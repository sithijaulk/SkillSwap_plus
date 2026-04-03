const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    favoriteType: {
        type: String,
        enum: ['mentor', 'skill'],
        required: true
    },
    favoriteId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true // ID of the favorited mentor or skill
    },
    notes: {
        type: String,
        default: '',
        maxlength: 500
    }
}, {
    timestamps: true
});

// Compound index to ensure unique favorites per user
favoriteSchema.index({ user: 1, favoriteType: 1, favoriteId: 1 }, { unique: true });

// Index for efficient queries
favoriteSchema.index({ user: 1, favoriteType: 1, createdAt: -1 });

const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = Favorite;