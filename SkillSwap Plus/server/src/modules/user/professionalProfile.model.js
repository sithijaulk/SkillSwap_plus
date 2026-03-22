const mongoose = require('mongoose');

const professionalProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    institution: {
        type: String,
        required: [true, 'Institution name is required'],
        trim: true
    },
    designation: {
        type: String,
        required: [true, 'Designation is required'], // Professor, Lecturer, etc.
        trim: true
    },
    credentials: [{
        title: String,
        issuer: String,
        year: Number
    }],
    areasOfExpertise: [{
        type: String,
        trim: true
    }],
    monitoringSettings: {
        autoObserveWeakPerformers: { type: Boolean, default: true },
        alertThresholdMPS: { type: Number, default: 3.0 }
    },
    stats: {
        mentorsVerified: { type: Number, default: 0 },
        recommendationsGiven: { type: Number, default: 0 },
        sessionsEvaluated: { type: Number, default: 0 }
    },
    monitoredUsers: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        addedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

const ProfessionalProfile = mongoose.model('ProfessionalProfile', professionalProfileSchema);

module.exports = ProfessionalProfile;
