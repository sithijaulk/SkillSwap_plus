const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    // User Reference
    learner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Learner is required']
    },

    // Skill Being Learned
    skill: {
        type: String,
        required: [true, 'Skill is required'],
        trim: true
    },

    // Progress Metrics
    totalSessionsAttended: {
        type: Number,
        default: 0,
        min: 0
    },
    totalHoursLearned: {
        type: Number,
        default: 0,
        min: 0
    },

    // Progress Level
    currentLevel: {
        type: String,
        enum: ['beginner', 'elementary', 'intermediate', 'advanced', 'expert'],
        default: 'beginner'
    },

    // Goals and Milestones
    goals: [{
        title: {
            type: String,
            required: true
        },
        description: String,
        targetDate: Date,
        isCompleted: {
            type: Boolean,
            default: false
        },
        completedAt: Date
    }],

    // Performance Metrics
    averageSessionRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    consistency: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Notes
    notes: {
        type: String,
        maxlength: 1000
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Last Session
    lastSessionDate: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for efficient queries
progressSchema.index({ learner: 1, skill: 1 });
progressSchema.index({ learner: 1, isActive: 1 });

const Progress = mongoose.model('Progress', progressSchema);

module.exports = Progress;
