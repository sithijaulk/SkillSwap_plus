const userService = require('./user.service');
const { validationResult } = require('express-validator');
const User = require('./user.model');

/**
 * User Controller
 * Handles HTTP requests for user operations
 */

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
exports.register = async (req, res, next) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { firstName, lastName, username, email, password, role, phone, nic } = req.body;

        const result = await userService.registerUser({
            firstName,
            lastName,
            username,
            email,
            password,
            role: role || 'learner',
            phone,
            nic
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
exports.login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password, username } = req.body;
        
        const loginIdentifier = email || username;

        const result = await userService.loginUser(loginIdentifier, password);

        res.json({
            success: true,
            message: 'Login successful',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
exports.getCurrentUser = async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: req.user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/users/profile/:userId
 * @desc    Get user profile by ID
 * @access  Private
 */
exports.getUserProfile = async (req, res, next) => {
    try {
        const user = await userService.getUserProfile(req.params.userId);

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
    try {
        const user = await userService.updateUserProfile(req.user._id, req.body);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/users/mentors
 * @desc    Get all mentors with filters
 * @access  Private
 */
exports.getMentors = async (req, res, next) => {
    try {
        const filters = {
            skill: req.query.skill,
            category: req.query.category,
            minRating: req.query.minRating
        };

        const mentors = await userService.getMentors(filters);

        res.json({
            success: true,
            count: mentors.length,
            data: mentors
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/users/skills
 * @desc    Update mentor skills
 * @access  Private (Mentor only)
 */
exports.updateSkills = async (req, res, next) => {
    try {
        const user = await userService.updateMentorSkills(req.user._id, req.body.skills);

        res.json({
            success: true,
            message: 'Skills updated successfully',
            data: user.skills
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/mentors/me/skills
 * @desc    Get logged-in mentor's skills
 * @access  Private (mentor)
 */
exports.getMySkills = async (req, res, next) => {
    try {
        const skills = await userService.getMySkills(req.user._id);
        res.json({ success: true, data: skills });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/mentors/me/skills
 * @desc    Add a new skill for logged-in mentor
 * @access  Private (mentor)
 */
exports.addMySkill = async (req, res, next) => {
    try {
        const skill = await userService.addSkill(req.user._id, req.body);
        res.status(201).json({ success: true, data: skill, message: 'Skill added' });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/mentors/me/skills/:skillId
 * @desc    Update a mentor skill
 * @access  Private (mentor)
 */
exports.updateMySkill = async (req, res, next) => {
    try {
        const skill = await userService.updateSkill(req.user._id, req.params.skillId, req.body);
        res.json({ success: true, data: skill, message: 'Skill updated' });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/mentors/me/skills/:skillId
 * @desc    Delete a mentor skill
 * @access  Private (mentor)
 */
exports.deleteMySkill = async (req, res, next) => {
    try {
        await userService.deleteSkill(req.user._id, req.params.skillId);
        res.json({ success: true, message: 'Skill deleted' });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/skills
 * @desc    Public list of skills across mentors
 * @access  Public
 */
exports.getPublicSkills = async (req, res, next) => {
    try {
        const { search, category, level, page, limit, sort } = req.query;
        const skills = await userService.getPublicSkills({ search, category, level, page, limit, sort });
        res.json({ success: true, count: skills.length, data: skills });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/public/mentors/leaderboard
 * @desc    Public graded mentor leaderboard with recent feedback snippets
 * @access  Public
 */
exports.getPublicMentorLeaderboard = async (req, res, next) => {
    try {
        const data = await userService.getPublicMentorLeaderboard({
            limit: req.query.limit,
            reviewsPerMentor: req.query.reviewsPerMentor,
        });

        res.json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private
 */
exports.getUserStats = async (req, res, next) => {
    try {
        const stats = await userService.getUserStats(req.user._id);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/mentors/me/finance
 * @desc    Get current mentor's finance summary and history
 * @access  Private (Mentor only)
 */
exports.getMentorFinance = async (req, res, next) => {
    try {
        const financeService = require('../admin/finance.service');
        const summary = await financeService.getMentorFinanceSummary(req.user._id);
        
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/upload/skill-image
 * @desc    Upload skill image
 * @access  Private (Mentor only)
 */
exports.uploadSkillImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        const FileUpload = require('./fileUpload.model');

        // Create file upload record
        const fileUpload = new FileUpload({
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            uploadedBy: req.user._id,
            uploadType: 'skill_image',
            relatedId: req.body.skillId || null // Will be set when associating with skill
        });

        await fileUpload.save();

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                fileId: fileUpload._id,
                filename: req.file.filename,
                path: req.file.path,
                url: `/uploads/skills/${req.file.filename}` // Public URL
            }
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/users/:id/follow — toggle follow/unfollow a user
exports.toggleFollow = async (req, res, next) => {
    try {
        const targetId = req.params.id;
        const currentUserId = req.user._id;

        if (targetId === currentUserId.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
        }

        const target = await User.findById(targetId);
        if (!target) return res.status(404).json({ success: false, message: 'User not found' });

        const isFollowing = target.followers.map(String).includes(currentUserId.toString());

        if (isFollowing) {
            await User.findByIdAndUpdate(targetId, { $pull: { followers: currentUserId } });
            await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetId } });
        } else {
            await User.findByIdAndUpdate(targetId, { $addToSet: { followers: currentUserId } });
            await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetId } });
        }

        res.json({ success: true, data: { following: !isFollowing } });
    } catch (error) {
        next(error);
    }
};

// GET /api/users/:id/followers
exports.getFollowers = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).populate('followers', 'firstName lastName role profileImage');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user.followers });
    } catch (error) {
        next(error);
    }
};

// GET /api/users/:id/following
exports.getFollowing = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).populate('following', 'firstName lastName role profileImage');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user.following });
    } catch (error) {
        next(error);
    }
};
