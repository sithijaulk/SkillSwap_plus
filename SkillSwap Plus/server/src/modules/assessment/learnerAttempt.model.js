const mongoose = require('mongoose');

const attemptQuestionSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    questionType: { type: String, enum: ['mcq', 'short'], required: true },
    prompt: { type: String, required: true },
    options: [{ type: String }],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    competency: { type: String, default: 'core-understanding' },
    points: { type: Number, default: 10 },
    answerKey: { type: String, required: true },
    keywords: [{ type: String }],
}, { _id: false });

const attemptTaskSchema = new mongoose.Schema({
    taskId: { type: mongoose.Schema.Types.ObjectId, required: true },
    taskType: { type: String, enum: ['coding', 'analysis', 'design', 'implementation'], default: 'analysis' },
    prompt: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    competency: { type: String, default: 'task-execution' },
    points: { type: Number, default: 20 },
    expectedKeywords: [{ type: String }],
    testCases: [
        {
            input: { type: String, default: '' },
            expectedContains: { type: String, default: '' },
        },
    ],
}, { _id: false });

const responseSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    answer: { type: String, default: '' },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
}, { _id: false });

const learnerAttemptSchema = new mongoose.Schema({
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
    assessment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true,
    },
    status: {
        type: String,
        enum: ['in_progress', 'submitted', 'graded', 'finalized'],
        default: 'in_progress',
        index: true,
    },
    questionSet: [attemptQuestionSchema],
    taskSet: [attemptTaskSchema],
    questionResponses: [responseSchema],
    taskResponses: [responseSchema],
    qaScorePercent: { type: Number, default: 0 },
    taskScorePercent: { type: Number, default: 0 },
    weightedScore: { type: Number, default: 0 },
    grade: { type: String, default: 'F' },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    completionTimeMinutes: { type: Number, default: 0 },
    report: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AssessmentReport',
    },
}, {
    timestamps: true,
    collection: 'learner_attempts',
});

learnerAttemptSchema.index({ learner: 1, program: 1, status: 1 });

module.exports = mongoose.model('LearnerAttempt', learnerAttemptSchema);
