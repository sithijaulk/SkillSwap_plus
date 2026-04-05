const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
    // Mentor Reference
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Mentor is required']
    },

    // Specific Date
    date: {
        type: Date,
        required: [true, 'Date is required']
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

    // Notes
    notes: {
        type: String,
        maxlength: 200
    }
}, {
    timestamps: true
});

// Index for efficient queries
availabilitySchema.index({ mentor: 1, date: 1 });
availabilitySchema.index({ mentor: 1, isActive: 1 });

// Validate end time is after start time and date is not in the past
availabilitySchema.pre('save', async function (next) {
    const start = this.startTime.split(':').map(Number);
    const end = this.endTime.split(':').map(Number);

    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];

    if (endMinutes <= startMinutes) {
        return next(new Error('End time must be after start time'));
    }

    // Ensure date is not in the past (only ignoring time of the day to avoid timezone weirdness with 12:00 AM)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reqDate = new Date(this.date);
    reqDate.setHours(0, 0, 0, 0);

    if (reqDate < today) {
        return next(new Error('Cannot create availability for a past date'));
    }

    // Check overlaps
    const existing = await mongoose.models.Availability.find({
        mentor: this.mentor,
        date: this.date,
        _id: { $ne: this._id }, // exclude self if updating
        isActive: true
    });

    for (const slot of existing) {
        const eStart = slot.startTime.split(':').map(Number);
        const eEnd = slot.endTime.split(':').map(Number);
        const slStartMins = eStart[0] * 60 + eStart[1];
        const slEndMins = eEnd[0] * 60 + eEnd[1];

        // Overlap condition checks
        if ((startMinutes >= slStartMins && startMinutes < slEndMins) || 
            (endMinutes > slStartMins && endMinutes <= slEndMins) || 
            (startMinutes <= slStartMins && endMinutes >= slEndMins)) {
            return next(new Error('Availability slot overlaps with an existing slot on this date'));
        }
    }

    next();
});

const Availability = mongoose.model('Availability', availabilitySchema);

module.exports = Availability;
