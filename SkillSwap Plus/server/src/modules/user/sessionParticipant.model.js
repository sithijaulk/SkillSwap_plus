const mongoose = require('mongoose');

/**
 * SessionParticipant Model
 * Tracks users who have joined/enrolled in sessions
 */
const sessionParticipantSchema = new mongoose.Schema({
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: [true, 'Session is required']
    },
    participant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Participant is required']
    },
    role: {
        type: String,
        enum: ['learner', 'mentor', 'instructor'],
        default: 'learner'
    },
    status: {
        type: String,
        enum: ['joined', 'attended', 'absent', 'left', 'removed'],
        default: 'joined'
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    attendanceMarkedAt: {
        type: Date,
        default: null
    },
    feedback: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PostSessionFeedback',
        default: null
    },
    paymentStatus: {
        type: String,
        enum: ['not_required', 'pending', 'paid', 'refunded'],
        default: 'not_required'
    },
    amountPaid: {
        type: Number,
        default: 0,
        min: [0, 'Amount cannot be negative']
    },
    transactionId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Compound index for query optimization
sessionParticipantSchema.index({ session: 1, participant: 1 }, { unique: true });
sessionParticipantSchema.index({ participant: 1, status: 1 });
sessionParticipantSchema.index({ session: 1, status: 1 });

// Method to check if participant has attended
sessionParticipantSchema.methods.hasAttended = function() {
    return this.status === 'attended';
};

// Static method to get participants for a session
sessionParticipantSchema.statics.getSessionParticipants = async function(sessionId) {
    return this.find({ session: sessionId, status: 'joined' })
        .populate('participant', 'firstName lastName profileImage role')
        .exec();
};

const SessionParticipant = mongoose.model('SessionParticipant', sessionParticipantSchema);

module.exports = SessionParticipant;
