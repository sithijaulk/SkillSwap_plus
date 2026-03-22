const { validationResult } = require('express-validator');
const Session = require('./session.model');
const PostSessionFeedback = require('./postSessionFeedback.model');

const normalizeStatus = (status) => (status || '').toString().toLowerCase();

/**
 * POST /api/feedback
 * Learner submits post-session feedback for a completed session.
 */
exports.createFeedback = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const {
      sessionId,
      rating,
      writtenReview,
      wasHelpful,
      wouldRecommend,
      feedbackTags,
      sessionDifficulty,
      isAnonymous,
      improvementSuggestion,
    } = req.body;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Only completed sessions
    if (normalizeStatus(session.status) !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only submit feedback for completed sessions' });
    }

    // Only learner of the session
    if (session.learner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the learner of this session can submit feedback' });
    }

    // Only one feedback per session per learner
    const existing = await PostSessionFeedback.findOne({
      sessionId: session._id,
      learnerId: req.user._id,
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Feedback already submitted for this session' });
    }

    const feedback = await PostSessionFeedback.create({
      sessionId: session._id,
      learnerId: req.user._id,
      mentorId: session.mentor,
      rating,
      writtenReview,
      wasHelpful,
      wouldRecommend,
      feedbackTags,
      sessionDifficulty,
      isAnonymous: !!isAnonymous,
      improvementSuggestion: improvementSuggestion || '',
      submittedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback,
    });
  } catch (error) {
    // Handle unique index violation cleanly
    if (error && error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Feedback already submitted for this session' });
    }
    next(error);
  }
};

/**
 * GET /api/feedback/session/:sessionId
 * Check whether the current learner has already submitted feedback for a session.
 */
exports.getFeedbackForSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Only learner of the session can check
    if (session.learner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const feedback = await PostSessionFeedback.findOne({
      sessionId: session._id,
      learnerId: req.user._id,
    });

    res.json({
      success: true,
      exists: !!feedback,
      data: feedback || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/feedback/mentor
 * Return all feedback received by the logged-in mentor.
 */
exports.getMentorFeedback = async (req, res, next) => {
  try {
    const feedback = await PostSessionFeedback.find({ mentorId: req.user._id })
      .populate('learnerId', 'firstName lastName')
      .populate('sessionId', 'skill topic scheduledDate status')
      .sort({ submittedAt: -1, createdAt: -1 });

    res.json({
      success: true,
      count: feedback.length,
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};
