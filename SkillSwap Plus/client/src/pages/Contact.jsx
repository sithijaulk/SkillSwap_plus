import React, { useState } from 'react';
import api from '../services/api';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

const Contact = () => {
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [status, setStatus] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/contact', formData);
            if (res.data.success) {
                setStatus('success');
                setFormData({ name: '', email: '', subject: '', message: '' });
            }
        } catch (err) {
            setStatus('error');
        }
    };

    return (
        <div className="pt-32 pb-20 min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="max-w-6xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Get in Touch</h1>
                    <p className="text-xl text-slate-500 font-medium">Have a question? Our university support team is here to help.</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-12">
                    <div className="space-y-8">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-white/5 group hover:scale-105 transition-all">
                            <div className="p-4 bg-indigo-500/10 text-indigo-600 rounded-2xl w-fit mb-6">
                                <Mail className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Email Us</h3>
                            <p className="text-slate-500 text-sm">support@skillswap.edu.lk</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-white/5 group hover:scale-105 transition-all">
                            <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl w-fit mb-6">
                                <Phone className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Call Us</h3>
                            <div className="space-y-1">
                                <p className="text-slate-500 text-sm font-bold">076 915 6692</p>
                                <p className="text-slate-500 text-sm font-bold">076 157 2173</p>
                                <p className="text-slate-500 text-sm font-bold">076 444 6830</p>
                                <p className="text-slate-500 text-sm font-bold">071 334 3558</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-white/5 group hover:scale-105 transition-all">
                            <div className="p-4 bg-violet-500/10 text-violet-600 rounded-2xl w-fit mb-6">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Visit Hub</h3>
                            <p className="text-slate-500 text-sm leading-relaxed italic">SLIIT Main Campus,<br />New Kandy Rd, Malabe.</p>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-white/5">
                        {status === 'success' ? (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-10 h-10" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Message Centered</h2>
                                <p className="text-slate-500 font-medium">We've received your request and will respond within 24 hours.</p>
                                <button onClick={() => setStatus(null)} className="mt-8 text-indigo-600 font-bold hover:underline">Send another message</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Your Name</label>
                                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600" placeholder="John Doe" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Email Address</label>
                                        <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600" placeholder="john@university.lk" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Subject</label>
                                    <input required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600" placeholder="Question about skill sharing..." />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Message</label>
                                    <textarea rows="6" required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600 resize-none" placeholder="Describe your inquiry in detail..."></textarea>
                                </div>
                                <button type="submit" className="w-full premium-gradient text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-500/30 hover:scale-[1.02] transition-all flex items-center justify-center space-x-3">
                                    <Send className="w-5 h-5" />
                                    <span>Transmit Message</span>
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
