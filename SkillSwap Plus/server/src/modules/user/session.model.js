const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    // Session Parties
    learner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null  // Optional for group sessions
    },
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null  // Optional for group sessions created by other mentors
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null  // Mentor/creator for group sessions
    },
    sourcePost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        default: null
    },
    
    // Group Session Fields
    isGroupSession: {
        type: Boolean,
        default: false  // true for workshops/group classes
    },
    capacity: {
        type: Number,
        default: null,  // null for unlimited or specific capacity
        min: [1, 'Capacity must be at least 1']
    },
    currentParticipantsCount: {
        type: Number,
        default: 0
    },
    tags: [{
        type: String,
        trim: true
    }],
    sessionCategory: {
        type: String,
        enum: ['workshop', 'masterclass', 'group_class', 'individual_session', 'webinar'],
        default: 'group_class'
    },
    coverImage: {
        type: String,
        default: null
    },

    // Session Details
    program: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
        default: null,
        index: true,
    },
    skill: {
        type: String,
        required: false,
        default: 'General'
    },
    topic: {
        type: String,
        required: [true, 'Topic is required'],
        trim: true
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },

    // Scheduling
    scheduledDate: {
        type: Date,
        required: [true, 'Scheduled date is required']
    },
    startTime: {
        type: String,  // HH:mm format
        default: null
    },
    endTime: {
        type: String,  // HH:mm format
        default: null
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
        enum: ['skill_exchange', 'paid', 'free', 'workshop', 'masterclass'],
        required: [true, 'Session type is required'],
        default: 'free'
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'pending', 'accepted', 'scheduled', 'live', 'completed', 'cancelled', 'disputed'],
        default: 'scheduled'
    },

    // Payment Information (Mock/Test)
    paymentStatus: {
        type: String,
        enum: ['not_required', 'pending', 'paid', 'refunded', 'failed'],
        default: 'not_required'
    },
    amount: {
        type: Number,
        default: 0,  // 0 for free sessions
        min: [0, 'Amount cannot be negative']
    },
    paymentMethod: {
        type: String,
        enum: ['test_card', 'test_wallet', 'test_bank', 'not_required'],
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
        enum: ['zoom', 'meet', 'teams', 'in-person', 'other', 'SkillSwap Meet'],
        default: 'zoom'
    },
    meetingGeneratedAt: {
        type: Date
    },

    // Reschedule Information
    rescheduledAt: {
        type: Date
    },
    rescheduledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rescheduleReason: {
        type: String,
        maxlength: 300
    },

    // Additional fields for enhanced functionality
    date: {
        type: Date
    },
    time: {
        type: String
    },
    message: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Index for efficient queries
sessionSchema.index({ learner: 1, status: 1 });
sessionSchema.index({ mentor: 1, status: 1 });
sessionSchema.index({ creator: 1, status: 1 });  // For mentor's created group sessions
sessionSchema.index({ scheduledDate: 1 });
sessionSchema.index({ isGroupSession: 1 });  // For filtering group vs individual sessions
sessionSchema.index({ status: 1, scheduledDate: 1 });  // For Programs page
sessionSchema.index({ sessionCategory: 1 });  // For filtering by category

// Virtual for session duration in hours
sessionSchema.virtual('durationHours').get(function () {
    return this.duration / 60;
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
