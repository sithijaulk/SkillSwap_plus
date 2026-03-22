const availabilityService = require('./availability.service');
const { validationResult } = require('express-validator');

/**
 * Availability Controller
 * Handles HTTP requests for availability management
 */

/**
 * @route   POST /api/availability
 * @desc    Create availability slot
 * @access  Private (Mentor only)
 */
exports.createAvailability = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const availabilityData = {
            ...req.body,
            mentor: req.user._id
        };

        const availability = await availabilityService.createAvailability(availabilityData);

        res.status(201).json({
            success: true,
            message: 'Availability created successfully',
            data: availability
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/availability/batch
 * @desc    Batch create availability slots
 * @access  Private (Mentor only)
 */
exports.batchCreateAvailability = async (req, res, next) => {
    try {
        const { slots } = req.body;

        if (!Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Slots array is required'
            });
        }

        const created = await availabilityService.batchCreateAvailability(
            req.user._id,
            slots
        );

        res.status(201).json({
            success: true,
            message: 'Availability slots created successfully',
            count: created.length,
            data: created
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/availability/mentor/:mentorId
 * @desc    Get mentor's availability
 * @access  Public
 */
exports.getMentorAvailability = async (req, res, next) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';

        const availability = await availabilityService.getMentorAvailability(
            req.params.mentorId,
            includeInactive
        );

        res.json({
            success: true,
            count: availability.length,
            data: availability
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/availability/my
 * @desc    Get current mentor's availability
 * @access  Private (Mentor only)
 */
exports.getMyAvailability = async (req, res, next) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';

        const availability = await availabilityService.getMentorAvailability(
            req.user._id,
            includeInactive
        );

        res.json({
            success: true,
            count: availability.length,
            data: availability
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/availability/:id
 * @desc    Update availability slot
 * @access  Private (Mentor only)
 */
exports.updateAvailability = async (req, res, next) => {
    try {
        const availability = await availabilityService.updateAvailability(
            req.params.id,
            req.user._id,
            req.body
        );

        res.json({
            success: true,
            message: 'Availability updated successfully',
            data: availability
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/availability/:id
 * @desc    Delete availability slot
 * @access  Private (Mentor only)
 */
exports.deleteAvailability = async (req, res, next) => {
    try {
        const result = await availabilityService.deleteAvailability(
            req.params.id,
            req.user._id
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/availability/slots/:mentorId/:date
 * @desc    Get available slots for specific date
 * @access  Public
 */
exports.getAvailableSlots = async (req, res, next) => {
    try {
        const { mentorId, date } = req.params;

        const slots = await availabilityService.getAvailableSlotsForDate(
            mentorId,
            date
        );

        res.json({
            success: true,
            count: slots.length,
            data: slots
        });
    } catch (error) {
        next(error);
    }
};
