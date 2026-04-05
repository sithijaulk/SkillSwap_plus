const mongoose = require('mongoose');

/**
 * Earnings Model
 * Tracks mentor earnings from paid sessions
 */
const earningsSchema = new mongoose.Schema({
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Mentor is required']
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: [true, 'Session is required']
    },
    learner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Amount breakdown
    grossAmount: {
        type: Number,
        required: [true, 'Gross amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    platformFeePercentage: {
        type: Number,
        default: 25 // 25% platform fee
    },
    platformFee: {
        type: Number,
        required: true,
        min: [0, 'Platform fee cannot be negative']
    },
    netAmount: {
        type: Number,
        required: true,
        min: [0, 'Net amount cannot be negative']
    },
    // Status tracking
    status: {
        type: String,
        enum: ['pending', 'completed', 'paid', 'failed'],
        default: 'pending'
    },
    payoutStatus: {
        type: String,
        enum: ['pending', 'processed', 'rejected'],
        default: 'pending'
    },
    payoutId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payout',
        default: null
    },
    // Metadata
    description: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    // Timestamps
    earnedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    },
    paidOutAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indices for efficient queries
earningsSchema.index({ mentor: 1, status: 1 });
earningsSchema.index({ mentor: 1, createdAt: -1 });
earningsSchema.index({ session: 1 });
earningsSchema.index({ payoutStatus: 1 });

// Method to calculate net amount
earningsSchema.methods.calculateNetAmount = function() {
    this.platformFee = this.grossAmount * (this.platformFeePercentage / 100);
    this.netAmount = this.grossAmount - this.platformFee;
    return this.netAmount;
};

// Static method to get mentor's total earnings
earningsSchema.statics.getMentorTotalEarnings = async function(mentorId, status = 'completed') {
    const result = await this.aggregate([
        { $match: { mentor: mongoose.Types.ObjectId(mentorId), status } },
        {
            $group: {
                _id: null,
                totalGross: { $sum: '$grossAmount' },
                totalFee: { $sum: '$platformFee' },
                totalNet: { $sum: '$netAmount' }
            }
        }
    ]);
    return result[0] || { totalGross: 0, totalFee: 0, totalNet: 0 };
};

// Static method to get mentor's pending payout
earningsSchema.statics.getMentorPendingPayout = async function(mentorId) {
    const result = await this.aggregate([
        { $match: { mentor: mongoose.Types.ObjectId(mentorId), payoutStatus: 'pending', status: 'completed' } },
        {
            $group: {
                _id: null,
                totalPending: { $sum: '$netAmount' }
            }
        }
    ]);
    return result[0]?.totalPending || 0;
};

const Earnings = mongoose.model('Earnings', earningsSchema);

module.exports = Earnings;
