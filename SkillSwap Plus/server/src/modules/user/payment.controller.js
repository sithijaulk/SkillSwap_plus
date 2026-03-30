const paymentService = require('./payment.service');
const sessionService = require('./session.service');
const { validationResult } = require('express-validator');

/**
 * Payment Controller
 * Handles payment-related HTTP requests
 */

/**
 * @route   POST /api/payments/initiate
 * @desc    Initiate a payment for a session
 * @access  Private (Learner)
 */
exports.initiatePayment = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { sessionId, paymentMethod } = req.body;

        const result = await paymentService.initiatePayment(
            sessionId,
            req.user._id,
            paymentMethod
        );

        res.json({
            success: true,
            message: 'Payment initiated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/payments/confirm
 * @desc    Confirm a payment
 * @access  Private
 */
exports.confirmPayment = async (req, res, next) => {
    try {
        const { paymentIntentId, transactionId } = req.body;

        const result = await paymentService.confirmPayment(paymentIntentId, transactionId);

        res.json({
            success: result.success,
            message: result.message,
            data: result.transaction
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/payments/refund
 * @desc    Process a refund
 * @access  Private
 */
exports.processRefund = async (req, res, next) => {
    try {
        const { sessionId, reason } = req.body;

        const transaction = await paymentService.processRefund(
            sessionId,
            req.user._id,
            reason
        );

        res.json({
            success: true,
            message: 'Refund processed successfully',
            data: transaction
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/payments/methods
 * @desc    Get available payment methods
 * @access  Private
 */
exports.getPaymentMethods = async (req, res, next) => {
    try {
        const methods = paymentService.getAvailablePaymentMethods();

        res.json({
            success: true,
            data: methods
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/payments/history
 * @desc    Get payment transaction history
 * @access  Private
 */
exports.getPaymentHistory = async (req, res, next) => {
    try {
        const role = req.user.role;
        const transactions = await paymentService.getTransactionHistory(req.user._id, role);

        res.json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics
 * @access  Private
 */
exports.getPaymentStats = async (req, res, next) => {
    try {
        const role = req.user.role;
        const stats = await paymentService.getPaymentStats(req.user._id, role);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle payment webhook (mock)
 * @access  Public
 */
exports.handleWebhook = async (req, res, next) => {
    try {
        // In a real implementation, this would verify webhook signatures
        const { type, data } = req.body;

        // Mock webhook processing
        console.log('Mock webhook received:', type, data);

        res.json({
            success: true,
            message: 'Webhook processed'
        });
    } catch (error) {
        next(error);
    }
};