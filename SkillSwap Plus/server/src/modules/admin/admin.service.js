const Report = require('./report.model');
const User = require('../user/user.model');
const Session = require('../user/session.model');
const Question = require('../community/question.model');
const Answer = require('../community/answer.model');
const Rating = require('../quality/rating.model');
const crypto = require('crypto');

/**
 * Admin Service Layer
 * Business logic for admin operations and governance
 */

class AdminService {
    /**
     * Get all users with filters
     */
    async getAllUsers(filters = {}, options = {}) {
        const query = {};

        if (filters.role) {
            query.role = filters.role;
        }

        if (filters.isVerified !== undefined) {
            query.isVerified = filters.isVerified === 'true';
        }

        if (filters.isActive !== undefined) {
            query.isActive = filters.isActive === 'true';
        }

        if (filters.search) {
            query.$or = [
                { firstName: { $regex: filters.search, $options: 'i' } },
                { lastName: { $regex: filters.search, $options: 'i' } },
                { email: { $regex: filters.search, $options: 'i' } }
            ];
        }

        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 20;
        const skip = (page - 1) * limit;

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(query);

        return {
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Verify a mentor
     */
    async verifyMentor(userId, adminId) {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        if (user.role !== 'mentor') {
            throw new Error('Only mentors can be verified');
        }

        user.isVerified = true;
        await user.save();

        return user;
    }

    /**
     * Suspend or activate a user
     */
    async updateUserStatus(userId, isActive, reason = null) {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        user.isActive = isActive;
        await user.save();

        return {
            user,
            action: isActive ? 'activated' : 'suspended',
            reason
        };
    }

    /**
     * Create a report
     */
    async createReport(reportData) {
        const report = new Report(reportData);
        await report.save();

        await report.populate('reporter reportedUser', 'firstName lastName email');

        return report;
    }

    /**
     * Get all reports with filters
     */
    async getReports(filters = {}, options = {}) {
        const query = {};

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.priority) {
            query.priority = filters.priority;
        }

        if (filters.assignedTo) {
            query.assignedTo = filters.assignedTo;
        }

        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 20;
        const skip = (page - 1) * limit;

        const reports = await Report.find(query)
            .populate('reporter reportedUser assignedTo', 'firstName lastName email')
            .sort({ priority: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Report.countDocuments(query);

        return {
            reports,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get report by ID
     */
    async getReportById(reportId) {
        const report = await Report.findById(reportId)
            .populate('reporter reportedUser assignedTo', 'firstName lastName email')
            .populate('communications.from', 'firstName lastName role');

        if (!report) {
            throw new Error('Report not found');
        }

        return report;
    }

    /**
     * Assign report to admin
     */
    async assignReport(reportId, adminId) {
        const report = await Report.findById(reportId);

        if (!report) {
            throw new Error('Report not found');
        }

        report.assignedTo = adminId;
        report.status = 'under-review';
        report.reviewedAt = new Date();

        await report.save();
        await report.populate('assignedTo', 'firstName lastName email');

        return report;
    }

    /**
     * Update report status
     */
    async updateReportStatus(reportId, updateData) {
        const report = await Report.findById(reportId);

        if (!report) {
            throw new Error('Report not found');
        }

        Object.assign(report, updateData);

        if (updateData.status === 'resolved') {
            report.resolvedAt = new Date();
        }

        await report.save();
        return report;
    }

    /**
     * Resolve report
     */
    async resolveReport(reportId, resolution, details, adminId) {
        const report = await Report.findById(reportId);

        if (!report) {
            throw new Error('Report not found');
        }

        report.status = 'resolved';
        report.resolution = resolution;
        report.resolutionDetails = details;
        report.resolvedAt = new Date();

        // Take action based on resolution
        await this.executeResolution(report, resolution, adminId);

        await report.save();
        return report;
    }

    /**
     * Add communication to report
     */
    async addCommunication(reportId, userId, message) {
        const report = await Report.findById(reportId);

        if (!report) {
            throw new Error('Report not found');
        }

        report.communications.push({
            from: userId,
            message,
            timestamp: new Date()
        });

        await report.save();
        await report.populate('communications.from', 'firstName lastName role');

        return report;
    }

    /**
     * Get system statistics
     */
    async getSystemStats() {
        const [
            totalUsers,
            activeUsers,
            totalMentors,
            verifiedMentors,
            totalSessions,
            completedSessions,
            totalQuestions,
            answeredQuestions,
            pendingReports,
            resolvedReports
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isActive: true }),
            User.countDocuments({ role: 'mentor' }),
            User.countDocuments({ role: 'mentor', isVerified: true }),
            Session.countDocuments(),
            Session.countDocuments({ status: 'completed' }),
            Question.countDocuments(),
            Question.countDocuments({ status: 'answered' }),
            Report.countDocuments({ status: { $in: ['pending', 'under-review'] } }),
            Report.countDocuments({ status: 'resolved' })
        ]);

        return {
            users: {
                total: totalUsers,
                active: activeUsers,
                inactive: totalUsers - activeUsers
            },
            mentors: {
                total: totalMentors,
                verified: verifiedMentors,
                pending: totalMentors - verifiedMentors
            },
            sessions: {
                total: totalSessions,
                completed: completedSessions,
                completionRate: totalSessions > 0 ? (completedSessions / totalSessions * 100).toFixed(2) : 0
            },
            community: {
                totalQuestions,
                answeredQuestions,
                answerRate: totalQuestions > 0 ? (answeredQuestions / totalQuestions * 100).toFixed(2) : 0
            },
            reports: {
                pending: pendingReports,
                resolved: resolvedReports,
                total: pendingReports + resolvedReports
            }
        };
    }

    /**
     * Get recent activities
     */
    async getRecentActivities(limit = 20) {
        const [recentSessions, recentQuestions, recentReports] = await Promise.all([
            Session.find()
                .populate('learner mentor', 'firstName lastName')
                .sort({ createdAt: -1 })
                .limit(limit),
            Question.find()
                .populate('author', 'firstName lastName')
                .sort({ createdAt: -1 })
                .limit(limit),
            Report.find()
                .populate('reporter', 'firstName lastName')
                .sort({ createdAt: -1 })
                .limit(limit)
        ]);

        return {
            recentSessions,
            recentQuestions,
            recentReports
        };
    }

    /**
     * Helper: Execute resolution action
     */
    async executeResolution(report, resolution, adminId) {
        switch (resolution) {
            case 'content-removed':
                await this.removeContent(report.reportedContent);
                break;

            case 'user-suspended':
                if (report.reportedUser) {
                    await User.findByIdAndUpdate(report.reportedUser, { isActive: false });
                }
                break;

            case 'warning-issued':
                // Could send email/notification to user
                break;

            case 'refund-issued':
                // Handle payment refund logic
                break;

            default:
                // No automated action
                break;
        }
    }

    /**
     * Helper: Remove flagged content
     */
    async removeContent(reportedContent) {
        if (!reportedContent.contentType || !reportedContent.contentId) {
            return;
        }

        const { contentType, contentId } = reportedContent;

        switch (contentType) {
            case 'question':
                await Question.findByIdAndDelete(contentId);
                await Answer.deleteMany({ question: contentId });
                break;

            case 'answer':
                await Answer.findByIdAndDelete(contentId);
                break;

            case 'rating':
                await Rating.findByIdAndDelete(contentId);
                break;

            default:
        }
    }

    /**
     * Register a new professional user
     */
    async registerProfessional(userData, files, adminId) {
        const { firstName, lastName, email, phone, nic, experienceYears, skills } = userData;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { nic: nic || 'non-existent-placeholder' }] });
        if (existingUser) {
            throw new Error('User with this email or NIC already exists');
        }

        const documents = {
            nicCopy: files?.nicCopy?.[0]?.path,
            license: files?.license?.[0]?.path
        };

        if (!documents.nicCopy) {
            throw new Error('NIC Document copy is strictly required');
        }

        const activationToken = crypto.randomBytes(32).toString('hex');
        const activationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiry
        
        let parsedSkills = [{
            name: 'General',
            category: 'General',
            level: 'Beginner'
        }];
        
        try {
            if (skills) {
               const parsed = JSON.parse(skills);
               if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                   parsedSkills = parsed.map(s => ({
                       name: s,
                       category: 'General',
                       level: 'Beginner'
                   }));
               }
            }
        } catch (e) {
            // ignore
        }

        const user = new User({
            firstName,
            lastName,
            email,
            phone,
            nic,
            experienceYears: experienceYears ? Number(experienceYears) : 0,
            skills: parsedSkills,
            password: crypto.randomBytes(16).toString('hex'), // random unused password
            role: 'professional',
            accountStatus: 'Pending',
            isVerified: false,
            isActive: false,
            professionalDocuments: documents,
            createdByAdmin: adminId,
            activationToken,
            activationTokenExpire
        });

        await user.save();
        return user;
    }
}

module.exports = new AdminService();
