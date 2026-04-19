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
        const SessionParticipant = require('./sessionParticipant.model');

        const isLearner = session.learner?._id?.toString() === req.user._id.toString();
        const isMentor = session.mentor?._id?.toString() === req.user._id.toString();
        const isCreator = session.creator?._id?.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        const participantRecord = await SessionParticipant.findOne({
            session: session._id,
            participant: req.user._id,
            status: 'joined'
        });
        const isParticipant = !!participantRecord;

        if (!isLearner && !isMentor && !isCreator && !isParticipant && !isAdmin) {
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
 * @route   POST /api/sessions/group/create
 * @desc    Create a group session
 * @access  Private (Mentor only)
 */
exports.createGroupSession = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const session = await sessionService.createGroupSession(req.body, req.user._id);

        res.status(201).json({
            success: true,
            message: 'Group session created successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/sessions/from-post/:postId
 * @desc    Create session from community post
 * @access  Private (Mentor only)
 */
exports.createSessionFromPost = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const session = await sessionService.createSessionFromPost(
            req.params.postId,
            req.user._id,
            req.body
        );

        res.status(201).json({
            success: true,
            message: 'Session created from post successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/sessions/:id/join
 * @desc    Join a session
 * @access  Private
 */
exports.joinSession = async (req, res, next) => {
    try {
        const participant = await sessionService.joinSession(
            req.params.id,
            req.user._id
        );

        res.status(201).json({
            success: true,
            message: 'Joined session successfully',
            data: participant
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/sessions/programs/list
 * @desc    Get published sessions for Programs page
 * @access  Public
 */
exports.getPublishedSessions = async (req, res, next) => {
    try {
        const filters = {
            category: req.query.category,
            searchText: req.query.search
        };

        const sessions = await sessionService.getPublishedSessions(filters);

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
 * @route   GET /api/mentor-dashboard/sessions/created
 * @desc    Get sessions created by mentor
 * @access  Private (Mentor only)
 */
exports.getMentorCreatedSessions = async (req, res, next) => {
    try {
        const sessions = await sessionService.getMentorCreatedSessions(req.user._id);

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
 * @route   GET /api/sessions/mentor
 * @desc    Get sessions owned by the current mentor
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

/**
 * @route   GET /api/mentor-dashboard/sessions/joined
 * @desc    Get sessions joined by mentor
 * @access  Private (Mentor only)
 */
exports.getMentorJoinedSessions = async (req, res, next) => {
    try {
        const sessions = await sessionService.getMentorJoinedSessions(req.user._id);

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
 * @route   GET /api/sessions/:id/participants
 * @desc    Get session participants
 * @access  Private
 */
exports.getSessionParticipants = async (req, res, next) => {
    try {
        const participants = await sessionService.getSessionParticipants(req.params.id);

        res.json({
            success: true,
            count: participants.length,
            data: participants
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/learner-dashboard/sessions/joined
 * @desc    Get sessions joined by learner
 * @access  Private (Learner only)
 */
exports.getLearnerJoinedSessions = async (req, res, next) => {
    try {
        const sessions = await sessionService.getLearnerJoinedSessions(req.user._id);

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
 * @route   GET /api/learner-dashboard/programs
 * @desc    Get enrolled programs for learner dashboard My Programs
 * @access  Private (Learner only)
 */
exports.getLearnerEnrolledPrograms = async (req, res, next) => {
    try {
        const programs = await sessionService.getLearnerEnrolledPrograms(req.user._id);

        res.json({
            success: true,
            count: programs.length,
            data: programs
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/sessions/:id/publish
 * @desc    Publish a draft session
 * @access  Private (Mentor only)
 */
exports.publishSession = async (req, res, next) => {
    try {
        const session = await sessionService.publishSession(req.params.id, req.user._id);

        res.json({
            success: true,
            message: 'Session published successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/sessions/:id/generate-link
 * @desc    Generate meeting link for a session
 * @access  Private (Mentor only)
 */
exports.generateMeetingLink = async (req, res, next) => {
    try {
        const session = await sessionService.generateMeetingLink(req.params.id, req.user._id);

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
 * @route   PUT /api/sessions/:id
 * @desc    Update session details
 * @access  Private
 */
exports.updateSession = async (req, res, next) => {
    try {
        const session = await sessionService.updateSession(
            req.params.id,
            req.user._id,
            req.body
        );

        res.json({
            success: true,
            message: 'Session updated successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/sessions/:id
 * @desc    Delete a session
 * @access  Private
 */
exports.deleteSession = async (req, res, next) => {
    try {
        const result = await sessionService.deleteSession(
            req.params.id,
            req.user._id
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};
