const User = require('./user.model');
const ProfessionalProfile = require('./professionalProfile.model');
const Session = require('./session.model');
const Notification = require('./notification.model');

class ProfessionalService {
    createHttpError(message, statusCode = 400) {
        const error = new Error(message);
        error.statusCode = statusCode;
        return error;
    }

    // Get performance metrics for all mentors
    async getMentorsPerformance() {
        return await User.find({ role: 'mentor' })
            .select('firstName lastName email mps grade averageRating isVerified')
            .sort({ mps: -1 });
    }

    // Get progress metrics for all learners
    async getLearnersProgress() {
        return await User.find({ role: 'learner' })
            .select('firstName lastName email credits studyStreak skillReadiness learningGoals')
            .sort({ credits: -1 });
    }

    // Generate system-wide insights
    async getSystemAnalytics() {
        const mentors = await User.find({ role: 'mentor' }).sort({ mps: -1 });
        const learners = await User.find({ role: 'learner' }).sort({ credits: -1 });

        return {
            topMentors: mentors.slice(0, 5),
            weakMentors: mentors.filter(m => m.mps < 3.0),
            topLearners: learners.slice(0, 5),
            weakLearners: learners.filter(l => l.credits < 10) // Example threshold
        };
    }

    // Verify a mentor with a badge
    async verifyMentorAction(professionalId, mentorId, evaluationNote) {
        if (!mentorId) {
            throw this.createHttpError('mentorId is required', 400);
        }

        const mentor = await User.findById(mentorId).select('_id role isVerified firstName lastName email');
        if (!mentor || mentor.role !== 'mentor') {
            throw this.createHttpError('Valid mentor not found', 404);
        }

        const updatedMentor = await User.findByIdAndUpdate(
            mentorId,
            { $set: { isVerified: true } },
            { new: true }
        ).select('-password');

        // Update professional stats
        await ProfessionalProfile.findOneAndUpdate(
            { user: professionalId },
            { $inc: { 'stats.mentorsVerified': 1 } }
        );

        // Notify mentor
        await Notification.create({
            recipient: mentorId,
            sender: professionalId,
            type: 'system_alert',
            title: 'Verified Badge Assigned',
            message: `A professional has verified your teaching profile: ${evaluationNote}`,
            relatedId: mentorId,
            relatedModel: 'User'
        });

        return updatedMentor;
    }

    // Recommend mentor to student
    async recommendMentorToLearner(professionalId, mentorId, learnerId, message) {
        const recommendation = await Notification.create({
            recipient: learnerId,
            sender: professionalId,
            type: 'recommendation',
            title: 'Personalized Recommendation',
            message: `A supervisor suggests you learn from this mentor. Message: ${message}`,
            relatedId: mentorId,
            relatedModel: 'User'
        });

        await ProfessionalProfile.findOneAndUpdate(
            { user: professionalId },
            { $inc: { 'stats.recommendationsGiven': 1 } }
        );

        return recommendation;
    }

    // Evaluate session results
    async evaluateSessionOutcome(professionalId, sessionId, evaluationData) {
        if (!sessionId) {
            throw this.createHttpError('sessionId is required', 400);
        }

        const session = await Session.findById(sessionId);
        if (!session) throw this.createHttpError('Session not found', 404);

        session.professionalEvaluation = {
            professional: professionalId,
            ...evaluationData,
            evaluatedAt: new Date()
        };
        await session.save();

        await ProfessionalProfile.findOneAndUpdate(
            { user: professionalId },
            { $inc: { 'stats.sessionsEvaluated': 1 } }
        );

        return session;
    }
}

module.exports = new ProfessionalService();
