const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('./user.controller');
const sessionController = require('./session.controller');
const availabilityController = require('./availability.controller');
const postSessionFeedbackController = require('./postSessionFeedback.controller');
const auth = require('../../middleware/auth.middleware');
const { isMentor, isLearner, isLearnerOrMentor } = require('../../middleware/role.middleware');

/**
 * ===========================
 * AUTHENTICATION ROUTES
 * ===========================
 */

// Register
router.post('/auth/register', [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['learner', 'mentor']).withMessage('Invalid role'),
    body('phone').trim().matches(/^\d{10}$/).withMessage('Phone number must be exactly 10 digits')
], userController.register);

// Login
router.post('/auth/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
], userController.login);

// Get current user
router.get('/auth/me', auth, userController.getCurrentUser);

/**
 * ===========================
 * USER ROUTES
 * ===========================
 */

// Get user profile by ID
router.get('/users/profile/:userId', auth, userController.getUserProfile);

// Update own profile
router.put('/users/profile', auth, [
    body('phone').optional().trim().matches(/^\d{10}$/).withMessage('Phone number must be exactly 10 digits'),
    body('email').optional().isEmail().withMessage('Valid email is required')
], userController.updateProfile);

// Get all mentors (with filters)
router.get('/users/mentors', auth, userController.getMentors);

// Update mentor skills
router.put('/users/skills', auth, isMentor, userController.updateSkills);

// Get user stats
router.get('/users/stats', auth, userController.getUserStats);

/**
 * ===========================
 * MENTOR SKILLS (mentor-only)
 * ===========================
 */

// Get my skills
router.get('/mentors/me/skills', auth, isMentor, userController.getMySkills);

// Get my finance summary
router.get('/mentors/me/finance', auth, isMentor, userController.getMentorFinance);

// Add a new skill
router.post('/mentors/me/skills', auth, isMentor, userController.addMySkill);

// Update a skill
router.put('/mentors/me/skills/:skillId', auth, isMentor, userController.updateMySkill);

// Delete a skill
router.delete('/mentors/me/skills/:skillId', auth, isMentor, userController.deleteMySkill);

/**
 * Public skills listing
 */
router.get('/skills', userController.getPublicSkills);

/**
 * ===========================
 * SESSION ROUTES
 * ===========================
 */

// Create session
router.post('/sessions', auth, isLearner, [
    body('mentor').notEmpty().withMessage('Mentor is required'),
    body('skill').trim().notEmpty().withMessage('Skill is required'),
    body('topic').trim().notEmpty().withMessage('Topic is required'),
    body('scheduledDate').isISO8601().withMessage('Valid date is required').custom((value) => {
        if (new Date(value) < new Date()) {
            throw new Error('Session date must be in the future');
        }
        return true;
    }),
    body('duration').isInt({ min: 15, max: 240 }).withMessage('Duration must be between 15 and 240 minutes'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number')
], sessionController.createSession);

// Get session by ID
router.get('/sessions/:id', auth, sessionController.getSession);

// Get all sessions (filtered by user)
router.get('/sessions', auth, sessionController.getSessions);

// Update session status
router.put('/sessions/:id/status', auth, isLearnerOrMentor, sessionController.updateStatus);

// Cancel session
router.put('/sessions/:id/cancel', auth, isLearnerOrMentor, sessionController.cancelSession);

// Update payment status
router.put('/sessions/:id/payment', auth, sessionController.updatePayment);

// Accept session (learner-initiated)
router.put('/sessions/:id/accept', auth, isLearner, sessionController.acceptSession);

// Reject session (learner-initiated)
router.put('/sessions/:id/reject', auth, isLearner, sessionController.rejectSession);

/**
 * ===========================
 * POST-SESSION FEEDBACK (learner/mentor)
 * ===========================
 */

// Create feedback (learner-only, completed sessions only)
router.post('/feedback', auth, isLearner, [
    body('sessionId').notEmpty().withMessage('sessionId is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be between 1 and 5').toInt(),
    body('writtenReview').trim().notEmpty().withMessage('writtenReview is required').isLength({ max: 1000 }).withMessage('writtenReview cannot exceed 1000 characters'),
    body('wasHelpful')
        .custom((v) => typeof v === 'boolean' || v === 'true' || v === 'false')
        .withMessage('wasHelpful must be boolean')
        .toBoolean(),
    body('wouldRecommend')
        .custom((v) => typeof v === 'boolean' || v === 'true' || v === 'false')
        .withMessage('wouldRecommend must be boolean')
        .toBoolean(),
    body('feedbackTags').isArray({ min: 1 }).withMessage('feedbackTags must be a non-empty array'),
    body('sessionDifficulty').isIn(['Easy', 'Medium', 'Hard']).withMessage('sessionDifficulty must be Easy, Medium, or Hard'),
    body('isAnonymous')
        .optional()
        .custom((v) => typeof v === 'boolean' || v === 'true' || v === 'false')
        .withMessage('isAnonymous must be boolean')
        .toBoolean(),
    body('improvementSuggestion').optional().isLength({ max: 1000 }).withMessage('improvementSuggestion cannot exceed 1000 characters')
], postSessionFeedbackController.createFeedback);

// Check whether current learner already submitted feedback for a session
router.get('/feedback/session/:sessionId', auth, isLearner, postSessionFeedbackController.getFeedbackForSession);

// Mentor view: all feedback received by the logged-in mentor
router.get('/feedback/mentor', auth, isMentor, postSessionFeedbackController.getMentorFeedback);

/**
 * ===========================
 * AVAILABILITY ROUTES
 * ===========================
 */

// Create availability
router.post('/availability', auth, isMentor, [
    body('dayOfWeek').isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).withMessage('Invalid day of week'),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format'),
    body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format')
], availabilityController.createAvailability);

// Batch create availability
router.post('/availability/batch', auth, isMentor, availabilityController.batchCreateAvailability);

// Get mentor's availability
router.get('/availability/mentor/:mentorId', availabilityController.getMentorAvailability);

// Get own availability
router.get('/availability/my', auth, isMentor, availabilityController.getMyAvailability);

// Update availability
router.put('/availability/:id', auth, isMentor, availabilityController.updateAvailability);

// Delete availability
router.delete('/availability/:id', auth, isMentor, availabilityController.deleteAvailability);

// Get available slots for date
router.get('/availability/slots/:mentorId/:date', availabilityController.getAvailableSlots);

/**
 * ===========================
 * SKILL ROUTES
 * ===========================
 */
const skillController = require('./skill.controller');
router.post('/skills', auth, isMentor, skillController.createSkill);
router.get('/skills/public', skillController.getSkills);
router.get('/skills/my', auth, isMentor, skillController.getMySkills);
router.put('/skills/:id', auth, isMentor, skillController.updateSkill);
router.delete('/skills/:id', auth, isMentor, skillController.deleteSkill);

module.exports = router;
