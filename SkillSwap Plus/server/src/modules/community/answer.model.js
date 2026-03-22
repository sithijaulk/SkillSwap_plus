const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    // Question Reference
    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: [true, 'Question is required']
    },

    // Author
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Author is required']
    },

    // Answer Content
    body: {
        type: String,
        required: [true, 'Answer body is required'],
        minlength: [20, 'Answer must be at least 20 characters'],
        maxlength: [2000, 'Answer cannot exceed 2000 characters']
    },

    // Status
    isAccepted: {
        type: Boolean,
        default: false
    },
    acceptedAt: Date,

    isHidden: {
        type: Boolean,
        default: false
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

    // Comments
    comments: [{
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: {
            type: String,
            maxlength: 300
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

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
        previousBody: String
    }]
}, {
    timestamps: true
});

// Indexes
answerSchema.index({ question: 1, voteScore: -1 });
answerSchema.index({ author: 1 });
answerSchema.index({ isAccepted: 1 });

// Update vote score on save
answerSchema.pre('save', function (next) {
    this.voteScore = this.upvotes.length - this.downvotes.length;
    next();
});

const Answer = mongoose.model('Answer', answerSchema);

module.exports = Answer;
