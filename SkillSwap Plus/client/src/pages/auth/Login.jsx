import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, Clock, XCircle } from 'lucide-react';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const user = await login(formData.email, formData.password);
            // Redirect based on role
            let dest = '/learner/dashboard';
            if (user.role === 'mentor' || user.role === 'professional') dest = '/mentor/dashboard';
            if (user.role === 'admin') dest = '/admin/dashboard';
            navigate(dest);
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Invalid email or password';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pt-40 pb-20 min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
            <div className="w-full max-w-md">
                <div className="glass-morphism rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden backdrop-blur-xl bg-white/10 dark:bg-slate-900/50 border border-white/20">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[100px] -z-10"></div>

                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight italic">Welcome Back</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Log in to your SkillSwap+ account</p>
                    </div>

                    {error && (() => {
                        const isPending  = error.toLowerCase().includes('pending');
                        const isRejected = error.toLowerCase().includes('not approved') || error.toLowerCase().includes('rejected');
                        const cfg = isPending
                            ? { bg: 'bg-amber-500/10 border-amber-400/30', text: 'text-amber-700 dark:text-amber-400', Icon: Clock }
                            : isRejected
                            ? { bg: 'bg-red-500/10 border-red-400/30',    text: 'text-red-600 dark:text-red-400',    Icon: XCircle }
                            : { bg: 'bg-red-500/10 border-red-500/20',    text: 'text-red-500',                      Icon: AlertCircle };
                        return (
                            <div className={`mb-6 p-4 ${cfg.bg} border rounded-2xl ${cfg.text} text-sm font-bold flex items-start space-x-2 animate-in fade-in slide-in-from-top-2`}>
                                <cfg.Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        );
                    })()}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pl-12 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    placeholder="university@email.plus"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    required
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
                            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all text-lg mt-4 flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                            <LogIn className="w-5 h-5" />
                            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                        </button>
                    </form>

                    <p className="text-center mt-10 text-slate-500 dark:text-slate-400 text-sm font-medium">
                        Don't have an account? <Link to="/auth/register" className="text-indigo-600 font-bold hover:underline">Register now</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
