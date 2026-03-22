const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['video', 'pdf', 'link', 'other'],
        default: 'link'
    },
    url: {
        type: String,
        required: true
    },
    description: String,
    category: String,
    views: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Material', materialSchema);
