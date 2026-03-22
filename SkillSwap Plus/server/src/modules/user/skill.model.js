const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    type: {
        type: String,
        enum: ['skill_exchange', 'paid'],
        default: 'skill_exchange'
    },
    price: {
        type: Number,
        default: 0,
        min: [0, 'Price cannot be negative']
    },
    requiredKnowledge: {
        type: String,
        default: ''
    },
    portfolio: [{
        title: String,
        link: String,
        description: String
    }],
    materials: [{
        title: { type: String, required: true },
        type: { type: String, enum: ['video', 'pdf', 'link'], required: true },
        url: { type: String }, // For external links
        filePath: { type: String }, // For local PC uploads
        description: String
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Skill = mongoose.model('Skill', skillSchema);

module.exports = Skill;
