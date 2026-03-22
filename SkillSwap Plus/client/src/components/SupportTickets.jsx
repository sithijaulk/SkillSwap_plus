import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Ticket, Send, CheckCircle, Clock, AlertCircle, Plus, X } from 'lucide-react';
import Modal from './common/Modal';

const SupportTickets = ({ role }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', priority: 'Medium', category: 'General' });
    const [reply, setReply] = useState('');

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const endpoint = role === 'admin' ? '/admin/tickets' : '/tickets/my';
            const res = await api.get(endpoint);
            setTickets(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/tickets', formData);
            if (res.data.success) {
                setTickets([res.data.data, ...tickets]);
                setIsModalOpen(false);
                setFormData({ title: '', description: '', priority: 'Medium', category: 'General' });
            }
        } catch (err) {
            alert('Error creating ticket');
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!reply.trim()) return;
        try {
            // In a real system, we'd have a specific reply route.
            // For now, we'll simulate by updating the ticket object.
            const updatedMessages = [...selectedTicket.messages, { message: reply, sender: 'me' }];
            const res = await api.put(`/admin/tickets/${selectedTicket._id}`, { messages: updatedMessages });
            if (res.data.success) {
                setTickets(tickets.map(t => t._id === selectedTicket._id ? res.data.data : t));
                setSelectedTicket(res.data.data);
                setReply('');
            }
        } catch (err) {
            alert('Error sending reply');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Help & Support</h2>
                    <p className="text-sm text-slate-500 font-medium">Track your academic assistance requests.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-2xl flex items-center space-x-2 shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all text-sm"
                >
                    <Plus className="w-4 h-4" />
                    <span>New Ticket</span>
                </button>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-10 text-slate-400">Loading tickets...</div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10 text-slate-500 italic">
                        No active support tickets. Need help? Create one above!
                    </div>
                ) : (
                    tickets.map(ticket => (
                        <div 
                            key={ticket._id} 
                            onClick={() => setSelectedTicket(ticket)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer group flex items-center justify-between"
                        >
                            <div className="flex items-center space-x-4">
                                <div className={`p-4 rounded-2xl ${
                                    ticket.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-600' :
                                    ticket.status === 'In Progress' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
                                }`}>
                                    <Ticket className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white capitalize group-hover:text-indigo-600 transition-colors">{ticket.title}</h4>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{ticket.category} • {new Date(ticket.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="text-right flex items-center space-x-4">
                                <div className="hidden md:block">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        ticket.priority === 'High' || ticket.priority === 'Urgent' ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                                    }`}>
                                        {ticket.priority}
                                    </span>
                                </div>
                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                    ticket.status === 'Resolved' ? 'bg-emerald-500 text-white' : 
                                    ticket.status === 'In Progress' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
                                }`}>
                                    {ticket.status}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Support Ticket">
                <form onSubmit={handleCreateTicket} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Subject</label>
                        <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600" placeholder="I have an issue with my session..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Category</label>
                            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600">
                                <option value="Technical">Technical</option>
                                <option value="Billing">Billing</option>
                                <option value="Account">Account</option>
                                <option value="General">General</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Priority</label>
                            <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600">
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Description</label>
                        <textarea rows="4" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600 resize-none" placeholder="Provide details about your issue..."></textarea>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all text-sm mt-4">
                        Submit Ticket
                    </button>
                </form>
            </Modal>

            {selectedTicket && (
                <Modal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} title={selectedTicket.title}>
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 no-scrollbar">
                        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10">
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedTicket.description}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">Opened on {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                        </div>

                        <div className="space-y-4">
                            {selectedTicket.messages?.map((msg, i) => (
                                <div key={i} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-4 rounded-2xl max-w-[80%] text-sm ${msg.sender === 'me' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-white'}`}>
                                        {msg.message}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selectedTicket.status !== 'Closed' && (
                            <form onSubmit={handleReply} className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-4">
                                <input 
                                    className="flex-grow bg-slate-100 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600" 
                                    placeholder="Type your message..."
                                    value={reply}
                                    onChange={e => setReply(e.target.value)}
                                />
                                <button type="submit" className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all">
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default SupportTickets;
