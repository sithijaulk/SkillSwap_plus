const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const userController = require('./user.controller');
const sessionController = require('./session.controller');
const availabilityController = require('./availability.controller');
const postSessionFeedbackController = require('./postSessionFeedback.controller');
const skillController = require('./skill.controller');
const notificationController = require('./notification.controller');
const favoriteController = require('./favorite.controller');
const paymentController = require('./payment.controller');
const auth = require('../../middleware/auth.middleware');
const { isMentor, isLearner, isLearnerOrMentor } = require('../../middleware/role.middleware');
const { skillImageUpload } = require('../../middleware/skillUpload.middleware');

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
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/).withMessage('Password must include uppercase, lowercase, and a number'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Confirm password must match password');
        }
        return true;
    }),
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
router.get('/mentors/me/skills', auth, isMentor, skillController.getMySkills);

// Get my finance summary
router.get('/mentors/me/finance', auth, isMentor, userController.getMentorFinance);

// Add a new skill
router.post('/mentors/me/skills', auth, isMentor, skillController.createSkill);

// Update a skill
router.put('/mentors/me/skills/:skillId', auth, isMentor, skillController.updateSkill);

// Delete a skill
router.delete('/mentors/me/skills/:skillId', auth, isMentor, skillController.deleteSkill);

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
    body('skill').optional().trim(),
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

// Reschedule session
router.put('/sessions/:id/reschedule', auth, isLearnerOrMentor, sessionController.rescheduleSession);

// Generate meeting link
router.post('/sessions/:id/generate-link', auth, isMentor, sessionController.generateMeetingLink);

// Get mentor sessions
router.get('/sessions/mentor', auth, isMentor, sessionController.getMentorSessions);

/**
 * ===========================
 * GROUP SESSIONS & PROGRAMS ROUTES
 * ===========================
 */

// Create group session (from mentor dashboard)
router.post('/sessions/group/create', auth, isMentor, [
    body('skill').optional().trim(),
    body('topic').trim().notEmpty().withMessage('Topic is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('scheduledDate').isISO8601().withMessage('Valid date is required'),
    body('startTime').matches(/^([0-1]?\d|2[0-3]):[0-5]\d$/).withMessage('Valid start time required (HH:mm)'),
    body('endTime').matches(/^([0-1]?\d|2[0-3]):[0-5]\d$/).withMessage('Valid end time required (HH:mm)'),
    body('duration').isInt({ min: 15, max: 240 }).withMessage('Duration must be between 15 and 240 minutes'),
    body('sessionType').isIn(['free', 'paid', 'workshop']).withMessage('Invalid session type'),
    body('sessionCategory').isIn(['workshop', 'masterclass', 'group_class', 'webinar']).withMessage('Invalid category'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1')
], sessionController.createGroupSession);

// Create session from community post
router.post('/sessions/from-post/:postId', auth, isMentor, [
    body('scheduledDate').isISO8601().withMessage('Valid date is required'),
    body('startTime').matches(/^([0-1]?\d|2[0-3]):[0-5]\d$/).withMessage('Valid start time required'),
    body('endTime').matches(/^([0-1]?\d|2[0-3]):[0-5]\d$/).withMessage('Valid end time required'),
    body('duration').isInt({ min: 15, max: 240 }).withMessage('Duration must be between 15 and 240 minutes'),
    body('sessionType').isIn(['free', 'paid', 'workshop']).withMessage('Invalid session type'),
    body('sessionCategory').isIn(['workshop', 'masterclass', 'group_class', 'webinar']).withMessage('Invalid category')
], sessionController.createSessionFromPost);

// Join a session
router.post('/sessions/:id/join', auth, sessionController.joinSession);

// Get published sessions (for Programs page)
router.get('/sessions/programs/list', [
    query('category').optional().isIn(['workshop', 'masterclass', 'group_class', 'webinar']),
    query('search').optional().trim()
], sessionController.getPublishedSessions);

// Get mentor created sessions (dashboard)
router.get('/mentor-dashboard/sessions/created', auth, isMentor, sessionController.getMentorCreatedSessions);

// Get mentor joined sessions (dashboard calendar)
router.get('/mentor-dashboard/sessions/joined', auth, isMentor, sessionController.getMentorJoinedSessions);

// Get session participants
router.get('/sessions/:id/participants', auth, sessionController.getSessionParticipants);

// Get learner joined sessions
router.get('/learner-dashboard/sessions/joined', auth, isLearner, sessionController.getLearnerJoinedSessions);

// Publish a draft session
router.put('/sessions/:id/publish', auth, isMentor, sessionController.publishSession);

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
    body('date').isISO8601().withMessage('Valid date is required'),
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
router.post('/skills', auth, isMentor, skillController.createSkill);
router.get('/skills/public', skillController.getSkills);
router.get('/skills/my', auth, isMentor, skillController.getMySkills);
router.get('/skills/:id', skillController.getSkill);
router.put('/skills/:id', auth, isMentor, skillController.updateSkill);
router.delete('/skills/:id', auth, isMentor, skillController.deleteSkill);

/**
 * ===========================
 * FILE UPLOAD ROUTES
 * ===========================
 */

// Upload skill image
router.post('/upload/skill-image', auth, isMentor, skillImageUpload.single('image'), userController.uploadSkillImage);

// Upload profile image
const upload = require('../../middleware/upload.middleware');
router.post('/upload/profile-image', auth, upload.profileUpload.single('image'), userController.uploadProfileImage);

/**
 * ===========================
 * NOTIFICATION ROUTES
 * ===========================
 */

// Get notifications
router.get('/notifications', auth, notificationController.getNotifications);

// Mark notification as read
router.put('/notifications/:id/read', auth, notificationController.markAsRead);

// Mark all notifications as read
router.put('/notifications/read-all', auth, notificationController.markAllAsRead);

// Get unread count
router.get('/notifications/unread-count', auth, notificationController.getUnreadCount);

// Delete notification
router.delete('/notifications/:id', auth, notificationController.deleteNotification);

/**
 * ===========================
 * FAVORITES ROUTES
 * ===========================
 */

// Add to favorites
router.post('/favorites', auth, [
    body('favoriteType').isIn(['mentor', 'skill']).withMessage('Invalid favorite type'),
    body('favoriteId').isMongoId().withMessage('Invalid favorite ID'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
], favoriteController.addFavorite);

// Get favorites
router.get('/favorites', auth, favoriteController.getFavorites);

// Remove from favorites
router.delete('/favorites/:id', auth, favoriteController.removeFavorite);

// Check if favorited
router.get('/favorites/check/:type/:id', auth, favoriteController.checkFavorite);

/**
 * ===========================
 * PAYMENT ROUTES
 * ===========================
 */

// Initiate payment
router.post('/payments/initiate', auth, isLearner, [
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('paymentMethod').optional().isIn(['card', 'paypal', 'bank', 'wallet']).withMessage('Invalid payment method')
], paymentController.initiatePayment);

// Confirm payment
router.post('/payments/confirm', auth, [
    body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
    body('transactionId').notEmpty().withMessage('Transaction ID is required')
], paymentController.confirmPayment);

// Process refund
router.post('/payments/refund', auth, [
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('reason').optional().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
], paymentController.processRefund);

// Get payment methods
router.get('/payments/methods', auth, paymentController.getPaymentMethods);

// Get payment history
router.get('/payments/history', auth, paymentController.getPaymentHistory);

// Get payment stats
router.get('/payments/stats', auth, paymentController.getPaymentStats);

// Payment webhook (mock)
router.post('/payments/webhook', paymentController.handleWebhook);

module.exports = router;
