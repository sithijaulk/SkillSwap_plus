const adminService = require('./admin.service');
const { validationResult } = require('express-validator');

/**
 * Admin Controller
 * Handles admin operations and governance
 */

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
exports.getAllUsers = async (req, res, next) => {
    try {
        const filters = {
            role: req.query.role,
            isVerified: req.query.isVerified,
            isActive: req.query.isActive,
            search: req.query.search
        };

        const options = {
            page: req.query.page,
            limit: req.query.limit
        };

        const result = await adminService.getAllUsers(filters, options);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/admin/verify-mentor/:userId
 * @desc    Verify a mentor
 * @access  Private (Admin only)
 */
exports.verifyMentor = async (req, res, next) => {
    try {
        const user = await adminService.verifyMentor(req.params.userId, req.user._id);

        res.json({
            success: true,
            message: 'Mentor verified successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/admin/users/:userId/status
 * @desc    Suspend or activate a user
 * @access  Private (Admin only)
 */
exports.updateUserStatus = async (req, res, next) => {
    try {
        const { isActive, reason } = req.body;

        const result = await adminService.updateUserStatus(
            req.params.userId,
            isActive,
            reason
        );

        res.json({
            success: true,
            message: `User ${result.action} successfully`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/admin/reports
 * @desc    Create a report
 * @access  Private
 */
exports.createReport = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const reportData = {
            ...req.body,
            reporter: req.user._id
        };

        const report = await adminService.createReport(reportData);

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            data: report
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/reports
 * @desc    Get all reports
 * @access  Private (Admin only)
 */
exports.getReports = async (req, res, next) => {
    try {
        const filters = {
            status: req.query.status,
            type: req.query.type,
            priority: req.query.priority,
            assignedTo: req.query.assignedTo
        };

        const options = {
            page: req.query.page,
            limit: req.query.limit
        };

        const result = await adminService.getReports(filters, options);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/reports/:id
 * @desc    Get report by ID
 * @access  Private (Admin only)
 */
exports.getReport = async (req, res, next) => {
    try {
        const report = await adminService.getReportById(req.params.id);

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/admin/reports/:id/assign
 * @desc    Assign report to admin
 * @access  Private (Admin only)
 */
exports.assignReport = async (req, res, next) => {
    try {
        const report = await adminService.assignReport(req.params.id, req.user._id);

        res.json({
            success: true,
            message: 'Report assigned successfully',
            data: report
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/admin/reports/:id/status
 * @desc    Update report status
 * @access  Private (Admin only)
 */
exports.updateReportStatus = async (req, res, next) => {
    try {
        const report = await adminService.updateReportStatus(req.params.id, req.body);

        res.json({
            success: true,
            message: 'Report updated successfully',
            data: report
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/admin/reports/:id/resolve
 * @desc    Resolve a report
 * @access  Private (Admin only)
 */
exports.resolveReport = async (req, res, next) => {
    try {
        const { resolution, details } = req.body;

        const report = await adminService.resolveReport(
            req.params.id,
            resolution,
            details,
            req.user._id
        );

        res.json({
            success: true,
            message: 'Report resolved successfully',
            data: report
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/admin/reports/:id/communicate
 * @desc    Add communication to report
 * @access  Private (Admin only)
 */
exports.addCommunication = async (req, res, next) => {
    try {
        const { message } = req.body;

        const report = await adminService.addCommunication(
            req.params.id,
            req.user._id,
            message
        );

        res.json({
            success: true,
            message: 'Communication added',
            data: report
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/stats
 * @desc    Get system statistics
 * @access  Private (Admin only)
 */
exports.getStats = async (req, res, next) => {
    try {
        const stats = await adminService.getSystemStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/activities
 * @desc    Get recent activities
 * @access  Private (Admin only)
 */
exports.getActivities = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 20;

        const activities = await adminService.getRecentActivities(limit);

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/admin/users/:userId/promote-professional
 * @desc    Promote a user to professional role
 * @access  Private (Admin only)
 */
exports.promoteProfessional = async (req, res, next) => {
    try {
        const user = await adminService.addProfessional(req.params.userId, req.user._id);

        res.json({
            success: true,
            message: 'User promoted to professional successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/admin/users/professional
 * @desc    Register a new professional
 * @access  Private (Admin only)
 */
exports.registerProfessional = async (req, res, next) => {
    try {
        const user = await adminService.registerProfessional(req.body, req.files, req.user._id);

        res.status(201).json({
            success: true,
            message: 'Professional registered and verified successfully.',
            data: { _id: user._id, email: user.email, status: user.accountStatus }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
