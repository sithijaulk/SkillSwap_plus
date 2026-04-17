import React, { useMemo, useState } from 'react';
import api from '../services/api';
import Modal from './common/Modal';

const AssessmentModal = ({ isOpen, onClose, payload, onSubmitted }) => {
    const attempt = payload?.attempt;

    const [questionAnswers, setQuestionAnswers] = useState({});
    const [taskAnswers, setTaskAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const questions = useMemo(() => attempt?.questionSet || [], [attempt]);
    const tasks = useMemo(() => attempt?.taskSet || [], [attempt]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!attempt?._id) return;

        const unansweredQuestions = questions.filter((q) => !String(questionAnswers[q.questionId] || '').trim());
        const unansweredTasks = tasks.filter((t) => !String(taskAnswers[t.taskId] || '').trim());

        if (unansweredQuestions.length > 0 || unansweredTasks.length > 0) {
            alert(
                `Please complete all assessment items before submitting. Missing: ${unansweredQuestions.length} question(s), ${unansweredTasks.length} task(s).`
            );
            return;
        }

        try {
            setSubmitting(true);

            const questionResponses = questions.map((q) => ({
                itemId: q.questionId,
                answer: questionAnswers[q.questionId] || '',
            }));

            const taskResponses = tasks.map((t) => ({
                itemId: t.taskId,
                answer: taskAnswers[t.taskId] || '',
            }));

            await api.post('/submit-assessment', {
                attemptId: attempt._id,
                questionResponses,
                taskResponses,
            });

            if (typeof onSubmitted === 'function') {
                onSubmitted();
            }
        } catch (error) {
            alert(error?.response?.data?.message || 'Failed to submit assessment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Program Assessment">
            {!attempt ? (
                <p className="text-sm text-slate-500">Preparing your personalized assessment...</p>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                    <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 p-3">
                        <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Personalized Attempt</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                            Questions: {questions.length} | Tasks: {tasks.length}
                        </p>
                    </div>

                    {questions.map((q, idx) => (
                        <div key={q.questionId} className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50 dark:bg-white/5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Q{idx + 1} • {q.questionType} • {q.difficulty}
                            </p>
                            <p className="text-sm font-bold text-slate-800 dark:text-white mb-3">{q.prompt}</p>

                            {q.questionType === 'mcq' ? (
                                <div className="space-y-2">
                                    {(q.options || []).map((option) => (
                                        <label key={option} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                            <input
                                                type="radio"
                                                name={`q-${q.questionId}`}
                                                value={option}
                                                checked={(questionAnswers[q.questionId] || '') === option}
                                                onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q.questionId]: e.target.value }))}
                                            />
                                            <span>{option}</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <textarea
                                    rows={3}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm"
                                    placeholder="Write your answer..."
                                    value={questionAnswers[q.questionId] || ''}
                                    onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q.questionId]: e.target.value }))}
                                />
                            )}
                        </div>
                    ))}

                    {tasks.map((t, idx) => (
                        <div key={t.taskId} className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50 dark:bg-white/5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Task {idx + 1} • {t.taskType} • {t.difficulty}
                            </p>
                            <p className="text-sm font-bold text-slate-800 dark:text-white mb-3">{t.prompt}</p>
                            <textarea
                                rows={4}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm"
                                placeholder="Submit your task response..."
                                value={taskAnswers[t.taskId] || ''}
                                onChange={(e) => setTaskAnswers((prev) => ({ ...prev, [t.taskId]: e.target.value }))}
                            />
                        </div>
                    ))}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {submitting ? 'Submitting...' : 'Submit Assessment'}
                    </button>
                </form>
            )}
        </Modal>
    );
};

export default AssessmentModal;
