const mongoose = require('mongoose');

const assessmentReportSchema = new mongoose.Schema({
    learner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    program: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
        required: true,
        index: true,
    },
    assessment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true,
    },
    attempt: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LearnerAttempt',
        required: true,
        unique: true,
    },
    learnerName: { type: String, required: true },
    programName: { type: String, required: true },
    score: { type: Number, default: 0 },
    qaScorePercent: { type: Number, default: 0 },
    taskScorePercent: { type: Number, default: 0 },
    grade: { type: String, default: 'F' },
    strengthAreas: [{ type: String }],
    weakAreas: [{ type: String }],
    taskPerformance: [
        {
            taskPrompt: String,
            score: Number,
            maxScore: Number,
            competency: String,
        },
    ],
    completionTimeMinutes: { type: Number, default: 0 },
    aiFeedbackSummary: { type: String, default: '' },
    isFinalized: { type: Boolean, default: false },
    finalizedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    finalizedAt: { type: Date, default: null },
    finalizedGrade: { type: String, default: null },
    supervisorNotes: { type: String, default: '' },
    hasSupervisorMarkAdjustments: { type: Boolean, default: false },
    markAdjustedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    markAdjustedAt: { type: Date, default: null },
}, {
    timestamps: true,
    collection: 'assessment_reports',
});

assessmentReportSchema.index({ learner: 1, program: 1 });

module.exports = mongoose.model('AssessmentReport', assessmentReportSchema);
