import React, { useState } from 'react';
import Modal from './Modal';
import api from '../../services/api';
import { AlertTriangle, Send, Loader2 } from 'lucide-react';

const ReportModal = ({ isOpen, onClose, targetType, targetId, targetName }) => {
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason) return;

        setIsSubmitting(true);
        try {
            // Complaint System API call
            const endpoint = targetType === 'user' ? '/complaints' : '/community/flag';
            const payload = targetType === 'user' 
                ? { targetUser: targetId, title: `Report: ${targetName}`, reason: `${reason}: ${details}` }
                : { contentType: targetType, contentId: targetId, reason: `${reason}: ${details}` };

            const response = await api.post(endpoint, payload);
            if (response.data.success) {
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                    setSuccess(false);
                    setReason('');
                    setDetails('');
                }, 2000);
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit report');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Report ${targetType === 'user' ? 'Member' : 'Content'}`}>
            {success ? (
                <div className="py-10 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Report Received</h3>
                    <p className="text-slate-500 dark:text-slate-400">Our moderation team will review this shortly. Thank you for keeping our community safe.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Reporting</p>
                        <p className="font-bold text-slate-900 dark:text-white">{targetName}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Reason for Report</label>
                        <select 
                            required
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600"
                        >
                            <option value="">Select a reason...</option>
                            <option value="Hate Speech">Hate Speech or Harassment</option>
                            <option value="Spam">Spam or Misleading Content</option>
                            <option value="Inappropriate">Inappropriate Behavior/Content</option>
                            <option value="Plagiarism">Plagiarism or Intellectual Property</option>
                            <option value="Other">Other Issues</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Additional Details</label>
                        <textarea 
                            value={details}
                            onChange={e => setDetails(e.target.value)}
                            placeholder="Provide any context that helps us understand the situation better..."
                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600 min-h-[120px] resize-none"
                        ></textarea>
                    </div>

                    <button 
                        type="submit"
                        disabled={isSubmitting || !reason}
                        className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-500/20 hover:bg-red-700 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>Submit Report</span>
                    </button>
                    
                    <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest">False reporting may result in account suspension.</p>
                </form>
            )}
        </Modal>
    );
};

export default ReportModal;
