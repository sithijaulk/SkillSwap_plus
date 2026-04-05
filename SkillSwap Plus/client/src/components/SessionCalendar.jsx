import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Video, Users, User, X } from 'lucide-react';
import api from '../services/api';
import Modal from './common/Modal';

const SessionCalendar = ({ role = 'learner', userId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSlotSessions, setSelectedSlotSessions] = useState([]);
    const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
    const [hoveredSession, setHoveredSession] = useState(null);
    const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        fetchSessions();
    }, [currentDate, role, userId]);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            let urls = [];
            if (role === 'mentor') {
                urls.push('/mentor-dashboard/sessions/created');
                urls.push('/mentor-dashboard/sessions/joined');
            } else {
                urls.push('/learner-dashboard/sessions/joined');
            }

            const responses = await Promise.all(
                urls.map(url => api.get(url).catch(() => ({ data: { data: [] } })))
            );

            // Merge and remove duplicates
            const allSessions = [];
            const seenIds = new Set();
            for (const res of responses) {
                const data = res.data?.data || [];
                for (const session of data) {
                    if (!seenIds.has(session._id)) {
                        seenIds.add(session._id);
                        allSessions.push(session);
                    }
                }
            }

            setSessions(allSessions);
        } catch (error) {
            console.error('Error fetching calendar sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    const getSessionsForDay = (date) => {
        if (!date) return [];
        return sessions.filter(session => {
            if (!session.scheduledDate) return false;
            const sessionDate = new Date(session.scheduledDate);
            return sessionDate.getFullYear() === date.getFullYear() &&
                   sessionDate.getMonth() === date.getMonth() &&
                   sessionDate.getDate() === date.getDate();
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'scheduled': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'live': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'completed': return 'bg-slate-100 text-slate-800 border-slate-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const handleSessionHover = (e, session) => {
        if (window.innerWidth >= 768) { // Only hover on desktop
            const rect = e.currentTarget.getBoundingClientRect();
            setHoverPosition({ x: rect.right + 10, y: rect.top });
            setHoveredSession(session);
        }
    };

    const handleSessionLeave = () => {
        if (window.innerWidth >= 768) {
            setHoveredSession(null);
        }
    };

    const handleDayClick = (daySessions) => {
        if (window.innerWidth < 768 && daySessions.length > 0) { // Mobile tap
            setSelectedSlotSessions(daySessions);
            setIsMobileModalOpen(true);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 w-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <CalendarIcon className="h-6 w-6 mr-2 text-indigo-500" />
                    Session Calendar
                </h2>
                <div className="flex items-center space-x-4">
                    <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <span className="text-lg font-medium text-gray-900 dark:text-white min-w-[140px] text-center">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center font-medium text-gray-500 dark:text-gray-400 py-2 text-xs md:text-sm">
                            {day}
                        </div>
                    ))}
                    {days.map((date, index) => {
                        const daySessions = getSessionsForDay(date);
                        const isToday = date && new Date().toDateString() === date.toDateString();

                        return (
                            <div
                                key={index}
                                onClick={() => handleDayClick(daySessions)}
                                className={`min-h-[80px] md:min-h-[120px] p-1 md:p-2 border rounded-lg transition-colors ${
                                    !date ? 'bg-gray-50 dark:bg-gray-900/50 border-transparent' : 
                                    isToday ? 'bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800' :
                                    'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                } cursor-pointer`}
                            >
                                {date && (
                                    <>
                                        <div className={`text-right text-xs md:text-sm font-medium ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'} mb-1 md:mb-2`}>
                                            {date.getDate()}
                                        </div>
                                        <div className="space-y-1">
                                            {daySessions.slice(0, 3).map((session, i) => (
                                                <div
                                                    key={i}
                                                    onMouseEnter={(e) => handleSessionHover(e, session)}
                                                    onMouseLeave={handleSessionLeave}
                                                    className={`text-[10px] md:text-xs p-1 rounded border truncate ${getStatusColor(session.status)}`}
                                                >
                                                    {session.startTime} - {session.topic || session.skill}
                                                </div>
                                            ))}
                                            {daySessions.length > 3 && (
                                                <div className="text-[10px] md:text-xs text-center text-gray-500 font-medium">
                                                    +{daySessions.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Desktop Hover Tooltip */}
            {hoveredSession && window.innerWidth >= 768 && (
                <div
                    className="fixed z-50 bg-white dark:bg-gray-800 shadow-xl rounded-xl p-4 w-72 border border-gray-100 dark:border-gray-700 animate-in fade-in"
                    style={{ left: hoverPosition.x, top: Math.max(hoverPosition.y - 50, 0) }}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(hoveredSession.status)} capitalize`}>
                            {hoveredSession.status}
                        </span>
                        <span className="text-xs text-gray-500 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {hoveredSession.isGroupSession ? 'Group' : '1-on-1'}
                        </span>
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
                        {hoveredSession.topic || hoveredSession.skill}
                    </h4>
                    <div className="space-y-1.5 mt-3">
                        <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                            <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                            {hoveredSession.startTime} - {hoveredSession.endTime} ({hoveredSession.duration} mins)
                        </div>
                        {hoveredSession.isGroupSession && (
                            <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                                <Users className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                {hoveredSession.currentParticipantsCount || 0} / {hoveredSession.capacity || '∞'} Participants
                            </div>
                        )}
                        {!hoveredSession.isGroupSession && hoveredSession.mentor && (
                            <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                                <User className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                Host: {hoveredSession.mentor?.firstName || 'Mentor'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mobile Modal */}
            <Modal
                isOpen={isMobileModalOpen}
                onClose={() => setIsMobileModalOpen(false)}
                title="Sessions on this Day"
            >
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {selectedSlotSessions.map((session, idx) => (
                        <div key={idx} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                                    {session.topic || session.skill}
                                </h4>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(session.status)} capitalize`}>
                                    {session.status}
                                </span>
                            </div>
                            <div className="space-y-2 mt-3">
                                <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                    {session.startTime} - {session.endTime} ({session.duration} mins)
                                </div>
                                <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                                    <Video className="w-4 h-4 mr-2 text-gray-400" />
                                    {session.isGroupSession ? 'Group Session' : '1-on-1 Session'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

export default SessionCalendar;
