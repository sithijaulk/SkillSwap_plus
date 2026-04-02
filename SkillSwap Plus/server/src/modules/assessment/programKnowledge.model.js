const mongoose = require('mongoose');

const programMaterialSchema = new mongoose.Schema({
    title: { type: String, default: '' },
    type: { type: String, default: '' },
    url: { type: String, default: '' },
    filePath: { type: String, default: '' },
    description: { type: String, default: '' },
}, { _id: false });

const programKnowledgeSchema = new mongoose.Schema({
    program: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
        required: true,
        unique: true,
        index: true,
    },
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    skillName: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    materials: [programMaterialSchema],
    knowledgeTokens: [{ type: String, trim: true }],
    difficultyBlueprint: {
        easy: { type: Number, default: 40 },
        medium: { type: Number, default: 40 },
        hard: { type: Number, default: 20 },
    },
    sourceVersion: {
        type: Number,
        default: 1,
    },
}, {
    timestamps: true,
    collection: 'program_knowledge',
});

module.exports = mongoose.model('ProgramKnowledge', programKnowledgeSchema);
