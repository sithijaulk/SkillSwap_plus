const qualityService = require('./quality.service');
const { validationResult } = require('express-validator');

/**
 * Quality Controller
 * Handles ratings, feedback, and improvement recommendations
 */

/**
 * @route   POST /api/ratings
 * @desc    Submit a rating
 * @access  Private
 */
exports.submitRating = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const ratingData = {
            ...req.body,
            rater: req.user._id
        };

        const rating = await qualityService.submitRating(ratingData);

        res.status(201).json({
            success: true,
            message: 'Rating submitted successfully',
            data: rating
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/ratings/user/:userId
 * @desc    Get ratings for a user
 * @access  Public
 */
exports.getUserRatings = async (req, res, next) => {
    try {
        const filters = {
            minRating: req.query.minRating
        };

        const ratings = await qualityService.getUserRatings(req.params.userId, filters);

        res.json({
            success: true,
            count: ratings.length,
            data: ratings
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/feedback
 * @desc    Submit feedback
 * @access  Private
 */
exports.submitFeedback = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const feedbackData = {
            ...req.body,
            provider: req.user._id
        };

        const feedback = await qualityService.submitFeedback(feedbackData);

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: feedback
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/feedback/user/:userId
 * @desc    Get feedback for a user
 * @access  Private
 */
exports.getUserFeedback = async (req, res, next) => {
    try {
        const filters = {
            type: req.query.type,
            isPrivate: req.query.isPrivate
        };

        const feedback = await qualityService.getUserFeedback(req.params.userId, filters);

        res.json({
            success: true,
            count: feedback.length,
            data: feedback
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/feedback/:id/acknowledge
 * @desc    Acknowledge feedback
 * @access  Private
 */
exports.acknowledgeFeedback = async (req, res, next) => {
    try {
        const feedback = await qualityService.acknowledgeFeedback(
            req.params.id,
            req.user._id
        );

        res.json({
            success: true,
            message: 'Feedback acknowledged',
            data: feedback
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/improvements
 * @desc    Get improvement recommendations
 * @access  Private
 */
exports.getImprovements = async (req, res, next) => {
    try {
        const status = req.query.status;

        const recommendations = await qualityService.getImprovementRecommendations(
            req.user._id,
            status
        );

        res.json({
            success: true,
            count: recommendations.length,
            data: recommendations
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/improvements/:id
 * @desc    Update improvement status
 * @access  Private
 */
exports.updateImprovement = async (req, res, next) => {
    try {
        const { status, notes } = req.body;

        const recommendation = await qualityService.updateImprovementStatus(
            req.params.id,
            req.user._id,
            status,
            notes
        );

        res.json({
            success: true,
            message: 'Improvement status updated',
            data: recommendation
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/reputation/:userId
 * @desc    Get reputation metrics
 * @access  Public
 */
exports.getReputation = async (req, res, next) => {
    try {
        const metrics = await qualityService.calculateReputation(req.params.userId);

        res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        next(error);
    }
};
