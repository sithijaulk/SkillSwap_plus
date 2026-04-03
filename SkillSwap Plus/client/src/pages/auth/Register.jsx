import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Smartphone, Mail, Lock, User, ShieldCheck } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({ 
        firstName: '', 
        lastName: '', 
        email: '', 
        password: '', 
        role: 'learner',
        phone: '' 
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!/^\d{10}$/.test(formData.phone)) {
            setError('Phone number must be exactly 10 digits');
            return;
        }

        setLoading(true);
        try {
            const user = await register(formData);
            let dest = '/learner/dashboard';
            if (user.role === 'mentor') dest = '/mentor/dashboard';
            navigate(dest);
        } catch (err) {
            console.error(err);
            if (err.response?.data?.errors) {
                setError(err.response.data.errors.map(e => e.msg).join(', '));
            } else {
                setError(err.response?.data?.message || 'Registration failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pt-40 pb-20 min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
            <div className="w-full max-w-xl">
                <div className="glass-morphism rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden backdrop-blur-xl bg-white/10 dark:bg-slate-900/50 border border-white/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -z-10"></div>

                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Join SkillSwap+</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Create your university account and start collaborating.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">First Name</label>
                                <input
                                    type="text" required
                                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    placeholder="Suresh"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Last Name</label>
                                <input
                                    type="text" required
                                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    placeholder="Dias"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                            <div className="relative">
                                <input
                                    type="email" required
                                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pl-12 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    placeholder="university@email.plus"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Phone Number (10 Digits)</label>
                            <div className="relative">
                                <input
                                    type="text" required
                                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pl-12 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    placeholder="0771234567"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'learner' })}
                                className={`py-4 rounded-2xl font-bold border-2 transition-all capitalize flex items-center justify-center space-x-2 ${formData.role === 'learner' ? 'border-indigo-600 bg-indigo-600/10 text-indigo-600' : 'border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-800/30 text-slate-500 hover:border-indigo-600/30'}`}
                            >
                                <User className="w-4 h-4" />
                                <span>Learner</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'mentor' })}
                                className={`py-4 rounded-2xl font-bold border-2 transition-all capitalize flex items-center justify-center space-x-2 ${formData.role === 'mentor' ? 'border-indigo-600 bg-indigo-600/10 text-indigo-600' : 'border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-800/30 text-slate-500 hover:border-indigo-600/30'}`}
                            >
                                <ShieldCheck className="w-4 h-4" />
                                <span>Mentor</span>
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                            <div className="relative">
                                <input
                                    type="password" required
                                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pl-12 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all text-lg mt-4 disabled:opacity-50"
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center mt-10 text-slate-500 dark:text-slate-400 text-sm font-medium">
                        Already a member? <Link to="/auth/login" className="text-indigo-600 font-bold hover:underline">Log in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
