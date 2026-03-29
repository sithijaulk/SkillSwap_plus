import React, { useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import Modal from './common/Modal';
import feedbackApi from '../services/feedbackApi';
import { useToast } from '../context/ToastContext';

const TAG_OPTIONS = [
  'helpful',
  'knowledgeable',
  'patient',
  'clear',
  'prepared',
  'professional',
  'punctual',
  'engaging',
];

const difficultyOptions = ['Easy', 'Medium', 'Hard'];

const boolOptions = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

const PostSessionFeedbackModal = ({ isOpen, onClose, session, onSubmitted }) => {
  const { addToast } = useToast() || {};

  const [rating, setRating] = useState(0);
  const [writtenReview, setWrittenReview] = useState('');
  const [wasHelpful, setWasHelpful] = useState(null);
  const [wouldRecommend, setWouldRecommend] = useState(null);
  const [feedbackTags, setFeedbackTags] = useState([]);
  const [sessionDifficulty, setSessionDifficulty] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [improvementSuggestion, setImprovementSuggestion] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({});

  const title = useMemo(() => {
    const sessionTitle = session?.skill?.title || session?.skill || session?.topic || 'Session';
    return `Give Feedback • ${sessionTitle}`;
  }, [session]);

  const errors = useMemo(() => {
    const next = {};
    if (!rating || rating < 1 || rating > 5) next.rating = 'Please select a rating (1–5).';
    if (!writtenReview.trim()) next.writtenReview = 'Please write a short review.';
    if (wasHelpful === null) next.wasHelpful = 'Please select Yes/No.';
    if (wouldRecommend === null) next.wouldRecommend = 'Please select Yes/No.';
    if (!Array.isArray(feedbackTags) || feedbackTags.length === 0) next.feedbackTags = 'Select at least one tag.';
    if (!difficultyOptions.includes(sessionDifficulty)) next.sessionDifficulty = 'Select a difficulty.';
    return next;
  }, [rating, writtenReview, wasHelpful, wouldRecommend, feedbackTags, sessionDifficulty]);

  const isValid = Object.keys(errors).length === 0;

  const markTouched = (key) => setTouched((t) => ({ ...t, [key]: true }));

  const toggleTag = (tag) => {
    setFeedbackTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      return [...prev, tag];
    });
  };

  const resetForm = () => {
    setRating(0);
    setWrittenReview('');
    setWasHelpful(null);
    setWouldRecommend(null);
    setFeedbackTags([]);
    setSessionDifficulty('');
    setIsAnonymous(false);
    setImprovementSuggestion('');
    setTouched({});
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark everything as touched so errors show
    setTouched({
      rating: true,
      writtenReview: true,
      wasHelpful: true,
      wouldRecommend: true,
      feedbackTags: true,
      sessionDifficulty: true,
    });

    if (!isValid) return;
    if (!session?._id) return;

    setSubmitting(true);
    try {
      await feedbackApi.submitSessionFeedback({
        sessionId: session._id,
        rating,
        writtenReview: writtenReview.trim(),
        wasHelpful,
        wouldRecommend,
        feedbackTags,
        sessionDifficulty,
        isAnonymous,
        improvementSuggestion: improvementSuggestion.trim(),
      });

      if (addToast) {
        addToast('Feedback submitted successfully.', 'success');
      } else {
        alert('Feedback submitted successfully.');
      }

      if (onSubmitted) onSubmitted(session._id);
      resetForm();
      onClose();
    } catch (err) {
      const firstValidationError = Array.isArray(err?.response?.data?.errors)
        ? err.response.data.errors.find((e) => e?.msg)?.msg
        : null;

      const msg =
        err?.response?.data?.message ||
        firstValidationError ||
        err?.message ||
        'Failed to submit feedback';
      if (addToast) addToast(msg, 'error');
      else alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="max-h-[72vh] overflow-y-auto pr-1 pb-6">
      <form onSubmit={handleSubmit} className="w-full space-y-6">
        {/* Rating */}
        <div className="space-y-2.5">
          <div className="min-h-[1.25rem] flex items-center justify-between gap-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rating</label>
            {touched.rating && errors.rating && (
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{errors.rating}</span>
            )}
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {Array.from({ length: 5 }).map((_, idx) => {
              const value = idx + 1;
              const active = value <= rating;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setRating(value);
                    markTouched('rating');
                  }}
                  className={`p-2 rounded-xl border ${active ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'} transition-colors`}
                  aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                >
                  <Star className={`w-5 h-5 ${active ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} fill={active ? 'currentColor' : 'none'} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Written review */}
        <div className="space-y-2.5">
          <div className="min-h-[1.25rem] flex items-center justify-between gap-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Written Review</label>
            {touched.writtenReview && errors.writtenReview && (
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{errors.writtenReview}</span>
            )}
          </div>
          <textarea
            rows={4}
            value={writtenReview}
            onChange={(e) => setWrittenReview(e.target.value)}
            onBlur={() => markTouched('writtenReview')}
            className={`w-full bg-slate-50 dark:bg-white/5 border rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none ${
              touched.writtenReview && errors.writtenReview ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10'
            }`}
            placeholder="Share what stood out and what you learned..."
          />
        </div>

        {/* Helpful + Recommend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
          <div className="space-y-2.5 min-w-0">
            <div className="min-h-[1.25rem] flex items-center justify-between gap-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Was Helpful?</label>
              {touched.wasHelpful && errors.wasHelpful && (
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Required</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5 w-full">
              {boolOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    setWasHelpful(opt.value);
                    markTouched('wasHelpful');
                  }}
                  className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-colors ${
                    wasHelpful === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 min-w-0">
            <div className="min-h-[1.25rem] flex items-center justify-between gap-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recommend?</label>
              {touched.wouldRecommend && errors.wouldRecommend && (
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Required</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5 w-full">
              {boolOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    setWouldRecommend(opt.value);
                    markTouched('wouldRecommend');
                  }}
                  className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-colors ${
                    wouldRecommend === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2.5">
          <div className="min-h-[1.25rem] flex items-center justify-between gap-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Feedback Tags</label>
            {touched.feedbackTags && errors.feedbackTags && (
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{errors.feedbackTags}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {TAG_OPTIONS.map((tag) => {
              const active = feedbackTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    toggleTag(tag);
                    markTouched('feedbackTags');
                  }}
                  className={`min-w-[96px] px-3 py-2 rounded-2xl text-[10px] text-center font-black uppercase tracking-widest border transition-colors ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-white/10'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div className="space-y-2.5">
          <div className="min-h-[1.25rem] flex items-center justify-between gap-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session Difficulty</label>
            {touched.sessionDifficulty && errors.sessionDifficulty && (
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{errors.sessionDifficulty}</span>
            )}
          </div>
          <select
            value={sessionDifficulty}
            onChange={(e) => setSessionDifficulty(e.target.value)}
            onBlur={() => markTouched('sessionDifficulty')}
            className={`w-full bg-slate-50 dark:bg-white/5 border rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none ${
              touched.sessionDifficulty && errors.sessionDifficulty ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10'
            }`}
          >
            <option value="">Select difficulty...</option>
            {difficultyOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Anonymous */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Submit anonymously (optional)</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Mentor won’t see your name.</p>
          </div>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-5 h-5 accent-indigo-600"
          />
        </div>

        {/* Improvement suggestion */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Improvement Suggestion (optional)</label>
          <textarea
            rows={3}
            value={improvementSuggestion}
            onChange={(e) => setImprovementSuggestion(e.target.value)}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none"
            placeholder="Anything the mentor could improve next time?"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
      </div>
    </Modal>
  );
};

export default PostSessionFeedbackModal;
