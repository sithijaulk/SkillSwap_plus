const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        default: 'Mock Bank Transfer'
    },
    earnings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MentorEarning'
    }],
    processedAt: {
        type: Date
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const Payout = mongoose.model('Payout', payoutSchema);

module.exports = Payout;
