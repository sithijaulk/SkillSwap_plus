const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    // Session Reference
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: [true, 'Session is required']
    },

    // Parties
    rater: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Rater is required']
    },
    ratee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Ratee is required']
    },

    // Rating Metrics
    overallRating: {
        type: Number,
        required: [true, 'Overall rating is required'],
        min: [1, 'Rating must be between 1 and 5'],
        max: [5, 'Rating must be between 1 and 5']
    },

    // Detailed Ratings (for mentors)
    knowledgeRating: {
        type: Number,
        min: 1,
        max: 5
    },
    communicationRating: {
        type: Number,
        min: 1,
        max: 5
    },
    professionalismRating: {
        type: Number,
        min: 1,
        max: 5
    },
    preparednessRating: {
        type: Number,
        min: 1,
        max: 5
    },

    // Review
    review: {
        type: String,
        maxlength: [500, 'Review cannot exceed 500 characters'],
        trim: true
    },

    // Tags
    tags: [{
        type: String,
        enum: ['helpful', 'knowledgeable', 'patient', 'clear', 'prepared', 'professional', 'punctual', 'engaging']
    }],

    // Recommendations
    wouldRecommend: {
        type: Boolean,
        default: true
    },

    // Status
    isPublic: {
        type: Boolean,
        default: true
    },

    // Moderation
    isFlagged: {
        type: Boolean,
        default: false
    },
    flagReason: String
}, {
    timestamps: true
});

// Index for efficient queries
ratingSchema.index({ session: 1 }, { unique: true }); // One rating per session
ratingSchema.index({ ratee: 1 });
ratingSchema.index({ rater: 1 });
ratingSchema.index({ overallRating: -1 });

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating;
