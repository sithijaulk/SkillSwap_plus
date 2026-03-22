const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    // Reporter
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reporter is required']
    },

    // Reported Entity
    reportedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reportedContent: {
        contentType: {
            type: String,
            enum: ['session', 'question', 'answer', 'rating', 'feedback'],
            default: null
        },
        contentId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        }
    },

    // Report Details
    type: {
        type: String,
        enum: ['user-misconduct', 'inappropriate-content', 'spam', 'harassment',
            'academic-dishonesty', 'payment-dispute', 'quality-issue', 'other'],
        required: true
    },
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        maxlength: 200
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        maxlength: 1000
    },

    // Evidence
    evidence: [{
        type: String  // URLs or file paths
    }],

    // Priority
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'under-review', 'resolved', 'dismissed', 'escalated'],
        default: 'pending'
    },

    // Admin Actions
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reviewedAt: Date,
    resolvedAt: Date,

    // Admin Response
    adminNotes: {
        type: String,
        maxlength: 1000
    },
    resolution: {
        type: String,
        enum: ['warning-issued', 'content-removed', 'user-suspended', 'user-banned',
            'no-action', 'refund-issued', 'mediation-completed'],
        default: null
    },
    resolutionDetails: {
        type: String,
        maxlength: 500
    },

    // Follow-up
    requiresFollowUp: {
        type: Boolean,
        default: false
    },
    followUpDate: Date,

    // Communication Log
    communications: [{
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        message: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Indexes
reportSchema.index({ reporter: 1 });
reportSchema.index({ reportedUser: 1 });
reportSchema.index({ status: 1, priority: -1 });
reportSchema.index({ assignedTo: 1 });
reportSchema.index({ createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
