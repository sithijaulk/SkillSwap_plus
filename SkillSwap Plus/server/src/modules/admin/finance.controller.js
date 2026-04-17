const financeService = require('./finance.service');
const { validationResult } = require('express-validator');
const Session = require('../user/session.model');
const XLSX = require('xlsx');

const normalizeAuditQuery = (query = {}) => ({
    actionType: query.actionType,
    mentorId: query.mentorId,
    adminId: query.adminId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    minAmount: query.minAmount,
    maxAmount: query.maxAmount,
    q: query.q,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    limit: query.limit,
    offset: query.offset,
});

/**
 * @route   POST /api/admin/finance/pay
 * @desc    Process a mock payment for a skill session
 * @access  Private (Learner)
 */
exports.processPayment = async (req, res, next) => {
    try {
        const { skillId, amount } = req.body;
        
        // This is a simplified version for demonstration.
        // In a real app, you'd integrate Stripe/PayPal here.
        
        const Transaction = require('./transaction.model');
        const Skill = require('../user/skill.model');
        
        const skill = await Skill.findById(skillId);
        if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });

        const programName = (skill.title || skill.name || 'Program Session').toString().trim();
        const sessionDescription = (skill.description || `Enrolled in ${programName}`).toString().slice(0, 1000);

        // Prevent duplicate active enrollments for the same learner/program pair.
        const existingEnrollment = await Session.findOne({
            learner: req.user._id,
            mentor: skill.mentor,
            skill: programName,
            sessionType: 'paid',
            status: { $in: ['pending', 'accepted', 'scheduled', 'live'] },
        });

        if (existingEnrollment) {
            return res.status(200).json({
                success: true,
                message: 'You are already enrolled in this program',
                data: {
                    session: existingEnrollment,
                },
            });
        }

        const basePrice = skill.price;
        const platformFee = basePrice * 0.25;
        const totalAmount = basePrice + platformFee;

        const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const timeHH = String(scheduledDate.getHours()).padStart(2, '0');
        const timeMM = String(scheduledDate.getMinutes()).padStart(2, '0');

        const enrolledSession = await Session.create({
            learner: req.user._id,
            mentor: skill.mentor,
            program: skill._id,
            skill: programName,
            topic: programName,
            description: sessionDescription,
            scheduledDate,
            duration: 60,
            sessionType: 'paid',
            status: 'scheduled',
            paymentStatus: 'paid',
            amount: basePrice,
            paymentMethod: 'test_card',
            date: scheduledDate,
            time: `${timeHH}:${timeMM}`,
            message: 'Auto-created after successful enrollment',
        });

        const transaction = await Transaction.create({
            learner: req.user._id,
            mentor: skill.mentor,
            skill: skillId,
            session: enrolledSession._id,
            amountPaid: totalAmount,
            platformFee,
            mentorEarning: basePrice,
            status: 'completed',
            paymentMethod: 'Mock Card',
            completedAt: new Date(),
        });

        enrolledSession.transactionId = transaction._id.toString();
        await enrolledSession.save();

        // Generate mentor earnings automatically
        await financeService.createMentorEarnings(transaction._id);

        await enrolledSession.populate('mentor', 'firstName lastName university department');

        res.status(201).json({
            success: true,
            message: 'Payment processed and earnings recorded',
            data: {
                transaction,
                session: enrolledSession,
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/finance/stats
 * @desc    Get detailed platform finance stats
 * @access  Private (Admin only)
 */
exports.getFinanceStats = async (req, res, next) => {
    try {
        const stats = await financeService.getSystemFinanceStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/finance/mentors
 * @desc    Get all mentors with their financial standing
 * @access  Private (Admin only)
 */
exports.getMentorsFinance = async (req, res, next) => {
    try {
        const mentors = await financeService.getMentorsFinancialList();
        res.json({ success: true, data: mentors });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/admin/finance/payout/:mentorId
 * @desc    Process payout for a mentor
 * @access  Private (Admin only)
 */
exports.processPayout = async (req, res, next) => {
    try {
        const payout = await financeService.processPayout(
            req.params.mentorId,
            req.user._id,
            req.body.paymentMethod
        );
        res.json({ success: true, message: 'Payout successful', data: payout });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/finance/audit
 * @desc    Get financial audit logs
 * @access  Private (Admin only)
 */
exports.getAuditLogs = async (req, res, next) => {
    try {
        const logs = await financeService.getAuditLogs(normalizeAuditQuery(req.query));
        res.json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/finance/audit/export
 * @desc    Export financial audit logs to Excel
 * @access  Private (Admin only)
 */
exports.exportAuditLogs = async (req, res, next) => {
    try {
        const exportQuery = normalizeAuditQuery(req.query);
        exportQuery.limit = exportQuery.limit || 5000;
        exportQuery.offset = 0;

        const logs = await financeService.getAuditLogs(exportQuery);
        const rows = logs.map((log) => ({
            Action: log.actionType || '',
            Admin: `${log.admin?.firstName || ''} ${log.admin?.lastName || ''}`.trim() || '-',
            TargetMentor: `${log.targetMentor?.firstName || ''} ${log.targetMentor?.lastName || ''}`.trim() || '-',
            Amount: log.amount ?? '',
            Date: log.createdAt ? new Date(log.createdAt).toISOString() : '',
            Description: log.description || '',
            Details: log.details || ''
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const fileName = `audit-log_${new Date().toISOString().slice(0, 10)}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};
