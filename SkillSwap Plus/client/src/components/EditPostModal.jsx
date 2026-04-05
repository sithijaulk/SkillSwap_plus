import React, { useState, useEffect } from 'react';
import api, { buildAssetUrl } from '../services/api';
import { AlertCircle, Trash2, X, ImagePlus } from 'lucide-react';
import { COMMUNITY_SUBJECTS, COMMUNITY_TOPIC_CHANNELS, COMMUNITY_IMAGE_LIMITS } from '../constants/community';

const EditPostModal = ({ post, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [subject, setSubject] = useState('programming');
    const [topicChannel, setTopicChannel] = useState('General');
    // Existing server images — user can remove individual ones
    const [existingImages, setExistingImages] = useState([]);
    // New images chosen by the user (not yet uploaded)
    const [newImages, setNewImages] = useState([]);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (post) {
            setTitle(post.title || '');
            setBody(post.body || '');
            setSubject(post.subject || 'programming');
            setTopicChannel(post.topicChannel || 'General');
            setExistingImages(Array.isArray(post.images) ? post.images : []);
            setNewImages([]);
            setError(null);
        }
    }, [post]);

    const handleNewImageSelect = (e) => {
        const files = Array.from(e.target.files || []);
        const totalImages = existingImages.length + newImages.length + files.length;
        if (totalImages > COMMUNITY_IMAGE_LIMITS.maxFiles) {
            setError(`You can attach at most ${COMMUNITY_IMAGE_LIMITS.maxFiles} images in total.`);
            return;
        }
        const oversized = files.find((f) => f.size > COMMUNITY_IMAGE_LIMITS.maxSizeBytes);
        if (oversized) {
            setError('Each image must be under 5 MB.');
            return;
        }
        setError(null);
        const previews = files.map((file) => ({
            file,
            url: URL.createObjectURL(file)
        }));
        setNewImages((prev) => [...prev, ...previews]);
        // Reset input so same file can be re-selected after removal
        e.target.value = '';
    };

    const removeNewImage = (idx) => {
        setNewImages((prev) => {
            URL.revokeObjectURL(prev[idx].url);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const removeExistingImage = (idx) => {
        setExistingImages((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const trimmedTitle = title.trim();
        const trimmedBody = body.trim();

        if (trimmedTitle.length < 10) {
            setError('Title must be at least 10 characters long.');
            return;
        }
        if (trimmedTitle.length > 200) {
            setError('Title cannot exceed 200 characters.');
            return;
        }
        if (trimmedBody.length < 20) {
            setError('Description must be at least 20 characters long.');
            return;
        }
        if (trimmedBody.length > 2000) {
            setError('Description cannot exceed 2000 characters.');
            return;
        }

        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('title', trimmedTitle);
            data.append('body', trimmedBody);
            data.append('subject', subject);
            data.append('topicChannel', topicChannel);
            // Tell the server which existing images to keep
            data.append('keepImages', JSON.stringify(existingImages.map((img) => img.filePath)));
            // Append new file uploads
            newImages.forEach((img) => data.append('images', img.file));

            const response = await api.put(`/questions/${post._id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                // Revoke all blob URLs before closing
                newImages.forEach((img) => URL.revokeObjectURL(img.url));
                onSave(response.data.data);
                onClose();
            }
        } catch (err) {
            const firstValidationError = err.response?.data?.errors?.[0]?.msg;
            setError(firstValidationError || err.response?.data?.message || 'Failed to update post. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!post) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Edit Post</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                        <span className="text-red-500">*</span> Required fields
                    </p>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Subject + Channel */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">
                                Subject <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm font-bold capitalize"
                            >
                                {COMMUNITY_SUBJECTS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Channel</label>
                            <select
                                value={topicChannel}
                                onChange={(e) => setTopicChannel(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm font-bold capitalize"
                            >
                                {COMMUNITY_TOPIC_CHANNELS.map((c) => (
                                    <option key={c} value={c}>#{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">
                            Question Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What is your question?"
                            className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm font-medium"
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">
                            Detailed Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            required
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Explain your question in detail..."
                            className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl p-4 text-sm font-medium min-h-[120px] resize-none"
                        />
                    </div>

                    {/* Existing images */}
                    {existingImages.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2">
                                Current Images — click <Trash2 className="inline w-3 h-3" /> to remove
                            </p>
                            <div className="flex gap-3 flex-wrap">
                                {existingImages.map((img, idx) => (
                                    <div key={idx} className="relative group shrink-0">
                                        <img
                                            src={buildAssetUrl(img.url)}
                                            alt={img.caption || `image ${idx + 1}`}
                                            className="w-24 h-24 object-cover rounded-2xl border-2 border-slate-200 dark:border-white/10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingImage(idx)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New images to upload */}
                    {newImages.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2">New Images</p>
                            <div className="flex gap-3 flex-wrap">
                                {newImages.map((img, idx) => (
                                    <div key={idx} className="relative group shrink-0">
                                        <img
                                            src={img.url}
                                            alt={`new upload ${idx + 1}`}
                                            className="w-24 h-24 object-cover rounded-2xl border-2 border-indigo-500/30"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeNewImage(idx)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions row */}
                    <div className="flex items-center justify-between pt-2">
                        {/* Attach images */}
                        {(existingImages.length + newImages.length) < COMMUNITY_IMAGE_LIMITS.maxFiles && (
                            <label className="cursor-pointer p-3 bg-slate-50 dark:bg-white/5 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all text-slate-400 hover:text-indigo-600">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleNewImageSelect}
                                    className="hidden"
                                />
                                <div className="flex items-center space-x-2">
                                    <ImagePlus className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Attach Images</span>
                                </div>
                            </label>
                        )}

                        <div className="flex items-center gap-3 ml-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-black px-6 py-3 rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !title.trim() || !body.trim()}
                                className="bg-indigo-600 text-white font-black px-8 py-3 rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPostModal;
