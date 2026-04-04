const mongoose = require('mongoose');

const assessmentQuestionSchema = new mongoose.Schema({
    assessment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true,
        index: true,
    },
    program: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
        required: true,
        index: true,
    },
    questionType: {
        type: String,
        enum: ['mcq', 'short'],
        required: true,
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
        index: true,
    },
    competency: {
        type: String,
        default: 'core-understanding',
    },
    prompt: {
        type: String,
        required: true,
    },
    options: [{ type: String }],
    correctAnswer: {
        type: String,
        required: true,
    },
    keywords: [{ type: String, trim: true }],
    points: {
        type: Number,
        default: 10,
        min: 1,
    },
}, {
    timestamps: true,
    collection: 'assessment_questions',
});

module.exports = mongoose.model('AssessmentQuestion', assessmentQuestionSchema);
