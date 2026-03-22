import React from 'react';
import { Users, Globe, Zap, Heart, ShieldCheck, GraduationCap } from 'lucide-react';

const AboutUs = () => {
    return (
        <div className="pt-32 pb-20 min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Hero Section */}
            <header className="max-w-6xl mx-auto px-6 text-center mb-24">
                <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 font-black text-[10px] uppercase tracking-widest mb-6">Our DNA</div>
                <h1 className="text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter">Empowering Scholars Through Shared Intelligence.</h1>
                <p className="text-xl text-slate-500 max-w-3xl mx-auto font-medium">SkillSwap+ is the premier decentralized learning ecosystem built specifically for university students in Sri Lanka.</p>
            </header>

            {/* Mission/Vision */}
            <section className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 mb-32">
                <div className="p-10 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-2xl rounded-full -mr-16 -mt-16"></div>
                    <GraduationCap className="w-12 h-12 text-indigo-600 mb-8" />
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Our Mission</h2>
                    <p className="text-slate-500 leading-relaxed font-medium">To break the silos of academic knowledge by providing a secure, role-based platform where students can trade skills, build professional networks, and accelerate their career trajectories before graduation.</p>
                </div>
                <div className="p-10 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 blur-2xl rounded-full -mr-16 -mt-16"></div>
                    <Globe className="w-12 h-12 text-emerald-600 mb-8" />
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Our Vision</h2>
                    <p className="text-slate-500 leading-relaxed font-medium">A borderless university culture where knowledge is the primary currency, and every Sri Lankan undergraduate has access to industry-grade mentorship and peer-to-peer learning opportunities.</p>
                </div>
            </section>

            {/* Core Values */}
            <section className="bg-slate-900 py-32 text-white overflow-hidden relative">
                <div className="absolute inset-0 bg-indigo-600/5 opacity-50 blur-3xl"></div>
                <div className="max-w-6xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-black mb-4">The SkillSwap Standard</h2>
                        <p className="text-slate-400 font-medium tracking-tight">How we maintain the highest quality of academic exchange.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-12">
                        {[
                            { icon: <Heart className="text-pink-500" />, title: 'Quality First', desc: 'Every mentor is verified by the platform admin to ensure academic excellence.' },
                            { icon: <ShieldCheck className="text-indigo-500" />, title: 'Secured Payments', desc: 'Industry-standard encryption for all skill purchases and mentor payouts.' },
                            { icon: <Zap className="text-amber-500" />, title: 'Real-time Growth', desc: 'Live sessions and instant community discussions for rapid skill acquisition.' },
                        ].map((val, idx) => (
                            <div key={idx} className="text-center space-y-4">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">{val.icon}</div>
                                <h3 className="text-xl font-bold">{val.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{val.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AboutUs;
