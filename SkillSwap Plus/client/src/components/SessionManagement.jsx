import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Video, Clock, Users, Calendar, MessageSquare, BookOpen, RefreshCw, X, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const SessionManagement = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    // Modal states
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [rescheduleData, setRescheduleData] = useState({
        date: '',
        time: '',
        reason: ''
    });
    const [cancelReason, setCancelReason] = useState('');

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const response = await api.get('/sessions/mentor');
            setSessions(response.data);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            showToast('Failed to load sessions', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (sessionId, newStatus) => {
        try {
            await api.put(`/sessions/${sessionId}/status`, { status: newStatus });
            showToast(`Session ${newStatus} successfully`, 'success');
            fetchSessions(); // Refresh the list
        } catch (error) {
            console.error('Error updating session status:', error);
            showToast('Failed to update session status', 'error');
        }
    };

    const handleRescheduleSession = async () => {
        if (!rescheduleData.date || !rescheduleData.time) {
            showToast('Please select both date and time', 'error');
            return;
        }

        try {
            await api.put(`/sessions/${selectedSession._id}/reschedule`, {
                newDate: rescheduleData.date,
                newTime: rescheduleData.time,
                reason: rescheduleData.reason
            });
            showToast('Session rescheduled successfully', 'success');
            setRescheduleModalOpen(false);
            setSelectedSession(null);
            setRescheduleData({ date: '', time: '', reason: '' });
            fetchSessions();
        } catch (error) {
            console.error('Error rescheduling session:', error);
            showToast('Failed to reschedule session', 'error');
        }
    };

    const handleCancelSession = async () => {
        if (!cancelReason.trim()) {
            showToast('Please provide a reason for cancellation', 'error');
            return;
        }

        try {
            await api.put(`/sessions/${selectedSession._id}/cancel`, {
                reason: cancelReason
            });
            showToast('Session cancelled successfully', 'success');
            setCancelModalOpen(false);
            setSelectedSession(null);
            setCancelReason('');
            fetchSessions();
        } catch (error) {
            console.error('Error cancelling session:', error);
            showToast('Failed to cancel session', 'error');
        }
    };

    const openRescheduleModal = (session) => {
        setSelectedSession(session);
        setRescheduleData({
            date: session.scheduledDate ? new Date(session.scheduledDate).toISOString().split('T')[0] : '',
            time: session.scheduledDate ? new Date(session.scheduledDate).toTimeString().split(' ')[0].substring(0, 5) : '',
            reason: ''
        });
        setRescheduleModalOpen(true);
    };

    const openCancelModal = (session) => {
        setSelectedSession(session);
        setCancelReason('');
        setCancelModalOpen(true);
    };

    const handleGenerateMeetingLink = async (sessionId) => {
        try {
            const response = await api.post(`/sessions/${sessionId}/generate-link`);
            showToast('Meeting link generated successfully', 'success');
            fetchSessions(); // Refresh to show the new link
        } catch (error) {
            console.error('Error generating meeting link:', error);
            showToast('Failed to generate meeting link', 'error');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-amber-500';
            case 'scheduled': return 'bg-indigo-500';
            case 'live': return 'bg-emerald-500';
            case 'completed': return 'bg-slate-500';
            case 'cancelled': return 'bg-red-500';
            default: return 'bg-slate-500';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return 'Pending Approval';
            case 'scheduled': return 'Scheduled';
            case 'live': return 'Live Now';
            case 'completed': return 'Completed';
            case 'cancelled': return 'Cancelled';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-xl">
                    <div className="animate-pulse">
                        <div className="h-8 bg-slate-200 dark:bg-white/10 rounded-2xl mb-6"></div>
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-20 bg-slate-200 dark:bg-white/10 rounded-2xl"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const pendingSessions = sessions.filter(s => s.status === 'pending');
    const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
    const completedSessions = sessions.filter(s => s.status === 'completed');

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Pending Sessions */}
            {pendingSessions.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-xl">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">Pending Requests</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Sessions awaiting your approval</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {pendingSessions.map((session) => (
                            <div key={session._id} className="border border-slate-200 dark:border-white/10 rounded-2xl p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center font-black text-lg">
                                            {session.learner?.firstName?.[0]}{session.learner?.lastName?.[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white capitalize">
                                                {session.learner?.firstName} {session.learner?.lastName}
                                            </h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{session.learner?.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={() => handleUpdateStatus(session._id, 'scheduled')}
                                            className="flex items-center space-x-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Accept</span>
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(session._id, 'cancelled')}
                                            className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-600 transition-all"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            <span>Decline</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4 mb-4">
                                    <div className="flex items-center space-x-2">
                                        <BookOpen className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">
                                            {session.skill?.title}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {new Date(session.scheduledDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {new Date(session.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                {session.message && (
                                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl">
                                        <div className="flex items-start space-x-2">
                                            <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Message</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">{session.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming Sessions */}
            {upcomingSessions.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-xl">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                            <Video className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">Upcoming Sessions</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Scheduled sessions ready to start</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {upcomingSessions.map((session) => (
                            <div key={session._id} className="border border-slate-200 dark:border-white/10 rounded-2xl p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center font-black text-lg">
                                            {session.learner?.firstName?.[0]}{session.learner?.lastName?.[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white capitalize">
                                                {session.learner?.firstName} {session.learner?.lastName}
                                            </h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{session.learner?.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        {!session.meetingLink ? (
                                            <button
                                                onClick={() => handleGenerateMeetingLink(session._id)}
                                                className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-600 transition-all"
                                            >
                                                <Video className="w-4 h-4" />
                                                <span>Generate Link</span>
                                            </button>
                                        ) : (
                                            <a
                                                href={session.meetingLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center space-x-2 bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-600 transition-all"
                                            >
                                                <Video className="w-4 h-4" />
                                                <span>Join Session</span>
                                            </a>
                                        )}
                                        <button
                                            onClick={() => openRescheduleModal(session)}
                                            className="flex items-center space-x-2 bg-amber-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-600 transition-all"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            <span>Reschedule</span>
                                        </button>
                                        <button
                                            onClick={() => openCancelModal(session)}
                                            className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-600 transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                            <span>Cancel</span>
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(session._id, 'completed')}
                                            className="flex items-center space-x-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Mark Complete</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="flex items-center space-x-2">
                                        <BookOpen className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">
                                            {session.skill?.title}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {new Date(session.scheduledDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {new Date(session.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Sessions */}
            {completedSessions.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-xl">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">Completed Sessions</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Successfully completed mentoring sessions</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {completedSessions.map((session) => (
                            <div key={session._id} className="border border-slate-200 dark:border-white/10 rounded-2xl p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-slate-500/10 text-slate-500 rounded-2xl flex items-center justify-center font-black text-lg">
                                            {session.learner?.firstName?.[0]}{session.learner?.lastName?.[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white capitalize">
                                                {session.learner?.firstName} {session.learner?.lastName}
                                            </h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{session.learner?.email}</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold uppercase rounded-lg">
                                        Completed
                                    </span>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="flex items-center space-x-2">
                                        <BookOpen className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">
                                            {session.skill?.title}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {new Date(session.scheduledDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {new Date(session.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {sessions.length === 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-12 rounded-[2.5rem] shadow-xl text-center">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Video className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">No Sessions Yet</h3>
                    <p className="text-slate-500 dark:text-slate-400">Your mentoring sessions will appear here once learners start booking.</p>
                </div>
            )}

            {/* Reschedule Modal */}
            {rescheduleModalOpen && selectedSession && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full">
                        <div className="flex items-center justify-between p-8 border-b border-slate-200 dark:border-white/10">
                            <div className="flex items-center space-x-3">
                                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                                    <RefreshCw className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 dark:text-white">Reschedule Session</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Update session date and time</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setRescheduleModalOpen(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                                    New Date
                                </label>
                                <input
                                    type="date"
                                    value={rescheduleData.date}
                                    onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                                    New Time
                                </label>
                                <input
                                    type="time"
                                    value={rescheduleData.time}
                                    onChange={(e) => setRescheduleData({...rescheduleData, time: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                                    Reason for Reschedule (Optional)
                                </label>
                                <textarea
                                    value={rescheduleData.reason}
                                    onChange={(e) => setRescheduleData({...rescheduleData, reason: e.target.value})}
                                    placeholder="Let the learner know why you need to reschedule..."
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-3 p-8 border-t border-slate-200 dark:border-white/10">
                            <button
                                onClick={() => setRescheduleModalOpen(false)}
                                className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRescheduleSession}
                                className="px-6 py-3 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 transition-all flex items-center space-x-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>Reschedule</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {cancelModalOpen && selectedSession && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full">
                        <div className="flex items-center justify-between p-8 border-b border-slate-200 dark:border-white/10">
                            <div className="flex items-center space-x-3">
                                <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 dark:text-white">Cancel Session</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setCancelModalOpen(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 p-4 rounded-2xl mb-6">
                                <div className="flex items-start space-x-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-red-700 dark:text-red-400">Important Notice</p>
                                        <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                                            Cancelling this session will notify the learner and may affect your mentor rating.
                                            Please provide a clear reason for the cancellation.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                                    Reason for Cancellation *
                                </label>
                                <textarea
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Please explain why you need to cancel this session..."
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                                    rows={4}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-3 p-8 border-t border-slate-200 dark:border-white/10">
                            <button
                                onClick={() => setCancelModalOpen(false)}
                                className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                            >
                                Keep Session
                            </button>
                            <button
                                onClick={handleCancelSession}
                                className="px-6 py-3 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all flex items-center space-x-2"
                            >
                                <X className="w-4 h-4" />
                                <span>Cancel Session</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionManagement;