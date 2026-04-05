import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/common/Modal';
import ReportModal from '../components/common/ReportModal';
import { BookOpen, User, Star, Clock, CheckCircle, CreditCard, ShieldCheck, Flag, Search, Filter, SortDesc } from 'lucide-react';

const Programs = () => {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [formData, setFormData] = useState({
        cardNumber: '',
        expiry: '',
        phone: user?.phone || ''
    });
    const [reportModal, setReportModal] = useState({ open: false, targetId: '', targetName: '', targetType: 'user' });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('newest');

    const categories = ['all', 'programming', 'languages', 'mathematics', 'science', 'arts', 'music', 'sports', 'other'];

    useEffect(() => {
        fetchSkills();
    }, [selectedCategory, sortBy]);

    // Use a debounce for search to avoid excessive API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSkills();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (user?.phone) {
            setFormData(prev => ({ ...prev, phone: user.phone }));
        }
    }, [user]);

    const fetchSkills = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (selectedCategory !== 'all') params.append('category', selectedCategory);
            if (sortBy !== 'newest') params.append('sort', sortBy);

            const response = await api.get(`/skills/public?${params.toString()}`);
            if (response.data.success) {
                setSkills(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching skills:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (skill) => {
        const typeKey = String(skill?.type || '').toLowerCase();
        const isPaidProgram = typeKey === 'paid' || typeKey === 'buy now';

        if (!isAuthenticated) {
            navigate('/auth/login');
            return;
        }

        if (isPaidProgram) {
            setSelectedSkill(skill);
            setIsBuyModalOpen(true);
        } else {
            // Free skill - navigate to booking
            const mentorId = skill?.mentor?._id || skill?.mentor;
            navigate(`/sessions/book/${mentorId || ''}`, {
                state: {
                    skillId: skill._id,
                    skill: skill
                }
            });
        }
    };

    const handleConfirmPurchase = async (e) => {
        e.preventDefault();
        
        if (!/^\d{10}$/.test(formData.phone)) {
            alert('Phone number must be exactly 10 digits (e.g., 0771234567)');
            return;
        }

        setIsProcessing(true);
        try {
            const response = await api.post('/admin/finance/pay', {
                skillId: selectedSkill._id,
                phone: formData.phone
            });
            if (response.data.success) {
                alert('Payment Successful! The program has been added to your dashboard.');
                setIsBuyModalOpen(false);
                navigate('/learner/dashboard?tab=my-learning');
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Payment failed');
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="pt-32 flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="pt-32 pb-20 min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">Available Programs</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium italic">Master new skills with university mentors and peers.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search skills or keywords..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 pr-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 w-full sm:w-64 shadow-sm"
                            />
                        </div>
                        <div className="relative">
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="pl-11 pr-10 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-white appearance-none focus:ring-2 focus:ring-indigo-600 shadow-sm capitalize"
                            >
                                <option value="newest">Newest First</option>
                                <option value="price_low">Price: Low to High</option>
                                <option value="price_high">Price: High to Low</option>
                                <option value="top_rated">Top Rated Mentors</option>
                            </select>
                            <SortDesc className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                        </div>
                    </div>
                </div>

                {/* Categories */}
                <div className="flex items-center space-x-3 mb-12 overflow-x-auto no-scrollbar pb-2">
                    <Filter className="w-5 h-5 text-slate-400 shrink-0 mr-2" />
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${
                                selectedCategory === cat 
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20' 
                                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-indigo-600'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {skills.length === 0 ? (
                        <div className="md:col-span-2 lg:col-span-3 py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10">
                            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 font-medium italic">No programs found matching your filters.</p>
                            <button 
                                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSortBy('newest'); }}
                                className="mt-4 text-indigo-600 font-bold hover:underline"
                            >
                                Clear all filters
                            </button>
                        </div>
                    ) : (
                        skills.map((skill) => {
                            const hasPublicReputation = Number(skill.totalReviews || 0) > 0;
                            const typeKey = String(skill?.type || '').toLowerCase();
                            const isPaidProgram = typeKey === 'paid' || typeKey === 'buy now';
                            const isFreeProgram = typeKey === 'free' || typeKey === 'skill share';
                            const previewReview = Array.isArray(skill.recentReviews)
                                ? skill.recentReviews.find((r) => (r?.writtenReview || '').trim().length > 0)
                                : null;
                            const previewReviewerName = previewReview
                                ? (previewReview.isAnonymous
                                    ? 'Anonymous Learner'
                                    : `${previewReview.learnerFirstName || ''} ${previewReview.learnerLastName || ''}`.trim() || 'Learner')
                                : '';

                            return (
                            <div key={skill._id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col">
                                <div className="h-48 bg-slate-800 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-violet-600/20 group-hover:scale-110 transition-transform duration-500"></div>
                                    <div className="absolute top-4 left-4">
                                        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg ${isFreeProgram ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
                                            {isFreeProgram ? 'Skill Share' : 'Buy Now'}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20">
                                        <span className="text-xs font-medium text-white flex items-center">
                                            <Clock className="w-3 h-3 mr-1" /> 12+ Lectures
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6 flex-grow">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{skill.category}</span>
                                        <div className="flex items-center text-amber-500">
                                            <Star className="w-4 h-4 fill-current" />
                                            <span className="ml-1 text-sm font-bold">
                                                {hasPublicReputation ? Number(skill.averageRating || 0).toFixed(1) : 'New'}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{skill.title || skill.name}</h3>

                                    {/* Public reputation (verified learner feedback) */}
                                    {hasPublicReputation ? (
                                        <div className="mb-5">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {skill.totalReviews} Reviews
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                                    {skill.recommendationRate}% Recommend
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                Verified learner feedback
                                            </p>
                                            {previewReview && (
                                                <div className="mt-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
                                                    <div className="flex items-center justify-between gap-3 mb-1">
                                                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                                            {previewReviewerName}
                                                        </p>
                                                        <span className="text-[11px] font-bold text-amber-500 whitespace-nowrap">
                                                            ★ {Number(previewReview.rating || 0).toFixed(1)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                                        {previewReview.writtenReview}
                                                    </p>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/programs/${skill._id}`)}
                                                className="mt-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                            >
                                                See all reviews
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="mb-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">New program • No reviews yet</p>
                                    )}
                                    <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-6">
                                        {skill.description}
                                    </p>
                                    
                                    <div className="flex items-center space-x-3 pt-4 border-t border-slate-100 dark:border-white/5">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-bold border border-slate-200 dark:border-white/10 shadow-sm">
                                            {skill.mentor?.firstName?.[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">{skill.mentor?.firstName} {skill.mentor?.lastName}</p>
                                            <p className="text-xs text-slate-500 mt-1">{skill.mentor?.university || 'University Partner'}</p>
                                        </div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setReportModal({ open: true, targetId: skill.mentor?._id, targetName: `${skill.mentor?.firstName} ${skill.mentor?.lastName}`, targetType: 'user' });
                                            }}
                                            className="ml-auto p-2 text-slate-300 hover:text-red-500 transition-colors"
                                            title="Report Mentor"
                                        >
                                            <Flag className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="px-6 py-5 bg-slate-50 dark:bg-white/5 flex items-center justify-between">
                                    <div>
                                        {isPaidProgram ? (
                                            <>
                                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter leading-none mb-1">Price + 25% Fee</p>
                                                <p className="text-2xl font-black text-slate-900 dark:text-white">Rs.{(skill.displayPrice || (skill.price * 1.25)).toLocaleString()}</p>
                                            </>
                                        ) : (
                                            <p className="text-xl font-black text-emerald-500 italic">FREE SHARE</p>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => handleAction(skill)}
                                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all transform hover:scale-105 active:scale-95 ${isFreeProgram ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 shadow-sm' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'}`}
                                    >
                                        {isFreeProgram ? 'Join Now' : 'Enroll Now'}
                                    </button>
                                </div>
                            </div>
                        );
                        })
                    )}
                </div>
            </div>

            {/* Buy Flow Modal */}
            <Modal 
                isOpen={isBuyModalOpen} 
                onClose={() => setIsBuyModalOpen(false)} 
                title="Enroll in Program"
            >
                {selectedSkill && (
                    <div className="space-y-6">
                        <div className="bg-indigo-50 dark:bg-indigo-500/5 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                            <h4 className="font-bold text-indigo-900 dark:text-indigo-200 mb-1">{selectedSkill?.title || selectedSkill?.name}</h4>
                            <p className="text-sm text-indigo-700 dark:text-indigo-400">Mentor: {selectedSkill.mentor?.firstName} {selectedSkill.mentor?.lastName}</p>
                        </div>

                        <form onSubmit={handleConfirmPurchase} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Card Number</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="**** **** **** 4444" 
                                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600" 
                                            required 
                                            value={formData.cardNumber}
                                            onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                                        />
                                        <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry</label>
                                    <input 
                                        type="text" 
                                        placeholder="MM/YY" 
                                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600" 
                                        required 
                                        value={formData.expiry}
                                        onChange={(e) => setFormData({...formData, expiry: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Phone (10 Digits)</label>
                                <input 
                                    type="text" 
                                    placeholder="07XXXXXXXX" 
                                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600" 
                                    required 
                                    value={formData.phone}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setFormData({...formData, phone: value});
                                    }}
                                    maxLength={10}
                                />
                            </div>
                            
                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Mentor Price</span>
                                    <span className="font-bold">Rs.{selectedSkill.price.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Platform Fee (25%)</span>
                                    <span className="font-bold">Rs.{(selectedSkill.price * 0.25).toLocaleString()}</span>
                                </div>
                                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-between">
                                    <span className="font-bold text-slate-800 dark:text-white">Total Amount</span>
                                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">Rs.{(selectedSkill.price * 1.25).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 text-xs text-slate-500 italic pb-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                <span>Payments are secure and encrypted.</span>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isProcessing}
                                className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {isProcessing ? 'Processing Transaction...' : 'Complete Enrollment'}
                            </button>
                        </form>
                    </div>
                )}
            </Modal>

            <ReportModal 
                isOpen={reportModal.open}
                onClose={() => setReportModal({ ...reportModal, open: false })}
                targetId={reportModal.targetId}
                targetName={reportModal.targetName}
                targetType={reportModal.targetType}
            />
        </div>
    );
};

export default Programs;
