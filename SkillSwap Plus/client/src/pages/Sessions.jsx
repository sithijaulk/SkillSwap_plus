import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, DollarSign, MapPin, BookOpen } from 'lucide-react';

const Sessions = () => {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const categories = ['all', 'workshop', 'masterclass', 'group_class', 'webinar'];

    useEffect(() => {
        fetchSessions();
    }, [categoryFilter, searchQuery]);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (categoryFilter !== 'all') params.append('category', categoryFilter);

            const response = await api.get(`/sessions/programs/list?${params.toString()}`);
            if (response.data.success) {
                setSessions(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinSession = async (sessionId) => {
        if (!isAuthenticated) {
            navigate('/auth/login');
            return;
        }

        try {
            const response = await api.post(`/sessions/${sessionId}/join`);
            if (response.data.success) {
                alert('Successfully joined session!');
                // Optionally refresh the sessions list
                fetchSessions();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to join session');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    return (
        <div className="pt-32 pb-20 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4">Explore Sessions</h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400">Join interactive workshops, masterclasses, and group learning sessions</p>
                </div>

                {/* Search and Filters */}
                <div className="mb-8 space-y-4">
                    <input
                        type="text"
                        placeholder="Search sessions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    categoryFilter === cat
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sessions Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 animate-pulse h-96">
                                <div className="bg-slate-200 dark:bg-slate-700 h-48 rounded-lg mb-4"></div>
                                <div className="bg-slate-200 dark:bg-slate-700 h-4 rounded mb-3"></div>
                                <div className="bg-slate-200 dark:bg-slate-700 h-4 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-16">
                        <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4"/>
                        <p className="text-slate-600 dark:text-slate-400 text-lg">No sessions found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sessions.map(session => (
                            <SessionCard 
                                key={session._id} 
                                session={session}
                                onJoin={handleJoinSession}
                                isAuthenticated={isAuthenticated}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const SessionCard = ({ session, onJoin, isAuthenticated }) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
            {/* Cover Image or Placeholder */}
            <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-white opacity-50" />
            </div>

            {/* Content */}
            <div className="p-6">
                {/* Category Badge */}
                <div className="mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full">
                        {session.sessionCategory}
                    </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
                    {session.topic}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {session.description}
                </p>

                {/* Mentor Info */}
                <div className="flex items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold mr-2">
                        {session.creator?.firstName?.[0] || 'M'}
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                        {session.creator?.firstName} {session.creator?.lastName}
                    </span>
                </div>

                {/* Session Details */}
                <div className="space-y-2 mb-6 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
                        {new Date(session.scheduledDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-indigo-600" />
                        {session.startTime} - {session.endTime}
                    </div>
                    {session.capacity && (
                        <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-indigo-600" />
                            {session.currentParticipantsCount || 0} / {session.capacity} participants
                        </div>
                    )}
                </div>

                {/* Price & Join Button */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        {session.amount > 0 ? (
                            <>
                                <DollarSign className="w-4 h-4 text-indigo-600 mr-1" />
                                <span className="font-bold text-slate-900 dark:text-white">${session.amount}</span>
                            </>
                        ) : (
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">FREE</span>
                        )}
                    </div>
                    <button
                        onClick={() => onJoin(session._id)}
                        disabled={!isAuthenticated}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        Join
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sessions;
