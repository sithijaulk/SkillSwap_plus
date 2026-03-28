import React, { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, BookOpen, AlertCircle, Loader } from 'lucide-react';
import Modal from './common/Modal';
import { Input } from './forms/Input';
import api from '../services/api';

const MentorSessionModal = ({ isOpen, onClose, post, onSessionCreated }) => {
  const [formData, setFormData] = useState({
    topic: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '18:00',
    duration: 60,
    sessionType: 'skill_exchange',
    amount: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (post && isOpen) {
      // Pre-fill with smart defaults
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      setFormData({
        topic: `Mentoring: ${post.title || 'Community Discussion'}`,
        description: `Session created from community question: "${post.title}"`,
        scheduledDate: dateStr,
        scheduledTime: '18:00',
        duration: 60,
        sessionType: 'skill_exchange',
        amount: 0
      });
      setError('');
    }
  }, [post, isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Combine date and time
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      
      // Validate that the scheduled time is in the future
      if (scheduledDateTime <= new Date()) {
        throw new Error('Session must be scheduled for a future date and time');
      }

      // Call the backend to create session
      const response = await api.post(`/questions/${post._id}/create-session`, {
        topic: formData.topic,
        description: formData.description,
        scheduledDate: scheduledDateTime.toISOString(),
        duration: formData.duration,
        sessionType: formData.sessionType,
        amount: formData.amount
      });

      if (response.data.success) {
        const createdSession = response.data.data;
        const successMsg = `✅ Session Created!\n\nTopic: ${createdSession.topic}\nTime: ${new Date(createdSession.scheduledDate).toLocaleString()}\nPrep: ${createdSession.preparationDate ? new Date(createdSession.preparationDate).toLocaleString() : 'Auto-set'}`;
        
        alert(successMsg);
        onSessionCreated && onSessionCreated(createdSession);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create session');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Mentoring Session"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Topic Field */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              <BookOpen className="inline w-4 h-4 mr-2" />
              Session Topic
            </label>
            <input
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter session topic"
              required
            />
            <p className="text-xs text-slate-500 mt-1">The learner will see this as the session title</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
              placeholder="Additional details about the session"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Scheduled Date */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                <Calendar className="inline w-4 h-4 mr-2" />
                Date
              </label>
              <input
                type="date"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Scheduled Time */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                <Clock className="inline w-4 h-4 mr-2" />
                Time
              </label>
              <input
                type="time"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                Duration (minutes)
              </label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={30}>30 mins</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={150}>2.5 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
              </select>
            </div>

            {/* Session Type */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                Session Type
              </label>
              <select
                name="sessionType"
                value={formData.sessionType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="skill_exchange">Skill Exchange</option>
                <option value="paid">Paid Session</option>
              </select>
            </div>
          </div>

          {/* Amount (if paid) */}
          {formData.sessionType === 'paid' && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                <DollarSign className="inline w-4 h-4 mr-2" />
                Amount (LKR)
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                min="0"
                step="100"
                className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Session'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default MentorSessionModal;
