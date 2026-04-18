import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import { 
    LayoutDashboard, 
    Users, 
    GraduationCap, 
    BarChart3, 
    CheckCircle, 
    ShieldCheck, 
    TrendingUp, 
    AlertCircle,
    Search,
    UserCheck,
    Star,
    Award,
    Activity,
    LineChart,
    Clock,
    Eye
} from 'lucide-react';
import Modal from '../../components/common/Modal';

const ProfessionalDashboard = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'overview';

    const setActiveTab = (tab) => {
        setSearchParams({ tab });
    };

    const [mentors, setMentors] = useState([]);
    const [learners, setLearners] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [assessmentReports, setAssessmentReports] = useState([]);
    const [finalizingReportId, setFinalizingReportId] = useState('');
    const [detailLoadingId, setDetailLoadingId] = useState('');
    const [reportDetail, setReportDetail] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [editableQuestions, setEditableQuestions] = useState([]);
    const [editableTasks, setEditableTasks] = useState([]);
    const [markAdjustmentNotes, setMarkAdjustmentNotes] = useState('');
    const [confirmingMarkChanges, setConfirmingMarkChanges] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const menuItems = [
        { label: 'Overview', path: '/professional/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
        { label: 'Mentor Monitoring', path: '/professional/dashboard', icon: <UserCheck className="w-5 h-5" />, tab: 'mentors' },
        { label: 'Learner Growth', path: '/professional/dashboard', icon: <GraduationCap className="w-5 h-5" />, tab: 'learners' },
        { label: 'Analytics', path: '/professional/dashboard', icon: <BarChart3 className="w-5 h-5" />, tab: 'analytics' },
        { label: 'Assessment Reports', path: '/professional/dashboard', icon: <LineChart className="w-5 h-5" />, tab: 'assessment-reports' },
        { label: 'Verification Panel', path: '/professional/dashboard', icon: <ShieldCheck className="w-5 h-5" />, tab: 'verification' },
    ];

    useEffect(() => {
        fetchProfessionalData();
    }, []);

    const fetchProfessionalData = async () => {
        try {
            const [mentorRes, learnerRes, analyticsRes, assessmentRes] = await Promise.all([
                api.get('/professional/mentors').catch(() => ({ data: { success: false } })),
                api.get('/professional/learners').catch(() => ({ data: { success: false } })),
                api.get('/professional/analytics').catch(() => ({ data: { success: false } })),
                api.get('/assessment/supervision/reports').catch(() => ({ data: { success: false, data: [] } })),
            ]);

            if (mentorRes.data?.success) setMentors(mentorRes.data.data);
            if (learnerRes.data?.success) setLearners(learnerRes.data.data);
            if (analyticsRes.data?.success) setAnalytics(analyticsRes.data.data);
            if (assessmentRes.data?.success) setAssessmentReports(assessmentRes.data.data || []);
        } catch (error) {
            console.error('Error fetching professional data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFinalizeGrade = async (report) => {
        const suggested = report?.grade || 'C';
        const finalGrade = window.prompt('Finalize grade (A/B/C/D/F):', suggested);
        if (finalGrade === null) return;

        const notes = window.prompt('Supervisor notes (optional):', report?.supervisorNotes || '') || '';

        try {
            setFinalizingReportId(report._id);
            const response = await api.post('/finalize-grade', {
                reportId: report._id,
                finalGrade: finalGrade.toUpperCase(),
                supervisorNotes: notes,
            });

            if (response?.data?.success) {
                await fetchProfessionalData();
            }
        } catch (error) {
            alert(error?.response?.data?.message || 'Failed to finalize grade');
        } finally {
            setFinalizingReportId('');
        }
    };

    const handleVerifyMentor = async (mentorId) => {
        if (!window.confirm('Assign verification badge to this mentor?')) return;
        try {
            const res = await api.post('/professional/verify-mentor', { mentorId, evaluationNote: 'Academic supervision approval.' });
            if (res.data.success) {
                alert('Mentor verified successfully');
                fetchProfessionalData();
            }
        } catch (error) {
            alert('Verification failed');
        }
    };

    const handleViewAnswerSheet = async (reportId) => {
        try {
            setDetailLoadingId(reportId);
            const res = await api.get(`/assessment/supervision/reports/${reportId}`);
            if (res?.data?.success) {
                const detail = res.data.data || null;
                setReportDetail(detail);
                setEditableQuestions(detail?.answerSheet?.questions || []);
                setEditableTasks(detail?.answerSheet?.tasks || []);
                setMarkAdjustmentNotes(detail?.report?.supervisorNotes || '');
                setDetailModalOpen(true);
            }
        } catch (error) {
            alert(error?.response?.data?.message || 'Failed to load answer sheet');
        } finally {
            setDetailLoadingId('');
        }
    };

    const handleQuestionScoreChange = (itemId, nextScore) => {
        setEditableQuestions((prev) => prev.map((q) => {
            if (String(q.itemId) !== String(itemId)) return q;

            const numericValue = Number(nextScore);
            const boundedScore = Number.isNaN(numericValue)
                ? 0
                : Math.max(0, Math.min(Number(q.maxScore || 0), numericValue));

            return { ...q, score: boundedScore };
        }));
    };

    const handleTaskScoreChange = (itemId, nextScore) => {
        setEditableTasks((prev) => prev.map((t) => {
            if (String(t.itemId) !== String(itemId)) return t;

            const numericValue = Number(nextScore);
            const boundedScore = Number.isNaN(numericValue)
                ? 0
                : Math.max(0, Math.min(Number(t.maxScore || 0), numericValue));

            return { ...t, score: boundedScore };
        }));
    };

    const handleConfirmMarkChanges = async () => {
        if (!reportDetail?.report?._id) return;

        try {
            setConfirmingMarkChanges(true);

            const payload = {
                questionAdjustments: editableQuestions.map((q) => ({
                    itemId: q.itemId,
                    score: Number(q.score || 0),
                })),
                taskAdjustments: editableTasks.map((t) => ({
                    itemId: t.itemId,
                    score: Number(t.score || 0),
                })),
                supervisorNotes: markAdjustmentNotes,
            };

            const response = await api.post(
                `/assessment/supervision/reports/${reportDetail.report._id}/confirm-marks`,
                payload
            );

            if (response?.data?.success) {
                const nextDetail = response?.data?.data || null;
                setReportDetail((prev) => ({
                    ...(prev || {}),
                    report: nextDetail?.report || prev?.report,
                    answerSheet: nextDetail?.answerSheet || prev?.answerSheet,
                }));

                setEditableQuestions(nextDetail?.answerSheet?.questions || []);
                setEditableTasks(nextDetail?.answerSheet?.tasks || []);

                await fetchProfessionalData();
                alert('Mark changes confirmed successfully. Updated scores are now saved.');
            }
        } catch (error) {
            alert(error?.response?.data?.message || 'Failed to confirm mark changes');
        } finally {
            setConfirmingMarkChanges(false);
        }
    };

    if (loading) return <div className="pt-32 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div></div>;

    const filteredMentors = mentors.filter(m => 
        `${m.firstName || ''} ${m.lastName || ''} ${m.email || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
            <Sidebar menuItems={menuItems} />
            <main className="flex-grow lg:ml-72 pt-32 p-8">
                <div className="max-w-7xl mx-auto">
                    <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <ShieldCheck className="w-8 h-8 text-violet-600" />
                                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Academic Supervision</h1>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium italic">Monitoring excellence and guiding scholarship at SkillSwap+.</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-6 py-4 rounded-3xl shadow-sm flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center font-bold text-xl">
                                {user.firstName[0]}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{user.firstName} {user.lastName}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{user.role} Dashboard</p>
                            </div>
                        </div>
                    </header>

                    {/* Quick Stats */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {[
                            { label: 'Avg Mentor MPS', value: '4.2', icon: <Award className="text-amber-500" />, sub: 'Out of 5.0' },
                            { label: 'Learner Growth', value: '+18%', icon: <TrendingUp className="text-emerald-500" />, sub: 'This semester' },
                            { label: 'Active Monitors', value: mentors.length + learners.length, icon: <Activity className="text-violet-500" />, sub: 'In focus' },
                            { label: 'Pending Verifications', value: mentors.filter(m => !m.isVerified).length, icon: <UserCheck className="text-indigo-500" />, sub: 'Mentors to review' },
                            { label: 'Pending Grades', value: assessmentReports.filter(r => !r.isFinalized).length, icon: <LineChart className="text-violet-500" />, sub: 'Need finalization' },
                        ].map((stat, idx) => (
                            <div key={idx} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 p-6 rounded-[2.5rem] shadow-sm hover:translate-y-[-4px] transition-all">
                                <div className="flex items-center space-x-4 mb-4">
                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5">{stat.icon}</div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stat.value}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{stat.sub}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex border-b border-slate-200 dark:border-white/5 mb-10 overflow-x-auto no-scrollbar">
                        {menuItems.map((item) => (
                            <button
                                key={item.tab}
                                onClick={() => setActiveTab(item.tab)}
                                className={`pb-4 px-8 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === item.tab ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'overview' && (
                        <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
                            {/* Performance Leaders */}
                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-white/10 p-8 shadow-xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Top Performing Mentors</h2>
                                    <BarChart3 className="w-5 h-5 text-violet-600" />
                                </div>
                                <div className="space-y-6">
                                    {mentors.slice(0, 4).map((m, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-3xl border border-transparent hover:border-violet-500/30 transition-all group">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black">#{idx + 1}</div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{m.firstName} {m.lastName}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Grade: {m.grade || 'Silver'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center justify-end text-amber-500 mb-1">
                                                    <Star className="w-3 h-3 fill-current" />
                                                    <span className="text-sm font-black ml-1 text-slate-900 dark:text-white">{m.mps?.toFixed(1) || '0.0'}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">MPS Score</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Alert Panel */}
                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-white/10 p-8 shadow-xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Supervision Alerts</h2>
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                </div>
                                <div className="space-y-6">
                                    {mentors.filter(m => (m.mps || 0) < 3.0 && m.mps > 0).map((m, idx) => (
                                        <div key={idx} className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-bold text-red-600">Low Performance Alert</p>
                                                <span className="px-2 py-1 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg">Critical</span>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">Mentor <span className="font-bold">{m.firstName}</span> has fallen below 3.0 MPS. Review suggested.</p>
                                            <button className="text-[10px] font-black uppercase text-red-600 hover:underline">Investigate Case</button>
                                        </div>
                                    ))}
                                    {mentors.filter(m => (m.mps || 0) < 3.0 && m.mps > 0).length === 0 && (
                                        <div className="text-center py-20 italic text-slate-400 font-medium">No critical alerts found. The ecosystem is stable.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'mentors' && (
                         <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Mentor Intelligence Hub</h2>
                                <div className="relative">
                                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search mentors..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="bg-slate-50 dark:bg-white/5 border-none rounded-2xl pl-12 pr-6 py-3 text-sm focus:ring-2 focus:ring-violet-600 w-full md:w-80" 
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 dark:bg-white/5">
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            <th className="px-8 py-6">Mentor / Scholar</th>
                                            <th className="px-8 py-6">MPS Grade</th>
                                            <th className="px-8 py-6">Teaching Quality</th>
                                            <th className="px-8 py-6">Status</th>
                                            <th className="px-8 py-6 text-right">Monitoring</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {filteredMentors.map(m => (
                                            <tr key={m._id} className="hover:bg-violet-500/[0.02] transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center font-bold text-violet-600">{m.firstName[0]}</div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{m.firstName} {m.lastName}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold">{m.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                                        m.grade === 'Platinum' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' :
                                                        m.grade === 'Gold' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
                                                        m.grade === 'Silver' ? 'bg-slate-400 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                                                    }`}>
                                                        {m.grade || 'Bronze'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="flex-grow bg-slate-200 dark:bg-white/5 h-1.5 rounded-full overflow-hidden max-w-[100px]">
                                                            <div className="bg-violet-600 h-full transition-all" style={{ width: `${(m.mps / 5) * 100}%` }}></div>
                                                        </div>
                                                        <span className="text-xs font-black text-slate-900 dark:text-white">{(m.mps || 0).toFixed(1)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center space-x-2">
                                                        {m.isVerified ? (
                                                            <>
                                                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                                <span className="text-[10px] font-black text-emerald-600 uppercase">Verified</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Clock className="w-4 h-4 text-amber-500" />
                                                                <span className="text-[10px] font-black text-amber-600 uppercase">Pending</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end space-x-3">
                                                        {!m.isVerified && (
                                                            <button onClick={() => handleVerifyMentor(m._id)} title="Verify Mentor" className="p-2.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-2xl transition-all">
                                                                <UserCheck className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                        <button title="Detailed Analytics" className="p-2.5 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-2xl transition-all">
                                                            <LineChart className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'learners' && (
                         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
                            {learners.map((l, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all group overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
                                    <div className="flex items-center space-x-4 mb-8">
                                        <div className="w-14 h-14 rounded-[1.5rem] bg-slate-100 dark:bg-white/5 flex items-center justify-center font-black text-2xl text-violet-600">
                                            {l.firstName[0]}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white">{l.firstName} {l.lastName}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{l.email}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6 mb-8">
                                        <div>
                                            <div className="flex justify-between text-xs font-black uppercase tracking-tighter mb-2">
                                                <span className="text-slate-400">Skill Growth</span>
                                                <span className="text-violet-600">65% Readiness</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                                                <div className="bg-violet-600 h-full w-[65%]"></div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                            <div className="text-center flex-grow border-r border-slate-200 dark:border-white/10">
                                                <p className="text-sm font-black text-slate-900 dark:text-white">{l.credits || 0}</p>
                                                <p className="text-[8px] font-black text-slate-400 uppercase">Credits</p>
                                            </div>
                                            <div className="text-center flex-grow">
                                                <p className="text-sm font-black text-slate-900 dark:text-white">{l.studyStreak || 0}d</p>
                                                <p className="text-[8px] font-black text-slate-400 uppercase">Streak</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button className="flex-grow bg-violet-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-violet-500/20 hover:scale-105 transition-all">Send Recommendation</button>
                                        <button className="p-3 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-2xl hover:text-violet-600"><AlertCircle className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                             <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-white/10 p-12 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 blur-[100px] rounded-full -mr-64 -mt-64"></div>
                                <div className="relative z-10">
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">Performance Comparison Engine</h2>
                                    <p className="text-sm text-slate-500 max-w-2xl italic mb-12">Leveraging MPS algorithms to identify the gap between potential and performance across the university ecosystem.</p>
                                    
                                    <div className="grid md:grid-cols-2 gap-12">
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4">Top Performing Sectors</h4>
                                            {[
                                                { label: 'Engineering Architecture', value: 92, color: 'bg-indigo-600' },
                                                { label: 'Computer Science & AI', value: 88, color: 'bg-violet-600' },
                                                { label: 'Business Strategy', value: 74, color: 'bg-emerald-600' },
                                            ].map((item, idx) => (
                                                <div key={idx}>
                                                    <div className="flex justify-between mb-2">
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                                                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{item.value}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 dark:bg-white/5 h-3 rounded-full overflow-hidden">
                                                        <div className={`${item.color} h-full transition-all duration-1000`} style={{ width: `${item.value}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-between">
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase text-violet-400 tracking-widest mb-2">Professional Insight</h4>
                                                <p className="text-xl font-bold italic tracking-tight">"Mentor completion rates are up by 12% across all Gold-graded scholars following the new feedback tagging protocol."</p>
                                            </div>
                                            <div className="flex items-center space-x-3 mt-8">
                                                <ShieldCheck className="w-8 h-8 text-violet-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">System Audit Log #P-298</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}

                    {activeTab === 'assessment-reports' && (
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl animate-in fade-in duration-500">
                            <div className="p-8 border-b border-slate-100 dark:border-white/5">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Assessment Reports</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review learner progression reports and finalize grades.</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 dark:bg-white/5">
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            <th className="px-8 py-5">Learner</th>
                                            <th className="px-8 py-5">Program</th>
                                            <th className="px-8 py-5">Score</th>
                                            <th className="px-8 py-5">Grade</th>
                                            <th className="px-8 py-5">Status</th>
                                            <th className="px-8 py-5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {assessmentReports.map((r) => (
                                            <tr key={r._id} className="hover:bg-violet-500/[0.02] transition-colors">
                                                <td className="px-8 py-5 text-sm font-bold text-slate-900 dark:text-white">
                                                    {r.learnerName || `${r.learner?.firstName || ''} ${r.learner?.lastName || ''}`.trim() || 'Learner'}
                                                </td>
                                                <td className="px-8 py-5 text-sm text-slate-600 dark:text-slate-300">{r.programName || r.program?.title || 'Program'}</td>
                                                <td className="px-8 py-5 text-sm font-bold text-indigo-600">{Number(r.score || 0).toFixed(1)}</td>
                                                <td className="px-8 py-5 text-sm font-black">{r.finalizedGrade || r.grade || 'N/A'}</td>
                                                <td className="px-8 py-5 text-xs font-black uppercase tracking-widest">
                                                    {r.isFinalized ? (
                                                        <span className="text-emerald-600">Finalized</span>
                                                    ) : (
                                                        <span className="text-amber-600">Pending</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleViewAnswerSheet(r._id)}
                                                            disabled={detailLoadingId === r._id}
                                                            className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-60"
                                                        >
                                                            {detailLoadingId === r._id ? 'Loading...' : (
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    View Sheet
                                                                </span>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleFinalizeGrade(r)}
                                                            disabled={finalizingReportId === r._id}
                                                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
                                                        >
                                                            {finalizingReportId === r._id ? 'Saving...' : 'Finalize Grade'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {assessmentReports.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-8 py-12 text-center text-sm text-slate-400 italic">No assessment reports yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <Modal
                        isOpen={detailModalOpen}
                        onClose={() => {
                            setDetailModalOpen(false);
                            setReportDetail(null);
                            setEditableQuestions([]);
                            setEditableTasks([]);
                            setMarkAdjustmentNotes('');
                        }}
                        title="Learner Answer Sheet"
                    >
                        {!reportDetail ? (
                            <p className="text-sm text-slate-500">Loading report details...</p>
                        ) : (
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                                <div className="rounded-2xl border border-violet-500/20 bg-violet-50 dark:bg-violet-500/10 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-1">Assessment Snapshot</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                                        {reportDetail?.report?.learnerName || `${reportDetail?.report?.learner?.firstName || ''} ${reportDetail?.report?.learner?.lastName || ''}`.trim() || 'Learner'}
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-300">Program: {reportDetail?.report?.programName || reportDetail?.report?.program?.title || 'Program'}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                        Score: {Number(reportDetail?.report?.score || 0).toFixed(1)} | Grade: {reportDetail?.report?.finalizedGrade || reportDetail?.report?.grade || 'N/A'}
                                    </p>
                                    {reportDetail?.report?.hasSupervisorMarkAdjustments && (
                                        <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 mt-2">
                                            Supervisor mark adjustments confirmed
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-slate-900">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Supervisor Notes</p>
                                    <textarea
                                        value={markAdjustmentNotes}
                                        onChange={(e) => setMarkAdjustmentNotes(e.target.value)}
                                        rows={3}
                                        disabled={!!reportDetail?.report?.isFinalized}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-70"
                                        placeholder="Add reasoning for mark adjustments (optional)"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Q&A Responses</p>
                                    {(editableQuestions || []).map((q, idx) => (
                                        <div key={q.itemId || idx} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-slate-50 dark:bg-white/5">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Q{idx + 1} • {q.questionType} • {q.difficulty}</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white mb-2">{q.prompt}</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap"><span className="font-black">Answer:</span> {q.answer || 'N/A'}</p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <label className="text-xs font-black text-slate-600 dark:text-slate-300">Score</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={Number(q.maxScore || 0)}
                                                    step="0.5"
                                                    value={q.score ?? 0}
                                                    disabled={!!reportDetail?.report?.isFinalized}
                                                    onChange={(e) => handleQuestionScoreChange(q.itemId, e.target.value)}
                                                    className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-70"
                                                />
                                                <span className="text-xs text-slate-500">/ {q.maxScore || 0}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(editableQuestions || []).length === 0 && (
                                        <p className="text-xs text-slate-500 italic">No Q&A responses found.</p>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Task Responses</p>
                                    {(editableTasks || []).map((t, idx) => (
                                        <div key={t.itemId || idx} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-slate-50 dark:bg-white/5">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Task {idx + 1} • {t.taskType} • {t.difficulty}</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white mb-2">{t.prompt}</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap"><span className="font-black">Answer:</span> {t.answer || 'N/A'}</p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <label className="text-xs font-black text-slate-600 dark:text-slate-300">Score</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={Number(t.maxScore || 0)}
                                                    step="0.5"
                                                    value={t.score ?? 0}
                                                    disabled={!!reportDetail?.report?.isFinalized}
                                                    onChange={(e) => handleTaskScoreChange(t.itemId, e.target.value)}
                                                    className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-70"
                                                />
                                                <span className="text-xs text-slate-500">/ {t.maxScore || 0}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(editableTasks || []).length === 0 && (
                                        <p className="text-xs text-slate-500 italic">No task responses found.</p>
                                    )}
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        onClick={handleConfirmMarkChanges}
                                        disabled={confirmingMarkChanges || !!reportDetail?.report?.isFinalized}
                                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
                                    >
                                        {confirmingMarkChanges ? 'Saving...' : 'Confirm Mark Changes'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </Modal>
                </div>
            </main>
        </div>
    );
};
{/* final update */}
export default ProfessionalDashboard;
