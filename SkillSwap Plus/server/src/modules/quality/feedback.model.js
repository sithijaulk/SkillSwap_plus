const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    // Session Reference
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: [true, 'Session is required']
    },

    // Provider and Receiver
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Feedback provider is required']
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Feedback receiver is required']
    },

    // Feedback Type
    type: {
        type: String,
        enum: ['mentor-to-learner', 'learner-to-mentor', 'peer'],
        required: true
    },

    // Strengths and Areas for Improvement
    strengths: [{
        type: String,
        trim: true
    }],
    areasForImprovement: [{
        type: String,
        trim: true
    }],

    // Detailed Feedback
    whatWentWell: {
        type: String,
        maxlength: 500
    },
    whatCouldImprove: {
        type: String,
        maxlength: 500
    },
    suggestions: {
        type: String,
        maxlength: 500
    },

    // Sentiment
    sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'constructive', 'critical'],
        default: 'neutral'
    },

    // Feedback Tags for categorization
    tags: [{
        type: String,
        enum: [
            'clear-explanations',
            'on-time',
            'patient',
            'professional',
            'well-prepared',
            'engaging',
            'needs-improvement',
            'unclear-explanations',
            'late',
            'rushed',
            'unprepared',
            'dismissive'
        ]
    }],

    // Completion Verification
    isSessionCompleted: {
        type: Boolean,
        required: true,
        default: false
    },
    completionVerifiedAt: {
        type: Date,
        default: null
    },

    // Status
    isPrivate: {
        type: Boolean,
        default: false
    },
    isAcknowledged: {
        type: Boolean,
        default: false
    },
    acknowledgedAt: Date
}, {
    timestamps: true
});

// Index for efficient queries
feedbackSchema.index({ session: 1 });
feedbackSchema.index({ receiver: 1, type: 1 });
feedbackSchema.index({ provider: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
