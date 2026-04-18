import React, { useState, useEffect, useCallback } from 'react';
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
    Eye,
    ChevronDown,
    Sparkles,
    Loader2
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/LoadingSkeleton';

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
    const [mentorEvaluationGroups, setMentorEvaluationGroups] = useState([]);
    const [mentorEvaluationLoading, setMentorEvaluationLoading] = useState(false);
    const [mentorEvaluationSearch, setMentorEvaluationSearch] = useState('');
    const [mentorEvaluationStatusFilter, setMentorEvaluationStatusFilter] = useState('all');
    const [mentorEvaluationMentorFilter, setMentorEvaluationMentorFilter] = useState('all');
    const [expandedMentors, setExpandedMentors] = useState({});
    const [aiEvaluatingReportId, setAiEvaluatingReportId] = useState('');
    const [batchEvaluating, setBatchEvaluating] = useState(false);
    const [evaluationDetailModalOpen, setEvaluationDetailModalOpen] = useState(false);
    const [selectedEvaluationReport, setSelectedEvaluationReport] = useState(null);
    const [evaluationDetailLoading, setEvaluationDetailLoading] = useState(false);
    const [evaluationFinalizeNotes, setEvaluationFinalizeNotes] = useState('');
    const [evaluationFinalizeOverride, setEvaluationFinalizeOverride] = useState('');
    const [evaluationFinalizing, setEvaluationFinalizing] = useState(false);

    const menuItems = [
        { label: 'Overview', path: '/professional/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
        { label: 'Mentor Monitoring', path: '/professional/dashboard', icon: <UserCheck className="w-5 h-5" />, tab: 'mentors' },
        { label: 'Learner Growth', path: '/professional/dashboard', icon: <GraduationCap className="w-5 h-5" />, tab: 'learners' },
        { label: 'Analytics', path: '/professional/dashboard', icon: <BarChart3 className="w-5 h-5" />, tab: 'analytics' },
        { label: 'Assessment Reports', path: '/professional/dashboard', icon: <LineChart className="w-5 h-5" />, tab: 'assessment-reports' },
        { label: 'Mentor Evaluation Reports', path: '/professional/dashboard', icon: <Sparkles className="w-5 h-5" />, tab: 'mentor-evaluation' },
        { label: 'Verification Panel', path: '/professional/dashboard', icon: <ShieldCheck className="w-5 h-5" />, tab: 'verification' },
    ];

    const evaluationStatusClasses = {
        submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
        under_review: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
        evaluated: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
        draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
    };

    const renderMpsStars = (score) => {
        const normalized = Math.max(0, Math.min(5, Number(score || 0)));

        return Array.from({ length: 5 }).map((_, index) => {
            const starIndex = index + 1;
            const full = normalized >= starIndex;
            const half = !full && normalized >= (starIndex - 0.5);

            return (
                <span key={starIndex} className="relative inline-flex">
                    <Star className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    {full && <Star className="w-4 h-4 text-amber-500 fill-current absolute inset-0" />}
                    {half && (
                        <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                            <Star className="w-4 h-4 text-amber-500 fill-current" />
                        </span>
                    )}
                </span>
            );
        });
    };

    const fetchMentorEvaluationReports = useCallback(async () => {
        try {
            setMentorEvaluationLoading(true);
            const params = new URLSearchParams();
            if (mentorEvaluationMentorFilter !== 'all') params.set('mentorId', mentorEvaluationMentorFilter);
            if (mentorEvaluationStatusFilter !== 'all') params.set('status', mentorEvaluationStatusFilter);
            const query = params.toString();
            const endpoint = query ? `/mentor-evaluation/reports?${query}` : '/mentor-evaluation/reports';
            const response = await api.get(endpoint);
            if (response?.data?.success) {
                setMentorEvaluationGroups(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching mentor evaluation reports:', error);
        } finally {
            setMentorEvaluationLoading(false);
        }
    }, [mentorEvaluationMentorFilter, mentorEvaluationStatusFilter]);

    const toggleMentorAccordion = (mentorId) => {
        setExpandedMentors((prev) => ({
            ...prev,
            [mentorId]: !prev[mentorId],
        }));
    };

    const openEvaluationDetail = async (reportId) => {
        try {
            setEvaluationDetailLoading(true);
            const response = await api.get(`/mentor-evaluation/reports/${reportId}`);
            if (response?.data?.success) {
                const report = response.data.data;
                setSelectedEvaluationReport(report);
                setEvaluationFinalizeNotes(report?.supervisorReview?.supervisorNotes || '');
                setEvaluationFinalizeOverride(
                    report?.supervisorReview?.finalMpsScore !== undefined && report?.supervisorReview?.finalMpsScore !== null
                        ? String(report.supervisorReview.finalMpsScore)
                        : ''
                );
                setEvaluationDetailModalOpen(true);
            }
        } catch (error) {
            alert(error?.response?.data?.message || 'Failed to load mentor evaluation report details');
        } finally {
            setEvaluationDetailLoading(false);
        }
    };

    const handleAiEvaluateMentorReport = async (reportId) => {
        try {
            setAiEvaluatingReportId(reportId);
            const response = await api.post(`/mentor-evaluation/reports/${reportId}/ai-evaluate`);
            if (response?.data?.success) {
                await fetchMentorEvaluationReports();
            }
        } catch (error) {
            alert(error?.response?.data?.message || 'AI evaluation failed for this report');
        } finally {
            setAiEvaluatingReportId('');
        }
    };

    const handleBatchAiEvaluate = async () => {
        const submittedIds = mentorEvaluationGroups
            .flatMap((mentorGroup) => mentorGroup.programs || [])
            .flatMap((programGroup) => programGroup.reports || [])
            .filter((report) => report?.status === 'submitted')
            .map((report) => report._id);

        if (submittedIds.length === 0) {
            alert('No submitted reports found for batch AI evaluation.');
            return;
        }

        try {
            setBatchEvaluating(true);
            const response = await api.post('/mentor-evaluation/reports/batch-ai-evaluate', {
                reportIds: submittedIds,
            });

            if (response?.data?.success) {
                alert('Batch AI evaluation completed.');
                await fetchMentorEvaluationReports();
            }
        } catch (error) {
            alert(error?.response?.data?.message || 'Batch AI evaluation failed');
        } finally {
            setBatchEvaluating(false);
        }
    };

    const handleFinalizeMentorEvaluation = async () => {
        if (!selectedEvaluationReport?._id) return;

        try {
            setEvaluationFinalizing(true);
            const payload = {
                supervisorNotes: evaluationFinalizeNotes,
            };

            if (evaluationFinalizeOverride !== '') {
                payload.finalMpsScore = Number(evaluationFinalizeOverride);
            }

            const response = await api.post(`/mentor-evaluation/reports/${selectedEvaluationReport._id}/finalize`, payload);
            if (response?.data?.success) {
                const nextReport = response?.data?.data?.report || selectedEvaluationReport;
                const nextMentor = response?.data?.data?.mentor || selectedEvaluationReport?.mentor;
                setSelectedEvaluationReport({
                    ...nextReport,
                    mentor: nextMentor,
                });
                await fetchProfessionalData();
                await fetchMentorEvaluationReports();
                alert('Mentor evaluation finalized successfully.');
            }
        } catch (error) {
            alert(error?.response?.data?.message || 'Failed to finalize mentor evaluation');
        } finally {
            setEvaluationFinalizing(false);
        }
    };

    const fetchProfessionalData = useCallback(async () => {
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
            await fetchMentorEvaluationReports();
        } catch (error) {
            console.error('Error fetching professional data:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchMentorEvaluationReports]);

    useEffect(() => {
        fetchProfessionalData();
    }, [fetchProfessionalData]);

    useEffect(() => {
        fetchMentorEvaluationReports();
    }, [fetchMentorEvaluationReports]);

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

    const filteredMentorEvaluationGroups = mentorEvaluationGroups.filter((group) => {
        const query = mentorEvaluationSearch.trim().toLowerCase();
        if (!query) return true;

        const mentorName = (group?.mentorName || '').toLowerCase();
        const programBlob = (group?.programs || [])
            .map((program) => program?.programTitle || '')
            .join(' ')
            .toLowerCase();

        return mentorName.includes(query) || programBlob.includes(query);
    });

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
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">MPS: {Number(m.mps || 0).toFixed(2)} / 5</p>
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

                    {activeTab === 'mentor-evaluation' && (
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl animate-in fade-in duration-500">
                            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Mentor Evaluation Reports</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Academic quality reports grouped by mentor and program.</p>
                                </div>

                                <details className="relative">
                                    <summary className="list-none cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-black uppercase tracking-widest hover:bg-violet-700">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Batch AI
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </summary>
                                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-2 z-20">
                                        <button
                                            onClick={handleBatchAiEvaluate}
                                            disabled={batchEvaluating}
                                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-60"
                                        >
                                            {batchEvaluating ? 'Evaluating Submitted Reports...' : 'Evaluate All Submitted'}
                                        </button>
                                    </div>
                                </details>
                            </div>

                            <div className="p-6 border-b border-slate-100 dark:border-white/5 grid md:grid-cols-3 gap-3">
                                <select
                                    value={mentorEvaluationMentorFilter}
                                    onChange={(e) => setMentorEvaluationMentorFilter(e.target.value)}
                                    className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm"
                                >
                                    <option value="all">All Mentors</option>
                                    {mentors.map((mentor) => (
                                        <option key={mentor._id} value={mentor._id}>
                                            {mentor.firstName} {mentor.lastName}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={mentorEvaluationStatusFilter}
                                    onChange={(e) => setMentorEvaluationStatusFilter(e.target.value)}
                                    className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm"
                                >
                                    <option value="all">All Status</option>
                                    <option value="submitted">Submitted</option>
                                    <option value="under_review">Under Review</option>
                                    <option value="evaluated">Evaluated</option>
                                </select>

                                <input
                                    value={mentorEvaluationSearch}
                                    onChange={(e) => setMentorEvaluationSearch(e.target.value)}
                                    placeholder="Search mentor or program"
                                    className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="p-6 space-y-4">
                                {mentorEvaluationLoading ? (
                                    <LoadingSkeleton rows={3} />
                                ) : (
                                    <>
                                        {filteredMentorEvaluationGroups.map((group) => (
                                            <div key={group.mentorId} className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                                                <button
                                                    onClick={() => toggleMentorAccordion(group.mentorId)}
                                                    className="w-full px-4 py-4 bg-slate-50 dark:bg-white/5 flex items-center justify-between"
                                                >
                                                    <div className="text-left">
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{group.mentorName}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="flex items-center gap-1">{renderMpsStars(group.currentMps)}</div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                                                {Number(group.currentMps || 0).toFixed(2)} ({group.currentGrade || 'None'})
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedMentors[group.mentorId] ? 'rotate-180' : ''}`} />
                                                </button>

                                                {expandedMentors[group.mentorId] && (
                                                    <div className="p-4 space-y-4">
                                                        {(group.programs || []).map((program) => (
                                                            <div key={program.programId} className="border border-slate-200 dark:border-white/10 rounded-xl p-3">
                                                                <p className="text-xs font-black text-slate-800 dark:text-white mb-2">{program.programTitle}</p>
                                                                <div className="space-y-2">
                                                                    {(program.reports || []).map((report) => {
                                                                        const status = String(report?.status || 'submitted').toLowerCase();
                                                                        const badgeClass = evaluationStatusClasses[status] || evaluationStatusClasses.submitted;

                                                                        return (
                                                                            <div key={report._id} className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3">
                                                                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                                                    <div>
                                                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{report.reportPeriod || 'Report period'}</p>
                                                                                        <div className="mt-1 flex items-center gap-2">
                                                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badgeClass}`}>
                                                                                                {status.replace('_', ' ')}
                                                                                            </span>
                                                                                            {report?.aiEvaluation?.overallScore !== undefined && (
                                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                                                                                    Score {Number(report.aiEvaluation.overallScore || 0).toFixed(1)} / 100
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="flex items-center gap-2">
                                                                                        {(status === 'submitted' || status === 'under_review') && (
                                                                                            <button
                                                                                                onClick={() => handleAiEvaluateMentorReport(report._id)}
                                                                                                disabled={aiEvaluatingReportId === report._id}
                                                                                                className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-1"
                                                                                            >
                                                                                                {aiEvaluatingReportId === report._id ? (
                                                                                                    <>
                                                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                                                        AI Evaluating...
                                                                                                    </>
                                                                                                ) : 'AI Evaluate'}
                                                                                            </button>
                                                                                        )}

                                                                                        <button
                                                                                            onClick={() => openEvaluationDetail(report._id)}
                                                                                            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
                                                                                        >
                                                                                            View
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {filteredMentorEvaluationGroups.length === 0 && (
                                            <p className="text-sm italic text-slate-500 text-center py-8">No mentor evaluation reports found for the selected filters.</p>
                                        )}
                                    </>
                                )}
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

                    <Modal
                        isOpen={evaluationDetailModalOpen}
                        onClose={() => {
                            setEvaluationDetailModalOpen(false);
                            setSelectedEvaluationReport(null);
                            setEvaluationFinalizeNotes('');
                            setEvaluationFinalizeOverride('');
                        }}
                        title="Mentor Evaluation Report Detail"
                    >
                        {evaluationDetailLoading ? (
                            <LoadingSkeleton rows={2} />
                        ) : !selectedEvaluationReport ? (
                            <p className="text-sm text-slate-500">No report selected.</p>
                        ) : (
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4">
                                    <p className="text-sm font-black text-slate-900 dark:text-white">{selectedEvaluationReport.programTitle || selectedEvaluationReport?.program?.title || 'Program'}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">
                                        Mentor: {selectedEvaluationReport?.mentor?.firstName} {selectedEvaluationReport?.mentor?.lastName} • Period: {selectedEvaluationReport?.reportPeriod}
                                    </p>
                                </div>

                                {[
                                    ['Teaching Methodology', selectedEvaluationReport.teachingMethodology],
                                    ['Course Work Description', selectedEvaluationReport.courseWorkDescription],
                                    ['Lecture Materials Summary', selectedEvaluationReport.lectureMaterialsSummary],
                                    ['Learner Progress Observations', selectedEvaluationReport.learnerProgressObservations],
                                    ['Challenges Faced', selectedEvaluationReport.challengesFaced],
                                    ['Improvement Plans', selectedEvaluationReport.improvementPlans],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-xl border border-slate-200 dark:border-white/10 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                                        <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{value || 'N/A'}</p>
                                    </div>
                                ))}

                                {selectedEvaluationReport?.aiEvaluation?.overallScore !== undefined && (
                                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-4 space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">AI Evaluation Result</p>
                                        {[
                                            ['Teaching', Number(selectedEvaluationReport.aiEvaluation.teachingScore || 0), 40],
                                            ['Course Work', Number(selectedEvaluationReport.aiEvaluation.courseWorkScore || 0), 30],
                                            ['Materials', Number(selectedEvaluationReport.aiEvaluation.materialsScore || 0), 30],
                                        ].map(([label, value, max]) => (
                                            <div key={label}>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</span>
                                                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{Number(value).toFixed(1)} / {max}</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40 overflow-hidden">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (Number(value) / Number(max)) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                        <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                                            Overall: {Number(selectedEvaluationReport.aiEvaluation.overallScore || 0).toFixed(1)} / 100 • Final MPS Contribution: {Number(selectedEvaluationReport.aiEvaluation.mpsContribution || 0).toFixed(2)} / 5
                                        </p>
                                        <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                                            {selectedEvaluationReport.aiEvaluation.detailedFeedback || 'No detailed feedback generated.'}
                                        </p>
                                        <div className="grid md:grid-cols-2 gap-3">
                                            <div className="rounded-xl bg-white/60 dark:bg-slate-900/40 border border-emerald-500/20 p-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-2">Strengths</p>
                                                <ul className="space-y-1">
                                                    {(selectedEvaluationReport.aiEvaluation.strengths || []).map((item, idx) => (
                                                        <li key={`${item}-${idx}`} className="text-xs text-slate-700 dark:text-slate-200">• {item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="rounded-xl bg-white/60 dark:bg-slate-900/40 border border-amber-500/20 p-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 mb-2">Improvement Areas</p>
                                                <ul className="space-y-1">
                                                    {(selectedEvaluationReport.aiEvaluation.improvementAreas || []).map((item, idx) => (
                                                        <li key={`${item}-${idx}`} className="text-xs text-slate-700 dark:text-slate-200">• {item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3 space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Finalize Evaluation</p>
                                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-300">
                                        Current Mentor MPS: {Number(selectedEvaluationReport?.mentor?.mps || 0).toFixed(2)} / 5 • Grade: {selectedEvaluationReport?.mentor?.grade || 'None'}
                                    </p>
                                    <textarea
                                        value={evaluationFinalizeNotes}
                                        onChange={(e) => setEvaluationFinalizeNotes(e.target.value)}
                                        rows={3}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm"
                                        placeholder="Supervisor notes (optional)"
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        max={5}
                                        step="0.01"
                                        value={evaluationFinalizeOverride}
                                        onChange={(e) => setEvaluationFinalizeOverride(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm"
                                        placeholder="Optional MPS override (0 - 5)"
                                    />
                                    <button
                                        onClick={handleFinalizeMentorEvaluation}
                                        disabled={evaluationFinalizing}
                                        className="w-full px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                                    >
                                        {evaluationFinalizing ? 'Finalizing...' : 'Finalize Evaluation'}
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
export default ProfessionalDashboard;
