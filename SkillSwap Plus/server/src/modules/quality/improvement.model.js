const mongoose = require('mongoose');

const improvementSchema = new mongoose.Schema({
    // User Reference
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
    },

    // Recommendation Type
    type: {
        type: String,
        enum: ['skill', 'communication', 'professionalism', 'time-management', 'engagement', 'general'],
        required: true
    },

    // Recommendation Details
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        maxlength: 500
    },

    // Priority
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },

    // Source of Recommendation
    source: {
        type: String,
        enum: ['automated', 'admin', 'feedback-analysis'],
        default: 'automated'
    },

    // Metrics that triggered this
    triggerMetrics: {
        averageRating: Number,
        totalFeedbacks: Number,
        commonIssues: [String]
    },

    // Action Items
    actionItems: [{
        item: String,
        isCompleted: {
            type: Boolean,
            default: false
        },
        completedAt: Date
    }],

    // Status
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'dismissed'],
        default: 'pending'
    },

    // User Response
    userNotes: {
        type: String,
        maxlength: 300
    },
    isDismissed: {
        type: Boolean,
        default: false
    },
    dismissedAt: Date,

    // Tracking
    viewedAt: Date,
    startedAt: Date,
    completedAt: Date
}, {
    timestamps: true
});

// Index for efficient queries
improvementSchema.index({ user: 1, status: 1 });
improvementSchema.index({ priority: -1 });
improvementSchema.index({ type: 1 });

const ImprovementRecommendation = mongoose.model('ImprovementRecommendation', improvementSchema);

module.exports = ImprovementRecommendation;
