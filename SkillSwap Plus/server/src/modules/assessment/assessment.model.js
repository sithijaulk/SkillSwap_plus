const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
    program: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
        required: true,
        index: true,
    },
    knowledgeBase: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProgramKnowledge',
        required: true,
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active',
        index: true,
    },
    version: {
        type: Number,
        default: 1,
    },
    generationMode: {
        type: String,
        enum: ['rule-based', 'hybrid-ai'],
        default: 'rule-based',
    },
    questionPoolCount: {
        type: Number,
        default: 0,
    },
    taskPoolCount: {
        type: Number,
        default: 0,
    },
    meta: {
        aiEnhanced: { type: Boolean, default: false },
        promptHash: { type: String, default: '' },
    },
}, {
    timestamps: true,
    collection: 'assessments',
});

module.exports = mongoose.model('Assessment', assessmentSchema);
