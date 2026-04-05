const User = require('./user.model');
const Session = require('./session.model');
const Availability = require('./availability.model');
const Progress = require('./progress.model');

/**
 * User Service Layer
 * Contains all business logic for user operations
 */

class UserService {
    /**
     * Register a new user
     */
    async registerUser(userData) {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            throw new Error('Email already registered');
        }

        // Set isVerified to true by default for new registrations
        userData.isVerified = true;

        // Create new user
        const user = new User(userData);
        await user.save();

        // Generate token
        const token = user.generateAuthToken();

        return {
            user: user.getPublicProfile(),
            token
        };
    }

    /**
     * Login user
     */
    async loginUser(emailOrUsername, password) {
        // Find user with password field (could be email or username)
        const user = await User.findOne({ 
            $or: [
                { email: emailOrUsername },
                { username: emailOrUsername }
            ]
        }).select('+password');
        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // Check if user is active
        if (!user.isActive) {
            throw new Error('Account is deactivated. Please contact support.');
        }

        // Generate token
        const token = user.generateAuthToken();

        return {
            user: user.getPublicProfile(),
            token
        };
    }

    /**
     * Get user profile by ID
     */
    async getUserProfile(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    /**
     * Update user profile
     */
    async updateUserProfile(userId, updateData) {
        // Remove fields that shouldn't be updated directly
        delete updateData.password;
        delete updateData.role;
        delete updateData.email;
        delete updateData.totalSessions;
        delete updateData.averageRating;
        delete updateData.totalRatings;
        delete updateData.reputationScore;

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

    /**
     * Get all mentors with optional filters
     */
    async getMentors(filters = {}) {
        const query = { role: 'mentor', isActive: true };

        // Filter by skill
        if (filters.skill) {
            query['skills.name'] = { $regex: filters.skill, $options: 'i' };
        }

        // Filter by category
        if (filters.category) {
            query['skills.category'] = filters.category;
        }

        // Filter by minimum rating
        if (filters.minRating) {
            query.averageRating = { $gte: parseFloat(filters.minRating) };
        }

        const mentors = await User.find(query)
            .select('-password')
            .sort({ averageRating: -1, totalSessions: -1 });

        return mentors;
    }

    /**
     * Add or update mentor skills
     */
    async updateMentorSkills(userId, skills) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.role !== 'mentor') {
            throw new Error('Only mentors can add skills');
        }

        user.skills = skills;
        await user.save();

        return user;
    }

    /**
     * Get current mentor's skills
     */
    async getMySkills(userId) {
        const user = await User.findById(userId).select('skills role');
        if (!user) throw new Error('User not found');
        if (user.role !== 'mentor') throw new Error('Only mentors have skills');
        return user.skills;
    }

    /**
     * Add a new skill to mentor
     */
    async addSkill(userId, skillData) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');
        if (user.role !== 'mentor') throw new Error('Only mentors can add skills');

        // Prevent duplicate skill names (case-insensitive)
        const exists = user.skills.some(s => s.name.toLowerCase() === (skillData.name || '').trim().toLowerCase());
        if (exists) throw new Error('Skill with this name already exists');

        const skill = {
            name: (skillData.name || '').trim(),
            category: skillData.category || 'General',
            level: skillData.level || 'Intermediate',
            description: skillData.description || '',
            hourlyRate: skillData.hourlyRate || 0,
            tags: Array.isArray(skillData.tags) ? skillData.tags : (skillData.tags ? [skillData.tags] : []),
            isActive: skillData.isActive !== false
        };

        user.skills.push(skill);
        await user.save();

        return user.skills[user.skills.length - 1];
    }

    /**
     * Update an existing mentor skill
     */
    async updateSkill(userId, skillId, skillData) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');
        if (user.role !== 'mentor') throw new Error('Only mentors can update skills');

        const skill = user.skills.id(skillId);
        if (!skill) throw new Error('Skill not found');

        // Prevent renaming to a duplicate name
        if (skillData.name) {
            const dup = user.skills.some(s => s._id.toString() !== skillId && s.name.toLowerCase() === skillData.name.trim().toLowerCase());
            if (dup) throw new Error('Another skill with this name already exists');
            skill.name = skillData.name.trim();
        }

        if (skillData.category !== undefined) skill.category = skillData.category;
        if (skillData.level !== undefined) skill.level = skillData.level;
        if (skillData.description !== undefined) skill.description = skillData.description;
        if (skillData.hourlyRate !== undefined) skill.hourlyRate = skillData.hourlyRate;
        if (skillData.tags !== undefined) skill.tags = Array.isArray(skillData.tags) ? skillData.tags : (skillData.tags ? [skillData.tags] : []);
        if (skillData.isActive !== undefined) skill.isActive = !!skillData.isActive;

        await user.save();

        return skill;
    }

    /**
     * Delete a mentor skill
     */
    async deleteSkill(userId, skillId) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');
        if (user.role !== 'mentor') throw new Error('Only mentors can delete skills');

        const skill = user.skills.id(skillId);
        if (!skill) throw new Error('Skill not found');

        skill.remove();
        await user.save();

        return { success: true };
    }

    /**
     * Public list of skills across mentors with filters
     */
    async getPublicSkills({ search, category, level, page = 1, limit = 20, sort } = {}) {
        const match = { role: 'mentor', isActive: true };

        // We'll unwind skills and filter only active skills
        const pipeline = [
            { $match: match },
            { $unwind: '$skills' },
            { $match: { 'skills.isActive': true } }
        ];

        if (search) {
            const regex = new RegExp(search, 'i');
            pipeline.push({ $match: { $or: [{ 'skills.name': regex }, { firstName: regex }, { lastName: regex }, { 'skills.tags': regex }] } });
        }

        if (category) pipeline.push({ $match: { 'skills.category': category } });
        if (level) pipeline.push({ $match: { 'skills.level': level } });

        // Add projection
        pipeline.push({
            $project: {
                skillId: '$skills._id',
                name: '$skills.name',
                category: '$skills.category',
                level: '$skills.level',
                description: '$skills.description',
                tags: '$skills.tags',
                hourlyRate: '$skills.hourlyRate',
                mentor: {
                    _id: '$_id',
                    name: { $concat: ['$firstName', ' ', '$lastName'] },
                    profileImage: '$profileImage',
                    ratingAvg: '$averageRating',
                    totalReviews: '$totalRatings'
                }
            }
        });

        // Sorting
        if (sort === 'popular') pipeline.push({ $sort: { 'mentor.ratingAvg': -1 } });
        else pipeline.push({ $sort: { name: 1 } });

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

        const results = await User.aggregate(pipeline);
        return results;
    }

    /**
     * Get user statistics
     */
    async getUserStats(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const stats = {
            totalSessions: user.totalSessions,
            averageRating: user.averageRating,
            totalRatings: user.totalRatings,
            reputationScore: user.reputationScore
        };

        // Get session counts by status
        const sessionStats = await Session.aggregate([
            { $match: { [user.role === 'mentor' ? 'mentor' : 'learner']: user._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        stats.sessionsByStatus = sessionStats;

        return stats;
    }

    async toggleFollow(currentUserId, targetUserId) {
        if (currentUserId.toString() === targetUserId.toString()) {
            throw new Error('Cannot follow yourself');
        }
        const target = await User.findById(targetUserId);
        if (!target) throw new Error('User not found');
        const current = await User.findById(currentUserId);
        const isFollowing = current.following.some(id => id.toString() === targetUserId.toString());
        if (isFollowing) {
            await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } });
            await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } });
            return { following: false, followersCount: target.followers.length - 1 };
        } else {
            await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId } });
            await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId } });
            return { following: true, followersCount: target.followers.length + 1 };
        }
    }

    async getFollowers(userId) {
        const user = await User.findById(userId).populate('followers', 'firstName lastName profileImage role');
        if (!user) throw new Error('User not found');
        return user.followers;
    }

    async getFollowing(userId) {
        const user = await User.findById(userId).populate('following', 'firstName lastName profileImage role');
        if (!user) throw new Error('User not found');
        return user.following;
    }
}

module.exports = new UserService();
