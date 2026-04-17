const mongoose = require('mongoose');

const assessmentGradeSchema = new mongoose.Schema({
    learner: {
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
    report: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AssessmentReport',
        required: true,
        unique: true,
    },
    qaWeight: { type: Number, default: 40 },
    taskWeight: { type: Number, default: 60 },
    qaScorePercent: { type: Number, default: 0 },
    taskScorePercent: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    computedGrade: { type: String, default: 'F' },
    finalGrade: { type: String, default: 'F' },
    isFinalized: { type: Boolean, default: false },
    finalizedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    finalizedAt: { type: Date, default: null },
}, {
    timestamps: true,
    collection: 'grades',
});

assessmentGradeSchema.index({ learner: 1, program: 1 });

module.exports = mongoose.model('AssessmentGrade', assessmentGradeSchema);
