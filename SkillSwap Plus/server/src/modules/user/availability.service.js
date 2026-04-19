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
            .sort({ dayOfWeek: 1, startTime: 1 });

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
        const dayOfWeek = this.getDayOfWeek(date);

        const availability = await Availability.find({
            mentor: mentorId,
            dayOfWeek: dayOfWeek.toLowerCase(),
            isActive: true
        });

        return availability;
    }

    /**
     * Helper: Get day of week from date
     */
    getDayOfWeek(date) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayIndex = new Date(date).getDay();
        return days[dayIndex];
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
