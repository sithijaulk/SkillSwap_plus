import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, MessageSquare, ShieldCheck, Smartphone, ArrowLeft, CreditCard, DollarSign } from 'lucide-react';
import PaymentModal from '../../components/PaymentModal';

const BookSession = () => {
    const { mentorId } = useParams();
    const [searchParams] = useSearchParams();
    const skillName = searchParams.get('skillName');
    const skillId = searchParams.get('skill');
    const navigate = useNavigate();
    const { user } = useAuth();

    const [mentor, setMentor] = useState(null);
    const [skill, setSkill] = useState(null);
    const [formData, setFormData] = useState({
        topic: '',
        scheduledDate: '',
        duration: 60,
        phone: user?.phone || '',
        skill: skillName || 'General Mentorship'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [bookedSession, setBookedSession] = useState(null);

    useEffect(() => {
        fetchMentorAndSkill();
    }, [mentorId, skillId]);

    const fetchMentorAndSkill = async () => {
        try {
            // Fetch mentor details
            const mentorResponse = await api.get(`/users/profile/${mentorId}`);
            setMentor(mentorResponse.data);

            // If skillId is provided, fetch skill details
            if (skillId) {
                const skillResponse = await api.get(`/skills/${skillId}`);
                setSkill(skillResponse.data);
                setFormData(prev => ({ ...prev, skill: skillResponse.data.title }));
            }
        } catch (error) {
            console.error('Error fetching mentor/skill details:', error);
        }
    };

    const calculateAmount = () => {
        if (!skill?.price) return 0;
        // Amount is per hour, convert duration to hours
        return (skill.price * (formData.duration / 60));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Date Validation
        if (new Date(formData.scheduledDate) < new Date()) {
            setError('Session date must be in the future');
            return;
        }

        // Phone Validation
        if (!/^\d{10}$/.test(formData.phone)) {
            setError('Phone number must be exactly 10 digits');
            return;
        }

        setLoading(true);
        try {
            const amount = calculateAmount();
            const response = await api.post('/sessions', {
                mentor: mentorId,
                skill: skillId || formData.skill,
                topic: formData.topic,
                scheduledDate: formData.scheduledDate,
                duration: formData.duration,
                amount: amount
            });

            if (response.data.success) {
                setBookedSession(response.data.data);

                // If amount is 0, go directly to success
                if (amount === 0) {
                    alert('Session booked successfully! Check your dashboard for details.');
                    navigate('/learner/dashboard');
                } else {
                    // Show payment modal
                    setShowPaymentModal(true);
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Booking failed');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = (transaction) => {
        alert('Session booked and payment processed successfully! Check your dashboard for details.');
        navigate('/learner/dashboard');
    };

    return (
        <div className="pt-32 pb-20 min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="container mx-auto px-6">
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center space-x-2 text-slate-500 hover:text-indigo-600 transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-bold uppercase tracking-widest">Back to Programs</span>
                </button>

                <div className="max-w-3xl mx-auto">
                    <div className="glass-morphism rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden backdrop-blur-xl bg-white/10 dark:bg-slate-900/50 border border-white/20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -z-10"></div>
                        
                        <div className="mb-10">
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Schedule Your Session</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium italic">Join a dynamic skill-sharing session with an expert mentor.</p>
                        </div>

                        {error && (
                            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Academic Skill</label>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={formData.skill}
                                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-400 focus:outline-none font-medium cursor-not-allowed"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Contact Phone (10 Digits)</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="07XXXXXXXX"
                                            value={formData.phone}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setFormData({...formData, phone: value});
                                            }}
                                            maxLength={10}
                                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pl-12 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                        />
                                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Specific Discussion Topic</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="e.g., Debugging React Hooks performance issues"
                                        value={formData.topic}
                                        onChange={(e) => setFormData({...formData, topic: e.target.value})}
                                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pl-12 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    />
                                    <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Scheduled Date & Time</label>
                                    <div className="relative">
                                        <input 
                                            type="datetime-local" 
                                            required
                                            value={formData.scheduledDate}
                                            onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pl-12 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                        />
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Duration (Minutes)</label>
                                    <div className="relative">
                                        <select 
                                            value={formData.duration}
                                            onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pl-12 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium appearance-none"
                                        >
                                            <option value={30}>30 Minutes</option>
                                            <option value={60}>60 Minutes</option>
                                            <option value={90}>90 Minutes</option>
                                            <option value={120}>120 Minutes</option>
                                        </select>
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-100 dark:bg-white/5 rounded-3xl space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Session Pricing</span>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-slate-800 dark:text-white">
                                            ${calculateAmount().toFixed(2)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            ${(calculateAmount() * 1.25).toFixed(2)} with fees
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-white/10">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Mentor Rate</span>
                                        <span className="font-medium">${skill?.price ? (skill.price * (formData.duration / 60)).toFixed(2) : '0.00'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Platform Fee (25%)</span>
                                        <span className="font-medium">${(calculateAmount() * 0.25).toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-start space-x-3 text-xs text-slate-500 italic">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>Secure payment processing. Funds are held until session completion.</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all text-lg mt-4 disabled:opacity-50 flex items-center justify-center space-x-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-5 h-5" />
                                        <span>Book Session - ${(calculateAmount() * 1.25).toFixed(2)}</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Payment Modal */}
                {showPaymentModal && bookedSession && (
                    <PaymentModal
                        isOpen={showPaymentModal}
                        onClose={() => setShowPaymentModal(false)}
                        session={bookedSession}
                        onPaymentSuccess={handlePaymentSuccess}
                    />
                )}
            </div>
        </div>
    );
};

export default BookSession;
