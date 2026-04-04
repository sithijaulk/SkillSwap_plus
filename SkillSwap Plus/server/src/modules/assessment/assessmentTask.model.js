const mongoose = require('mongoose');

const assessmentTaskSchema = new mongoose.Schema({
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
    taskType: {
        type: String,
        enum: ['coding', 'analysis', 'design', 'implementation'],
        default: 'analysis',
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
        index: true,
    },
    competency: {
        type: String,
        default: 'task-execution',
    },
    prompt: {
        type: String,
        required: true,
    },
    expectedKeywords: [{ type: String, trim: true }],
    testCases: [
        {
            input: { type: String, default: '' },
            expectedContains: { type: String, default: '' },
        },
    ],
    points: {
        type: Number,
        default: 20,
        min: 1,
    },
}, {
    timestamps: true,
    collection: 'assessment_tasks',
});

module.exports = mongoose.model('AssessmentTask', assessmentTaskSchema);
