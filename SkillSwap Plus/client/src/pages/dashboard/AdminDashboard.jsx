import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import { 
    Users, 
    AlertTriangle, 
    DollarSign, 
    Shield, 
    CheckCircle, 
    XCircle, 
    UserPlus, 
    Search,
    ChevronRight,
    MessageSquare,
    Headphones,
    ShieldAlert,
    Eye,
    Clock
} from 'lucide-react';

const AdminDashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'users';

    const setActiveTab = (tab) => {
        setSearchParams({ tab });
    };

    const [users, setUsers] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [flaggedContent, setFlaggedContent] = useState({ questions: [], answers: [] });
    const [financeStats, setFinanceStats] = useState({ totalRevenue: 0, totalPlatformFee: 0, totalMentorEarnings: 0, payouts: { pending: 0, paid: 0 } });
    const [financeMentors, setFinanceMentors] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [isShowProfModal, setIsShowProfModal] = useState(false);
    const [profFormData, setProfFormData] = useState({ firstName: '', lastName: '', email: '', username: '', phone: '', nic: '', experienceYears: '', password: '' });
    const [profDocuments, setProfDocuments] = useState({ nicCopy: null, license: null });
    const [isShowReplyModal, setIsShowReplyModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [isShowReviewModal, setIsShowReviewModal] = useState(false);
    const [reviewUser, setReviewUser] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [reviewAction, setReviewAction] = useState(null); // 'approve' | 'reject'

    const menuItems = [
        { label: 'User Hub', path: '/admin/dashboard', icon: <Users className="w-5 h-5" />, tab: 'users' },
        { label: 'Support Tickets', path: '/admin/dashboard', icon: <Headphones className="w-5 h-5" />, tab: 'tickets' },
        { label: 'Complaints', path: '/admin/dashboard', icon: <ShieldAlert className="w-5 h-5" />, tab: 'complaints' },
        { label: 'Community', path: '/admin/dashboard', icon: <MessageSquare className="w-5 h-5" />, tab: 'community' },
        { label: 'Finance', path: '/admin/dashboard', icon: <DollarSign className="w-5 h-5" />, tab: 'finance' },
        { label: 'Audit Trail', path: '/admin/dashboard', icon: <Shield className="w-5 h-5" />, tab: 'audit' },
    ];

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        try {
            const [userRes, ticketRes, complaintRes, flaggedContentRes, financeRes] = await Promise.all([
                api.get('/admin/users').catch(() => ({ data: { success: false } })),
                api.get('/admin/tickets').catch(() => ({ data: { success: false } })),
                api.get('/admin/complaints').catch(() => ({ data: { success: false } })),
                api.get('/admin/community/flagged').catch(() => ({ data: { success: false } })),
                api.get('/admin/finance/stats').catch(() => ({ data: { success: false } }))
            ]);

            if (userRes.data?.success) setUsers(userRes.data.users || []);
            if (ticketRes.data?.success) setTickets(ticketRes.data.data || []);
            if (complaintRes.data?.success) setComplaints(complaintRes.data.data || []);
            if (flaggedContentRes.data?.success) setFlaggedContent(flaggedContentRes.data.data || { questions: [], answers: [] });
            
            // Fetch separate finance data
            const [finStatsRes, finMentorsRes, auditRes] = await Promise.all([
                api.get('/admin/finance/stats').catch(() => ({ data: { success: false, data: {} } })),
                api.get('/admin/finance/mentors').catch(() => ({ data: { success: false, data: [] } })),
                api.get('/admin/finance/audit').catch(() => ({ data: { success: false, data: [] } }))
            ]);
            
            if (finStatsRes.data?.success) setFinanceStats(finStatsRes.data.data);
            if (finMentorsRes.data?.success) setFinanceMentors(finMentorsRes.data.data || []);
            if (auditRes.data?.success) setAuditLogs(auditRes.data.data || []);

        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyMentor = async (userId) => {
        try {
            await api.put(`/admin/verify-mentor/${userId}`);
            setIsShowReviewModal(false);
            setReviewUser(null);
            fetchAdminData();
        } catch (error) {
            alert(error.response?.data?.message || 'Verification failed');
        }
    };

    const handleRejectMentor = async (userId, reason) => {
        try {
            await api.put(`/admin/reject-mentor/${userId}`, { reason });
            setIsShowReviewModal(false);
            setReviewUser(null);
            setRejectReason('');
            setReviewAction(null);
            fetchAdminData();
        } catch (error) {
            alert(error.response?.data?.message || 'Rejection failed');
        }
    };

    const openReviewModal = (user) => {
        setReviewUser(user);
        setRejectReason('');
        setReviewAction(null);
        setIsShowReviewModal(true);
    };

    const handleAddProfessional = async (userId) => {
        try {
            await api.put(`/admin/users/${userId}/promote-professional`); 
            fetchAdminData();
        } catch (error) {
            alert('Promotion failed');
        }
    };

    const handleProcessPayout = async (mentorId) => {
        if (!window.confirm('Confirm payout processing? This will mark all pending sessions as paid.')) return;
        try {
            await api.post(`/admin/finance/payout/${mentorId}`, { paymentMethod: 'Direct Bank Transfer' });
            alert('Payout successful');
            fetchAdminData();
        } catch (error) {
            alert(error.response?.data?.message || 'Payout failed');
        }
    };

    const handleCreateProfessional = async (e) => {
        e.preventDefault();
        
        if (profFormData.password.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }

        try {
            const formData = new FormData();
            Object.keys(profFormData).forEach(key => formData.append(key, profFormData[key]));
            if (profDocuments.nicCopy) formData.append('nicCopy', profDocuments.nicCopy);
            if (profDocuments.license) formData.append('license', profDocuments.license);
            formData.append('skills', JSON.stringify(['General']));

            await api.post('/admin/create-professional', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setIsShowProfModal(false);
            setProfFormData({ firstName: '', lastName: '', email: '', username: '', phone: '', nic: '', experienceYears: '', password: '' });
            setProfDocuments({ nicCopy: null, license: null });
            alert('Professional account created and verified successfully!');
            fetchAdminData();
        } catch (error) {
            const errMsg = error.response?.data?.errors?.[0]?.msg
                || error.response?.data?.message
                || 'Creation failed. Please check all fields.';
            alert('Error: ' + errMsg);
        }
    };

    const handleResolveTicket = async (id, status) => {
        try {
            await api.put(`/admin/tickets/${id}`, { status });
            fetchAdminData();
        } catch (error) {
            alert('Resolution failed');
        }
    };

    const handleOpenReplyModal = (ticket) => {
        setSelectedTicket(ticket);
        setReplyMessage('');
        setIsShowReplyModal(true);
    };

    const handleReplyToTicket = async () => {
        if (!replyMessage.trim()) {
            alert('Please enter a reply message');
            return;
        }

        try {
            await api.post(`/admin/tickets/${selectedTicket._id}/reply`, { message: replyMessage });
            setIsShowReplyModal(false);
            setReplyMessage('');
            setSelectedTicket(null);
            alert('Reply sent successfully');
            fetchAdminData();
        } catch (error) {
            alert(error.response?.data?.message || 'Reply failed');
        }
    };

    const handleReviewQuestion = async (questionId) => {
        try {
            await api.put(`/admin/community/questions/${questionId}/review`);
            alert('Question reviewed and unflagged');
            fetchAdminData();
        } catch (error) {
            alert(error.response?.data?.message || 'Review failed');
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;
        try {
            await api.delete(`/community/questions/${questionId}`);
            alert('Question deleted successfully');
            fetchAdminData();
        } catch (error) {
            alert(error.response?.data?.message || 'Deletion failed');
        }
    };

    const handleDeleteAnswer = async (answerId) => {
        if (!window.confirm('Are you sure you want to remove this reply?')) return;
        try {
            await api.delete(`/community/answers/${answerId}`);
            alert('Reply removed successfully');
            fetchAdminData();
        } catch (error) {
            alert(error.response?.data?.message || 'Removal failed');
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || u.role === filterRole;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
            <Sidebar menuItems={menuItems} />
            <main className="flex-grow lg:ml-72 pt-32 p-8">
                <div className="max-w-6xl mx-auto">
                    <header className="mb-10">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">System Governance</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium italic">High-level oversight of SkillSwap+ university ecosystem.</p>
                    </header>

                    {/* Stats Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {[
                        { label: 'Platform Revenue', value: `Rs. ${financeStats.totalPlatformFee?.toLocaleString() || '0.00'}`, icon: <DollarSign className="text-emerald-500" />, sub: '25% Total Markup' },
                        { label: 'Total Scholars', value: users.length, icon: <Users className="text-indigo-500" />, sub: `${users.filter(u => u.accountStatus === 'Pending').length} pending verification` },
                        { label: 'Open Tickets', value: tickets.filter(t => t.status !== 'Resolved').length, icon: <Headphones className="text-orange-500" />, sub: 'Support Needed' },
                        { label: 'Active Disputes', value: complaints.filter(c => c.status !== 'Resolved').length, icon: <ShieldAlert className="text-red-500" />, sub: 'Review Required' },
                        ].map((stat, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
                                <div className="flex items-center space-x-4 mb-4">
                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 group-hover:bg-indigo-500/10 transition-colors">
                                        {stat.icon}
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stat.value}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">{stat.sub}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex border-b border-slate-200 dark:border-white/5 mb-10 overflow-x-auto no-scrollbar">
                        {['Users', 'Tickets', 'Complaints', 'Community', 'Finance', 'Audit'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase())}
                                className={`pb-4 px-8 text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.toLowerCase() ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'users' && (
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">User Management</h2>
                                    <button 
                                        onClick={() => setIsShowProfModal(true)}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" /> Add Professional
                                    </button>
                                </div>
                                <div className="flex items-center space-x-4 w-full md:w-auto">
                                    <div className="flex gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                                        {['all', 'learner', 'mentor', 'professional'].map(r => (
                                            <button 
                                                key={r} 
                                                onClick={() => setFilterRole(r)}
                                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterRole === r ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="relative flex-grow md:flex-grow-0">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Search scholars..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-600 font-medium" 
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="px-6 py-4 text-left">User</th>
                                            <th className="px-6 py-4">Role</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                        {filteredUsers.map(u => (
                                            <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                            {u.firstName[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{u.firstName} {u.lastName}</p>
                                                            <p className="text-[10px] text-slate-400">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 capitalize text-xs font-bold text-slate-600 dark:text-slate-400">{u.role}</td>
                                                <td className="px-6 py-4">
                                                    {(() => {
                                                        const s = u.role === 'professional' ? 'Verified' : (u.accountStatus || 'Pending');
                                                        const cls = s === 'Verified' ? 'bg-emerald-500/10 text-emerald-600' :
                                                                    s === 'Rejected' ? 'bg-red-500/10 text-red-500' :
                                                                    s === 'Active'   ? 'bg-blue-500/10 text-blue-500' :
                                                                                       'bg-amber-500/10 text-amber-600';
                                                        const icon = s === 'Verified' ? <CheckCircle className="w-3 h-3" /> :
                                                                     s === 'Rejected' ? <XCircle className="w-3 h-3" /> :
                                                                     s === 'Active'   ? <CheckCircle className="w-3 h-3" /> :
                                                                                        <Clock className="w-3 h-3" />;
                                                        return (
                                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit ${cls}`}>
                                                                {icon}{s}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end space-x-1">
                                                        {(u.role === 'mentor' || u.role === 'learner') && u.accountStatus === 'Pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => openReviewModal(u)}
                                                                    title="Review Details"
                                                                    className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleVerifyMentor(u._id)}
                                                                    title="Approve"
                                                                    className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => { openReviewModal(u); setReviewAction('reject'); }}
                                                                    title="Reject"
                                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {u.role !== 'professional' && u.role !== 'admin' && (
                                                            <button onClick={() => handleAddProfessional(u._id)} title="Promote to Professional" className="p-2 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-xl transition-all"><UserPlus className="w-4 h-4" /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tickets' && (
                        <div className="space-y-6">
                            {tickets.length === 0 ? (
                                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 text-slate-500 italic">No open tickets.</div>
                            ) : (
                                tickets.map(t => (
                                    <div key={t._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] flex items-center justify-between group">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-600"><Headphones className="w-5 h-5" /></div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white capitalize">{t.title}</h4>
                                                <p className="text-xs text-slate-400 font-medium tracking-tight">User: {t.user?.firstName} • Priority: {t.priority} • Category: {t.category}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            {t.status !== 'Resolved' && (
                                                <button onClick={() => handleResolveTicket(t._id, 'Resolved')} className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Resolve</button>
                                            )}
                                            {!(t.status === 'Resolved' && t.repliedByAdmin === true) ? (
                                                <button onClick={() => handleOpenReplyModal(t)} className="bg-slate-100 dark:bg-white/5 text-slate-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all">Reply</button>
                                            ) : (
                                                <span className="bg-emerald-500/10 text-emerald-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Solved</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'complaints' && (
                        <div className="space-y-6">
                            {complaints.length === 0 ? (
                                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 text-slate-500 italic">Excellent! No active disputes.</div>
                            ) : (
                                complaints.map(c => (
                                    <div key={c._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] flex items-center justify-between group">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-4 rounded-full bg-red-500/10 text-red-600"><ShieldAlert className="w-5 h-5" /></div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white capitalize">{c.title}</h4>
                                                <p className="text-xs text-slate-400 font-medium tracking-tight">Reporter: {c.user?.firstName} • Target: {c.targetUser?.firstName}</p>
                                            </div>
                                        </div>
                                        <button className="bg-red-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 opacity-0 group-hover:opacity-100 transition-all">Review Dispute</button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                    {activeTab === 'community' && (
                        <div className="space-y-12">
                            {/* Flagged Questions */}
                            <section>
                                <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                                    <AlertTriangle className="text-orange-500" /> Flagged Posts
                                </h3>
                                <div className="space-y-4">
                                    {flaggedContent.questions.length === 0 ? (
                                        <p className="text-slate-500 italic">No flagged posts to review.</p>
                                    ) : (
                                        flaggedContent.questions.map(q => (
                                            <div key={q._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-3xl shadow-sm flex items-center justify-between group">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-white">{q.title}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Author: {q.author?.firstName} • Flags: {q.flagReasons?.length || 1}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleReviewQuestion(q._id)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">Review</button>
                                                    <button onClick={() => handleDeleteQuestion(q._id)} className="bg-red-500/10 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">Delete</button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>

                            {/* Flagged Answers */}
                            <section>
                                <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                                    <MessageSquare className="text-orange-500" /> Flagged Replies
                                </h3>
                                <div className="space-y-4">
                                    {flaggedContent.answers.length === 0 ? (
                                        <p className="text-slate-500 italic">No flagged replies to review.</p>
                                    ) : (
                                        flaggedContent.answers.map(a => (
                                            <div key={a._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-3xl shadow-sm flex items-center justify-between group">
                                                <div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium line-clamp-1">{a.body}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">From Post: {a.question?.title} • Author: {a.author?.firstName}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleDeleteAnswer(a._id)} className="bg-red-500/10 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">Remove</button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    )}


                    {activeTab === 'finance' && (
                        <div className="space-y-12">
                            {/* Finance Stats Grid */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: 'Total Revenue', value: `Rs. ${financeStats.totalRevenue?.toLocaleString()}`, color: 'text-slate-900 dark:text-white' },
                                    { label: 'Platform Fee (25%)', value: `Rs. ${financeStats.totalPlatformFee?.toLocaleString()}`, color: 'text-emerald-500' },
                                    { label: 'Mentor Share (75%)', value: `Rs. ${financeStats.totalMentorEarnings?.toLocaleString()}`, color: 'text-indigo-500' },
                                    { label: 'Pending Payouts', value: `Rs. ${financeStats.payouts?.pending?.toLocaleString()}`, color: 'text-orange-500' },
                                ].map((s, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-3xl shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                        <h4 className={`text-2xl font-black ${s.color}`}>{s.value}</h4>
                                    </div>
                                ))}
                            </div>

                            {/* Mentor Earnings Table */}
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
                                <div className="p-8 border-b border-slate-100 dark:border-white/5">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mentor Payout Registry</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-white/5">
                                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <th className="px-8 py-4">Mentor</th>
                                                <th className="px-8 py-4">Sessions</th>
                                                <th className="px-8 py-4">Gross Earned</th>
                                                <th className="px-8 py-4">Platform Fee</th>
                                                <th className="px-8 py-4">Pending Payout</th>
                                                <th className="px-8 py-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                            {financeMentors.map(m => (
                                                <tr key={m._id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                                    <td className="px-8 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">{m.firstName[0]}</div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800 dark:text-white">{m.firstName} {m.lastName}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium">{m.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{m.completedSessions}</td>
                                                    <td className="px-8 py-4 text-sm font-bold text-slate-900 dark:text-white">Rs. {m.totalEarned?.toLocaleString()}</td>
                                                    <td className="px-8 py-4 text-sm font-medium text-red-500">-Rs. {m.totalFees?.toLocaleString()}</td>
                                                    <td className="px-8 py-4">
                                                        <span className={`text-sm font-black ${m.pendingPayment > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                                                            Rs. {m.pendingPayment?.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        {m.pendingPayment > 0 && (
                                                            <button 
                                                                onClick={() => handleProcessPayout(m._id)}
                                                                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                                                            >
                                                                Pay Now
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'audit' && (
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
                            <div className="p-8 border-b border-slate-100 dark:border-white/5">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Financial Audit Trail</h2>
                                <p className="text-xs text-slate-500 italic mt-1 font-medium">Immutable log of all financial governance actions.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-white/5">
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="px-8 py-4">Action</th>
                                            <th className="px-8 py-4">Admin</th>
                                            <th className="px-8 py-4">Target Mentor</th>
                                            <th className="px-8 py-4">Amount</th>
                                            <th className="px-8 py-4">Date</th>
                                            <th className="px-8 py-4">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                        {auditLogs.map(log => (
                                            <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                                <td className="px-8 py-4">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                        log.actionType.includes('payout') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-600'
                                                    }`}>
                                                        {log.actionType.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{log.admin?.firstName} {log.admin?.lastName}</td>
                                                <td className="px-8 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{log.targetMentor?.firstName} {log.targetMentor?.lastName || '-'}</td>
                                                <td className="px-8 py-4 text-sm font-bold text-slate-900 dark:text-white">{log.amount ? `Rs. ${log.amount.toLocaleString()}` : '-'}</td>
                                                <td className="px-8 py-4 text-xs font-medium text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                                                <td className="px-8 py-4 text-xs font-medium text-slate-500 italic">{log.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Add Professional Modal */}
            {isShowProfModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden my-auto">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
                        <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Add Professional</h2>
                        <p className="text-sm text-slate-500 mb-8 italic">Register a new elite scholar to the platform.</p>
                        
                        <form onSubmit={handleCreateProfessional} className="space-y-4 relative z-10">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">First Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
                                        placeholder="Suresh"
                                        value={profFormData.firstName}
                                        onChange={(e) => setProfFormData({...profFormData, firstName: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Last Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
                                        placeholder="Dias"
                                        value={profFormData.lastName}
                                        onChange={(e) => setProfFormData({...profFormData, lastName: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Email Address</label>
                                    <input 
                                        type="email" 
                                        required 
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
                                        placeholder="professor@university.edu"
                                        value={profFormData.email}
                                        onChange={(e) => setProfFormData({...profFormData, email: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Username</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
                                        placeholder="johndoe123"
                                        value={profFormData.username}
                                        onChange={(e) => setProfFormData({...profFormData, username: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Phone</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
                                        placeholder="0771234567"
                                        value={profFormData.phone}
                                        onChange={(e) => setProfFormData({...profFormData, phone: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">NIC Number</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
                                        placeholder="1990123456"
                                        value={profFormData.nic}
                                        onChange={(e) => setProfFormData({...profFormData, nic: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Password</label>
                                    <input 
                                        type="password" 
                                        required
                                        minLength="6"
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
                                        placeholder="Min 6 characters"
                                        value={profFormData.password}
                                        onChange={(e) => setProfFormData({...profFormData, password: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Experience (Yrs)</label>
                                    <input 
                                        type="number" 
                                        required 
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
                                        placeholder="5"
                                        value={profFormData.experienceYears}
                                        onChange={(e) => setProfFormData({...profFormData, experienceYears: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">NIC Document Copy (PDF/Img)</label>
                                    <input 
                                        type="file" 
                                        required 
                                        accept=".pdf,image/*"
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                        onChange={(e) => setProfDocuments({...profDocuments, nicCopy: e.target.files[0]})}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Professional License (Optional)</label>
                                    <input 
                                        type="file" 
                                        accept=".pdf,image/*"
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                        onChange={(e) => setProfDocuments({...profDocuments, license: e.target.files[0]})}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button 
                                    type="button" 
                                    onClick={() => setIsShowProfModal(false)}
                                    className="flex-grow bg-slate-100 dark:bg-white/5 text-slate-500 font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 dark:border-white/5"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-grow premium-gradient text-white font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all"
                                >
                                    Add Professional (Pending)
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Review Modal */}
            {isShowReviewModal && reviewUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden my-auto">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>

                        {/* Header */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black text-lg">
                                {reviewUser.firstName?.[0]}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">{reviewUser.firstName} {reviewUser.lastName}</h2>
                                <p className="text-xs text-slate-400 font-medium capitalize">{reviewUser.role} &bull; {reviewUser.email}</p>
                            </div>
                            <span className={`ml-auto px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                reviewUser.accountStatus === 'Pending' ? 'bg-amber-500/10 text-amber-600' :
                                reviewUser.accountStatus === 'Verified' ? 'bg-emerald-500/10 text-emerald-600' :
                                'bg-red-500/10 text-red-500'
                            }`}>{reviewUser.accountStatus || 'Pending'}</span>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                            {[
                                { label: 'Email', value: reviewUser.email },
                                { label: 'Phone', value: reviewUser.phone || '—' },
                                { label: 'NIC', value: reviewUser.nic || '—' },
                                { label: 'Experience', value: reviewUser.experienceYears != null ? `${reviewUser.experienceYears} yr(s)` : '—' },
                            ].map(({ label, value }) => (
                                <div key={label} className="bg-slate-50 dark:bg-white/5 rounded-2xl px-4 py-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white break-all">{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Skills */}
                        {reviewUser.role === 'mentor' && (
                            <div className="mb-6 relative z-10">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Skills Listed</p>
                                {reviewUser.skills && reviewUser.skills.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {reviewUser.skills.map((s, i) => (
                                            <span key={i} className="bg-indigo-500/10 text-indigo-600 px-3 py-1 rounded-xl text-xs font-bold">
                                                {typeof s === 'string' ? s : s.name} {s.level ? `• ${s.level}` : ''}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-amber-500 font-medium italic">No skills added yet</p>
                                )}
                            </div>
                        )}

                        {/* Documents */}
                        {reviewUser.professionalDocuments && (
                            <div className="mb-6 relative z-10">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Uploaded Documents</p>
                                <div className="flex gap-3">
                                    {reviewUser.professionalDocuments.nicCopy && (
                                        <a href={`/uploads/documents/${reviewUser.professionalDocuments.nicCopy.split('/').pop()}`}
                                           target="_blank" rel="noreferrer"
                                           className="bg-slate-100 dark:bg-white/5 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all">
                                            View ID Document
                                        </a>
                                    )}
                                    {reviewUser.professionalDocuments.license && (
                                        <a href={`/uploads/documents/${reviewUser.professionalDocuments.license.split('/').pop()}`}
                                           target="_blank" rel="noreferrer"
                                           className="bg-slate-100 dark:bg-white/5 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all">
                                            View License/Certificate
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Automated Checks Summary */}
                        <div className="mb-6 bg-slate-50 dark:bg-white/5 rounded-2xl px-5 py-4 relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Automated Checks</p>
                            <div className="space-y-2">
                                {[
                                    { label: 'Email format valid', pass: /^\S+@\S+\.\S+$/.test(reviewUser.email) },
                                    { label: 'Phone number provided', pass: !!reviewUser.phone },
                                    { label: 'NIC number provided', pass: !!reviewUser.nic },
                                    { label: reviewUser.role === 'mentor' ? 'At least one skill listed' : 'Profile complete', pass: reviewUser.role === 'mentor' ? reviewUser.skills?.length > 0 : true },
                                ].map(({ label, pass }) => (
                                    <div key={label} className="flex items-center gap-2">
                                        {pass
                                            ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            : <XCircle className="w-4 h-4 text-amber-500" />}
                                        <span className={`text-xs font-medium ${pass ? 'text-slate-600 dark:text-slate-300' : 'text-amber-500'}`}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reject Reason (shown when reject action chosen) */}
                        {reviewAction === 'reject' && (
                            <div className="mb-5 relative z-10">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Rejection Reason (sent to user by email)</label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Explain why the application was rejected..."
                                    rows="3"
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none resize-none"
                                />
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 relative z-10">
                            <button
                                onClick={() => { setIsShowReviewModal(false); setReviewUser(null); setReviewAction(null); }}
                                className="flex-grow bg-slate-100 dark:bg-white/5 text-slate-500 font-black px-4 py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 dark:border-white/5"
                            >
                                Close
                            </button>
                            {reviewUser.accountStatus === 'Pending' && (
                                <>
                                    {reviewAction !== 'reject' ? (
                                        <>
                                            <button
                                                onClick={() => setReviewAction('reject')}
                                                className="flex-grow bg-red-500/10 text-red-500 font-black px-4 py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleVerifyMentor(reviewUser._id)}
                                                className="flex-grow bg-emerald-600 text-white font-black px-4 py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all"
                                            >
                                                Approve &amp; Notify
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleRejectMentor(reviewUser._id, rejectReason)}
                                            className="flex-grow bg-red-600 text-white font-black px-4 py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all"
                                        >
                                            Confirm Rejection &amp; Notify
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Reply to Ticket Modal */}
            {isShowReplyModal && selectedTicket && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
                        <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Reply to Ticket</h2>
                        <p className="text-sm text-slate-500 mb-4 italic">{selectedTicket.title}</p>
                        
                        <div className="space-y-4 relative z-10">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block mb-2">Your Reply</label>
                                <textarea 
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Type your response to the user..."
                                    rows="6"
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none resize-none"
                                />
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setIsShowReplyModal(false);
                                        setReplyMessage('');
                                        setSelectedTicket(null);
                                    }}
                                    className="flex-grow bg-slate-100 dark:bg-white/5 text-slate-500 font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 dark:border-white/5"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleReplyToTicket}
                                    className="flex-grow premium-gradient text-white font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all"
                                >
                                    Send Reply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
