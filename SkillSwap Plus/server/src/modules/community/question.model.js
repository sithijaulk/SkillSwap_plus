const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    // Author
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Author is required']
    },

    // Question Content
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [10, 'Title must be at least 10 characters'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    body: {
        type: String,
        required: [true, 'Question body is required'],
        minlength: [20, 'Question must be at least 20 characters'],
        maxlength: [2000, 'Question cannot exceed 2000 characters']
    },

    // Tags and Categorization
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    subject: {
        type: String,
        enum: ['mathematics', 'physics', 'chemistry', 'biology', 'programming', 'languages',
            'engineering', 'business', 'arts', 'other'],
        required: true
    },
    topicChannel: {
        type: String,
        enum: ['General', 'Academic Support', 'Skill Exchange', 'Career Guidance', 'Project Collaboration', 'Research Discussion', 'Exam Prep', 'Student Life'],
        default: 'General'
    },
    images: [{
        url: String, // For cloud/url
        filePath: String, // For local PC upload
        caption: String
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Status and Metadata
    status: {
        type: String,
        enum: ['open', 'answered', 'closed'],
        default: 'open'
    },
    views: {
        type: Number,
        default: 0
    },

    // Voting
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    downvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    voteScore: {
        type: Number,
        default: 0
    },

    // Accepted Answer
    acceptedAnswer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Answer',
        default: null
    },

    // Answers Count
    answerCount: {
        type: Number,
        default: 0
    },

    // Moderation
    isFlagged: {
        type: Boolean,
        default: false
    },
    flagReasons: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        flaggedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Edit History
    editedAt: Date,
    editHistory: [{
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        editedAt: {
            type: Date,
            default: Date.now
        },
        previousTitle: String,
        previousBody: String
    }],
    // Comments
    comments: [{
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: String,
        isMarkedByMentor: {
            type: Boolean,
            default: false
        },
        markedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        markedAt: {
            type: Date,
            default: null
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Indexes for efficient queries
questionSchema.index({ author: 1 });
questionSchema.index({ subject: 1, status: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ voteScore: -1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ title: 'text', body: 'text', tags: 'text' });

// Update vote score on save
questionSchema.pre('save', function (next) {
    this.voteScore = this.upvotes.length - this.downvotes.length;
    next();
});

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
