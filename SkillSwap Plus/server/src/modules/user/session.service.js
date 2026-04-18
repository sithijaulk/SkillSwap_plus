const Session = require('./session.model');
const User = require('./user.model');
const Availability = require('./availability.model');
const Progress = require('./progress.model');
const Transaction = require('../admin/transaction.model');
const qualityService = require('../quality/quality.service');
const mongoose = require('mongoose');

/**
 * Session Service Layer
 * Contains business logic for session management
 */

class SessionService {
    /**
     * Create a new session
     */
    async createSession(sessionData) {
        // Validate mentor exists and is verified
        const mentor = await User.findById(sessionData.mentor);
        if (!mentor || mentor.role !== 'mentor') {
            throw new Error('Invalid mentor');
        }

        if (!mentor.isVerified) {
            throw new Error('Mentor is not verified yet');
        }

        // Create session
        const session = new Session(sessionData);
        await session.save();

        // Populate references
        await session.populate('learner mentor', '-password');

        return session;
    }

    /**
     * Get session by ID
     */
    async getSessionById(sessionId) {
        const session = await Session.findById(sessionId)
            .populate('learner mentor', '-password')
            .populate('cancelledBy', 'firstName lastName');

        if (!session) {
            throw new Error('Session not found');
        }

        return session;
    }

    /**
     * Get sessions with filters
     */
    async getSessions(filters = {}) {
        const query = {};

        // Filter by learner or mentor
        if (filters.learnerId) {
            query.learner = filters.learnerId;
        }
        if (filters.mentorId) {
            query.mentor = filters.mentorId;
        }

        // Filter by status
        if (filters.status) {
            query.status = filters.status;
        }

        // Filter by date range
        if (filters.startDate || filters.endDate) {
            query.scheduledDate = {};
            if (filters.startDate) {
                query.scheduledDate.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                query.scheduledDate.$lte = new Date(filters.endDate);
            }
        }

        const sessions = await Session.find(query)
            .populate('learner mentor', '-password')
            .sort({ scheduledDate: -1 });

        return sessions;
    }

    /**
     * Update session status
     */
    async updateSessionStatus(sessionId, status, userId) {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const nextStatus = (status || '').toString().toLowerCase();
        const currentStatus = (session.status || '').toString().toLowerCase();
        const allowedStatuses = ['pending', 'accepted', 'scheduled', 'live', 'completed', 'cancelled', 'disputed'];

        if (!allowedStatuses.includes(nextStatus)) {
            throw new Error('Invalid session status');
        }

        // Verify user is part of the session
        const isLearner = session.learner.toString() === userId;
        const isMentor = session.mentor.toString() === userId;

        if (!isLearner && !isMentor) {
            throw new Error('Unauthorized to update this session');
        }

        // Scheduling and completion are mentor-only actions
        if (['scheduled', 'completed'].includes(nextStatus) && !isMentor) {
            throw new Error('Only the assigned mentor can update this session status');
        }

        // Restore core workflow: enrolled/accepted -> scheduled -> completed
        if (nextStatus === 'scheduled' && !['pending', 'accepted', 'enrolled'].includes(currentStatus)) {
            throw new Error('Session can only be scheduled from pending/accepted state');
        }

        if (nextStatus === 'completed' && !['scheduled', 'live'].includes(currentStatus)) {
            throw new Error('Session can only be completed after it is scheduled/live');
        }

        // Update status
        session.status = nextStatus;

        // Set completion time and handle finance if completed
        if (nextStatus === 'completed') {
            session.completedAt = new Date();
 
            // Create a real transaction if it's a paid session
            if (session.sessionType === 'paid' && session.amount > 0) {
                const platformFee = session.amount * 0.25;
                const mentorEarning = session.amount - platformFee;

                const transactionData = {
                    learner: session.learner,
                    mentor: session.mentor,
                    amountPaid: session.amount,
                    platformFee,
                    mentorEarning,
                    status: 'completed'
                };

                // Session skill may be stored as plain text; only attach when it's a valid Skill ObjectId.
                if (mongoose.Types.ObjectId.isValid(session.skill)) {
                    transactionData.skill = session.skill;
                }

                await Transaction.create(transactionData);
            }

            // Update mentor's total sessions and reward 25 credits
            await User.findByIdAndUpdate(session.mentor, { $inc: { totalSessions: 1, credits: 25 } });
            
            // Recalculate MPS
            try {
                await qualityService.calculateMPS(session.mentor);
            } catch (mpsError) {
                // MPS recalculation should not block core session completion flow.
                console.error('MPS recalculation failed after session completion:', mpsError.message);
            }
 
            // Update learner's progress and reward 10 credits
            await User.findByIdAndUpdate(session.learner, { $inc: { credits: 10 } });
            await this.updateLearnerProgress(session.learner, session.skill, session.duration);
        }

        // Handle live session link generation
        if (nextStatus === 'live' && !session.meetingLink) {
            session.meetingLink = `https://meet.skillswap.plus/${session._id}`;
            session.meetingPlatform = 'zoom';
        }

        await session.save();
        await session.populate('learner mentor', '-password');

        return session;
    }

    /**
     * Cancel session
     */
    async cancelSession(sessionId, userId, reason) {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Verify user is part of the session
        const isLearner = session.learner.toString() === userId;
        const isMentor = session.mentor.toString() === userId;

        if (!isLearner && !isMentor) {
            throw new Error('Unauthorized to cancel this session');
        }

        // Cannot cancel if already completed or cancelled
        if (['completed', 'cancelled'].includes(session.status)) {
            throw new Error(`Cannot cancel a ${session.status} session`);
        }

        session.status = 'cancelled';
        session.cancelledAt = new Date();
        session.cancelledBy = userId;
        session.cancellationReason = reason;

        // Handle payment refund (mock)
        if (session.paymentStatus === 'paid') {
            session.paymentStatus = 'refunded';
        }

        await session.save();
        await session.populate('learner mentor cancelledBy', '-password');

        return session;
    }

    /**
     * Update session payment status (mock)
     */
    async updatePaymentStatus(sessionId, paymentData) {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.paymentStatus = paymentData.status;
        session.transactionId = paymentData.transactionId || `TEST_${Date.now()}`;

        // Accept session if payment is successful
        if (paymentData.status === 'paid' && session.status === 'pending') {
            session.status = 'accepted';
        }

        await session.save();
        return session;
    }

    /**
     * Learner accepts a mentor-initiated session
     */
    async acceptSession(sessionId, learnerId) {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Only the learner can accept their own session
        if (session.learner.toString() !== learnerId.toString()) {
            throw new Error('Only the learner can accept this session');
        }

        // Can only accept if status is pending
        if (session.status !== 'pending') {
            throw new Error(`Cannot accept a session with status: ${session.status}`);
        }

        session.status = 'accepted';
        await session.save();
        await session.populate('learner mentor', '-password');

        return session;
    }

    /**
     * Learner rejects a mentor-initiated session
     */
    async rejectSession(sessionId, learnerId, reason = '') {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Only the learner can reject their own session
        if (session.learner.toString() !== learnerId.toString()) {
            throw new Error('Only the learner can reject this session');
        }

        // Can only reject if status is pending
        if (session.status !== 'pending') {
            throw new Error(`Cannot reject a session with status: ${session.status}`);
        }

        session.status = 'cancelled';
        session.cancelledAt = new Date();
        session.cancelledBy = learnerId;
        session.cancellationReason = reason || 'Rejected by learner';

        await session.save();
        await session.populate('learner mentor', '-password');

        return session;
    }

    /**
     * Helper: Update learner progress
     */
    async updateLearnerProgress(learnerId, skill, durationMinutes) {
        let progress = await Progress.findOne({ learner: learnerId, skill });

        if (!progress) {
            progress = new Progress({
                learner: learnerId,
                skill,
                totalSessionsAttended: 1,
                totalHoursLearned: durationMinutes / 60,
                lastSessionDate: new Date()
            });
        } else {
            progress.totalSessionsAttended += 1;
            progress.totalHoursLearned += durationMinutes / 60;
            progress.lastSessionDate = new Date();

            // Auto-progress level based on hours
            if (progress.totalHoursLearned >= 50) {
                progress.currentLevel = 'expert';
            } else if (progress.totalHoursLearned >= 30) {
                progress.currentLevel = 'advanced';
            } else if (progress.totalHoursLearned >= 15) {
                progress.currentLevel = 'intermediate';
            } else if (progress.totalHoursLearned >= 5) {
                progress.currentLevel = 'elementary';
            }
        }

        await progress.save();
        return progress;
    }

    /**
     * Reschedule a session
     */
    async rescheduleSession(sessionId, userId, rescheduleData) {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Verify user is part of the session
        const isLearner = session.learner.toString() === userId;
        const isMentor = session.mentor.toString() === userId;

        if (!isLearner && !isMentor) {
            throw new Error('Unauthorized to reschedule this session');
        }

        // Cannot reschedule if already completed or cancelled
        if (['completed', 'cancelled'].includes(session.status)) {
            throw new Error(`Cannot reschedule a ${session.status} session`);
        }

        // Update session details
        const newScheduledDate = new Date(`${rescheduleData.newDate}T${rescheduleData.newTime}`);
        session.scheduledDate = newScheduledDate;
        session.rescheduledAt = new Date();
        session.rescheduledBy = userId;
        session.rescheduleReason = rescheduleData.reason;

        // Reset status to scheduled if it was accepted
        if (session.status === 'accepted') {
            session.status = 'scheduled';
        }

        await session.save();
        await session.populate('learner mentor rescheduledBy', '-password');

        return session;
    }

    /**
     * Generate meeting link for session
     */
    async generateMeetingLink(sessionId, mentorId) {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Only mentor can generate meeting link
        if (session.mentor.toString() !== mentorId) {
            throw new Error('Only the mentor can generate meeting links');
        }

        // Cannot generate link for completed or cancelled sessions
        if (['completed', 'cancelled'].includes(session.status)) {
            throw new Error(`Cannot generate meeting link for ${session.status} session`);
        }

        // Generate a unique meeting link
        const meetingId = `SS${session._id.toString().slice(-8)}${Date.now().toString().slice(-4)}`;
        session.meetingLink = `https://meet.skillswap.plus/${meetingId}`;
        session.meetingPlatform = 'SkillSwap Meet';
        session.meetingGeneratedAt = new Date();

        await session.save();
        await session.populate('learner mentor', '-password');

        return session;
    }

    /**
     * Get sessions for a specific mentor
     */
    async getMentorSessions(mentorId) {
        const sessions = await Session.find({ mentor: mentorId })
            .populate('learner mentor', '-password')
            .sort({ scheduledDate: -1 });

        return sessions;
    }
}

module.exports = new SessionService();
