const Availability = require('./availability.model');

/**
 * Availability Service Layer
 * Contains business logic for mentor availability management
 */

class AvailabilityService {
    /**
     * Create availability slot
     */
    async createAvailability(availabilityData) {
        const availability = new Availability(availabilityData);
        await availability.save();
        await availability.populate('mentor', 'firstName lastName email');
        return availability;
    }

    /**
     * Get mentor's availability
     */
    async getMentorAvailability(mentorId, includeInactive = false) {
        const query = { mentor: mentorId };

        if (!includeInactive) {
            query.isActive = true;
        }

        const availability = await Availability.find(query)
            .populate('mentor', 'firstName lastName')
            .sort({ date: 1, startTime: 1 });

        return availability;
    }

    /**
     * Update availability slot
     */
    async updateAvailability(availabilityId, mentorId, updateData) {
        const availability = await Availability.findOne({
            _id: availabilityId,
            mentor: mentorId
        });

        if (!availability) {
            throw new Error('Availability slot not found or unauthorized');
        }

        Object.assign(availability, updateData);
        await availability.save();

        return availability;
    }

    /**
     * Delete availability slot
     */
    async deleteAvailability(availabilityId, mentorId) {
        const availability = await Availability.findOneAndDelete({
            _id: availabilityId,
            mentor: mentorId
        });

        if (!availability) {
            throw new Error('Availability slot not found or unauthorized');
        }

        return { message: 'Availability slot deleted successfully' };
    }

    /**
     * Get available time slots for a specific date
     */
    async getAvailableSlotsForDate(mentorId, date) {
        // Find by exact date matching the start of the day if possible, or exact date string mapping
        const startOfDay = new Date(date);
        startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23,59,59,999);

        const availability = await Availability.find({
            mentor: mentorId,
            date: { $gte: startOfDay, $lte: endOfDay },
            isActive: true
        });

        return availability;
    }

    /**
     * Batch create availability (for multiple days)
     */
    async batchCreateAvailability(mentorId, slots) {
        const availabilities = slots.map(slot => ({
            ...slot,
            mentor: mentorId
        }));

        const created = await Availability.insertMany(availabilities);
        return created;
    }
}

module.exports = new AvailabilityService();
