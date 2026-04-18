const mongoose = require('mongoose');

const mentorEvaluationReportSchema = new mongoose.Schema(
    {
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
        programTitle: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        reportPeriod: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        teachingMethodology: {
            type: String,
            required: true,
            trim: true,
            minlength: [100, 'teachingMethodology must be at least 100 characters'],
            maxlength: 4000,
        },
        courseWorkDescription: {
            type: String,
            required: true,
            trim: true,
            maxlength: 4000,
        },
        lectureMaterialsSummary: {
            type: String,
            required: true,
            trim: true,
            maxlength: 4000,
        },
        learnerProgressObservations: {
            type: String,
            required: true,
            trim: true,
            maxlength: 4000,
        },
        challengesFaced: {
            type: String,
            required: true,
            trim: true,
            maxlength: 4000,
        },
        improvementPlans: {
            type: String,
            required: true,
            trim: true,
            maxlength: 4000,
        },

        attachedMaterialUrls: {
            type: [String],
            default: [],
        },

        status: {
            type: String,
            enum: ['draft', 'submitted', 'under_review', 'evaluated'],
            default: 'submitted',
            index: true,
        },

        aiEvaluation: {
            teachingScore: { type: Number, min: 0, max: 40 },
            courseWorkScore: { type: Number, min: 0, max: 30 },
            materialsScore: { type: Number, min: 0, max: 30 },
            overallScore: { type: Number, min: 0, max: 100 },
            mpsContribution: { type: Number, min: 0, max: 5 },
            strengths: { type: [String], default: [] },
            improvementAreas: { type: [String], default: [] },
            detailedFeedback: { type: String, default: '' },
            evaluatedAt: { type: Date },
            evaluatedBy: { type: String, default: '' },
        },

        supervisorReview: {
            reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            reviewedAt: { type: Date },
            supervisorNotes: { type: String, default: '', maxlength: 3000 },
            finalMpsScore: { type: Number, min: 0, max: 5 },
            isFinalized: { type: Boolean, default: false },
        },

        submittedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true }
);

mentorEvaluationReportSchema.index({ mentor: 1, program: 1, submittedAt: -1 });

const MentorEvaluationReport = mongoose.model('MentorEvaluationReport', mentorEvaluationReportSchema);

module.exports = MentorEvaluationReport;
