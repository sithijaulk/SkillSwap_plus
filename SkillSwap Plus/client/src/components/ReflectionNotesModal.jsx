import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Save, Edit3, Calendar } from 'lucide-react';

const ReflectionNotesModal = ({ isOpen, onClose, session, onSave }) => {
    const [notes, setNotes] = useState('');
    const [keyTakeaways, setKeyTakeaways] = useState('');
    const [nextSteps, setNextSteps] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (session?.reflectionNotes) {
            setNotes(session.reflectionNotes.notes || '');
            setKeyTakeaways(session.reflectionNotes.keyTakeaways || '');
            setNextSteps(session.reflectionNotes.nextSteps || '');
            setIsEditing(false);
        } else {
            // Reset form for new reflection
            setNotes('');
            setKeyTakeaways('');
            setNextSteps('');
            setIsEditing(true);
        }
    }, [session, isOpen]);

    const handleSave = () => {
        const reflectionData = {
            notes,
            keyTakeaways,
            nextSteps,
            dateAdded: new Date().toISOString()
        };

        onSave(session._id, reflectionData);
        setIsEditing(false);
    };

    const handleClose = () => {
        setIsEditing(false);
        onClose();
    };

    if (!isOpen || !session) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white">Reflection Notes</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{session.skill?.title || session.skill}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Session Info */}
                    <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-2xl mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center font-black text-sm">
                                    {session.mentor?.firstName?.[0]}{session.mentor?.lastName?.[0]}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-white">Mentor {session.mentor?.firstName}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                                        <Calendar className="w-4 h-4 mr-1" />
                                        {new Date(session.scheduledDate || session.date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold uppercase rounded-lg">
                                Completed
                            </span>
                        </div>
                    </div>

                    {/* Reflection Notes */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                            What did you learn?
                        </label>
                        {isEditing ? (
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Describe what you learned in this session, key insights, and how it impacted your understanding..."
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                rows={4}
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                                    {notes || 'No reflection notes added yet.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Key Takeaways */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                            Key Takeaways
                        </label>
                        {isEditing ? (
                            <textarea
                                value={keyTakeaways}
                                onChange={(e) => setKeyTakeaways(e.target.value)}
                                placeholder="What are the most important points you want to remember from this session?"
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                rows={3}
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {keyTakeaways || 'No key takeaways recorded.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Next Steps */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                            Next Steps
                        </label>
                        {isEditing ? (
                            <textarea
                                value={nextSteps}
                                onChange={(e) => setNextSteps(e.target.value)}
                                placeholder="What will you do next to build on this learning? Any follow-up actions or practice needed?"
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                rows={3}
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {nextSteps || 'No next steps planned.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-8 border-t border-slate-200 dark:border-white/10">
                    <button
                        onClick={handleClose}
                        className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>
                    {isEditing ? (
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all flex items-center space-x-2"
                        >
                            <Save className="w-4 h-4" />
                            <span>Save Reflection</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all flex items-center space-x-2"
                        >
                            <Edit3 className="w-4 h-4" />
                            <span>Edit Reflection</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReflectionNotesModal;