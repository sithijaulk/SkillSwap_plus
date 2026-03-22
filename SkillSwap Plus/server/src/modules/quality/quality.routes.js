const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const qualityController = require('./quality.controller');
const auth = require('../../middleware/auth.middleware');
const { isLearnerOrMentor } = require('../../middleware/role.middleware');

/**
 * ===========================
 * RATING ROUTES
 * ===========================
 */

// Submit rating
router.post('/ratings', auth, isLearnerOrMentor, [
    body('session').notEmpty().withMessage('Session is required'),
    body('overallRating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().isLength({ max: 500 }).withMessage('Review cannot exceed 500 characters')
], qualityController.submitRating);

// Get user ratings
router.get('/ratings/user/:userId', qualityController.getUserRatings);

/**
 * ===========================
 * FEEDBACK ROUTES
 * ===========================
 */

// Submit feedback
router.post('/feedback', auth, isLearnerOrMentor, [
    body('session').notEmpty().withMessage('Session is required'),
    body('whatWentWell').optional().isLength({ max: 500 }),
    body('whatCouldImprove').optional().isLength({ max: 500 }),
    body('suggestions').optional().isLength({ max: 500 })
], qualityController.submitFeedback);

// Get user feedback
router.get('/feedback/user/:userId', auth, qualityController.getUserFeedback);

// Acknowledge feedback
router.put('/feedback/:id/acknowledge', auth, qualityController.acknowledgeFeedback);

/**
 * ===========================
 * IMPROVEMENT ROUTES
 * ===========================
 */

// Get improvement recommendations
router.get('/improvements', auth, qualityController.getImprovements);

// Update improvement status
router.put('/improvements/:id', auth, qualityController.updateImprovement);

/**
 * ===========================
 * REPUTATION ROUTES
 * ===========================
 */

// Get reputation metrics
router.get('/reputation/:userId', qualityController.getReputation);

module.exports = router;
