import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { buildAssetUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import PostSessionFeedbackModal from '../../components/PostSessionFeedbackModal';
import feedbackApi from '../../services/feedbackApi';
import { 
    LayoutDashboard, 
    BookOpen, 
    Wallet, 
    User, 
    CheckCircle, 
    Calendar, 
    Clock, 
    Search, 
    ChevronRight,
    Play,
    MessageSquare,
    Headphones,
    ExternalLink,
    Video,
    FileText,
    Link as LinkIcon,
    Shield,
    TrendingUp,
    Star,
    Users,
    X
} from 'lucide-react';
import SupportTickets from '../../components/SupportTickets';
import SessionCalendar from '../../components/SessionCalendar';
import ReflectionNotesModal from '../../components/ReflectionNotesModal';
import PaymentHistory from '../../components/PaymentHistory';
import AssessmentModal from '../../components/AssessmentModal';

const LearnerDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'overview';

    const setActiveTab = (tab) => {
        setSearchParams({ tab });
    };

    const [sessions, setSessions] = useState([]);
    const [enrolledPrograms, setEnrolledPrograms] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [credits, setCredits] = useState(user?.credits || 0);

    const [feedbackStatus, setFeedbackStatus] = useState({});
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);

    const [reflectionModalOpen, setReflectionModalOpen] = useState(false);
    const [selectedReflectionSession, setSelectedReflectionSession] = useState(null);

    const [assessmentReportsByProgram, setAssessmentReportsByProgram] = useState({});
    const [assessmentLoadingProgramId, setAssessmentLoadingProgramId] = useState('');
    const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
    const [activeAssessmentPayload, setActiveAssessmentPayload] = useState(null);
    const [followStats, setFollowStats] = useState({ followers: [], following: [] });
    const [followModal, setFollowModal] = useState({ open: false, type: 'followers' });

    const [profile, setProfile] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        university: user?.university || '',
        bio: user?.bio || '',
        profileImage: user?.profileImage || ''
    });

    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(user?.profileImage ? buildAssetUrl(user.profileImage) : null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const menuItems = [
        { label: 'Overview', path: '/learner/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
        { label: 'My Programs', path: '/learner/dashboard', icon: <BookOpen className="w-5 h-5" />, tab: 'my-programs' },
        { label: 'My Sessions', path: '/learner/dashboard', icon: <Calendar className="w-5 h-5" />, tab: 'my-sessions' },
        { label: 'Study Library', path: '/learner/dashboard', icon: <BookOpen className="w-5 h-5" />, tab: 'library' },
        { label: 'Learning Wallet', path: '/learner/dashboard', icon: <Wallet className="w-5 h-5" />, tab: 'wallet' },
        { label: 'Support Hub', path: '/learner/dashboard', icon: <Headphones className="w-5 h-5" />, tab: 'support' },
        { label: 'Profile', path: '/learner/dashboard', icon: <User className="w-5 h-5" />, tab: 'profile' },
    ];

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const completed = sessions.filter((s) => String(s.status || '').toLowerCase() === 'completed');
        const missing = completed.filter((s) => !feedbackStatus[s._id]);

        if (missing.length === 0) return;

        let cancelled = false;

        (async () => {
            try {
                const results = await Promise.all(
                    missing.map(async (s) => {
                        try {
                            const res = await feedbackApi.getSessionFeedbackStatus(s._id);
                            return { sessionId: s._id, exists: Boolean(res?.data?.exists) };
                        } catch {
                            // If the check fails, keep UI conservative (do not show submitted)
                            return { sessionId: s._id, exists: false };
                        }
                    })
                );

                if (cancelled) return;

                setFeedbackStatus((prev) => {
                    const next = { ...prev };
                    results.forEach((r) => {
                        next[r.sessionId] = { loaded: true, exists: r.exists };
                    });
                    return next;
                });
            } catch (e) {
                if (!cancelled) console.error('Error checking feedback status:', e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [sessions]);

    const fetchData = async () => {
        try {
            const [sessionRes, programRes, materialRes, assessmentRes] = await Promise.all([
                api.get('/learner-dashboard/sessions/joined'),
                api.get('/learner-dashboard/programs'),
                api.get('/materials'),
                api.get('/assessment/my-results').catch(() => ({ data: { success: false, data: [] } })),
            ]);

            if (sessionRes.data.success) setSessions(sessionRes.data.data);
            if (programRes.data.success) setEnrolledPrograms(programRes.data.data);
            if (materialRes.data.success) setMaterials(materialRes.data.data);

            if (assessmentRes?.data?.success) {
                const reportMap = (assessmentRes.data.data || []).reduce((acc, report) => {
                    const key = (report?.program?._id || report?.program || '').toString();
                    if (key) acc[key] = report;
                    return acc;
                }, {});
                setAssessmentReportsByProgram(reportMap);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
        if (user?._id) {
            try {
                const [followersRes, followingRes] = await Promise.all([
                    api.get(`/users/${user._id}/followers`),
                    api.get(`/users/${user._id}/following`)
                ]);
                setFollowStats({
                    followers: followersRes.data?.data || [],
                    following: followingRes.data?.data || []
                });
            } catch {}
        }
    };

    const getSessionProgramId = (session) => {
        const value = session?.program;
        if (!value) return '';
        if (typeof value === 'string') return value;
        return value?._id || '';
    };

    const handleStartAssessment = async (session) => {
        const programId = getSessionProgramId(session);
        if (!programId) {
            alert('Assessment is not available for this session yet.');
            return;
        }

        try {
            setAssessmentLoadingProgramId(programId);
            const assessmentRes = await api.get(`/assessment/${user._id}/${programId}`);
            const payload = assessmentRes?.data?.data;

            if (payload?.alreadySubmitted) {
                const reportRes = await api.get(`/report/${user._id}/${programId}`);
                const report = reportRes?.data?.data?.report;

                if (report?.isFinalized) {
                    const score = report?.score;
                    const grade = report?.finalizedGrade || report?.grade;
                    alert(`Assessment already submitted. Final Score: ${score ?? 0}, Final Grade: ${grade || 'N/A'}`);
                } else {
                    alert('Assessment already submitted. Your final score and grade will appear after academic supervisor finalization.');
                }

                await fetchData();
                return;
            }

            setActiveAssessmentPayload({ ...payload, programId });
            setAssessmentModalOpen(true);
        } catch (error) {
            alert(error?.response?.data?.message || 'Failed to open assessment');
        } finally {
            setAssessmentLoadingProgramId('');
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            // If image is selected, upload it first
            if (selectedImage) {
                setUploadingImage(true);
                const formData = new FormData();
                formData.append('image', selectedImage);
                const uploadRes = await api.post('/upload/profile-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.data.success) {
                    const newUrl = uploadRes.data.data.url;
                    profile.profileImage = newUrl;
                    setImagePreview(buildAssetUrl(newUrl));
                }
            }

            const res = await api.put('/users/profile', profile);
            if (res.data?.data?.profileImage) {
                setImagePreview(buildAssetUrl(res.data.data.profileImage));
            }
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert(error.response?.data?.message || 'Error updating profile');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                alert('Invalid file format. Please upload JPG, PNG, or WEBP.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('File size exceeds 5MB limit.');
                return;
            }
            setSelectedImage(file);
            const objectUrl = URL.createObjectURL(file);
            setImagePreview(objectUrl);
        }
    };

    const handleAcceptSession = async (sessionId) => {
        try {
            const response = await api.put(`/sessions/${sessionId}/status`, { status: 'accepted' });
            if (response.data.success) {
                setSessions((prev) => prev.map((s) => (s._id === sessionId ? response.data.data : s)));
                alert('Session accepted! Check your dashboard for session details.');
            }
        } catch (error) {
            console.error('Error accepting session:', error);
            alert(error.response?.data?.message || 'Failed to accept session');
        }
    };

    const handleRejectSession = async (sessionId) => {
        const reason = window.prompt('Why are you rejecting this session? (optional)');
        if (reason === null) return; // User cancelled

        try {
            const response = await api.put(`/sessions/${sessionId}/cancel`, { reason });
            if (response.data.success) {
                setSessions((prev) => prev.map((s) => (s._id === sessionId ? response.data.data : s)));
                alert('Session rejected successfully');
            }
        } catch (error) {
            console.error('Error rejecting session:', error);
            alert(error.response?.data?.message || 'Failed to reject session');
        }
    };

    const handleSaveReflection = async (sessionId, reflectionData) => {
        try {
            await api.put(`/sessions/${sessionId}/reflection`, { reflectionData });
            setSessions(sessions.map(s =>
                s._id === sessionId
                    ? { ...s, reflectionNotes: reflectionData }
                    : s
            ));
            setReflectionModalOpen(false);
            setSelectedReflectionSession(null);
            alert('Reflection notes saved successfully!');
        } catch (error) {
            console.error('Error saving reflection:', error);
            alert('Failed to save reflection notes');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'scheduled': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'live': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    const formatSessionDate = (session) => {
        const value = session?.scheduledDate || session?.date;
        if (!value) return 'Not scheduled';

        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? 'Not scheduled' : d.toLocaleDateString();
    };

    const formatSessionTime = (session) => {
        const value = session?.scheduledDate || session?.date;
        if (!value) return '--';

        const d = new Date(value);
        return Number.isNaN(d.getTime())
            ? (session?.time || '--')
            : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const statusOf = (session) => String(session?.status || '').toLowerCase();

    if (loading) return <div className="pt-32 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-500">
            <Sidebar menuItems={menuItems} />
            <main className="flex-grow lg:ml-72 pt-24 p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in fade-in slide-in-from-top duration-700">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">Knowledge Portfolio</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium italic">Scholarly path of {user?.firstName} {user?.lastName}.</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 flex items-center space-x-4 shadow-xl shadow-indigo-500/5">
                            <div className="w-12 h-12 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Learning Credits</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white">{credits} PTS</span>
                            </div>
                        </div>
                    </header>

                    <div className="flex border-b border-slate-100 dark:border-white/5 mb-10 overflow-x-auto no-scrollbar">
                        {['Overview', 'My-Programs', 'My-Sessions', 'Learning-Path', 'Library', 'Wallet', 'Support', 'Profile'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase())}
                                className={`pb-4 px-8 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.toLowerCase() ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {tab.replace('-', ' ')}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'my-programs' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">My Programs</h3>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{enrolledPrograms.length} Enrolled</span>
                            </div>

                            {enrolledPrograms.length === 0 ? (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-12 rounded-[2.5rem] shadow-xl text-center">
                                    <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                        <BookOpen className="w-12 h-12 text-slate-400" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">No Enrolled Programs Yet</h3>
                                    <p className="text-slate-500 dark:text-slate-400 mb-6">Enroll in a program to see it here under My Programs.</p>
                                    <button
                                        onClick={() => navigate('/programs')}
                                        className="bg-indigo-600 text-white font-black px-8 py-4 rounded-2xl uppercase text-sm tracking-widest hover:bg-indigo-700 transition-all"
                                    >
                                        Browse Programs
                                    </button>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {enrolledPrograms.map((entry) => {
                                        const program = entry.program || {};
                                        const programTitle = program.title || program.name || entry.topic || entry.skill || 'Program';
                                        const mentorName = entry.mentor ? `${entry.mentor.firstName || ''} ${entry.mentor.lastName || ''}`.trim() : 'Mentor';
                                        const enrolledOn = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '-';

                                        return (
                                            <div key={entry._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-sm">
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">Enrolled</span>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">ID: {String(entry._id).slice(-6)}</p>
                                                </div>
                                                <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">{programTitle}</h4>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Mentor: <span className="font-bold">{mentorName || 'Mentor'}</span></p>
                                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Enrolled On: {enrolledOn}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <div className="space-y-10 animate-in fade-in duration-500">
                            {/* Follow List Modal */}
                            {followModal.open && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white capitalize">{followModal.type}</h3>
                                            <button onClick={() => setFollowModal({ open: false, type: 'followers' })} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"><X className="w-5 h-5" /></button>
                                        </div>
                                        <div className="space-y-3 max-h-72 overflow-y-auto">
                                            {(followStats[followModal.type] || []).length === 0 && (
                                                <p className="text-slate-400 text-sm text-center py-8">No {followModal.type} yet.</p>
                                            )}
                                            {(followStats[followModal.type] || []).map(u => (
                                                <div key={u._id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5">
                                                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 font-black text-sm">{u.firstName?.[0]}</div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-white text-sm capitalize">{u.firstName} {u.lastName}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{u.role}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stats Grid */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                                {[
                                    { label: 'Active Sessions', value: sessions.filter(s => s.status === 'scheduled').length, icon: <Calendar className="text-indigo-600" />, sub: 'Next 7 Days', onClick: null },
                                    { label: 'Study Streak', value: `${user?.studyStreak || 0} Days`, icon: <TrendingUp className="text-orange-500" />, sub: 'Consistent Learning', onClick: null },
                                    { label: 'Resources', value: materials.length, icon: <BookOpen className="text-violet-500" />, sub: 'Study Assets', onClick: null },
                                    { label: 'Points', value: user?.credits || 0, icon: <Shield className="text-amber-500" />, sub: 'Academic Rank', onClick: null },
                                    { label: 'Followers', value: followStats.followers.length, icon: <Users className="text-pink-500" />, sub: 'Click to view', onClick: () => setFollowModal({ open: true, type: 'followers' }) },
                                    { label: 'Following', value: followStats.following.length, icon: <Users className="text-teal-500" />, sub: 'Click to view', onClick: () => setFollowModal({ open: true, type: 'following' }) },
                                ].map((stat, idx) => (
                                    <div key={idx} onClick={stat.onClick || undefined} className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative ${stat.onClick ? 'cursor-pointer' : ''}`}>
                                        <div className="flex items-center space-x-4 mb-4 relative z-10">
                                            <div className="p-3 rounded-2xl bg-white dark:bg-white/5">
                                                {stat.icon}
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-1 relative z-10">{stat.value}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter relative z-10">{stat.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Skill Readiness Section */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[3rem] p-10 shadow-xl">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 tracking-tighter">Skill Readiness Levels</h2>
                                <div className="grid md:grid-cols-2 gap-8">
                                    {(user?.skillReadiness || [
                                        { skillName: 'React Development', level: 65 },
                                        { skillName: 'UI/UX Design', level: 40 },
                                        { skillName: 'Node.js Backend', level: 25 }
                                    ]).map((skill, idx) => (
                                        <div key={idx} className="space-y-3">
                                            <div className="flex justify-between items-end">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{skill.skillName}</span>
                                                <span className="text-xs font-black text-indigo-600">{skill.level}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-white/5 h-3 rounded-full overflow-hidden">
                                                <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${skill.level}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'learning-path' && (
                        <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-10 rounded-[3rem] shadow-xl">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Active Goals</h3>
                                <div className="space-y-6">
                                    {(user?.learningGoals || [
                                        { title: 'Master React Context API', isCompleted: false },
                                        { title: 'Complete 5 Backend Sessions', isCompleted: true },
                                        { title: 'Build a Personal Portfolio', isCompleted: false }
                                    ]).map((goal, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-indigo-500/20 transition-all">
                                            <div className="flex items-center space-x-4">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${goal.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-white/10'}`}>
                                                    {goal.isCompleted && <CheckCircle className="w-4 h-4 text-white" />}
                                                </div>
                                                <span className={`text-sm font-bold ${goal.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{goal.title}</span>
                                            </div>
                                            {!goal.isCompleted && <button className="text-[10px] font-black uppercase text-indigo-600">Mark Done</button>}
                                        </div>
                                    ))}
                                    <button className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-xs font-black text-slate-400 uppercase hover:border-indigo-500 hover:text-indigo-600 transition-all">+ Add New Goal</button>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-10 rounded-[3rem] shadow-xl">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Reflection Notes</h3>
                                <div className="space-y-6">
                                    {(user?.reflectionNotes || [
                                        { note: 'The session on Node.js streams was mind-blowing. Need to practice pipes.', createdAt: new Date() }
                                    ]).map((note, idx) => (
                                        <div key={idx} className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl relative">
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic mb-4 leading-relaxed">"{note.note}"</p>
                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{new Date(note.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    ))}
                                    <button className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl">Add Reflection Note</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'my-sessions' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Learning Progress Overview */}
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-500/20">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-2xl font-black mb-2 tracking-tight">Learning Journey</h3>
                                        <p className="text-indigo-100 text-sm italic">Track your progress and celebrate milestones</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-black">{sessions.filter((s) => statusOf(s) === 'completed').length}</p>
                                        <p className="text-xs font-bold uppercase tracking-widest">Sessions Completed</p>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                                            <span className="text-sm font-bold">Completed</span>
                                        </div>
                                        <p className="text-2xl font-black">{sessions.filter((s) => statusOf(s) === 'completed').length}</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <Calendar className="w-5 h-5 text-blue-400" />
                                            <span className="text-sm font-bold">Upcoming</span>
                                        </div>
                                        <p className="text-2xl font-black">{sessions.filter((s) => statusOf(s) === 'scheduled').length}</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <TrendingUp className="w-5 h-5 text-amber-400" />
                                            <span className="text-sm font-bold">In Progress</span>
                                        </div>
                                        <p className="text-2xl font-black">{sessions.filter((s) => statusOf(s) === 'live').length}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Session Calendar */}
                            <div className="mb-8">
                                <SessionCalendar role="learner" userId={user?._id} />
                            </div>

                            {/* Pending Sessions - Require Action */}
                            {sessions.filter((s) => statusOf(s) === 'pending').length > 0 && (
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-2">
                                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-full text-[10px] font-black">REQUIRES ACTION</span>
                                        Pending Session Invitations
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                                        {sessions
                                            .filter((s) => statusOf(s) === 'pending')
                                            .map((s) => (
                                                <div key={s._id} className="bg-yellow-50 dark:bg-yellow-500/5 border border-yellow-200 dark:border-yellow-500/20 p-8 rounded-[2.5rem] shadow-sm group">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20">Pending</span>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase">ID: {s._id?.slice(-6)}</p>
                                                    </div>
                                                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">{s.topic || s.skill || 'Session'}</h3>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-4">{s.description}</p>
                                                    <p className="text-sm text-slate-500 font-medium mb-6">
                                                        Mentor: <span className="font-bold text-slate-700 dark:text-slate-300">{s.mentor?.firstName} {s.mentor?.lastName}</span>
                                                    </p>
                                                    <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-8 gap-6">
                                                        <span className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> {formatSessionDate(s)}</span>
                                                        <span className="flex items-center"><Clock className="w-4 h-4 mr-2" /> {formatSessionTime(s)}</span>
                                                    </div>

                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => handleAcceptSession(s._id)}
                                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-2xl uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-green-500/20"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectSession(s._id)}
                                                            className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-black py-3 rounded-2xl uppercase text-[10px] tracking-widest transition-all"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Learning Progress & Reflection Notes */}
                            {sessions.filter((s) => statusOf(s) === 'completed').length > 0 && (
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-2">
                                        <BookOpen className="w-6 h-6 text-indigo-500" />
                                        Learning Progress & Reflections
                                    </h3>
                                    <div className="space-y-6">
                                        {sessions.filter((s) => statusOf(s) === 'completed').map((s) => (
                                            <div key={s._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-sm group">
                                                {(() => {
                                                    const sessionProgramId = getSessionProgramId(s);
                                                    const report = assessmentReportsByProgram[sessionProgramId];

                                                    return (
                                                        <>
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center font-black text-lg">
                                                            {s.mentor?.firstName?.[0]}{s.mentor?.lastName?.[0]}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-800 dark:text-white capitalize">{s.skill?.title || s.skill}</h4>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">Mentor: {s.mentor?.firstName} {s.mentor?.lastName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold uppercase rounded-lg mb-2 block">Completed</span>
                                                        <p className="text-xs text-slate-400 font-bold uppercase">{new Date(s.scheduledDate || s.date).toLocaleDateString()}</p>
                                                        {report?.isFinalized && (report?.finalizedGrade || report?.grade) && (
                                                            <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mt-1">
                                                                Grade: {report.finalizedGrade || report.grade}
                                                            </p>
                                                        )}
                                                    </div>

                                                </div>

                                                {/* Progress Indicators */}
                                                <div className="grid md:grid-cols-3 gap-4 mb-6">
                                                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-bold text-slate-400 uppercase">Understanding</span>
                                                            <Star className="w-4 h-4 text-amber-500" />
                                                        </div>
                                                        <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2">
                                                            <div className="bg-amber-500 h-2 rounded-full" style={{width: '85%'}}></div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1">85% - Excellent grasp</p>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-bold text-slate-400 uppercase">Skills Applied</span>
                                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                        </div>
                                                        <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2">
                                                            <div className="bg-emerald-500 h-2 rounded-full" style={{width: '70%'}}></div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1">70% - Good progress</p>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-bold text-slate-400 uppercase">Confidence</span>
                                                            <TrendingUp className="w-4 h-4 text-indigo-500" />
                                                        </div>
                                                        <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2">
                                                            <div className="bg-indigo-500 h-2 rounded-full" style={{width: '90%'}}></div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1">90% - Very confident</p>
                                                    </div>
                                                </div>

                                                {/* Reflection Notes */}
                                                <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-2xl mb-6">
                                                    <div className="flex items-center space-x-2 mb-4">
                                                        <MessageSquare className="w-5 h-5 text-indigo-500" />
                                                        <h5 className="font-bold text-slate-800 dark:text-white">Reflection Notes</h5>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl">
                                                            <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                                                                "This session was incredibly valuable. I learned practical techniques for [skill] that I can immediately apply to my studies. The mentor was patient and provided clear examples that made complex concepts accessible."
                                                            </p>
                                                            <p className="text-xs text-slate-400 mt-2">Key takeaways: Practice regularly, ask questions, build confidence through application.</p>
                                                        </div>
                                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl">
                                                            <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                                                                "Areas for improvement: Need to work on [specific skill area]. Will schedule follow-up session to address this."
                                                            </p>
                                                            <p className="text-xs text-slate-400 mt-2">Next steps: Review materials, practice exercises, schedule advanced session.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleStartAssessment(s)}
                                                        disabled={!sessionProgramId || assessmentLoadingProgramId === sessionProgramId}
                                                        className={`flex-1 font-black py-3 rounded-2xl uppercase text-[10px] tracking-widest transition-all border ${
                                                            sessionProgramId
                                                                ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700'
                                                                : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {assessmentLoadingProgramId === sessionProgramId ? 'Preparing...' : 'Start Assessment'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedReflectionSession(s);
                                                            setReflectionModalOpen(true);
                                                        }}
                                                        className="flex-1 bg-indigo-600 text-white font-black py-3 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all"
                                                    >
                                                        Add Reflection Note
                                                    </button>
                                                    {(() => {
                                                        const isCompleted = String(s?.status || '').toUpperCase() === 'COMPLETED';
                                                        const learnerId = (typeof s?.learner === 'string' ? s.learner : s?.learner?._id)?.toString?.();
                                                        const currentUserId = user?._id?.toString?.();
                                                        const isOwnSession = !learnerId || (currentUserId && learnerId === currentUserId);
                                                        const status = feedbackStatus[s._id];
                                                        const submitted = Boolean(status?.loaded && status?.exists);
                                                        const checking = !status?.loaded;

                                                        if (!isCompleted || !isOwnSession) return null;

                                                        return (
                                                            <button
                                                                type="button"
                                                                disabled={checking || submitted}
                                                                onClick={() => {
                                                                    if (!submitted) {
                                                                        setSelectedSession(s);
                                                                        setFeedbackModalOpen(true);
                                                                    }
                                                                }}
                                                                className={`flex-1 font-black py-3 rounded-2xl uppercase text-[10px] tracking-widest transition-all border ${
                                                                    submitted
                                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 cursor-not-allowed'
                                                                        : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                                                                } ${checking ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                            >
                                                                {checking ? 'Checking...' : submitted ? 'Feedback Submitted' : 'Give Feedback'}
                                                            </button>
                                                        );
                                                    })()}
                                                    <button className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-black py-3 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-dashed border-slate-200 dark:border-white/10">
                                                        View Materials
                                                    </button>
                                                </div>

                                                {report && (
                                                    <div className="mt-4 rounded-2xl border border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 p-4">
                                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Assessment Summary</p>
                                                            {report?.isFinalized ? (
                                                                <div className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-200">
                                                                    <span>Score: {Number(report.score || 0).toFixed(1)}</span>
                                                                    <span>Grade: {report.finalizedGrade || report.grade || 'N/A'}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Pending Supervisor Finalization</span>
                                                            )}
                                                        </div>
                                                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                                                            {report?.isFinalized
                                                                ? (report.aiFeedbackSummary || 'Assessment feedback will appear here after submission.')
                                                                : 'Your answer sheet has been system-evaluated and is waiting for academic supervisor finalization. Final score and grade will be visible once finalized.'}
                                                        </p>
                                                    </div>
                                                )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Live Sessions */}
                            {sessions.filter((s) => statusOf(s) === 'live').length > 0 && (
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-2">
                                        <Video className="w-6 h-6 text-emerald-500" />
                                        Live Sessions
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                                        {sessions.filter((s) => statusOf(s) === 'live').map((s) => (
                                            <div key={s._id} className="bg-white dark:bg-slate-900 border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-sm">
                                                <div className="flex justify-between items-start mb-6">
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Live</span>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">ID: {s._id?.slice(-6)}</p>
                                                </div>
                                                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 capitalize">{s.skill?.title || s.skill || s.topic || 'Session'}</h3>
                                                <p className="text-sm text-slate-500 font-medium mb-6">With Mentor {s.mentor?.firstName}</p>
                                                <button
                                                    onClick={() => navigate(`/sessions/live/${s._id}`)}
                                                    className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all text-center block animate-pulse"
                                                >
                                                    Join Now
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Upcoming Sessions */}
                            {sessions.filter((s) => statusOf(s) === 'scheduled').length > 0 && (
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-2">
                                        <Calendar className="w-6 h-6 text-blue-500" />
                                        Upcoming Learning Sessions
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {sessions.filter((s) => statusOf(s) === 'scheduled').map((s) => (
                                            <div key={s._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-sm group">
                                                <div className="flex justify-between items-start mb-6">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(s.status)}`}>{s.status}</span>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">ID: {s._id?.slice(-6)}</p>
                                                </div>
                                                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 capitalize">{s.skill?.title || s.skill || s.topic || 'Session'}</h3>
                                                <p className="text-sm text-slate-500 font-medium mb-6">With Mentor {s.mentor?.firstName}</p>
                                                <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
                                                    <Calendar className="w-4 h-4 mr-2" /> {formatSessionDate(s)}
                                                    <Clock className="w-4 h-4 ml-6 mr-2" /> {formatSessionTime(s)}
                                                </div>

                                                    <div className="space-y-3">
                                                        <button
                                                            disabled
                                                            className="w-full bg-slate-100 dark:bg-white/5 text-slate-400 font-black py-4 rounded-2xl border border-slate-200 dark:border-white/10 uppercase text-[10px] tracking-widest cursor-not-allowed"
                                                        >
                                                            Join Now (Enabled when mentor starts)
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/sessions/live/${s._id}`)}
                                                            className="w-full bg-slate-50 dark:bg-white/5 text-slate-400 font-black py-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 uppercase text-[10px] tracking-widest hover:border-indigo-500 hover:text-indigo-600 transition-all"
                                                        >
                                                            Launch Learning Center
                                                        </button>
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
                                        <BookOpen className="w-12 h-12 text-slate-400" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Start Your Learning Journey</h3>
                                    <p className="text-slate-500 dark:text-slate-400 mb-6">Book your first mentoring session to begin tracking your progress and achievements.</p>
                                    <button
                                        onClick={() => navigate('/skills')}
                                        className="bg-indigo-600 text-white font-black px-8 py-4 rounded-2xl uppercase text-sm tracking-widest hover:bg-indigo-700 transition-all"
                                    >
                                        Browse Skills
                                    </button>
                                </div>
                            )}

                            <PostSessionFeedbackModal
                                isOpen={feedbackModalOpen}
                                onClose={() => {
                                    setFeedbackModalOpen(false);
                                    setSelectedSession(null);
                                }}
                                session={selectedSession}
                                onSubmitted={(sessionId) => {
                                    setFeedbackStatus((prev) => ({
                                        ...prev,
                                        [sessionId]: { loaded: true, exists: true },
                                    }));
                                }}
                            />

                            <ReflectionNotesModal
                                isOpen={reflectionModalOpen}
                                onClose={() => {
                                    setReflectionModalOpen(false);
                                    setSelectedReflectionSession(null);
                                }}
                                session={selectedReflectionSession}
                                onSave={handleSaveReflection}
                            />

                            <AssessmentModal
                                isOpen={assessmentModalOpen}
                                onClose={() => {
                                    setAssessmentModalOpen(false);
                                    setActiveAssessmentPayload(null);
                                }}
                                payload={activeAssessmentPayload}
                                onSubmitted={async () => {
                                    setAssessmentModalOpen(false);
                                    setActiveAssessmentPayload(null);
                                    await fetchData();
                                }}
                            />
                        </div>
                    )}

                    {activeTab === 'library' && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
                            {materials.map(m => (
                                <div key={m._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[3rem] shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden h-fit">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-600">
                                            {m.type === 'video' ? <Video /> : m.type === 'pdf' ? <FileText /> : <LinkIcon />}
                                        </div>
                                        <a href={buildAssetUrl(m.url)} target="_blank" rel="noreferrer" className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors">
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    </div>
                                    <h4 className="text-2xl font-black text-slate-800 dark:text-white mb-2 leading-tight capitalize tracking-tight">{m.title}</h4>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">Mentor {m.mentor?.firstName}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic line-clamp-3 leading-relaxed">"{m.description || 'Dedicated academic resource for SkillSwap scholars.'}"</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'wallet' && <PaymentHistory />}

                    {activeTab === 'support' && <SupportTickets />}
                    
                    {activeTab === 'profile' && (
                        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl animate-in fade-in duration-500">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-10 tracking-tight">Identity Management</h2>
                            
                            <div className="flex flex-col items-center mb-8">
                                <div className="w-32 h-32 rounded-[2rem] bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden relative group flex items-center justify-center mb-4">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-12 h-12 text-slate-400" />
                                    )}
                                    <label className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <span className="text-xs font-black text-white uppercase tracking-widest">Change</span>
                                        <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={handleImageChange} />
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest text-center">JPG, PNG, WEBP. Max 5MB.</p>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <input value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})} className="bg-slate-50 dark:bg-white/5 border-none rounded-2xl p-4 text-sm font-bold" placeholder="First Name" />
                                    <input value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})} className="bg-slate-50 dark:bg-white/5 border-none rounded-2xl p-4 text-sm font-bold" placeholder="Last Name" />
                                </div>
                                <input value={profile.university} onChange={e => setProfile({...profile, university: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl p-4 text-sm font-bold" placeholder="University" />
                                <textarea rows="4" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl p-4 text-sm font-bold resize-none" placeholder="Short bio about your scholarly goals..."></textarea>
                                <button disabled={uploadingImage} type="submit" className="w-full disabled:opacity-50 disabled:scale-100 bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all uppercase tracking-widest text-[10px]">{uploadingImage ? 'Uploading & Saving...' : 'Verify & Save Changes'}</button>
                            </form>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default LearnerDashboard;
