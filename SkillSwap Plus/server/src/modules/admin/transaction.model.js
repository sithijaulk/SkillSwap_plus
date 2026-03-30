const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    learner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    skill: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill'
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session'
    },
    amountPaid: {
        type: Number,
        required: true
    },
    platformFee: {
        type: Number, // 25% of amountPaid
        required: true
    },
    mentorEarning: {
        type: Number, // 75% of amountPaid
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        default: 'Mock Gateway'
    },
    completedAt: {
        type: Date
    },
    failedAt: {
        type: Date
    },
    failureReason: {
        type: String
    },
    refundedAt: {
        type: Date
    },
    refundReason: {
        type: String
    },
    refundAmount: {
        type: Number
    }
}, {
    timestamps: true
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
