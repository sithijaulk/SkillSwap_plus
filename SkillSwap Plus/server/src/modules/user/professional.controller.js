const professionalService = require('./professional.service');

/**
 * Professional Controller
 */

// Monitor Mentors
exports.monitorMentors = async (req, res, next) => {
    try {
        const mentors = await professionalService.getMentorsPerformance();
        res.json({ success: true, data: mentors });
    } catch (error) {
        next(error);
    }
};

// Monitor Learners
exports.monitorLearners = async (req, res, next) => {
    try {
        const learners = await professionalService.getLearnersProgress();
        res.json({ success: true, data: learners });
    } catch (error) {
        next(error);
    }
};

// Get Analytics
exports.getAnalytics = async (req, res, next) => {
    try {
        const analytics = await professionalService.getSystemAnalytics();
        res.json({ success: true, data: analytics });
    } catch (error) {
        next(error);
    }
};

// Verify Mentor
exports.verifyMentor = async (req, res, next) => {
    try {
        const { mentorId, evaluationNote } = req.body;
        const result = await professionalService.verifyMentorAction(req.user._id, mentorId, evaluationNote);
        res.json({ success: true, message: 'Mentor verified and badge assigned', data: result });
    } catch (error) {
        next(error);
    }
};

// Recommend Mentor to Learner
exports.recommendMentor = async (req, res, next) => {
    try {
        const { mentorId, learnerId, message } = req.body;
        const result = await professionalService.recommendMentorToLearner(req.user._id, mentorId, learnerId, message);
        res.json({ success: true, message: 'Recommendation sent', data: result });
    } catch (error) {
        next(error);
    }
};

// Evaluate Session
exports.evaluateSession = async (req, res, next) => {
    try {
        const { sessionId, evaluationData } = req.body;
        const result = await professionalService.evaluateSessionOutcome(req.user._id, sessionId, evaluationData);
        res.json({ success: true, message: 'Session evaluation submitted', data: result });
    } catch (error) {
        next(error);
    }
};
