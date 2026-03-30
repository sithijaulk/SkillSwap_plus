const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    // Session Parties
    learner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Learner is required']
    },
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Mentor is required']
    },
    sourcePost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        default: null
    },

    // Session Details
    skill: {
        type: String,
        required: [true, 'Skill is required'],
        trim: true
    },
    topic: {
        type: String,
        required: [true, 'Topic is required'],
        trim: true
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },

    // Scheduling
    scheduledDate: {
        type: Date,
        required: [true, 'Scheduled date is required']
    },
    preparationDate: {
        type: Date,
        default: null
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [15, 'Minimum duration is 15 minutes'],
        max: [240, 'Maximum duration is 4 hours']
    },

    // Session Type and Status
    sessionType: {
        type: String,
        enum: ['skill_exchange', 'paid'],
        required: [true, 'Session type is required'],
        default: 'skill_exchange'
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'scheduled', 'live', 'completed', 'cancelled', 'disputed'],
        default: 'pending'
    },

    // Payment Information (Mock/Test)
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'failed'],
        default: 'pending'
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    paymentMethod: {
        type: String,
        enum: ['test_card', 'test_wallet', 'test_bank'],
        default: 'test_card'
    },
    transactionId: {
        type: String,
        default: null
    },

    // Session Outcome
    completedAt: {
        type: Date
    },
    cancelledAt: {
        type: Date
    },
    cancellationReason: {
        type: String,
        maxlength: 300
    },
    professionalEvaluation: {
        professional: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        qualityScore: { type: Number, min: 1, max: 5 },
        feedback: String,
        learningOutcomes: [String],
        evaluatedAt: Date
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Notes
    learnerNotes: {
        type: String,
        maxlength: 500
    },
    mentorNotes: {
        type: String,
        maxlength: 500
    },

    // Meeting Information
    meetingLink: {
        type: String
    },
    meetingPlatform: {
        type: String,
        enum: ['zoom', 'meet', 'teams', 'in-person', 'other'],
        default: 'zoom'
    }
}, {
    timestamps: true
});

// Index for efficient queries
sessionSchema.index({ learner: 1, status: 1 });
sessionSchema.index({ mentor: 1, status: 1 });
sessionSchema.index({ scheduledDate: 1 });

// Virtual for session duration in hours
sessionSchema.virtual('durationHours').get(function () {
    return this.duration / 60;
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
