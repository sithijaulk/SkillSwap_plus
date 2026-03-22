const mongoose = require('mongoose');

const mentorEarningSchema = new mongoose.Schema({
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session'
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true
    },
    amount: {
        type: Number, // 75% of total
        required: true
    },
    platformFee: {
        type: Number, // 25% of total
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
    },
    payout: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payout',
        default: null
    }
}, {
    timestamps: true
});

const MentorEarning = mongoose.model('MentorEarning', mentorEarningSchema);

module.exports = MentorEarning;
