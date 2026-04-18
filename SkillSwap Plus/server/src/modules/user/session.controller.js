const sessionService = require('./session.service');
const { validationResult } = require('express-validator');

/**
 * Session Controller
 * Handles HTTP requests for session operations
 */

/**
 * @route   POST /api/sessions
 * @desc    Create a new session
 * @access  Private (Learner)
 */
exports.createSession = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const sessionData = {
            ...req.body,
            learner: req.user._id
        };

        const session = await sessionService.createSession(sessionData);

        res.status(201).json({
            success: true,
            message: 'Session created successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/sessions/:id
 * @desc    Get session by ID
 * @access  Private
 */
exports.getSession = async (req, res, next) => {
    try {
        const session = await sessionService.getSessionById(req.params.id);

        // Verify user is part of the session
        const isLearner = session.learner._id.toString() === req.user._id.toString();
        const isMentor = session.mentor._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isLearner && !isMentor && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/sessions
 * @desc    Get sessions with filters
 * @access  Private
 */
exports.getSessions = async (req, res, next) => {
    try {
        const filters = {
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        // Filter by user role
        if (req.user.role === 'learner') {
            filters.learnerId = req.user._id;
        } else if (req.user.role === 'mentor') {
            filters.mentorId = req.user._id;
        }
        // Admin can see all sessions

        const sessions = await sessionService.getSessions(filters);

        res.json({
            success: true,
            count: sessions.length,
            data: sessions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/sessions/:id/status
 * @desc    Update session status
 * @access  Private
 */
exports.updateStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const session = await sessionService.updateSessionStatus(
            req.params.id,
            status,
            req.user._id.toString()
        );

        res.json({
            success: true,
            message: 'Session status updated',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/sessions/:id/cancel
 * @desc    Cancel a session
 * @access  Private
 */
exports.cancelSession = async (req, res, next) => {
    try {
        const { reason } = req.body;

        const session = await sessionService.cancelSession(
            req.params.id,
            req.user._id.toString(),
            reason
        );

        res.json({
            success: true,
            message: 'Session cancelled successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/sessions/:id/payment
 * @desc    Update payment status (mock)
 * @access  Private
 */
exports.updatePayment = async (req, res, next) => {
    try {
        const session = await sessionService.updatePaymentStatus(
            req.params.id,
            req.body
        );

        res.json({
            success: true,
            message: 'Payment status updated',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/sessions/:id/accept
 * @desc    Learner accepts a mentor-initiated session
 * @access  Private (Learner only)
 */
exports.acceptSession = async (req, res, next) => {
    try {
        const session = await sessionService.acceptSession(
            req.params.id,
            req.user._id.toString()
        );

        res.json({
            success: true,
            message: 'Session accepted successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/sessions/:id/reject
 * @desc    Learner rejects a mentor-initiated session
 * @access  Private (Learner only)
 */
exports.rejectSession = async (req, res, next) => {
    try {
        const { reason } = req.body;

        const session = await sessionService.rejectSession(
            req.params.id,
            req.user._id.toString(),
            reason
        );

        res.json({
            success: true,
            message: 'Session rejected successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/sessions/:id/reschedule
 * @desc    Reschedule a session
 * @access  Private
 */
exports.rescheduleSession = async (req, res, next) => {
    try {
        const { newDate, newTime, reason } = req.body;

        if (!newDate || !newTime) {
            return res.status(400).json({
                success: false,
                message: 'New date and time are required'
            });
        }

        const session = await sessionService.rescheduleSession(
            req.params.id,
            req.user._id.toString(),
            { newDate, newTime, reason }
        );

        res.json({
            success: true,
            message: 'Session rescheduled successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/sessions/:id/generate-link
 * @desc    Generate meeting link for session
 * @access  Private (Mentor only)
 */
exports.generateMeetingLink = async (req, res, next) => {
    try {
        const session = await sessionService.generateMeetingLink(
            req.params.id,
            req.user._id.toString()
        );

        res.json({
            success: true,
            message: 'Meeting link generated successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/sessions/mentor
 * @desc    Get sessions for mentor
 * @access  Private (Mentor only)
 */
exports.getMentorSessions = async (req, res, next) => {
    try {
        const sessions = await sessionService.getMentorSessions(req.user._id);

        res.json({
            success: true,
            count: sessions.length,
            data: sessions
        });
    } catch (error) {
        next(error);
    }
};
