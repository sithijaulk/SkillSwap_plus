import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    Calendar,
    Clock,
    Plus,
    Trash2,
    Save,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

const AvailabilityCalendar = () => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [availability, setAvailability] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showAddSlot, setShowAddSlot] = useState(false);
    const [newSlot, setNewSlot] = useState({
        dayOfWeek: '',
        startTime: '',
        endTime: ''
    });

    const daysOfWeek = [
        'sunday', 'monday', 'tuesday', 'wednesday',
        'thursday', 'friday', 'saturday'
    ];

    const dayNames = [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday',
        'Thursday', 'Friday', 'Saturday'
    ];

    useEffect(() => {
        fetchAvailability();
    }, []);

    const fetchAvailability = async () => {
        try {
            setLoading(true);
            const response = await api.get('/availability/my');
            setAvailability(response.data.data || []);
        } catch (error) {
            console.error('Error fetching availability:', error);
            showToast('Failed to load availability', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getSlotsForDay = (dayOfWeek) => {
        return availability.filter(slot => slot.dayOfWeek === dayOfWeek && slot.isActive);
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        const days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const day = new Date(year, month, i);
            const dayOfWeek = daysOfWeek[day.getDay()];
            const slots = getSlotsForDay(dayOfWeek);

            days.push({
                date: i,
                dayOfWeek,
                dayName: dayNames[day.getDay()],
                slots: slots,
                hasAvailability: slots.length > 0
            });
        }

        return days;
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day) => {
        setSelectedDate(day);
        setShowAddSlot(true);
        setNewSlot({
            dayOfWeek: day.dayOfWeek,
            startTime: '',
            endTime: ''
        });
    };

    const handleAddSlot = async () => {
        if (!newSlot.startTime || !newSlot.endTime) {
            showToast('Please fill both start and end times', 'error');
            return;
        }

        if (newSlot.startTime >= newSlot.endTime) {
            showToast('End time must be after start time', 'error');
            return;
        }

        setSaving(true);
        try {
            await api.post('/availability', newSlot);
            showToast('Availability slot added successfully', 'success');
            setShowAddSlot(false);
            setNewSlot({ dayOfWeek: '', startTime: '', endTime: '' });
            fetchAvailability();
        } catch (error) {
            console.error('Error adding slot:', error);
            showToast('Failed to add availability slot', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSlot = async (slotId) => {
        if (!window.confirm('Are you sure you want to delete this availability slot?')) {
            return;
        }

        try {
            await api.delete(`/availability/${slotId}`);
            showToast('Availability slot deleted', 'success');
            fetchAvailability();
        } catch (error) {
            console.error('Error deleting slot:', error);
            showToast('Failed to delete availability slot', 'error');
        }
    };

    const formatTime = (timeString) => {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const days = getDaysInMonth(currentDate);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Calendar className="h-6 w-6 mr-2" />
                    Availability Calendar
                </h2>
                <button
                    onClick={() => setShowAddSlot(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Slot
                </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-6">
                {/* Day headers */}
                {dayNames.map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                        {day.slice(0, 3)}
                    </div>
                ))}

                {/* Empty cells for days before the first day of the month */}
                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, index) => (
                    <div key={`empty-${index}`} className="p-2"></div>
                ))}

                {/* Calendar days */}
                {days.map(day => (
                    <div
                        key={day.date}
                        className={`min-h-[80px] p-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            day.hasAvailability
                                ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700'
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        }`}
                        onClick={() => handleDateClick(day)}
                        onMouseEnter={(e) => {
                            if (day.hasAvailability) {
                                e.currentTarget.title = `${day.slots.length} available slot${day.slots.length > 1 ? 's' : ''}`;
                            }
                        }}
                    >
                        <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            {day.date}
                        </div>
                        {day.hasAvailability && (
                            <div className="text-xs text-green-600 dark:text-green-400">
                                {day.slots.length} slot{day.slots.length > 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Current Availability List */}
            <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Current Availability Slots
                </h3>
                {availability.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                        No availability slots set. Click "Add Slot" to get started.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {daysOfWeek.map(dayOfWeek => {
                            const daySlots = getSlotsForDay(dayOfWeek);
                            if (daySlots.length === 0) return null;

                            return (
                                <div key={dayOfWeek} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="flex items-center">
                                        <Clock className="h-4 w-4 text-gray-500 mr-2" />
                                        <span className="font-medium text-gray-900 dark:text-white capitalize mr-3">
                                            {dayOfWeek}
                                        </span>
                                        <div className="flex gap-2">
                                            {daySlots.map(slot => (
                                                <span
                                                    key={slot._id}
                                                    className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                                                >
                                                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {daySlots.map(slot => (
                                            <button
                                                key={slot._id}
                                                onClick={() => handleDeleteSlot(slot._id)}
                                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Slot Modal */}
            {showAddSlot && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                {selectedDate ? `Add slot for ${selectedDate.dayName}` : 'Add Availability Slot'}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Day of Week
                                    </label>
                                    <select
                                        value={newSlot.dayOfWeek}
                                        onChange={(e) => setNewSlot({...newSlot, dayOfWeek: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">Select day</option>
                                        {daysOfWeek.map(day => (
                                            <option key={day} value={day} className="capitalize">
                                                {dayNames[daysOfWeek.indexOf(day)]}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Start Time
                                        </label>
                                        <input
                                            type="time"
                                            value={newSlot.startTime}
                                            onChange={(e) => setNewSlot({...newSlot, startTime: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            End Time
                                        </label>
                                        <input
                                            type="time"
                                            value={newSlot.endTime}
                                            onChange={(e) => setNewSlot({...newSlot, endTime: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowAddSlot(false);
                                        setSelectedDate(null);
                                        setNewSlot({ dayOfWeek: '', startTime: '', endTime: '' });
                                    }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddSlot}
                                    disabled={saving}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    {saving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Add Slot
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AvailabilityCalendar;