const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
    // Setting key (unique identifier)
    key: {
        type: String,
        required: [true, 'Setting key is required'],
        unique: true,
        uppercase: true,
        enum: [
            'CANCELLATION_WINDOW_HOURS',
            'PAID_SESSION_LIMIT_PER_MENTOR_DAY',
            'MAX_SESSIONS_PER_DAY_MENTEE',
            'MIN_REPUTATION_FOR_MENTORSHIP',
            'MIN_RATING_FOR_VERIFIED_BADGE',
            'COMPLETION_RATE_THRESHOLD_PERCENT',
            'SKILL_EXCHANGE_DURATION_MIN',
            'SKILL_EXCHANGE_DURATION_MAX',
            'PAID_SESSION_DURATION_MIN',
            'PAID_SESSION_DURATION_MAX',
            'FEEDBACK_SUBMISSION_DEADLINE_DAYS',
            'DISPUTE_RESOLUTION_TIME_DAYS',
            'INACTIVITY_SUSPENSION_DAYS',
            'CONTENT_AUTO_HIDE_REPORT_THRESHOLD',
            'MENTOR_VERIFICATION_REQUIRED',
            'PLATFORM_COMMISSION_PERCENTAGE'
        ]
    },

    // Current value
    value: mongoose.Schema.Types.Mixed,

    // Value type for validation
    type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'array', 'date'],
        required: true
    },

    // Category for UI organization
    category: {
        type: String,
        enum: ['sessions', 'quality', 'safety', 'payments', 'community', 'general'],
        required: true
    },

    // Human-readable description
    description: {
        type: String,
        required: true
    },

    // Valid range or options
    validationRules: {
        min: Number,
        max: Number,
        allowedValues: [mongoose.Schema.Types.Mixed]
    },

    // Who modified it
    modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Previous values for history
    changeHistory: [{
        previousValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        changedBy: mongoose.Schema.Types.ObjectId,
        changedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Prevent changing the key
systemSettingsSchema.pre('findByIdAndUpdate', function (next) {
    if (this._update.$set && this._update.$set.key) {
        const err = new Error('Cannot modify the setting key');
        err.statusCode = 400;
        return next(err);
    }
    next();
});

// Index
systemSettingsSchema.index({ key: 1 });
systemSettingsSchema.index({ category: 1 });

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

module.exports = SystemSettings;
