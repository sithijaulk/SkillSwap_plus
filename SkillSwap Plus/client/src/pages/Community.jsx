import React, { useState, useEffect } from 'react';
import api, { buildAssetUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, ThumbsUp, Trash2, Flag, User as UserIcon, Calendar, Info, AlertCircle, ExternalLink, Pin, Plus, ArrowUpRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ReportModal from '../components/common/ReportModal';
import MentorSessionModal from '../components/MentorSessionModal';
import AIChatbot from '../components/AIChatbot';

const Community = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('all');
    const [filter, setFilter] = useState('recent');
    const [activeChannel, setActiveChannel] = useState('all');
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        subject: 'programming',
        topicChannel: 'General',
        images: []
    });
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedPostId, setExpandedPostId] = useState(null);
    const [answers, setAnswers] = useState({}); // { postId: [answers] }
    const [answerDrafts, setAnswerDrafts] = useState({}); // { postId: draftText }
    const [pinnedPostIds, setPinnedPostIds] = useState([]);
    const [reportModal, setReportModal] = useState({ open: false, targetId: '', targetName: '', targetType: 'question' });
    const [sessionModal, setSessionModal] = useState({ open: false, selectedPost: null });
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [trendingSuggestions, setTrendingSuggestions] = useState([]);
    const [personalizedSuggestions, setPersonalizedSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(true);
    const [suggestionsError, setSuggestionsError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [newlyCreatedPostIds, setNewlyCreatedPostIds] = useState([]);

    const subjects = ['mathematics', 'physics', 'chemistry', 'biology', 'programming', 'languages', 'engineering', 'business', 'arts', 'other'];
    const topicChannels = ['General', 'Academic Support', 'Skill Exchange', 'Career Guidance', 'Project Collaboration', 'Research Discussion', 'Exam Prep', 'Student Life'];

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPosts(searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [filter, activeChannel, searchTerm]);

    useEffect(() => {
        fetchSuggestions();
    }, [isAuthenticated, user?._id]);

    useEffect(() => {
        if (!successMessage) return;
        const timer = setTimeout(() => setSuccessMessage(''), 2500);
        return () => clearTimeout(timer);
    }, [successMessage]);

    useEffect(() => {
        if (!user?._id) {
            setPinnedPostIds([]);
            return;
        }

        const storageKey = `skillswap:pinnedPosts:${user._id}`;
        try {
            const savedPins = JSON.parse(localStorage.getItem(storageKey) || '[]');
            setPinnedPostIds(Array.isArray(savedPins) ? savedPins : []);
        } catch {
            setPinnedPostIds([]);
        }
    }, [user?._id]);

    const fetchPosts = async (search = '') => {
        try {
            setLoading(true);
            const params = {
                sort: filter === 'recent' ? 'recent' : (filter === 'helpful' ? 'votes' : filter),
                topicChannel: activeChannel !== 'all' ? activeChannel : undefined,
                search: search || undefined
            };
            const response = await api.get('/questions', { params });
            if (response.data.success) {
                setPosts(Array.isArray(response.data.questions) ? response.data.questions : []);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuggestions = async () => {
        try {
            setSuggestionsLoading(true);
            setSuggestionsError('');

            const trendingRequest = api.get('/questions/suggestions/trending', {
                params: { limit: 4, windowDays: 7 }
            });

            const personalizedRequest = isAuthenticated && user?._id
                ? api.get('/questions/suggestions/personalized', {
                    params: { limit: 4, windowDays: 14 }
                })
                : Promise.resolve({ data: { success: true, data: [] } });

            const [trendingResult, personalizedResult] = await Promise.allSettled([
                trendingRequest,
                personalizedRequest
            ]);

            if (trendingResult.status === 'fulfilled' && trendingResult.value?.data?.success) {
                setTrendingSuggestions(Array.isArray(trendingResult.value.data.data) ? trendingResult.value.data.data : []);
            } else {
                setTrendingSuggestions([]);
                setSuggestionsError('Could not load trending suggestions right now.');
            }

            if (personalizedResult.status === 'fulfilled' && personalizedResult.value?.data?.success) {
                setPersonalizedSuggestions(Array.isArray(personalizedResult.value.data.data) ? personalizedResult.value.data.data : []);
            } else {
                setPersonalizedSuggestions([]);
            }
        } catch (error) {
            setTrendingSuggestions([]);
            setPersonalizedSuggestions([]);
            setSuggestionsError('Could not load suggestions right now.');
        } finally {
            setSuggestionsLoading(false);
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage('');

        const trimmedTitle = formData.title.trim();
        const trimmedContent = formData.content.trim();

        // Validation
        if (trimmedTitle.length < 10) {
            setError('Title must be at least 10 characters long');
            return;
        }
        if (trimmedTitle.length > 200) {
            setError('Title cannot exceed 200 characters');
            return;
        }
        if (trimmedContent.length < 20) {
            setError('Content must be at least 20 characters long');
            return;
        }
        if (trimmedContent.length > 2000) {
            setError('Content cannot exceed 2000 characters');
            return;
        }

        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('title', trimmedTitle);
            data.append('body', trimmedContent);
            data.append('subject', formData.subject);
            data.append('topicChannel', formData.topicChannel);
            
            // Append actual file objects
            formData.images.forEach(img => {
                if (img.file) data.append('images', img.file);
            });

            const response = await api.post('/questions', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                const createdPost = response.data.data;
                if (createdPost?._id) {
                    setPosts((prevPosts) => [createdPost, ...(Array.isArray(prevPosts) ? prevPosts : [])]);
                    setNewlyCreatedPostIds((prevIds) => [createdPost._id, ...prevIds.filter((id) => id !== createdPost._id)].slice(0, 5));

                    setTimeout(() => {
                        setNewlyCreatedPostIds((prevIds) => prevIds.filter((id) => id !== createdPost._id));
                    }, 10000);
                }
                setFormData({ title: '', content: '', subject: 'programming', topicChannel: 'General', images: [] });
                setIsCreateOpen(false);
                setSuccessMessage('Post created successfully.');
            }
        } catch (err) {
            console.error(err);
            const firstValidationError = err.response?.data?.errors?.[0]?.msg;
            setError(firstValidationError || err.response?.data?.message || 'Error creating post');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        try {
            await api.delete(`/questions/${postId}`);
            setPosts((Array.isArray(posts) ? posts : []).filter(p => p._id !== postId));
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    };

    const handleFollowQuestion = async (postId) => {
        try {
            const response = await api.post(`/questions/${postId}/follow`);
            if (response.data.success) {
                setPosts(posts.map(p => p._id === postId ? { ...p, followers: response.data.data.followers } : p));
            }
        } catch (error) {
            console.error('Error following post:', error);
        }
    };

    const handleToggleHideReply = async (answerId, postId) => {
        try {
            const response = await api.put(`/answers/${answerId}/hide`);
            if (response.data.success) {
                setAnswers({
                    ...answers,
                    [postId]: answers[postId].map(a => a._id === answerId ? { ...a, isHidden: response.data.data.isHidden } : a)
                });
            }
        } catch (error) {
            console.error('Error hiding reply:', error);
        }
    };

    const handleVoteQuestion = async (postId) => {
        try {
            if (!isAuthenticated) {
                navigate('/auth/login');
                return;
            }

            const targetPost = (Array.isArray(posts) ? posts : []).find((p) => p._id === postId);
            const alreadyUpvoted = targetPost?.upvotes?.includes(user?._id);
            const voteType = alreadyUpvoted ? 'remove' : 'upvote';

            const response = await api.post(`/questions/${postId}/vote`, { voteType });
            if (response.data.success) {
                setPosts((prevPosts) =>
                    (Array.isArray(prevPosts) ? prevPosts : []).map((p) =>
                        p._id === postId
                            ? {
                                ...p,
                                upvotes: response.data.data.upvotes || [],
                                downvotes: response.data.data.downvotes || [],
                                voteScore: response.data.data.voteScore || 0
                            }
                            : p
                    )
                );
            }
        } catch (error) {
            alert('Error liking question');
        }
    };

    const handleCreateSessionFromPost = (post) => {
        setSessionModal({ open: true, selectedPost: post });
    };

    const handleSessionCreatedFromModal = (createdSession) => {
        // Redirect to appropriate dashboard after session is created
        if (user?.role === 'mentor') {
            navigate('/mentor/dashboard');
        } else if (user?.role === 'professional') {
            navigate('/professional/dashboard');
        } else {
            setSessionModal({ open: false, selectedPost: null });
        }
    };

    const fetchAnswers = async (postId) => {
        try {
            const response = await api.get(`/questions/${postId}/answers`);
            if (response.data.success) {
                setAnswers((prev) => ({ ...prev, [postId]: response.data.data }));
            }
        } catch (error) {
            console.error('Error fetching answers:', error);
        }
    };

    const handleToggleExpand = (postId) => {
        if (expandedPostId === postId) {
            setExpandedPostId(null);
        } else {
            setExpandedPostId(postId);
            if (!answers[postId]) {
                fetchAnswers(postId);
            }
        }
    };

    const handlePostAnswer = async (postId) => {
        const draft = answerDrafts[postId] || '';
        if (!draft.trim()) return;

        try {
            const response = await api.post(`/questions/${postId}/answers`, { body: draft });
            if (response.data.success) {
                setAnswers((prev) => ({
                    ...prev,
                    [postId]: [response.data.data, ...(prev[postId] || [])]
                }));
                setAnswerDrafts((prev) => ({ ...prev, [postId]: '' }));
                setPosts((prevPosts) =>
                    (Array.isArray(prevPosts) ? prevPosts : []).map((p) =>
                        p._id === postId ? { ...p, answerCount: (p.answerCount || 0) + 1 } : p
                    )
                );
            }
        } catch (error) {
            alert('Error posting answer');
        }
    };

    const handleOpenPost = (postId) => {
        navigate(`/community/post/${postId}`);
    };

    const handleTogglePinPost = (postId) => {
        if (!isAuthenticated || !user?._id) {
            navigate('/auth/login');
            return;
        }

        const storageKey = `skillswap:pinnedPosts:${user._id}`;
        setPinnedPostIds((prev) => {
            const isPinned = prev.includes(postId);
            const next = isPinned ? prev.filter((id) => id !== postId) : [postId, ...prev];
            localStorage.setItem(storageKey, JSON.stringify(next));
            return next;
        });
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const newImages = files.map(file => ({
            url: URL.createObjectURL(file), // Local preview
            file: file // For actual upload if needed
        }));
        setFormData({ ...formData, images: [...formData.images, ...newImages] });
    };

    if (loading) {
        return (
            <div className="pt-32 flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const calculatePostRankScore = (post) => {
        const followersCount = Array.isArray(post?.followers) ? post.followers.length : 0;
        const answerCount = post?.answerCount || 0;
        const acceptedBonus = post?.acceptedAnswer ? 4 : 0;
        const ageHours = Math.max(0, (Date.now() - new Date(post?.createdAt).getTime()) / (1000 * 60 * 60));
        const freshnessBonus = ageHours <= 24 ? 3 : ageHours <= 72 ? 1 : 0;

        // Align frontend ranking with backend suggestion score so higher-value questions rise to top.
        return ((post?.voteScore || 0) * 4) + (followersCount * 2) + (answerCount * 1.5) + acceptedBonus + freshnessBonus;
    };

    const sortedPosts = [...(posts || [])].sort((a, b) => {
        const aPinned = pinnedPostIds.includes(a._id);
        const bPinned = pinnedPostIds.includes(b._id);
        if (aPinned !== bPinned) return aPinned ? -1 : 1;

        const aJustCreated = newlyCreatedPostIds.includes(a._id);
        const bJustCreated = newlyCreatedPostIds.includes(b._id);
        if (aJustCreated !== bJustCreated) return aJustCreated ? -1 : 1;

        const scoreDiff = calculatePostRankScore(b) - calculatePostRankScore(a);
        if (scoreDiff !== 0) return scoreDiff;

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const canEditFirstField = formData.content.trim().length > 0;
    const searchPlaceholderByType = {
        all: 'Search questions, channels, or keywords...',
        questions: 'Search question titles or descriptions...',
        channels: 'Search channels like Exam Prep or Skill Exchange...',
        authors: 'Search by student or mentor name...'
    };

    const trendingSuggestionIds = new Set((trendingSuggestions || []).map((post) => post._id));
    const personalizedSuggestionIds = new Set((personalizedSuggestions || []).map((post) => post._id));

    return (
        <div className="pt-32 pb-20 min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="container mx-auto px-6 max-w-6xl">
                <div className="mb-12">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">University Community</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium italic">Scholarly discourse and collective intelligence.</p>                            <div className="mt-8 relative w-full lg:min-w-[480px]">
                                <AIChatbot />
                            </div>                        </div>
                        <div className="relative group lg:w-96 flex flex-col">
                            <select
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value)}
                                className="w-full mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500"
                            >
                                <option value="all">All</option>
                                <option value="questions">Questions</option>
                                <option value="channels">Channels</option>
                                <option value="authors">Authors</option>
                            </select>
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    placeholder={searchPlaceholderByType[searchType]}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 pl-12 pr-6 text-sm focus:ring-2 focus:ring-indigo-500 transition-all shadow-xl shadow-indigo-500/5"
                                  />
                                  <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Create Post */}
                {isAuthenticated && (
                    <div className="mb-10">
                        {successMessage && (
                            <div className="mb-4 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-bold">
                                {successMessage}
                            </div>
                        )}

                        <div className="flex justify-end mb-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setError(null);
                                    setSuccessMessage('');
                                    setIsCreateOpen((prev) => !prev);
                                }}
                                className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-400/30 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:border-indigo-500 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                {isCreateOpen ? 'Close' : 'Create'}
                            </button>
                        </div>

                        {isCreateOpen && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl transition-all hover:shadow-indigo-500/5">
                        <div className="flex items-start space-x-6">
                            <div className="hidden md:flex w-12 h-12 rounded-full bg-indigo-600 items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-indigo-500/20">
                                {user?.firstName?.[0]}
                            </div>
                            <form onSubmit={handleCreatePost} className="flex-grow space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                                    <span className="text-red-500">*</span> Required fields
                                </p>
                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold flex items-center space-x-2">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>{error}</span>
                                    </div>
                                )}
                                
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">
                                            Question Title <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            required
                                            placeholder={canEditFirstField ? 'What is your question?' : 'Fill detailed description first'}
                                            value={formData.title}
                                            onChange={e => setFormData({...formData, title: e.target.value})}
                                            disabled={!canEditFirstField}
                                            className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">
                                            Subject <span className="text-red-500">*</span>
                                        </label>
                                        <select 
                                            required
                                            value={formData.subject}
                                            onChange={e => setFormData({...formData, subject: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm font-bold capitalize"
                                        >
                                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Channel</label>
                                        <select 
                                            value={formData.topicChannel}
                                            onChange={e => setFormData({...formData, topicChannel: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm font-bold capitalize"
                                        >
                                            {topicChannels.map(c => <option key={c} value={c}>#{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">
                                        Detailed Description <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        required
                                        value={formData.content}
                                        onChange={(e) => {
                                            const nextContent = e.target.value;
                                            setFormData((prev) => ({
                                                ...prev,
                                                content: nextContent,
                                                title: nextContent.trim().length === 0 ? '' : prev.title
                                            }));
                                        }}
                                        placeholder="Explain your question in detail..."
                                        className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl p-4 text-sm font-medium min-h-[120px] resize-none"
                                    ></textarea>
                                </div>

                                {/* Image Preview */}
                                {formData.images.length > 0 && (
                                    <div className="flex gap-4 overflow-x-auto pb-4">
                                        {formData.images.map((img, idx) => (
                                            <div key={idx} className="relative group shrink-0">
                                                <img src={img.url} alt="upload" className="w-24 h-24 object-cover rounded-2xl border-2 border-indigo-500/20" />
                                                <button 
                                                    onClick={() => setFormData({...formData, images: formData.images.filter((_, i) => i !== idx)})}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <label className="cursor-pointer p-4 bg-slate-50 dark:bg-white/5 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all text-slate-400 hover:text-indigo-600">
                                            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                                            <div className="flex items-center space-x-2">
                                                <UserIcon className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Attach Images</span>
                                            </div>
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setError(null);
                                                setIsCreateOpen(false);
                                            }}
                                            className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-black px-6 py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}
                                            className="bg-indigo-600 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all disabled:opacity-50"
                                        >
                                            {isSubmitting ? 'Publishing...' : 'Post Question'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                        )}
                    </div>
                )}

                {/* Post List */}
                <div className="space-y-8">
                    {(!posts || posts.length === 0) ? (
                        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/10 italic text-slate-500">
                            Be the first to start a conversation in the scholar community!
                        </div>
                    ) : (
                        sortedPosts.map((post) => {
                            const isTrending = trendingSuggestionIds.has(post._id);
                            const isRecommended = isAuthenticated && personalizedSuggestionIds.has(post._id);
                            const isJustCreated = newlyCreatedPostIds.includes(post._id);

                            return (
                            <div key={post._id} className={`bg-white dark:bg-slate-900 border rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative ${isTrending ? 'border-orange-300 dark:border-orange-400/40' : isRecommended ? 'border-emerald-300 dark:border-emerald-400/40' : 'border-slate-200 dark:border-white/10'}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="flex items-center justify-between mb-6 relative z-10">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black border border-slate-200 dark:border-white/10 shadow-sm">
                                            {post.author?.firstName?.[0] || 'A'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white leading-none capitalize tracking-tight flex items-center gap-2">
                                                {post.author?.firstName} {post.author?.lastName || ''}
                                                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded uppercase tracking-widest">{post.author?.role}</span>
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1.5 flex items-center font-medium">
                                                <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                                                {new Date(post.createdAt).toLocaleDateString()} • {post.subject || 'General'} • <span className="text-indigo-500 font-black ml-1">#{post.topicChannel || 'general'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleTogglePinPost(post._id)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center ${pinnedPostIds.includes(post._id) ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-amber-600'}`}
                                        >
                                            <Pin className="w-3 h-3 mr-1.5" /> {pinnedPostIds.includes(post._id) ? 'Pinned' : 'Pin'}
                                        </button>
                                        <button 
                                            onClick={() => handleFollowQuestion(post._id)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${post.followers?.includes(user?._id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-indigo-600'}`}
                                        >
                                            {post.followers?.includes(user?._id) ? 'Following' : 'Follow'}
                                        </button>
                                        {post.sessionExists && user?._id === post.author?._id && (
                                            <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                                                Session Pending Review
                                            </span>
                                        )}
                                        {(user?.role === 'mentor' || user?.role === 'professional') && (
                                            <button 
                                                onClick={() => handleCreateSessionFromPost(post)}
                                                className="bg-green-500/10 text-green-600 hover:bg-green-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Create Session
                                            </button>
                                        )}
                                        { (user?._id === post.author?._id || user?.role === 'admin') && (
                                            <button 
                                                onClick={() => handleDeletePost(post._id)}
                                                className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <Link to={`/community/post/${post._id}`} className="block group/title">
                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                        {isTrending && (
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                                                Trending
                                            </span>
                                        )}
                                        {isRecommended && (
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                Recommended
                                            </span>
                                        )}
                                        {suggestionsLoading && !isTrending && !isRecommended && (
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
                                                Scanning
                                            </span>
                                        )}
                                        {isJustCreated && (
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                                                Just Posted
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 group-hover/title:text-indigo-600 dark:group-hover/title:text-indigo-400 transition-colors tracking-tight leading-tight flex items-center gap-3">
                                        {post.title}
                                        <ExternalLink className="w-4 h-4 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                                    </h3>
                                </Link>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                                    {post.body}
                                </p>

                                {/* Post Images */}
                                {post.images?.length > 0 && (
                                    <div className="flex gap-4 overflow-x-auto pb-8">
                                        {post.images.map((img, idx) => (
                                            <img
                                                key={idx}
                                                src={buildAssetUrl(img.url)}
                                                alt="content"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                                className="w-64 h-48 object-cover rounded-3xl border border-slate-100 dark:border-white/5"
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center space-x-8 pt-6 border-t border-slate-100 dark:border-white/5 relative z-10">
                                    <button
                                        onClick={() => handleVoteQuestion(post._id)}
                                        className={`flex items-center transition-colors text-xs font-black uppercase tracking-widest ${post.upvotes?.includes(user?._id) ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
                                    >
                                        <ThumbsUp className="w-4 h-4 mr-2" /> {post.upvotes?.length || 0} Likes
                                    </button>
                                    <button 
                                        onClick={() => handleToggleExpand(post._id)}
                                        className={`flex items-center transition-colors text-xs font-black uppercase tracking-widest ${expandedPostId === post._id ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2" /> {post.answerCount || 0} Discussions
                                    </button>
                                    <button
                                        onClick={() => handleOpenPost(post._id)}
                                        className="flex items-center text-indigo-600 hover:text-indigo-700 transition-colors text-[10px] font-black uppercase tracking-widest ml-auto"
                                    >
                                        <ArrowUpRight className="w-4 h-4 mr-1.5" /> Open
                                    </button>
                                    <button 
                                        onClick={() => setReportModal({ open: true, targetId: post._id, targetName: post.title, targetType: 'question' })}
                                        className="flex items-center text-slate-400 hover:text-orange-500 transition-colors text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <Flag className="w-4 h-4 mr-2" /> Report
                                    </button>
                                </div>

                                {/* Expanded Answers Section */}
                                {expandedPostId === post._id && (
                                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 space-y-6">
                                        {isAuthenticated && (
                                            <div className="flex gap-4">
                                                <input 
                                                    className="flex-grow bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600" 
                                                    placeholder="Share your academic insight..."
                                                    value={answerDrafts[post._id] || ''}
                                                    onChange={e => setAnswerDrafts((prev) => ({ ...prev, [post._id]: e.target.value }))}
                                                />
                                                <button 
                                                    onClick={() => handlePostAnswer(post._id)}
                                                    disabled={!(answerDrafts[post._id] || '').trim()}
                                                    className="bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                                >
                                                    Reply
                                                </button>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {answers[post._id]?.map(ans => (
                                                <div key={ans._id} className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{ans.author?.firstName} {ans.author?.lastName}</p>
                                                        <div className="flex items-center gap-4">
                                                            <p className="text-[10px] text-slate-400 uppercase font-black">{new Date(ans.createdAt).toLocaleDateString()}</p>
                                                            {(user?._id === post.author?._id || user?.role === 'admin') && (
                                                                <button 
                                                                    onClick={() => handleToggleHideReply(ans._id, post._id)}
                                                                    className={`text-xs font-bold ${ans.isHidden ? 'text-green-500' : 'text-slate-400 hover:text-orange-500'}`}
                                                                >
                                                                    {ans.isHidden ? 'Restore' : 'Hide'}
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => setReportModal({ open: true, targetId: ans._id, targetName: `Reply by ${ans.author?.firstName}`, targetType: 'answer' })}
                                                                className="text-slate-300 hover:text-orange-500 transition-colors"
                                                            >
                                                                <Flag className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className={ans.isHidden ? 'opacity-40 grayscale pointer-events-none' : ''}>
                                                        {ans.isHidden && <p className="text-[10px] font-black text-orange-500 uppercase mb-2">Hidden by Moderator</p>}
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{ans.body}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!answers[post._id] || answers[post._id].length === 0) && (
                                                <p className="text-center py-6 text-slate-400 text-xs italic">No replies yet. Be the first to help!</p>
                                            )}
                                        </div>

                                    </div>
                                )}
                            </div>
                        );
                    })
                    )}
                </div>
            </div>

            <ReportModal 
                isOpen={reportModal.open}
                onClose={() => setReportModal({ ...reportModal, open: false })}
                targetId={reportModal.targetId}
                targetName={reportModal.targetName}
                targetType={reportModal.targetType}
            />

            <MentorSessionModal
                isOpen={sessionModal.open}
                onClose={() => setSessionModal({ open: false, selectedPost: null })}
                post={sessionModal.selectedPost}
                onSessionCreated={handleSessionCreatedFromModal}
            />
        </div>
    );
};

export default Community;
//note: This code is a React component for a community page where users can post questions, follow them, create sessions based on questions, and engage in discussions. It includes features like searching, filtering by channels, posting answers, and reporting content.

