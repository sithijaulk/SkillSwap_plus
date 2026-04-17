const User = require('./user.model');
const Session = require('./session.model');
const Availability = require('./availability.model');
const Progress = require('./progress.model');
const sendEmail = require('../../utils/sendEmail');
const config = require('../../config');

/**
 * User Service Layer
 * Contains all business logic for user operations
 */

class UserService {
    async generateUniqueUsername(baseInput) {
        const normalizedBase = (baseInput || 'user')
            .toString()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 20) || 'user';

        let candidate = normalizedBase;
        let suffix = 1;

        while (await User.exists({ username: candidate })) {
            candidate = `${normalizedBase}${suffix}`;
            suffix += 1;
        }

        return candidate;
    }

    /**
     * Run automated preliminary checks on a user.
     * Returns an array of { label, pass } objects.
     */
    _runAutoChecks(user) {
        const nicValid = user.nic
            ? (/^\d{12}$/.test(user.nic) || /^\d{9}[vVxX]$/.test(user.nic))
            : false;

        return [
            { label: 'Email address provided and valid', pass: !!(user.email && /^\S+@\S+\.\S+$/.test(user.email)) },
            { label: 'Phone number provided',            pass: !!user.phone },
            { label: 'NIC number provided and valid',    pass: nicValid },
            { label: 'At least one skill listed',        pass: Array.isArray(user.skills) && user.skills.length > 0 },
            { label: 'Experience (years) provided',      pass: user.experienceYears != null && user.experienceYears >= 0 },
        ];
    }

    /**
     * Register a new user.
     * - Learners: auto-approved immediately, welcome email sent.
     * - Mentors:  automated checks run instantly.
     *   All pass  → auto-approved, approval email sent.
     *   Any fail  → kept Pending for admin document review,
     *               email lists which checks need attention.
     */
    async registerUser(userData) {
        // Duplicate email check
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            throw new Error('Email already registered');
        }

        if (userData.nic) {
            userData.nic = userData.nic.toString().trim().toUpperCase();

            const existingNicUser = await User.findOne({ nic: userData.nic });
            if (existingNicUser) {
                throw new Error('NIC already registered');
            }
        }

        const isMentor = userData.role === 'mentor';
        const clientUrl = config.CLIENT_URL || 'http://localhost:3000';

        // ── LEARNER: instantly active ──────────────────────────────────────────
        if (!isMentor) {
            userData.isVerified = false;
            userData.accountStatus = 'Pending';
            const user = new User(userData);
            await user.save();

            // Registration received email
            sendEmail({
                email: user.email,
                subject: 'SkillSwap+ — Registration Received, Pending Approval',
                html: `
                    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:40px 20px;background:#f8fafc">
                        <div style="background:white;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
                            <h2 style="color:#4f46e5;margin-bottom:8px">Registration Received, ${user.firstName}!</h2>
                            <p style="color:#64748b;font-size:16px;line-height:1.6">
                                Your <strong>learner</strong> account registration has been received and is
                                <strong style="color:#f59e0b">pending admin approval</strong>. You will receive
                                another email once your account has been reviewed and approved.
                            </p>
                            <p style="color:#94a3b8;font-size:13px">— The SkillSwap+ Team</p>
                        </div>
                    </div>
                `
            }).catch(e => console.error('Registration email failed:', e.message));

            const token = user.generateAuthToken();
            return { user: user.getPublicProfile(), token };
        }

        const suggestedUsername = userData.username
            || `${userData.firstName || ''}${userData.lastName || ''}`
            || (userData.email || '').split('@')[0]
            || 'user';
        userData.username = await this.generateUniqueUsername(suggestedUsername);

        // Set isVerified to true by default for new registrations
        userData.isVerified = true;

        // ── MENTOR: save as Pending first ──────────────────────────────────────
        userData.isVerified = false;
        userData.accountStatus = 'Pending';
        const user = new User(userData);
        await user.save();

        // Immediately send "application received" email
        sendEmail({
            email: user.email,
            subject: 'SkillSwap+ — Mentor Application Received',
            html: `
                <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:40px 20px;background:#f8fafc">
                    <div style="background:white;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
                        <h2 style="color:#4f46e5;margin-bottom:8px">Application Received, ${user.firstName}!</h2>
                        <p style="color:#64748b;font-size:16px;line-height:1.6">
                            We have received your mentor application. Our automated system is reviewing your profile now.
                            You will receive another email shortly with the result.
                        </p>
                        <p style="color:#94a3b8;font-size:13px">— The SkillSwap+ Team</p>
                    </div>
                </div>
            `
        }).catch(e => console.error('Pending email failed:', e.message));

        const token = user.generateAuthToken();
        return { user: user.getPublicProfile(), token };
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

        // Block login based on verification status (applies to mentors & learners only, not admins)
        if (user.role !== 'admin' && user.accountStatus === 'Pending') {
            throw new Error('Your account is pending verification. You will receive an approval email once reviewed.');
        }
        if (user.role !== 'admin' && user.accountStatus === 'Rejected') {
            throw new Error('Your account application was not approved. Please contact support for more information.');
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
            image: skillData.image || null,
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
        if (skillData.image !== undefined) skill.image = skillData.image;
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
