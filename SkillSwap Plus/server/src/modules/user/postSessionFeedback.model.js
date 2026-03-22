const mongoose = require('mongoose');

const postSessionFeedbackSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'sessionId is required'],
      index: true,
    },
    learnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'learnerId is required'],
      index: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'mentorId is required'],
      index: true,
    },

    rating: {
      type: Number,
      required: [true, 'rating is required'],
      min: [1, 'rating must be between 1 and 5'],
      max: [5, 'rating must be between 1 and 5'],
    },
    writtenReview: {
      type: String,
      required: [true, 'writtenReview is required'],
      trim: true,
      maxlength: [1000, 'writtenReview cannot exceed 1000 characters'],
    },
    wasHelpful: {
      type: Boolean,
      required: [true, 'wasHelpful is required'],
    },
    wouldRecommend: {
      type: Boolean,
      required: [true, 'wouldRecommend is required'],
    },
    feedbackTags: {
      type: [String],
      validate: {
        validator: function (arr) {
          return Array.isArray(arr) && arr.length > 0;
        },
        message: 'feedbackTags must have at least one tag',
      },
      required: [true, 'feedbackTags is required'],
    },
    sessionDifficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: [true, 'sessionDifficulty is required'],
    },

    isAnonymous: {
      type: Boolean,
      default: false,
    },
    improvementSuggestion: {
      type: String,
      trim: true,
      maxlength: [1000, 'improvementSuggestion cannot exceed 1000 characters'],
      default: '',
    },

    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Only one feedback per session per learner
postSessionFeedbackSchema.index({ sessionId: 1, learnerId: 1 }, { unique: true });

const PostSessionFeedback = mongoose.model('PostSessionFeedback', postSessionFeedbackSchema);

module.exports = PostSessionFeedback;
