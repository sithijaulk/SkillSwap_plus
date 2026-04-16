const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    actionType: {
        type: String,
        enum: ['payment_processed', 'payout_processed', 'earnings_updated', 'adjustment_made'],
        required: true
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetMentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    amount: {
        type: Number
    },
    description: {
        type: String
    },
    details: {
        type: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;

