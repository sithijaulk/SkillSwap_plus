const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    evidence: String,
    status: {
        type: String,
        enum: ['Pending', 'Reviewing', 'Resolved', 'Dismissed'],
        default: 'Pending'
    },
    resolution: String
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
