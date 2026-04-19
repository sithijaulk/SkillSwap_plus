const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
    // Mentor Reference
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Mentor is required']
    },

    // Day of Week
    dayOfWeek: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: [true, 'Day of week is required']
    },

    // Time Slots
    startTime: {
        type: String,
        required: [true, 'Start time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)']
    },
    endTime: {
        type: String,
        required: [true, 'End time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)']
    },

    // Active Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Optional: Specific date overrides
    specificDate: {
        type: Date,
        default: null
    },

    // Notes
    notes: {
        type: String,
        maxlength: 200
    }
}, {
    timestamps: true
});

// Index for efficient queries
availabilitySchema.index({ mentor: 1, dayOfWeek: 1 });
availabilitySchema.index({ mentor: 1, isActive: 1 });

// Validate end time is after start time
availabilitySchema.pre('save', function (next) {
    const start = this.startTime.split(':').map(Number);
    const end = this.endTime.split(':').map(Number);

    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];

    if (endMinutes <= startMinutes) {
        next(new Error('End time must be after start time'));
    }

    next();
});

const Availability = mongoose.model('Availability', availabilitySchema);

module.exports = Availability;
