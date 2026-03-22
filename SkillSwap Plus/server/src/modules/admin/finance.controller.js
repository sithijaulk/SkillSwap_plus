const financeService = require('./finance.service');
const { validationResult } = require('express-validator');

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

        const basePrice = skill.price;
        const platformFee = basePrice * 0.25;
        const totalAmount = basePrice + platformFee;

        const transaction = await Transaction.create({
            learner: req.user._id,
            mentor: skill.mentor,
            skill: skillId,
            amountPaid: totalAmount,
            platformFee,
            mentorEarning: basePrice,
            status: 'completed',
            paymentMethod: 'Mock Card'
        });

        // Generate mentor earnings automatically
        await financeService.createMentorEarnings(transaction._id);

        res.status(201).json({
            success: true,
            message: 'Payment processed and earnings recorded',
            data: transaction
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
        const logs = await financeService.getAuditLogs(req.query);
        res.json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
};
