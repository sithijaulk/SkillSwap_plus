import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MessageSquare, ThumbsUp, Trash2, Send, Flag, User as UserIcon, Calendar, ArrowLeft, CheckCircle } from 'lucide-react';
import api, { buildAssetUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ReportModal from '../../components/common/ReportModal';
import EditPostModal from '../../components/EditPostModal';

const PostDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { addToast } = useToast() || {};
    
    const [post, setPost] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [answerContent, setAnswerContent] = useState('');
    const [answerCommentInputs, setAnswerCommentInputs] = useState({});
    const [commentSubmittingFor, setCommentSubmittingFor] = useState(null);
    const [reportModal, setReportModal] = useState({ open: false, targetId: '', targetName: '', targetType: 'question' });
    const [editModal, setEditModal] = useState(false);

    useEffect(() => {
        fetchPostDetails();
    }, [id]);

    const fetchPostDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/questions/${id}`);
            if (response.data.success) {
                setPost(response.data.data.question);
                setAnswers(response.data.data.answers);
            }
        } catch (error) {
            console.error('Error fetching post details:', error);
            addToast?.('Could not load the post details.', 'error');
            navigate('/community');
        } finally {
            setLoading(false);
        }
    };

    const handlePostAnswer = async () => {
        if (!answerContent.trim()) return;
        try {
            const response = await api.post('/answers', { 
                question: id,
                body: answerContent 
            });
            if (response.data.success) {
                setAnswers([response.data.data, ...answers]);
                setAnswerContent('');
            }
        } catch (error) {
            addToast?.('Could not submit your response.', 'error');
        }
    };

    const handleVote = async (type, targetId, isQuestion = true) => {
        try {
            const url = isQuestion ? `/questions/${targetId}/vote` : `/answers/${targetId}/vote`;
            const res = await api.post(url, { voteType: type });
            if (res.data.success) {
                if (isQuestion) {
                    setPost({ ...post, upvotes: res.data.data.upvotes, voteScore: res.data.data.voteScore });
                } else {
                    setAnswers(answers.map(a => a._id === targetId ? { ...a, upvotes: res.data.data.upvotes, voteScore: res.data.data.voteScore } : a));
                }
            }
        } catch (error) {
            addToast?.('Could not update your vote.', 'error');
        }
    };

    const handleToggleHide = async (answerId) => {
        try {
            const res = await api.put(`/answers/${answerId}/hide`);
            if (res.data.success) {
                setAnswers(answers.map(a => a._id === answerId ? { ...a, isHidden: res.data.data.isHidden } : a));
            }
        } catch (error) {
            addToast?.('Could not update answer visibility.', 'error');
        }
    };

    const handlePostAnswerComment = async (answerId) => {
        const text = (answerCommentInputs[answerId] || '').trim();
        if (!text) return;

        try {
            setCommentSubmittingFor(answerId);
            const response = await api.post(`/answers/${answerId}/comments`, { text });
            if (response.data.success) {
                setAnswers((prev) => prev.map((a) => (
                    a._id === answerId
                        ? { ...a, comments: response.data?.data?.comments || a.comments || [] }
                        : a
                )));
                setAnswerCommentInputs((prev) => ({ ...prev, [answerId]: '' }));
            }
        } catch (error) {
            addToast?.(error.response?.data?.message || 'Could not post comment.', 'error');
        } finally {
            setCommentSubmittingFor(null);
        }
    };

    if (loading) return <div className="pt-32 text-center">Loading scholarship...</div>;
    if (!post) return <div className="pt-32 text-center">Post not found</div>;

    return (
        <div className="pt-32 pb-20 min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="container mx-auto px-6 max-w-4xl">
                <Link to="/community" className="flex items-center text-indigo-600 font-black text-xs uppercase tracking-widest mb-8 hover:gap-2 transition-all">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Community
                </Link>

                {/* Question Header */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-10 shadow-xl mb-10">
                    <div className="flex items-center space-x-4 mb-8">
                        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-black text-xl border border-slate-200 dark:border-white/10">
                            {post.author?.firstName?.[0]}
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white leading-none">
                                {post.author?.firstName} {post.author?.lastName}
                                <span className="ml-3 text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded uppercase tracking-widest">{post.author?.role}</span>
                            </h4>
                            <p className="text-sm text-slate-500 mt-2 font-medium">
                                Posted on {new Date(post.createdAt).toLocaleDateString()} • {post.subject} • <span className="text-indigo-600 font-bold">#{post.topicChannel}</span>
                            </p>
                        </div>
                    </div>

                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-6 leading-tight tracking-tight">
                        {post.title}
                    </h1>
                    <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-medium text-lg leading-relaxed mb-8">
                        {post.body}
                    </div>

                    {post.images?.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            {post.images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={buildAssetUrl(img.url)}
                                    alt="content"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                    className="rounded-3xl border border-slate-200 dark:border-white/10 w-full h-64 object-cover"
                                />
                            ))}
                        </div>
                    )}

                    <div className="flex items-center space-x-8 pt-8 border-t border-slate-100 dark:border-white/5">
                        <button 
                            onClick={() => handleVote('upvote', post._id)}
                            className={`flex items-center text-xs font-black uppercase tracking-widest transition-all ${post.upvotes?.includes(user?._id) ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
                        >
                            <ThumbsUp className="w-5 h-5 mr-2" /> {post.voteScore || 0} Helpful
                        </button>
                        <div className="text-slate-400 text-xs font-black uppercase tracking-widest flex items-center">
                            <MessageSquare className="w-5 h-5 mr-2" /> {answers.length} Responses
                        </div>
                        <button 
                            onClick={() => setReportModal({ open: true, targetId: post._id, targetName: post.title, targetType: 'question' })}
                            className="bg-orange-500/10 text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ml-auto"
                        >
                            <Flag className="w-4 h-4 mr-2" /> Report Post
                        </button>
                        {user?._id === post.author?._id && (
                            <button
                                onClick={() => setEditModal(true)}
                                className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Edit Post
                            </button>
                        )}
                    </div>
                </div>

                {/* Post Answer Form */}
                {isAuthenticated && (
                    <div className="mb-12">
                        <h3 className="text-xl font-black mb-6 flex items-center">
                            <Send className="w-5 h-5 mr-3 text-indigo-600" /> Share Your Expertise
                        </h3>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-lg shadow-indigo-500/5">
                            <textarea 
                                value={answerContent}
                                onChange={e => setAnswerContent(e.target.value)}
                                placeholder="Write a detailed, scholarly response..."
                                className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl p-6 text-slate-800 dark:text-white font-medium min-h-[150px] resize-none focus:ring-2 focus:ring-indigo-600 transition-all mb-4"
                            />
                            <div className="flex justify-end">
                                <button 
                                    onClick={handlePostAnswer}
                                    disabled={!answerContent.trim()}
                                    className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all disabled:opacity-50"
                                >
                                    Submit Response
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Answers List */}
                <div className="space-y-6">
                    <h3 className="text-xl font-black mb-6">Scholarly Discussions ({answers.length})</h3>
                    {answers.map(ans => (
                        <div key={ans._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2rem] p-8 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold font-black text-indigo-500">
                                        {ans.author?.firstName?.[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none">
                                            {ans.author?.firstName} {ans.author?.lastName}
                                            <span className="ml-2 text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">{ans.author?.role}</span>
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{new Date(ans.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {(user?._id === post.author?._id || user?.role === 'admin') && (
                                        <button 
                                            onClick={() => handleToggleHide(ans._id)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${ans.isHidden ? 'bg-green-500 text-white border-green-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-400 hover:text-orange-500'}`}
                                        >
                                            {ans.isHidden ? 'Restore' : 'Hide Spam'}
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setReportModal({ open: true, targetId: ans._id, targetName: `Reply by ${ans.author?.firstName}`, targetType: 'answer' })}
                                        className="p-2 text-slate-300 hover:text-orange-500"
                                    >
                                        <Flag className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className={ans.isHidden ? 'opacity-30 grayscale blur-[1px]' : ''}>
                                {ans.isHidden && <div className="flex items-center text-orange-600 font-black text-[10px] uppercase mb-4 tracking-widest bg-orange-50 dark:bg-orange-500/10 w-fit px-3 py-1 rounded-full"><Flag className="w-3 h-3 mr-1.5" /> Hidden by Post Owner</div>}
                                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">
                                    {ans.body}
                                </p>
                            </div>

                            <div className="mt-8 flex items-center pt-6 border-t border-slate-100 dark:border-white/5">
                                <button 
                                    onClick={() => handleVote('upvote', ans._id, false)}
                                    className={`flex items-center text-[10px] font-black uppercase tracking-widest transition-all ${ans.upvotes?.includes(user?._id) ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
                                >
                                    <ThumbsUp className="w-4 h-4 mr-2" /> {ans.voteScore || 0} Upvotes
                                </button>
                                {ans.isAccepted && (
                                    <div className="ml-auto flex items-center text-green-500 font-black text-[10px] uppercase tracking-widest bg-green-50 dark:bg-green-500/10 px-4 py-1.5 rounded-full">
                                        <CheckCircle className="w-4 h-4 mr-2" /> Solution Verified
                                    </div>
                                )}
                            </div>

                            <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-white/5 px-4 py-4 border border-slate-100 dark:border-white/10">
                                <div className="space-y-3">
                                    {(ans.comments || []).map((comment, idx) => (
                                        <div key={idx} className="flex items-start gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[11px] font-black shrink-0">
                                                {comment.author?.firstName?.[0] || 'U'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2.5">
                                                    <p className="text-[11px] font-black text-slate-800 dark:text-white leading-none mb-1">
                                                        {comment.author?.firstName || 'User'} {comment.author?.lastName || ''}
                                                    </p>
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 break-words">{comment.text}</p>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                    <span className="hover:text-indigo-600 cursor-default">Like</span>
                                                    <span className="hover:text-indigo-600 cursor-default">Reply</span>
                                                    <span>{comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Now'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {isAuthenticated && (
                                    <div className="mt-4 flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-indigo-600/15 text-indigo-600 flex items-center justify-center text-[11px] font-black shrink-0">
                                            {user?.firstName?.[0] || 'Y'}
                                        </div>
                                        <input
                                            type="text"
                                            value={answerCommentInputs[ans._id] || ''}
                                            onChange={(e) => setAnswerCommentInputs((prev) => ({ ...prev, [ans._id]: e.target.value }))}
                                            placeholder="Write a comment..."
                                            className="flex-grow bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-full px-4 py-2.5 text-xs text-slate-900 dark:text-white"
                                        />
                                        <button
                                            onClick={() => handlePostAnswerComment(ans._id)}
                                            disabled={commentSubmittingFor === ans._id || !(answerCommentInputs[ans._id] || '').trim()}
                                            className="bg-indigo-600 text-white rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide disabled:opacity-50"
                                        >
                                            {commentSubmittingFor === ans._id ? 'Posting' : 'Post'}
                                        </button>
                                    </div>
                                )}
                            </div>

                        </div>
                    ))}
                    {answers.length === 0 && (
                        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 italic text-slate-400">
                            The collective brain is thinking... Be the first to share an answer!
                        </div>
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

            {editModal && (
                <EditPostModal
                    post={post}
                    onClose={() => setEditModal(false)}
                    onSave={(updatedPost) => {
                        setPost(updatedPost);
                        setEditModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default PostDetails;
