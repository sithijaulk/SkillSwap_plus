const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');

const userSchema = new mongoose.Schema({
    // Basic Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,6})+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false
    },

    // Role and Status
    role: {
        type: String,
        enum: ['learner', 'mentor', 'professional', 'admin'],
        default: 'learner'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: true
    },

    // Profile Information
    profileImage: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
        default: ''
    },
    university: {
        type: String,
        default: ''
    },
    department: {
        type: String,
        default: ''
    },
    yearOfStudy: {
        type: Number,
        min: 1,
        max: 6
    },

    // Contact Information
    phone: {
        type: String,
        default: null,
        validate: {
            validator: function(v) {
                if (!v) return true; // allow null/empty
                return /^\d{10}$/.test(v);
            },
            message: 'Phone number must be exactly 10 digits'
        }
    },

    // Identity Verification
    nic: {
        type: String,
        trim: true,
        uppercase: true,
        required: [
            function() {
                return this.isNew && ['learner', 'mentor'].includes(this.role);
            },
            'NIC is required for learner and mentor accounts'
        ],
        match: [/^(?:\d{9}[VX]|\d{12})$/, 'Please provide a valid NIC format (e.g. 200012345678 or 991234567V)']
    },
    
    // Professional verification details
    professionalDocuments: {
        nicCopy: { type: String },
        license: { type: String }
    },
    experienceYears: {
        type: Number,
        min: [0, 'Experience cannot be negative']
    },
    
    // Account Status Control
    accountStatus: {
        type: String,
        enum: ['Pending', 'Verified', 'Active', 'Rejected'],
        default: 'Pending'
    },
    
    // Track Origin (Audit)
    createdByAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Account Claim Token
    activationToken: String,
    activationTokenExpire: Date,

    // Mentor-specific fields
    skills: [{
        name: {
            type: String,
            required: [true, 'Skill name is required'],
            trim: true,
            minlength: [2, 'Skill name must be at least 2 characters'],
            maxlength: [50, 'Skill name cannot exceed 50 characters']
        },
        category: {
            type: String,
            trim: true,
            default: 'General'
        },
        level: {
            type: String,
            enum: ['Beginner', 'Intermediate', 'Advanced'],
            default: 'Intermediate'
        },
        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters'],
            default: ''
        },
        hourlyRate: {
            type: Number,
            min: [0, 'Hourly rate cannot be negative'],
            default: 0
        },
        tags: [{ type: String, trim: true }],
        image: { type: String, default: null },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now }
    }],
    hourlyRate: {
        type: Number,
        default: 0,
        min: [0, 'Hourly rate cannot be negative']
    },
    totalSessions: {
        type: Number,
        default: 0
    },

    // Reputation and Quality Metrics
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalRatings: {
        type: Number,
        default: 0
    },
    reputationScore: {
        type: Number,
        default: 0
    },

    // Learner-specific tracking (Module 1 & 2)
    credits: {
        type: Number,
        default: 0
    },
    studyStreak: {
        type: Number,
        default: 0
    },
    learningGoals: [{
        title: { type: String, required: true },
        isCompleted: { type: Boolean, default: false },
        targetDate: Date
    }],
    skillReadiness: [{
        skillName: String,
        level: { type: Number, min: 0, max: 100, default: 0 }
    }],
    reflectionNotes: [{
        session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
        note: String,
        createdAt: { type: Date, default: Date.now }
    }],

    // Professional/Admin tracking
    mps: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    grade: {
        type: String,
        enum: ['Platinum', 'Gold', 'Silver', 'Bronze', 'None'],
        default: 'None'
    },

    // Social
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }]
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
    return jwt.sign(
        { userId: this._id, role: this.role },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRE }
    );
};

// Get public profile (exclude sensitive data)
userSchema.methods.getPublicProfile = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
