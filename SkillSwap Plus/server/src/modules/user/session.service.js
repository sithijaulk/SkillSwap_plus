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

        // Compute startTime and endTime from scheduledDate if missing
        if (!sessionData.startTime && sessionData.scheduledDate) {
            const dateObj = new Date(sessionData.scheduledDate);
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            sessionData.startTime = `${hours}:${minutes}`;
        }

        if (!sessionData.endTime && sessionData.startTime && sessionData.duration) {
            const [h, m] = sessionData.startTime.split(':').map(Number);
            const totalMins = h * 60 + m + parseInt(sessionData.duration);
            const endH = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
            const endM = String(totalMins % 60).padStart(2, '0');
            sessionData.endTime = `${endH}:${endM}`;
        }

        // Validations
        this.validateSessionDateTime(sessionData.scheduledDate, sessionData.startTime, sessionData.endTime);
        await this.checkSessionConflict(sessionData.mentor, sessionData.scheduledDate, sessionData.startTime, sessionData.endTime);
        await this.checkSessionConflict(sessionData.learner, sessionData.scheduledDate, sessionData.startTime, sessionData.endTime);

        // Create session
        const session = new Session({
            ...sessionData,
            status: 'scheduled'
        });
        await session.save();

        // Add to participants for both mentor and learner to support calendar joining checks
        const SessionParticipant = require('./sessionParticipant.model');
        await SessionParticipant.create({ session: session._id, participant: session.learner, role: 'learner', status: 'joined' });
        await SessionParticipant.create({ session: session._id, participant: session.mentor, role: 'mentor', status: 'joined' });

        // Populate references
        await session.populate('learner mentor', '-password');

        return session;
    }

    /**
     * Get session by ID
     */
    async getSessionById(sessionId) {
        const session = await Session.findById(sessionId)
            .populate('learner mentor creator', '-password')
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
            .populate('learner mentor skill', '-password')
            .sort({ scheduledDate: -1 });

        return sessions;
    }

    /**
     * Create a group session (by mentor)
     */
    async createGroupSession(groupSessionData, creatorId) {
        // Validate creator is a mentor
        const creator = await User.findById(creatorId);
        if (!creator || creator.role !== 'mentor') {
            throw new Error('Only mentors can create group sessions');
        }

        if (!creator.isVerified) {
            throw new Error('Mentor must be verified to create sessions');
        }

        // Validate dates and times
        this.validateSessionDateTime(groupSessionData.scheduledDate, groupSessionData.startTime, groupSessionData.endTime);
        await this.checkSessionConflict(creatorId, groupSessionData.scheduledDate, groupSessionData.startTime, groupSessionData.endTime);

        // Create the group session
        const sessionData = {
            ...groupSessionData,
            creator: creatorId,
            isGroupSession: true,
            status: 'published',  // Published for immediate visibility
            learner: null,
            mentor: null
        };

        if (groupSessionData.sessionType === 'free' || groupSessionData.sessionType === 'workshop') {
            sessionData.amount = 0;
            sessionData.paymentStatus = 'not_required';
        }

        const session = new Session(sessionData);
        await session.save();
        await session.populate('creator', 'firstName lastName profileImage');

        return session;
    }

    /**
     * Validate session date and time (must be future)
     */
    validateSessionDateTime(scheduledDate, startTime, endTime) {
        const sessionDate = new Date(scheduledDate);
        const now = new Date();
        
        // Remove time from date comparison
        now.setHours(0, 0, 0, 0);
        sessionDate.setHours(0, 0, 0, 0);

        // Check if date is in the future
        if (sessionDate < now) {
            throw new Error('Session date must be in the future');
        }

        // If same day, validate time
        if (sessionDate.getTime() === now.getTime() && startTime) {
            const [hours, minutes] = startTime.split(':').map(Number);
            const sessionTime = new Date();
            sessionTime.setHours(hours, minutes, 0, 0);
            
            const currentTime = new Date();
            if (sessionTime <= currentTime) {
                throw new Error('Session time must be in the future');
            }
        }

        // Validate start time < end time
        if (startTime && endTime) {
            const [startHours, startMinutes] = startTime.split(':').map(Number);
            const [endHours, endMinutes] = endTime.split(':').map(Number);
            
            const startInMinutes = startHours * 60 + startMinutes;
            const endInMinutes = endHours * 60 + endMinutes;
            
            if (startInMinutes >= endInMinutes) {
                throw new Error('Start time must be before end time');
            }
        }
    }

    /**
     * Join a session (for learners and mentors)
     */
    async joinSession(sessionId, participantId) {
        const SessionParticipant = require('./sessionParticipant.model');
        
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const participant = await User.findById(participantId);
        if (!participant) {
            throw new Error('User not found');
        }

        // Check if session is published/scheduled
        if (!['published', 'scheduled'].includes(session.status)) {
            throw new Error('Session is not available for joining');
        }

        // Check if already joined
        const alreadyJoined = await SessionParticipant.findOne({
            session: sessionId,
            participant: participantId
        });

        if (alreadyJoined) {
            throw new Error('You have already joined this session');
        }

        // Check capacity
        if (session.capacity) {
            const currentCount = await SessionParticipant.countDocuments({
                session: sessionId,
                status: 'joined'
            });

            if (currentCount >= session.capacity) {
                throw new Error('Session is full');
            }
        }

        // Check for time conflicts (user shouldn't have overlapping sessions)
        await this.checkSessionConflict(participantId, session.scheduledDate, session.startTime, session.endTime);

        // Handle payment for paid sessions
        let paymentStatus = 'not_required';
        if (session.sessionType === 'paid' && session.amount > 0) {
            paymentStatus = 'pending';  // Requires payment before joining
            // In real implementation, process payment here
        }

        // Create participant record
        const sessionParticipant = new SessionParticipant({
            session: sessionId,
            participant: participantId,
            role: participant.role === 'mentor' ? 'mentor' : 'learner',
            status: 'joined',
            paymentStatus
        });

        await sessionParticipant.save();

        // Increment participant count
        session.currentParticipantsCount = (session.currentParticipantsCount || 0) + 1;
        await session.save();

        await sessionParticipant.populate('participant', 'firstName lastName profileImage role');
        return sessionParticipant;
    }

    /**
     * Check for session time conflicts
     */
    async checkSessionConflict(userId, sessionDate, startTime, endTime) {
        const SessionParticipant = require('./sessionParticipant.model');

        if (!startTime || !endTime) {
            return;
        }

        const requestedDate = new Date(sessionDate);
        const startOfDay = new Date(requestedDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

        const participantRecords = await SessionParticipant.find({
            participant: userId,
            status: 'joined'
        }).populate('session', 'scheduledDate startTime endTime status');

        for (const record of participantRecords) {
            const existingSession = record.session;
            if (!existingSession || ['cancelled', 'completed'].includes(existingSession.status)) {
                continue;
            }

            const existingDate = new Date(existingSession.scheduledDate);
            if (existingDate >= startOfDay && existingDate < endOfDay) {
                if (existingSession.startTime && existingSession.endTime) {
                    const [requestedStartHours, requestedStartMinutes] = startTime.split(':').map(Number);
                    const [requestedEndHours, requestedEndMinutes] = endTime.split(':').map(Number);
                    const [existingStartHours, existingStartMinutes] = existingSession.startTime.split(':').map(Number);
                    const [existingEndHours, existingEndMinutes] = existingSession.endTime.split(':').map(Number);

                    const requestedStart = requestedStartHours * 60 + requestedStartMinutes;
                    const requestedEnd = requestedEndHours * 60 + requestedEndMinutes;
                    const existingStart = existingStartHours * 60 + existingStartMinutes;
                    const existingEnd = existingEndHours * 60 + existingEndMinutes;

                    if (!(requestedEnd <= existingStart || requestedStart >= existingEnd)) {
                        throw new Error('You have a conflicting session at this time');
                    }
                }
            }
        }
    }

    /**
     * Get all participants in a session
     */
    async getSessionParticipants(sessionId) {
        const SessionParticipant = require('./sessionParticipant.model');
        return SessionParticipant.getSessionParticipants(sessionId);
    }

    /**
     * Get sessions created by a mentor (for dashboard)
     */
    async getMentorCreatedSessions(mentorId, options = {}) {
        const query = { creator: mentorId, isGroupSession: true };
        
        const sessions = await Session.find(query)
            .populate('creator', 'firstName lastName profileImage')
            .sort({ scheduledDate: options.sort === 'asc' ? 1 : -1 })
            .limit(options.limit || 50);

        return sessions;
    }

    /**
     * Get sessions joined by a mentor (for dashboard calendar)
     */
    async getMentorJoinedSessions(mentorId, options = {}) {
        const SessionParticipant = require('./sessionParticipant.model');
        
        const participants = await SessionParticipant.find({
            participant: mentorId,
            status: 'joined'
        }).populate('session');

        const sessionIds = participants.map(p => p.session._id);
        const sessions = await Session.find({ _id: { $in: sessionIds } })
            .populate('creator', 'firstName lastName profileImage')
            .sort({ scheduledDate: -1 });

        return sessions;
    }

    /**
     * Get all sessions for Programs page
     */
    async getPublishedSessions(filters = {}) {
        const query = {
            status: { $in: ['published', 'scheduled'] },
            isGroupSession: true
        };

        if (filters.category) {
            query.sessionCategory = filters.category;
        }

        if (filters.searchText) {
            query.$or = [
                { topic: { $regex: filters.searchText, $options: 'i' } },
                { description: { $regex: filters.searchText, $options: 'i' } },
                { tags: { $in: [new RegExp(filters.searchText, 'i')] } }
            ];
        }

        const sessions = await Session.find(query)
            .populate('creator', 'firstName lastName profileImage')
            .sort({ scheduledDate: -1 });

        return sessions;
    }

    /**
     * Create session from community post
     */
    async createSessionFromPost(postId, creatorId, sessionData) {
        // Validate creator is a mentor
        const creator = await User.findById(creatorId);
        if (!creator || creator.role !== 'mentor') {
            throw new Error('Only mentors can create sessions');
        }

        // Get the community question/post
        const Question = require('../community/question.model');
        const post = await Question.findById(postId);
        if (!post) {
            throw new Error('Community post not found');
        }

        // Auto-fill from post
        const autoFilledData = {
            ...sessionData,
            topic: post.title,
            description: post.description,
            tags: post.tags,
            sourcePost: postId,
            creator: creatorId,
            isGroupSession: true,
            learner: null,
            mentor: null,
            status: 'published'
        };

        // Validate date/time
        this.validateSessionDateTime(autoFilledData.scheduledDate, autoFilledData.startTime, autoFilledData.endTime);

        const session = new Session(autoFilledData);
        await session.save();
        await session.populate('creator sourcePost', 'firstName lastName profileImage title');

        return session;
    }

    /**
     * Publish a draft session
     */
    async publishSession(sessionId, publisherId) {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (session.creator.toString() !== publisherId.toString()) {
            throw new Error('Only the session creator can publish');
        }

        if (session.status !== 'draft') {
            throw new Error('Only draft sessions can be published');
        }

        session.status = 'published';
        await session.save();

        return session;
    }

    /**
     * Get learner's joined sessions
     */
    async getLearnerJoinedSessions(learnerId, options = {}) {
        const SessionParticipant = require('./sessionParticipant.model');
        
        const participants = await SessionParticipant.find({
            participant: learnerId,
            status: 'joined'
        }).populate('session');

        const sessionIds = participants.map(p => p.session._id);
        const sessions = await Session.find({ _id: { $in: sessionIds } })
            .populate('creator mentor learner', 'firstName lastName profileImage')
            .sort({ scheduledDate: -1 });

        return sessions;
    }

    /**
     * Get sessions created by a specific mentor (group sessions)
     */
    async getMentorCreatedSessions(mentorId) {
        const sessions = await Session.find({ 
            creator: mentorId, 
            isGroupSession: true 
        })
        .populate('creator', 'firstName lastName profileImage')
        .sort({ scheduledDate: -1 });

        return sessions;
    }

    /**
     * Get sessions joined by a mentor (one-on-one sessions where they are the mentor)
     */
    async getMentorJoinedSessions(mentorId) {
        const sessions = await Session.find({ 
            mentor: mentorId, 
            isGroupSession: false 
        })
        .populate('learner skill', 'firstName lastName email title')
        .sort({ scheduledDate: -1 });

        return sessions;
    }

    /**
     * Get participants for a specific session
     */
    async getSessionParticipants(sessionId) {
        const SessionParticipant = require('./sessionParticipant.model');
        const participants = await SessionParticipant.find({ 
            session: sessionId,
            status: 'joined'
        }).populate('participant', 'firstName lastName profileImage email');

        return participants;
    }
}

module.exports = new SessionService();
