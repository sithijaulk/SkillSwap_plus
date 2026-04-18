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
    ChevronRight,
    AlertTriangle,
    Edit2
} from 'lucide-react';

const AvailabilityCalendar = ({ mentorId, readOnly = false, title = 'Availability Calendar' }) => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [availability, setAvailability] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showAddSlot, setShowAddSlot] = useState(false);
    const [editingSlotId, setEditingSlotId] = useState(null);
    
    // YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];

    const [newSlot, setNewSlot] = useState({
        date: todayStr,
        startTime: '',
        endTime: ''
    });

    const canEdit = !mentorId && !readOnly;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    useEffect(() => {
        fetchAvailability();
    }, [mentorId]);

    const fetchAvailability = async () => {
        try {
            setLoading(true);
            const url = mentorId ? `/availability/mentor/${mentorId}` : '/availability/my';
            const response = await api.get(url);
            const data = response.data.data || [];
            // Filter out invalid slots that don't have a valid date property
            const validSlots = data.filter(slot => slot.date && !isNaN(new Date(slot.date).getTime()));
            setAvailability(validSlots);
        } catch (error) {
            console.error('Error fetching availability:', error);
            showToast('Failed to load availability', 'error');
        } finally {
            setLoading(false);
        }
    };

    const isSameDate = (d1, d2) => {
        if (!d1 || !d2) return false;
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    };

    const getSlotsForDate = (dateObj) => {
        return availability.filter(slot => {
            if (!slot.date) return false;
            const slotDate = new Date(slot.date);
            return (
                slotDate.getFullYear() === dateObj.getFullYear() &&
                slotDate.getMonth() === dateObj.getMonth() &&
                slotDate.getDate() === dateObj.getDate()
            );
        });
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        const days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const dayDate = new Date(year, month, i);
            const slots = getSlotsForDate(dayDate);

            days.push({
                fullDate: dayDate,
                dateNum: i,
                slots: slots,
                hasAvailability: slots.length > 0,
                isPast: dayDate < new Date(new Date().setHours(0,0,0,0))
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
        if (!canEdit) return;
        if (day.isPast) {
            showToast('Cannot set availability in the past', 'error');
            return;
        }
        
        // Adjust timezone offset to get correct YYYY-MM-DD
        const offset = day.fullDate.getTimezoneOffset()
        const targetDate = new Date(day.fullDate.getTime() - (offset*60*1000))
        const isoDate = targetDate.toISOString().split('T')[0];

        setSelectedDate(day);
        setShowAddSlot(true);
        setNewSlot({
            date: isoDate,
            startTime: '',
            endTime: ''
        });
    };

    const handleAddSlot = async () => {
        if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) {
            showToast('Please fill all date and time fields', 'error');
            return;
        }

        if (newSlot.startTime >= newSlot.endTime) {
            showToast('End time must be after start time', 'error');
            return;
        }

        const slotDate = new Date(newSlot.date);
        slotDate.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);

        if(slotDate < today) {
            showToast('Cannot set availability in the past', 'error');
            return;
        }

        setSaving(true);
        try {
            if (editingSlotId) {
                await api.put(`/availability/${editingSlotId}`, newSlot);
                showToast('Availability slot updated successfully', 'success');
            } else {
                await api.post('/availability', newSlot);
                showToast('Availability slot added successfully', 'success');
            }
            setShowAddSlot(false);
            setEditingSlotId(null);
            setNewSlot({ date: todayStr, startTime: '', endTime: '' });
            fetchAvailability();
        } catch (error) {
            console.error('Error adding slot:', error);
            showToast(error.response?.data?.message || 'Failed to add availability', 'error');
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
        if(!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const days = getDaysInMonth(currentDate);

    // Group current availabilities by Date for the list view
    const sortedAvailability = [...availability].sort((a,b) => new Date(a.date) - new Date(b.date) || a.startTime.localeCompare(b.startTime));
    const groupedAvailability = {};
    sortedAvailability.forEach(slot => {
        const dStr = new Date(slot.date).toDateString();
        if(!groupedAvailability[dStr]) groupedAvailability[dStr] = [];
        groupedAvailability[dStr].push(slot);
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm p-6 lg:p-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center tracking-tight">
                    <Calendar className="h-6 w-6 mr-3 text-indigo-600" />
                    {title}
                </h2>
                {canEdit && (
                    <button
                        onClick={() => {
                            setSelectedDate(null);
                            setShowAddSlot(true);
                            setNewSlot({ date: todayStr, startTime: '', endTime: ''});
                        }}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center shadow-lg shadow-indigo-500/20"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Slot
                    </button>
                )}
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6 bg-slate-50 dark:bg-white/5 p-4 rounded-3xl border border-slate-200 dark:border-white/10">
                <button
                    onClick={handlePrevMonth}
                    className="p-3 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md dark:shadow-none hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition"
                >
                    <ChevronLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                </button>
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                    onClick={handleNextMonth}
                    className="p-3 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md dark:shadow-none hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition"
                >
                    <ChevronRight className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-10">
                {/* Day headers */}
                {dayNames.map(day => (
                    <div key={day} className="p-2 text-center text-xs font-black uppercase text-slate-400 tracking-widest">
                        {day}
                    </div>
                ))}

                {/* Empty cells */}
                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, index) => (
                    <div key={`empty-${index}`} className="p-2"></div>
                ))}

                {/* Calendar days */}
                {days.map(day => (
                    <div
                        key={day.dateNum}
                        className={`min-h-[100px] p-3 border-2 rounded-2xl transition-colors ${
                            day.hasAvailability
                                ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800'
                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/5'
                        } ${day.isPast ? 'opacity-50 cursor-not-allowed bg-slate-50/50' : 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500'}`}
                        onClick={() => handleDateClick(day)}
                    >
                        <div className={`text-sm font-black mb-2 ${day.isPast ? 'text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                            {day.dateNum}
                        </div>
                        {day.hasAvailability && (
                            <div className="flex flex-col gap-1">
                                {day.slots.slice(0,2).map((s,i)=>(
                                    <span key={i} className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded-lg truncate block">
                                        {formatTime(s.startTime)}
                                    </span>
                                ))}
                                {day.slots.length > 2 && (
                                    <span className="text-[10px] font-bold text-slate-500 pl-1">+{day.slots.length-2} more</span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Current Availability List */}
            <div className="border-t border-slate-100 dark:border-white/10 pt-10">
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 tracking-tight">
                    Saved Availability
                </h3>
                {sortedAvailability.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/20 rounded-3xl p-10 text-center">
                        <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium font-bold text-sm">
                            No availability slots mapped yet. Open a date and construct your timeline!
                        </p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(groupedAvailability).map(([dateStr, slots]) => (
                            <div key={dateStr} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-5 rounded-[2rem] shadow-sm">
                                <h4 className="font-black text-slate-800 dark:text-white mb-4 text-sm flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                                    {dateStr}
                                </h4>
                                <div className="space-y-3">
                                    {slots.map(slot => (
                                        <div key={slot._id} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-3 rounded-2xl">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center">
                                                <Clock className="w-3 h-3 mr-2 text-slate-400" />
                                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                            </span>
                                            {canEdit && (
                                                <div className="flex items-center space-x-1">
                                                    <button
                                                        onClick={() => {
                                                            setEditingSlotId(slot._id);
                                                            setNewSlot({
                                                                date: new Date(slot.date).toISOString().split('T')[0],
                                                                startTime: slot.startTime,
                                                                endTime: slot.endTime
                                                            });
                                                            setShowAddSlot(true);
                                                        }}
                                                        className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSlot(slot._id)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Slot Modal */}
            {showAddSlot && canEdit && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
                        <div className="flex items-center justify-between p-8 border-b border-slate-100 dark:border-white/10">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                                    {editingSlotId ? 'Edit Free Slot' : selectedDate ? 'Slot Editor' : 'Create Free Slot'}
                                </h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                                    {editingSlotId ? new Date(newSlot.date).toDateString() : selectedDate ? selectedDate.fullDate.toDateString() : 'Pick any valid date'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAddSlot(false);
                                    setSelectedDate(null);
                                }}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>
                        
                        <div className="p-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                        Active Date
                                    </label>
                                    <input
                                        type="date"
                                        min={todayStr}
                                        value={newSlot.date}
                                        onChange={(e) => setNewSlot({...newSlot, date: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                            Start Time
                                        </label>
                                        <input
                                            type="time"
                                            value={newSlot.startTime}
                                            onChange={(e) => setNewSlot({...newSlot, startTime: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                            End Time
                                        </label>
                                        <input
                                            type="time"
                                            value={newSlot.endTime}
                                            onChange={(e) => setNewSlot({...newSlot, endTime: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-start bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl">
                                        <AlertTriangle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5 mr-3" />
                                        <p className="text-xs text-indigo-800 dark:text-indigo-300 font-medium leading-relaxed">
                                            Availability spans exactly the date indicated. Check conflicts before applying blocks natively against your localized timezone settings!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    onClick={() => {
                                        setShowAddSlot(false);
                                        setSelectedDate(null);
                                    }}
                                    className="px-6 py-3 font-bold rounded-2xl text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                >
                                    Refuse
                                </button>
                                <button
                                    onClick={handleAddSlot}
                                    disabled={saving}
                                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-indigo-500/20 transition"
                                >
                                    {saving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Persisting...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            {editingSlotId ? 'Update Block' : 'Apply Block'}
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