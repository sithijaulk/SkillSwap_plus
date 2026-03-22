import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Globe, Github, Twitter, Linkedin, Heart } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 pt-20 pb-10">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-1">
                        <Link to="/" className="flex items-center space-x-2 mb-6 group">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                                <span className="text-white font-bold text-sm">S+</span>
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-white dark:to-slate-400">
                                SkillSwap+
                            </span>
                        </Link>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                            The premier university skill-sharing platform dedicated to bridging the academic-industry gap through peer collaboration.
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">
                                <Twitter className="w-4 h-4" />
                            </a>
                            <a href="#" className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">
                                <Github className="w-4 h-4" />
                            </a>
                            <a href="#" className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">
                                <Linkedin className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Platform</h4>
                        <ul className="space-y-4">
                            <li><Link to="/programs" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Academic Programs</Link></li>
                            <li><Link to="/community" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Community Hub</Link></li>
                            <li><Link to="/mentors" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Elite Mentors</Link></li>
                            <li><Link to="/skills" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Skill Categories</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Company</h4>
                        <ul className="space-y-4">
                            <li><Link to="/about" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">About Mission</Link></li>
                            <li><Link to="/contact" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Contact Support</Link></li>
                            <li><Link to="/privacy" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Connect With Us</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start space-x-3">
                                <Mail className="w-4 h-4 text-indigo-600 mt-0.5" />
                                <div>
                                    <span className="text-sm text-slate-500 dark:text-slate-400 block">contact@skillswap.plus</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Email Support</span>
                                </div>
                            </li>
                            <li className="flex items-start space-x-3">
                                <Globe className="w-4 h-4 text-indigo-600 mt-0.5" />
                                <div>
                                    <span className="text-sm text-slate-500 dark:text-slate-400 block italic underline">SLIIT Main Campus, Malabe</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Official Hub</span>
                                </div>
                            </li>
                            <li className="pt-4 border-t border-slate-100 dark:border-white/5">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Hotlines</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {['076 915 6692', '076 157 2173', '076 444 6830', '071 334 3558'].map(num => (
                                        <span key={num} className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{num}</span>
                                    ))}
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col items-center gap-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">
                        all rights reserved copyright by Skillswapplus
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                        Developed by Sithija, Vihanga, Suresh, chamodi
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
