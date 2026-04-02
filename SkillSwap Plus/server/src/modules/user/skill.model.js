const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    type: {
        type: String,
        enum: ['free', 'paid'],
        default: 'free'
    },
    price: {
        type: Number,
        default: 0,
        min: [0, 'Price cannot be negative'],
        validate: {
            validator: function(value) {
                // Price must be 0 for free skills, greater than 0 for paid skills
                if (this.type === 'free') {
                    return value === 0;
                } else if (this.type === 'paid') {
                    return value > 0;
                }
                return true;
            },
            message: 'Price must be 0 for free skills and greater than 0 for paid skills'
        }
    },
    image: {
        type: String, // Path to uploaded image
        default: null
    },
    requiredKnowledge: {
        type: String,
        default: ''
    },
    portfolio: [{
        title: String,
        link: String,
        description: String
    }],
    materials: [{
        title: { type: String, required: true },
        type: { type: String, enum: ['video', 'pdf', 'link'], required: true },
        url: { type: String }, // For external links
        filePath: { type: String }, // For local PC uploads
        description: String
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Skill = mongoose.model('Skill', skillSchema);

module.exports = Skill;
