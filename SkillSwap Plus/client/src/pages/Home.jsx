import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
    Zap, 
    ShieldCheck, 
    Users, 
    ArrowRight, 
    Star, 
    Globe, 
    Award,
    CheckCircle,
    Trophy,
    Quote,
    Sparkles
} from 'lucide-react';

const Home = () => {
    const [mentorLeaderboard, setMentorLeaderboard] = useState([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const response = await api.get('/public/mentors/leaderboard?limit=6&reviewsPerMentor=2');
                if (!cancelled) {
                    setMentorLeaderboard(response?.data?.data || []);
                }
            } catch (error) {
                if (!cancelled) {
                    setMentorLeaderboard([]);
                }
            } finally {
                if (!cancelled) {
                    setLeaderboardLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="relative overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Hero Section */}
            <section className="relative pt-40 pb-32 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full -z-10"></div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                            <Zap className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Bridging Academic Gaps</span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black text-slate-900 dark:text-white mb-8 leading-[1.1] tracking-tighter">
                            Master Any Skill with <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 animate-gradient-x">University Experts.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                            The ultimate campus ecosystem for sharing knowledge, building scholarly portfolios, and receiving elite mentorship from Admin-approved <span className="text-indigo-600 font-bold underline decoration-indigo-200 underline-offset-4">Professional Advisors</span>.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                            <Link to="/auth/register" className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center justify-center space-x-2">
                                <span>Get Started Now</span>
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link to="/programs" className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                Browse Programs
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-1/4 -left-20 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </section>

            {/* Features Grid */}
            <section className="py-24 border-y border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-12">
                        {[
                            { 
                                icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />, 
                                title: "Verified Mentors", 
                                desc: "Every mentor is vetted by our academic board to ensure high-quality material delivery." 
                            },
                            { 
                                icon: <Users className="w-8 h-8 text-indigo-500" />, 
                                title: "Topic Channels", 
                                desc: "Engage in categorized discussions across exam prep, study groups, and career advice with image support." 
                            },
                            { 
                                icon: <Award className="w-8 h-8 text-violet-500" />, 
                                title: "Professional Tier", 
                                desc: "Elite mentors undergo rigorous academic vetting and monitoring to provide top-tier learning sessions." 
                            }
                        ].map((f, i) => (
                            <div key={i} className="group p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500">
                                <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 w-fit group-hover:scale-110 transition-transform">
                                    {f.icon}
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tight">{f.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium text-sm">
                                    {f.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mentor Leaderboard Section */}
            <section className="py-24 bg-gradient-to-b from-white/70 to-slate-50 dark:from-slate-900/60 dark:to-slate-950 border-y border-slate-200 dark:border-white/5">
                <div className="container mx-auto px-6">
                    <div className="max-w-3xl mb-12">
                        <div className="inline-flex items-center space-x-2 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 rounded-2xl border border-amber-100 dark:border-amber-500/20 mb-6">
                            <Trophy className="w-4 h-4 text-amber-600" />
                            <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Mentor Leaderboard</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">
                            Visible Graded Mentors by <span className="text-indigo-600">MPS Score</span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            Explore top-to-low ranked mentors based on the university MPS system and review real learner feedback before joining a program.
                        </p>
                    </div>

                    {leaderboardLoading ? (
                        <div className="grid lg:grid-cols-2 gap-8">
                            {[1, 2].map((idx) => (
                                <div key={idx} className="rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-8 animate-pulse">
                                    <div className="h-6 w-40 bg-slate-200 dark:bg-white/10 rounded-xl mb-6"></div>
                                    <div className="h-4 w-full bg-slate-200 dark:bg-white/10 rounded mb-3"></div>
                                    <div className="h-4 w-5/6 bg-slate-200 dark:bg-white/10 rounded mb-8"></div>
                                    <div className="h-20 w-full bg-slate-200 dark:bg-white/10 rounded-2xl"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {mentorLeaderboard.length > 0 ? (
                                <div className="grid lg:grid-cols-2 gap-8">
                                    {mentorLeaderboard.map((mentor) => (
                                        <article key={mentor.id} className="group rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500">
                                            <div className="flex items-start justify-between gap-4 mb-6">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Rank #{mentor.rank}</p>
                                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                                        {mentor.firstName} {mentor.lastName}
                                                    </h3>
                                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">
                                                        {mentor.university || 'University Mentor'}{mentor.department ? ` • ${mentor.department}` : ''}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                                                        <Sparkles className="w-4 h-4" />
                                                        <span className="text-sm font-black">MPS {Number(mentor.mps || 0).toFixed(2)}</span>
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mt-2">Grade: {mentor.grade || 'N/A'}</p>
                                                </div>
                                            </div>

                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                                                {mentor.bio || 'Experienced mentor delivering high-impact, learner-focused sessions.'}
                                            </p>

                                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Learner Feedback</p>
                                                    <div className="flex items-center gap-1 text-amber-500">
                                                        <Star className="w-4 h-4 fill-current" />
                                                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">{Number(mentor.averageRating || 0).toFixed(1)} ({mentor.totalRatings || 0})</span>
                                                    </div>
                                                </div>

                                                {(mentor.feedbacks || []).length > 0 ? (
                                                    <div className="space-y-3">
                                                        {(mentor.feedbacks || []).map((item) => (
                                                            <div key={item.id} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-3">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.learnerName}</p>
                                                                    <div className="inline-flex items-center gap-1 text-amber-500">
                                                                        <Star className="w-3.5 h-3.5 fill-current" />
                                                                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">{Number(item.rating || 0).toFixed(1)}</span>
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                                                                    <Quote className="inline w-3 h-3 mr-1 text-indigo-500" />
                                                                    {item.review}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs italic text-slate-500">No public feedback available yet for this mentor.</p>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 p-10 text-center">
                                    <p className="text-sm font-medium italic text-slate-500 dark:text-slate-400">Mentor leaderboard is being prepared. Please check again soon.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Trust Section */}
            <section className="py-32">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <div className="md:w-1/2 relative">
                            <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] rounded-full"></div>
                            <div className="relative bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-2xl">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 text-center">
                                        <h4 className="text-4xl font-black text-indigo-600 mb-1">High</h4>
                                        <p className="text-[10px] font-black text-slate-500 uppercase">Success Rate</p>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-white/5 text-center">
                                        <h4 className="text-4xl font-black text-slate-900 dark:text-white mb-1">Elite</h4>
                                        <p className="text-[10px] font-black text-slate-500 uppercase">Mentor Pool</p>
                                    </div>
                                    <div className="col-span-2 p-8 rounded-3xl bg-slate-900 text-white relative overflow-hidden">
                                        <div className="relative z-10 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Global Impact</p>
                                                <h4 className="text-2xl font-black">Connected <br /> Network</h4>
                                            </div>
                                            <Globe className="w-12 h-12 text-white/20" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="md:w-1/2">
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-8 leading-tight tracking-tighter">
                                Designed for Scholars, <br />
                                <span className="text-indigo-600">Built for Professionals.</span>
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-lg mb-10 leading-relaxed font-medium">
                                SkillSwap+ handles the complexity of scheduling, payments, and material delivery so you can focus on what matters most: growing your knowledge base.
                            </p>
                            <ul className="space-y-4 mb-10">
                                {[
                                    { icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, text: "Automated session link generation" },
                                    { icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, text: "Secure 25% transparent fee structure" },
                                    { icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, text: "Real-time community forum support" }
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center space-x-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {item.icon}
                                        <span>{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link to="/programs" className="inline-flex items-center space-x-2 text-indigo-600 font-black uppercase tracking-widest text-sm hover:translate-x-2 transition-all">
                                <span>Learn More About Flow</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-6 mb-32">
                <div className="relative bg-indigo-600 rounded-[3.5rem] p-12 md:p-24 text-center overflow-hidden shadow-2xl shadow-indigo-500/40">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-900/20 rounded-full blur-[100px] -ml-48 -mb-48"></div>
                    
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tighter">
                            Ready to Swap Your First Skill?
                        </h2>
                        <p className="text-indigo-100 text-lg mb-12 font-medium">
                            Join the university revolution today and start your journey towards academic excellence.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <Link to="/auth/register" className="w-full sm:w-auto px-10 py-5 bg-white text-indigo-600 font-black rounded-2xl shadow-xl hover:scale-105 transition-all">
                                Join SkillSwap+ Now
                            </Link>
                            <button className="w-full sm:w-auto px-10 py-5 bg-indigo-500 text-white font-black rounded-2xl hover:bg-indigo-400 transition-all">
                                Contact Enterprise
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
