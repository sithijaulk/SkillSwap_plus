const Transaction = require('../admin/transaction.model');
const User = require('./user.model');
const Session = require('./session.model');

/**
 * Mock Payment Gateway Service
 * Simulates payment processing for SkillSwap Plus
 */
class PaymentService {
    /**
     * Initialize a payment for a session
     */
    async initiatePayment(sessionId, learnerId, paymentMethod = 'card') {
        const session = await Session.findById(sessionId).populate('mentor skill');
        if (!session) {
            throw new Error('Session not found');
        }

        // Verify learner owns the session
        if (session.learner.toString() !== learnerId.toString()) {
            throw new Error('Unauthorized to pay for this session');
        }

        // Check if payment already exists
        const existingTransaction = await Transaction.findOne({
            learner: learnerId,
            session: sessionId
        });

        if (existingTransaction) {
            throw new Error('Payment already initiated for this session');
        }

        // Calculate amounts
        const amount = session.amount;
        const platformFee = amount * 0.25; // 25% platform fee
        const mentorEarning = amount - platformFee;

        // Create transaction record
        const transaction = new Transaction({
            learner: learnerId,
            mentor: session.mentor._id,
            skill: session.skill?._id,
            session: sessionId,
            amountPaid: amount,
            platformFee,
            mentorEarning,
            status: 'pending',
            paymentMethod: this.getPaymentMethodName(paymentMethod)
        });

        await transaction.save();

        // Generate mock payment intent
        const paymentIntent = {
            id: `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            clientSecret: `cs_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            amount: amount * 100, // Convert to cents
            currency: 'usd',
            status: 'requires_payment_method',
            transactionId: transaction._id
        };

        return {
            paymentIntent,
            transaction
        };
    }

    /**
     * Confirm a payment (mock processing)
     */
    async confirmPayment(paymentIntentId, transactionId) {
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        if (transaction.status !== 'pending') {
            throw new Error('Transaction is not in pending status');
        }

        // Simulate payment processing delay
        await this.delay(1000 + Math.random() * 2000); // 1-3 seconds

        // Mock payment success (95% success rate)
        const isSuccess = Math.random() > 0.05;

        if (isSuccess) {
            transaction.status = 'completed';
            transaction.completedAt = new Date();

            // Update session payment status
            await Session.findByIdAndUpdate(transaction.session, {
                paymentStatus: 'paid',
                status: 'scheduled' // Move to scheduled once paid
            });

            // Award credits to users
            await User.findByIdAndUpdate(transaction.learner, { $inc: { credits: 10 } });
            await User.findByIdAndUpdate(transaction.mentor, { $inc: { credits: 25 } });

        } else {
            transaction.status = 'failed';
            transaction.failedAt = new Date();
            transaction.failureReason = 'Mock payment declined';
        }

        await transaction.save();
        await transaction.populate('learner mentor');

        return {
            success: isSuccess,
            transaction,
            message: isSuccess ? 'Payment processed successfully' : 'Payment failed'
        };
    }

    /**
     * Process a refund
     */
    async processRefund(sessionId, userId, reason = 'Session cancelled') {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Verify user is part of the session
        const isLearner = session.learner.toString() === userId;
        const isMentor = session.mentor.toString() === userId;

        if (!isLearner && !isMentor) {
            throw new Error('Unauthorized to refund this session');
        }

        // Find the transaction
        const transaction = await Transaction.findOne({
            session: sessionId,
            status: 'completed'
        });

        if (!transaction) {
            throw new Error('No completed transaction found for this session');
        }

        // Process refund
        transaction.status = 'refunded';
        transaction.refundedAt = new Date();
        transaction.refundReason = reason;
        transaction.refundAmount = transaction.amountPaid;

        await transaction.save();

        // Update session
        session.paymentStatus = 'refunded';
        await session.save();

        // Deduct credits (reverse the rewards)
        await User.findByIdAndUpdate(transaction.learner, { $inc: { credits: -10 } });
        await User.findByIdAndUpdate(transaction.mentor, { $inc: { credits: -25 } });

        return transaction;
    }

    /**
     * Get payment methods available
     */
    getAvailablePaymentMethods() {
        return [
            { id: 'card', name: 'Credit/Debit Card', icon: 'credit-card' },
            { id: 'paypal', name: 'PayPal', icon: 'paypal' },
            { id: 'bank', name: 'Bank Transfer', icon: 'bank' },
            { id: 'wallet', name: 'SkillSwap Wallet', icon: 'wallet' }
        ];
    }

    /**
     * Get payment method display name
     */
    getPaymentMethodName(method) {
        const methods = {
            'card': 'Credit/Debit Card',
            'paypal': 'PayPal',
            'bank': 'Bank Transfer',
            'wallet': 'SkillSwap Wallet'
        };
        return methods[method] || 'Unknown';
    }

    /**
     * Get transaction history for a user
     */
    async getTransactionHistory(userId, role = 'learner') {
        const filter = role === 'mentor' ? { mentor: userId } : { learner: userId };

        const transactions = await Transaction.find(filter)
            .populate('learner mentor skill session')
            .sort({ createdAt: -1 })
            .limit(50);

        return transactions;
    }

    /**
     * Get payment statistics
     */
    async getPaymentStats(userId, role = 'learner') {
        const filter = role === 'mentor' ? { mentor: userId } : { learner: userId };

        const stats = await Transaction.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amountPaid' }
                }
            }
        ]);

        const result = {
            totalTransactions: 0,
            totalAmount: 0,
            completed: { count: 0, amount: 0 },
            pending: { count: 0, amount: 0 },
            failed: { count: 0, amount: 0 },
            refunded: { count: 0, amount: 0 }
        };

        stats.forEach(stat => {
            result.totalTransactions += stat.count;
            result.totalAmount += stat.totalAmount;

            if (stat._id === 'completed') {
                result.completed = { count: stat.count, amount: stat.totalAmount };
            } else if (stat._id === 'pending') {
                result.pending = { count: stat.count, amount: stat.totalAmount };
            } else if (stat._id === 'failed') {
                result.failed = { count: stat.count, amount: stat.totalAmount };
            } else if (stat._id === 'refunded') {
                result.refunded = { count: stat.count, amount: stat.totalAmount };
            }
        });

        return result;
    }

    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new PaymentService();