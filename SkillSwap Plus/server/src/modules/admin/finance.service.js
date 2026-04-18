const Transaction = require('./transaction.model');
const MentorEarning = require('./mentorEarning.model');
const Payout = require('./payout.model');
const AuditLog = require('./auditLog.model');
const User = require('../user/user.model');
const mongoose = require('mongoose');

class FinanceService {
    /**
     * Create earnings for a mentor after a successful payment
     */
    async createMentorEarnings(transactionId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const transaction = await Transaction.findById(transactionId).session(session);
            if (!transaction || transaction.status !== 'completed') {
                throw new Error('Invalid or incomplete transaction');
            }

            // Check if earning already exists
            const existingEarning = await MentorEarning.findOne({ transaction: transactionId }).session(session);
            if (existingEarning) {
                return existingEarning;
            }

            const earning = new MentorEarning({
                mentor: transaction.mentor,
                transaction: transactionId,
                session: transaction.session, // If available
                amount: transaction.mentorEarning,
                platformFee: transaction.platformFee,
                status: 'pending'
            });

            await earning.save({ session });

            // Update mentor's total earnings (optional if we aggregate, but useful for quick view)
            // For now, we'll rely on aggregation for accuracy

            await this.logAction({
                actionType: 'earnings_updated',
                admin: transaction.learner, // System action initiated by learner payment
                targetMentor: transaction.mentor,
                amount: transaction.mentorEarning,
                description: `Earnings generated from transaction ${transactionId}`
            }, session);

            await session.commitTransaction();
            return earning;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get mentor finance summary
     */
    async getMentorFinanceSummary(mentorId) {
        const earnings = await MentorEarning.aggregate([
            { $match: { mentor: new mongoose.Types.ObjectId(mentorId) } },
            {
                $group: {
                    _id: "$status",
                    total: { $sum: "$amount" },
                    fees: { $sum: "$platformFee" }
                }
            }
        ]);

        const summary = {
            pending: 0,
            paid: 0,
            totalFees: 0,
            totalNet: 0
        };

        earnings.forEach(e => {
            if (e._id === 'pending') summary.pending = e.total;
            if (e._id === 'paid') summary.paid = e.total;
            summary.totalFees += e.fees;
        });

        summary.totalNet = summary.pending + summary.paid;
        return summary;
    }

    /**
     * Process a payout for a mentor
     */
    async processPayout(mentorId, adminId, paymentMethod = 'Mock Bank Transfer') {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Find all pending earnings for this mentor
            const pendingEarnings = await MentorEarning.find({
                mentor: mentorId,
                status: 'pending'
            }).session(session);

            if (pendingEarnings.length === 0) {
                throw new Error('No pending earnings for this mentor');
            }

            const totalAmount = pendingEarnings.reduce((sum, e) => sum + e.amount, 0);

            // Create Payout record
            const payout = new Payout({
                mentor: mentorId,
                amount: totalAmount,
                status: 'completed',
                paymentMethod,
                earnings: pendingEarnings.map(e => e._id),
                processedAt: new Date(),
                processedBy: adminId
            });

            await payout.save({ session });

            // Mark earnings as paid
            await MentorEarning.updateMany(
                { _id: { $in: pendingEarnings.map(e => e._id) } },
                { $set: { status: 'paid', payout: payout._id } },
                { session }
            );

            // Log action
            await this.logAction({
                actionType: 'payout_processed',
                admin: adminId,
                targetMentor: mentorId,
                amount: totalAmount,
                description: `Payout of Rs. ${totalAmount} processed for ${pendingEarnings.length} sessions.`
            }, session);

            await session.commitTransaction();
            return payout;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get system-wide finance stats
     */
    async getSystemFinanceStats() {
        const stats = await Transaction.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$amountPaid" },
                    totalPlatformFee: { $sum: "$platformFee" },
                    totalMentorEarnings: { $sum: "$mentorEarning" }
                }
            }
        ]);

        const payoutStats = await MentorEarning.aggregate([
            {
                $group: {
                    _id: "$status",
                    total: { $sum: "$amount" }
                }
            }
        ]);

        const finance = stats[0] || { totalRevenue: 0, totalPlatformFee: 0, totalMentorEarnings: 0 };
        const payouts = { pending: 0, paid: 0 };
        
        payoutStats.forEach(p => {
            if (p._id === 'pending') payouts.pending = p.total;
            if (p._id === 'paid') payouts.paid = p.total;
        });

        return {
            ...finance,
            payouts
        };
    }

    /**
     * Get mentor list with financial summary
     */
    async getMentorsFinancialList() {
        return User.aggregate([
            { $match: { role: 'mentor' } },
            {
                $lookup: {
                    from: 'mentorearnings',
                    localField: '_id',
                    foreignField: 'mentor',
                    as: 'earnings'
                }
            },
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    email: 1,
                    bankDetails: 1,
                    totalEarned: { $sum: "$earnings.amount" },
                    totalFees: { $sum: "$earnings.platformFee" },
                    pendingPayment: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$earnings",
                                        as: "e",
                                        cond: { $eq: ["$$e.status", "pending"] }
                                    }
                                },
                                as: "fe",
                                in: "$$fe.amount"
                            }
                        }
                    },
                    completedSessions: {
                        $size: {
                            $filter: {
                                input: "$earnings",
                                as: "e",
                                cond: { $ne: ["$$e.session", null] }
                            }
                        }
                    }
                }
            }
        ]);
    }

    /**
     * Log a financial action
     */
    async logAction(data, session = null) {
        const log = new AuditLog(data);
        if (session) {
            await log.save({ session });
        } else {
            await log.save();
        }
        return log;
    }

    /**
     * Get audit logs
     */
    async getAuditLogs(filters = {}) {
        const query = {};
        if (filters.actionType) query.actionType = filters.actionType;
        if (filters.mentorId) query.targetMentor = filters.mentorId;

        return AuditLog.find(query)
            .populate('admin', 'firstName lastName')
            .populate('targetMentor', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(100);
    }
}

module.exports = new FinanceService();
