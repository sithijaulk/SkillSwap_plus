import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import feedbackApi from '../../services/feedbackApi';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import MentorSkills from '../mentor/MentorSkills';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';
import SessionManagement from '../../components/SessionManagement';
import {
    LayoutDashboard,
    BookOpen,
    DollarSign,
    User,
    Video,
    CheckCircle,
    XCircle,
    Clock,
    ArrowUpRight,
    Plus,
    Trash2,
    ExternalLink,
    FileText,
    Link as LinkIcon,
    Headphones,
    Star,
    ShieldCheck,
    Calendar
} from 'lucide-react';
import SupportTickets from '../../components/SupportTickets';

const MentorDashboard = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'overview';

    const setActiveTab = (tab) => {
        setSearchParams({ tab });
    };

    const [sessions, setSessions] = useState([]);
    const [skills, setSkills] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [newMaterial, setNewMaterial] = useState({ title: '', type: 'video', url: '', description: '' });
    const [loading, setLoading] = useState(true);
    const [payouts, setPayouts] = useState([]);
    const [financeSummary, setFinanceSummary] = useState({ pending: 0, paid: 0, totalFees: 0, totalNet: 0 });
    const [statsData, setStatsData] = useState({});

    const [mentorFeedback, setMentorFeedback] = useState([]);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [assessmentInsights, setAssessmentInsights] = useState({
        totalReports: 0,
        averageScore: 0,
        weakAreas: [],
        recentReports: [],
        learnerRankings: [],
        programTypeFilters: [],
        finalizedReports: 0,
    });
    const [mentorMpsScore, setMentorMpsScore] = useState(Number(user?.mps || 0));
    const [mentorGrade, setMentorGrade] = useState(user?.grade || 'None');
    const [mpsTrend, setMpsTrend] = useState([]);
    const [selectedRankingProgramType, setSelectedRankingProgramType] = useState('all');

    const menuItems = [
        { label: 'Overview', path: '/mentor/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
        { label: 'My Skills', path: '/mentor/dashboard', icon: <BookOpen className="w-5 h-5" />, tab: 'my skills' },
        { label: 'Availability', path: '/mentor/dashboard', icon: <Calendar className="w-5 h-5" />, tab: 'availability' },
        { label: 'Sessions', path: '/mentor/dashboard', icon: <Video className="w-5 h-5" />, tab: 'sessions' },
        { label: 'Earnings', path: '/mentor/dashboard', icon: <DollarSign className="w-5 h-5" />, tab: 'earned income' },
        { label: 'Materials Hub', path: '/mentor/dashboard', icon: <BookOpen className="w-5 h-5" />, tab: 'materials' },
        { label: 'Feedback', path: '/mentor/dashboard', icon: <Star className="w-5 h-5" />, tab: 'feedback' },
        { label: 'Support Hub', path: '/mentor/dashboard', icon: <Headphones className="w-5 h-5" />, tab: 'support hub' },
        { label: 'Profile', path: '/mentor/dashboard', icon: <User className="w-5 h-5" />, tab: 'profile' },
    ];

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (activeTab !== 'feedback') return;
        if (mentorFeedback.length > 0) return;

        let cancelled = false;

        (async () => {
            setFeedbackLoading(true);
            try {
                const res = await feedbackApi.getMentorFeedback();
                const data = res?.data?.data || [];
                if (!cancelled) setMentorFeedback(data);
            } catch (e) {
                if (!cancelled) console.error('Error fetching mentor feedback:', e);
            } finally {
                if (!cancelled) setFeedbackLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeTab]);

    const fetchData = async () => {
        try {
            const [statsRes, skillRes, sessionRes, financeRes, materialRes, assessmentRes, meRes, mentorEvaluationRes] = await Promise.all([
                api.get('/users/stats').catch(() => ({ data: { success: false } })),
                api.get('/skills/my').catch(() => ({ data: { success: false } })),
                api.get('/sessions').catch(() => ({ data: { success: false } })),
                api.get('/mentors/me/finance').catch(() => ({ data: { success: false } })),
                api.get('/materials/my').catch(() => ({ data: { success: false } })),
                api.get('/assessment/mentor/insights').catch(() => ({ data: { success: false, data: {} } })),
                api.get('/auth/me').catch(() => ({ data: { success: false, data: null } })),
                api.get('/mentor-evaluation/reports/my?status=evaluated').catch(() => ({ data: { success: false, data: { reports: [] } } })),
            ]);
            if (statsRes.data?.success) setStatsData(statsRes.data.data);
            if (skillRes.data?.success) setSkills(skillRes.data.data);
            if (sessionRes.data?.success) setSessions(sessionRes.data.data);
            if (financeRes.data?.success) setFinanceSummary(financeRes.data.data);
            if (materialRes.data?.success) setMaterials(materialRes.data.data);
            if (assessmentRes.data?.success) setAssessmentInsights(assessmentRes.data.data || {});
            if (meRes.data?.success && meRes.data?.data) {
                setMentorMpsScore(Number(meRes.data.data.mps || 0));
                setMentorGrade(meRes.data.data.grade || 'None');
            }
            if (mentorEvaluationRes.data?.success) {
                const evaluatedReports = Array.isArray(mentorEvaluationRes.data?.data?.reports)
                    ? mentorEvaluationRes.data.data.reports
                    : [];

                const trend = evaluatedReports
                    .filter((report) => report?.supervisorReview?.isFinalized)
                    .sort((a, b) => new Date(b?.supervisorReview?.reviewedAt || b?.updatedAt) - new Date(a?.supervisorReview?.reviewedAt || a?.updatedAt))
                    .slice(0, 3)
                    .map((report) => ({
                        id: report._id,
                        period: report.reportPeriod || 'Period',
                        score: Number(report?.supervisorReview?.finalMpsScore || 0),
                    }));

                setMpsTrend(trend);
            }
        } catch (error) {
            console.error('Error fetching mentor data:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderMpsStars = (score) => {
        const normalized = Math.max(0, Math.min(5, Number(score || 0)));

        return Array.from({ length: 5 }).map((_, index) => {
            const starIndex = index + 1;
            const full = normalized >= starIndex;
            const half = !full && normalized >= (starIndex - 0.5);

            return (
                <span key={starIndex} className="relative inline-flex">
                    <Star className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                    {full && <Star className="w-5 h-5 text-amber-500 fill-current absolute inset-0" />}
                    {half && (
                        <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                            <Star className="w-5 h-5 text-amber-500 fill-current" />
                        </span>
                    )}
                </span>
            );
        });
    };

    const handleUpdateStatus = async (sessionId, status) => {
        try {
            const response = await api.put(`/sessions/${sessionId}/status`, { status });
            if (response.data.success) {
                setSessions((prev) => prev.map((s) => (s._id === sessionId ? response.data.data : s)));
            }
        } catch (error) {
            alert(error?.response?.data?.message || 'Error updating session status');
        }
    };

    const formatSessionDateTime = (scheduledDate) => {
        if (!scheduledDate) return 'Not scheduled yet';

        const d = new Date(scheduledDate);
        if (Number.isNaN(d.getTime())) return 'Not scheduled yet';

        return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    const dashboardStats = [
        { label: 'Total Earnings', value: `Rs. ${financeSummary.totalNet?.toLocaleString()}`, sub: 'Net (75% of Gross)', icon: <DollarSign className="text-emerald-500" />, color: 'emerald' },
        { label: 'MPS Rating', value: (mentorMpsScore || 0).toFixed(2), sub: `Grade: ${mentorGrade || 'None'}`, icon: <Star className="text-amber-500" />, color: 'amber' },
        { label: 'Active Skills', value: skills.length, sub: 'Currently listed', icon: <BookOpen className="text-indigo-500" />, color: 'indigo' },
        { label: 'Pending Payout', value: `Rs. ${financeSummary.pending?.toLocaleString()}`, sub: 'In platform treasury', icon: <Clock className="text-orange-500" />, color: 'orange' },
    ];

    const rankingProgramTypeOptions = useMemo(() => {
        return Array.isArray(assessmentInsights?.programTypeFilters)
            ? assessmentInsights.programTypeFilters
            : [];
    }, [assessmentInsights]);

    const filteredLearnerRankings = useMemo(() => {
        const rankings = Array.isArray(assessmentInsights?.learnerRankings)
            ? assessmentInsights.learnerRankings
            : [];

        if (selectedRankingProgramType === 'all') return rankings;

        return rankings.filter(
            (item) => String(item?.programCategory || '').toLowerCase() === selectedRankingProgramType.toLowerCase()
        );
    }, [assessmentInsights, selectedRankingProgramType]);

    const handleAddMaterial = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/materials', newMaterial);
            if (res.data.success) {
                setMaterials([...materials, res.data.data]);
                setNewMaterial({ title: '', type: 'video', url: '', description: '' });
            }
        } catch (error) {
            alert('Error adding material');
        }
    };

    if (loading) return <div className="pt-32 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
            <Sidebar menuItems={menuItems} />
            <main className="flex-grow lg:ml-72 pt-32 p-8">
                <div className="max-w-6xl mx-auto">
                    <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Mentor Dashboard</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium italic">Empowering the next generation of scholars.</p>
                        </div>
                        <button 
                            onClick={() => setActiveTab('my skills')}
                            className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-2xl flex items-center space-x-2 shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add New Skill</span>
                        </button>
                    </header>

                    {/* Stats Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {dashboardStats.map((stat, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                                <div className="flex items-center space-x-4 mb-4 relative z-10">
                                    <div className={`p-3 rounded-2xl bg-white dark:bg-white/5`}>
                                        {stat.icon}
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                </div>
                                <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors relative z-10">{stat.value}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter relative z-10">{stat.sub}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex border-b border-slate-200 dark:border-white/5 mb-10 overflow-x-auto no-scrollbar">
                        {['Overview', 'My Skills', 'Availability', 'Sessions', 'Earnings', 'Materials Hub', 'Feedback', 'Support Hub'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase())}
                                className={`pb-4 px-8 text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.toLowerCase() ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 shadow-sm">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Current MPS Rating</p>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-3xl font-black text-slate-900 dark:text-white">{Number(mentorMpsScore || 0).toFixed(2)} / 5</span>
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                                                {mentorGrade || 'None'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {renderMpsStars(mentorMpsScore)}
                                        </div>
                                    </div>

                                    <div className="lg:w-1/2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Last 3 Evaluations</p>
                                        {mpsTrend.length > 0 ? (
                                            <div className="space-y-2">
                                                {mpsTrend.map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-2">
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.period}</p>
                                                        <div className="inline-flex items-center gap-2">
                                                            <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                                                            <span className="text-xs font-black text-slate-900 dark:text-white">{Number(item.score || 0).toFixed(2)} / 5</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs italic text-slate-500">No finalized mentor evaluation trend available yet.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                             <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Scholar</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Skill</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Date/Time</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Status</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {sessions.map((s) => (
                                            <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white capitalize">{s.learner?.firstName} {s.learner?.lastName}</p>
                                                    <p className="text-[10px] text-slate-500">{s.learner?.email}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">{s.skill?.title || s.skill || s.topic || 'Session'}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                                    {formatSessionDateTime(s.scheduledDate || s.date)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {(() => {
                                                        const status = String(s.status || '').toLowerCase();
                                                        return (
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                        status === 'completed' ? 'bg-emerald-500 text-white' : 
                                                        status === 'scheduled' ? 'bg-indigo-500 text-white' : 
                                                        status === 'cancelled' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                                                    }`}>
                                                        {status || 'pending'}
                                                    </span>
                                                        );
                                                    })()}
                                                </td>
                                                 <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end items-center space-x-4">
                                                        {['pending', 'accepted', 'enrolled'].includes(String(s.status || '').toLowerCase()) && (
                                                            <>
                                                                <button onClick={() => handleUpdateStatus(s._id, 'scheduled')} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all"><CheckCircle className="w-5 h-5" /></button>
                                                                <button onClick={() => handleUpdateStatus(s._id, 'cancelled')} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"><XCircle className="w-5 h-5" /></button>
                                                            </>
                                                        )}
                                                        {(['scheduled', 'live'].includes(String(s.status || '').toLowerCase())) && (
                                                            <div className="flex items-center space-x-3">
                                                                {s.meetingLink && (
                                                                    <a href={s.meetingLink} target="_blank" rel="noreferrer" className="flex items-center space-x-1 text-[10px] font-black text-indigo-600 uppercase hover:underline">
                                                                        <Video className="w-4 h-4" />
                                                                        <span>Join Live</span>
                                                                    </a>
                                                                )}
                                                                <button onClick={() => handleUpdateStatus(s._id, 'completed')} className="text-[10px] font-black text-emerald-600 uppercase hover:underline">Mark Done</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Learner Progress Insights</h3>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Reports: {assessmentInsights?.totalReports || 0}
                                    </span>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Average Assessment Score</p>
                                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{Number(assessmentInsights?.averageScore || 0).toFixed(1)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Top Weak Areas</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {(assessmentInsights?.weakAreas || []).slice(0, 3).map((w) => (
                                                <span key={w.area} className="px-2 py-1 rounded-lg bg-white/70 dark:bg-slate-900/40 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                                    {w.area} ({w.count})
                                                </span>
                                            ))}
                                            {(assessmentInsights?.weakAreas || []).length === 0 && (
                                                <span className="text-xs text-amber-700 dark:text-amber-300">No weak areas identified yet.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                                    <div className="p-4 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-black text-slate-900 dark:text-white">Learners Ranking</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                Showing only Academic Supervision finalized assessment grades
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Program Type</label>
                                            <select
                                                value={selectedRankingProgramType}
                                                onChange={(e) => setSelectedRankingProgramType(e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200"
                                            >
                                                <option value="all">All Types</option>
                                                {rankingProgramTypeOptions.map((type) => (
                                                    <option key={type} value={type}>{type}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10">
                                                <tr>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Rank</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Learner</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Program</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Score</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Grade</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Finalized</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                {filteredLearnerRankings.map((item, index) => (
                                                    <tr key={item.reportId || `${item.learnerId}-${item.programId}`} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                                        <td className="px-4 py-3 text-xs font-black text-slate-800 dark:text-white">#{index + 1}</td>
                                                        <td className="px-4 py-3">
                                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{item.learnerName || 'Learner'}</p>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.learnerEmail || 'No email'}</p>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.programTitle || 'Program'}</p>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.programCategory || 'other'}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-black text-emerald-700 dark:text-emerald-300">{Number(item.score || 0).toFixed(1)}</td>
                                                        <td className="px-4 py-3 text-xs font-black text-indigo-700 dark:text-indigo-300">{item.grade || 'N/A'}</td>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                            {item.finalizedAt ? new Date(item.finalizedAt).toLocaleDateString() : 'N/A'}
                                                        </td>
                                                    </tr>
                                                ))}

                                                {filteredLearnerRankings.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-8 text-center text-xs font-medium italic text-slate-500 dark:text-slate-400">
                                                            No finalized learner rankings available for this program type.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'earnings' && (
                        <div className="space-y-12 animate-in slide-in-from-bottom-5 duration-500">
                            {/* Detailed Stats */}
                            <div className="grid md:grid-cols-3 gap-8">
                                {[
                                    { label: 'Net Earnings', value: `Rs. ${financeSummary.totalNet?.toLocaleString()}`, sub: 'Lifetime Total', icon: <DollarSign />, color: 'indigo' },
                                    { label: 'Platform Fee (25%)', value: `Rs. ${financeSummary.totalFees?.toLocaleString()}`, sub: 'Deducted At Source', icon: <ArrowUpRight />, color: 'red' },
                                    { label: 'Pending Payout', value: `Rs. ${financeSummary.pending?.toLocaleString()}`, sub: 'Accessible next cycle', icon: <Clock />, color: 'orange' },
                                ].map((s, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                                        <div className={`p-4 rounded-2xl bg-${s.color}-500/10 text-${s.color}-500 w-fit mb-6`}>{s.icon}</div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                        <h4 className="text-3xl font-black text-slate-800 dark:text-white mb-1">
                                            {s.value}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{s.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Earnings breakdown info */}
                            <div className="bg-indigo-600 p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div>
                                        <h3 className="text-2xl font-black mb-2 tracking-tight">System Transparency</h3>
                                        <p className="text-indigo-100 text-sm italic max-w-lg">Every session you conduct follows a 75/25 split. 75% goes directly to you as a scholar, and 25% is retained by SkillSwap+ to maintain the platform and university infrastructure.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="bg-white/10 border border-white/20 p-4 rounded-2xl text-center backdrop-blur-md">
                                            <p className="text-[10px] uppercase font-black mb-1">Your Share</p>
                                            <p className="text-2xl font-black">75%</p>
                                        </div>
                                        <div className="bg-white/10 border border-white/20 p-4 rounded-2xl text-center backdrop-blur-md opacity-60">
                                            <p className="text-[10px] uppercase font-black mb-1">Markup Fee</p>
                                            <p className="text-2xl font-black">25%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'my skills' && <MentorSkills skills={skills} onUpdate={fetchData} />}

                    {activeTab === 'availability' && <AvailabilityCalendar />}

                    {activeTab === 'sessions' && <SessionManagement />}

                    {activeTab === 'materials hub' && (
                        <div className="grid lg:grid-cols-3 gap-10 animate-in fade-in duration-500">
                            <div className="lg:col-span-2 space-y-6">
                                {materials.map(m => (
                                    <div key={m._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] flex items-center justify-between group">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-600 transition-all">
                                                {m.type === 'video' ? <Video /> : m.type === 'pdf' ? <FileText /> : <LinkIcon />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white capitalize">{m.title}</h4>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{m.type} • {m.category || 'General'}</p>
                                            </div>
                                        </div>
                                        <a href={m.url} target="_blank" rel="noreferrer" className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors">
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    </div>
                                ))}
                                {materials.length === 0 && <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/10 italic text-slate-500">Empty library.</div>}
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-xl h-fit">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Add Resource</h3>
                                <form onSubmit={handleAddMaterial} className="space-y-4">
                                    <input required value={newMaterial.title} onChange={e => setNewMaterial({...newMaterial, title: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm" placeholder="Title" />
                                    <select value={newMaterial.type} onChange={e => setNewMaterial({...newMaterial, type: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm">
                                        <option value="video">Video</option>
                                        <option value="pdf">PDF</option>
                                        <option value="link">Link</option>
                                    </select>
                                    <input required value={newMaterial.url} onChange={e => setNewMaterial({...newMaterial, url: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm" placeholder="URL" />
                                    <button className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/20">Publish</button>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'feedback' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-sm">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Learner Feedback</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">Reviews submitted after completed sessions.</p>
                            </div>

                            {feedbackLoading && (
                                <div className="pt-10 flex justify-center">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                                </div>
                            )}

                            {!feedbackLoading && mentorFeedback.length === 0 && (
                                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/10 italic text-slate-500">
                                    No feedback received yet.
                                </div>
                            )}

                            {!feedbackLoading && mentorFeedback.length > 0 && (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {mentorFeedback.map((f) => {
                                        const learnerName = f.isAnonymous
                                            ? 'Anonymous Learner'
                                            : `${f.learnerId?.firstName || ''} ${f.learnerId?.lastName || ''}`.trim() || 'Learner';

                                        const sessionSkillOrTopic = f.sessionId?.skill || f.sessionId?.topic || 'Session';
                                        const sessionDateRaw = f.sessionId?.scheduledDate || f.sessionId?.date;
                                        const sessionDate = sessionDateRaw ? new Date(sessionDateRaw).toLocaleDateString() : null;
                                        const sessionTime = f.sessionId?.time || (sessionDateRaw ? new Date(sessionDateRaw).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);
                                        const sessionShortId = (f.sessionId?._id || f.sessionId)?.toString?.().slice(-6);

                                        return (
                                            <div key={f._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-sm">
                                                <div className="flex items-start justify-between gap-4 mb-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Session</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                                                            {sessionSkillOrTopic}
                                                            {sessionDate ? ` | ${sessionDate}` : ''}
                                                            {sessionShortId ? ` | ID: ${sessionShortId}` : ''}
                                                            {sessionTime ? ` | ${sessionTime}` : ''}
                                                        </p>

                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">From</p>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-white capitalize">{learnerName}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {Array.from({ length: 5 }).map((_, idx) => (
                                                            <Star
                                                                key={idx}
                                                                className={`w-4 h-4 ${idx + 1 <= (f.rating || 0) ? 'text-amber-500' : 'text-slate-200 dark:text-slate-700'}`}
                                                                fill={idx + 1 <= (f.rating || 0) ? 'currentColor' : 'none'}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed mb-4">"{f.writtenReview}"</p>

                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {(f.feedbackTags || []).map((tag) => (
                                                        <span key={tag} className="px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-white/10">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3">
                                                        Helpful: <span className="text-slate-700 dark:text-slate-200">{String(f.wasHelpful)}</span>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3">
                                                        Recommend: <span className="text-slate-700 dark:text-slate-200">{String(f.wouldRecommend)}</span>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 col-span-2">
                                                        Difficulty: <span className="text-slate-700 dark:text-slate-200">{f.sessionDifficulty}</span>
                                                    </div>
                                                </div>

                                                {f.improvementSuggestion && (
                                                    <div className="mt-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-500/10 rounded-2xl px-4 py-3">
                                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Improvement</p>
                                                        <p className="text-xs text-slate-700 dark:text-slate-200 font-medium italic">"{f.improvementSuggestion}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'support hub' && <SupportTickets />}
                </div>
            </main>
        </div>
    );
};

export default MentorDashboard;
