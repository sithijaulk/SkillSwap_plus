const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: [
            'session_booked',
            'session_accepted',
            'session_rejected',
            'session_cancelled',
            'session_rescheduled',
            'session_completed',
            'payment_received',
            'payment_failed',
            'feedback_received',
            'session_reminder'
        ],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true // ID of related session, payment, etc.
    },
    relatedModel: {
        type: String,
        enum: ['Session', 'Payment', 'Feedback'],
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    actionUrl: {
        type: String, // URL to redirect user when clicking notification
        default: null
    }
}, {
    timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
