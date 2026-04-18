import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
    Calendar, MessageSquare, ThumbsUp, ArrowUpRight,
    GraduationCap, Building2, Users, Star, ChevronLeft
} from 'lucide-react';

const CommunityUserProfile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated } = useAuth();

    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [stats, setStats] = useState({ totalPosts: 0, totalVotes: 0, totalAnswers: 0 });

    const isOwnProfile = currentUser?._id === userId;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // Fetch profile and posts independently so one failure doesn't block the other
            const [profileResult, postsResult] = await Promise.allSettled([
                api.get(`/users/${userId}/community-profile`),
                api.get('/questions', { params: { authorId: userId, limit: 50, sort: 'recent' } })
            ]);

            let userPosts = [];
            if (postsResult.status === 'fulfilled' && postsResult.value?.data?.success) {
                userPosts = Array.isArray(postsResult.value.data.questions) ? postsResult.value.data.questions : [];
                setPosts(userPosts);
                setStats({
                    totalPosts: userPosts.length,
                    totalVotes: userPosts.reduce((sum, p) => sum + (p.upvotes?.length || 0), 0),
                    totalAnswers: userPosts.reduce((sum, p) => sum + (p.answerCount || 0), 0)
                });
            }

            if (profileResult.status === 'fulfilled' && profileResult.value?.data?.success) {
                setProfile(profileResult.value.data.data);
            } else {
                // Fallback: build basic profile from the author info embedded in posts
                const authorFromPost = userPosts[0]?.author;
                if (authorFromPost?._id) {
                    setProfile({
                        _id: authorFromPost._id,
                        firstName: authorFromPost.firstName,
                        lastName: authorFromPost.lastName,
                        role: authorFromPost.role,
                        averageRating: authorFromPost.averageRating,
                        profileImage: authorFromPost.profileImage
                    });
                } else {
                    console.error('Profile fetch failed:', profileResult.reason || profileResult.value?.data);
                }
            }

            setLoading(false);
        };

        fetchData();
    }, [userId]);

    useEffect(() => {
        if (!isAuthenticated || !currentUser?._id || isOwnProfile) return;
        api.get(`/users/${currentUser._id}/following`)
            .then(res => {
                if (res.data.success) {
                    const following = res.data.data || [];
                    setIsFollowing(following.some(u => u._id === userId));
                    setFollowersCount(following.length);
                }
            })
            .catch(() => {});
    }, [userId, currentUser?._id, isAuthenticated, isOwnProfile]);

    const handleFollow = async () => {
        if (!isAuthenticated) { navigate('/auth/login'); return; }
        try {
            const res = await api.post(`/users/${userId}/follow`);
            if (res.data?.success) {
                setIsFollowing(res.data.data.following);
            }
        } catch (err) {
            console.error('Error toggling follow:', err);
        }
    };

    const roleColors = {
        mentor: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
        learner: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
        professional: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        admin: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
    };

    if (loading) {
        return (
            <div className="pt-32 flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="pt-32 flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-slate-500 text-lg font-medium">User not found.</p>
                <button onClick={() => navigate('/community')} className="text-indigo-600 font-bold underline">
                    Back to Community
                </button>
            </div>
        );
    }

    return (
        <div className="pt-32 pb-20 min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="container mx-auto px-6 max-w-4xl">

                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 text-sm font-bold mb-8 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>

                {/* Profile Header */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 mb-8 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-500/25 shrink-0">
                            {profile.firstName?.[0]?.toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-grow">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight capitalize">
                                    {profile.firstName} {profile.lastName}
                                </h1>
                                <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${roleColors[profile.role] || 'bg-slate-100 text-slate-600'}`}>
                                    {profile.role}
                                </span>
                            </div>

                            {profile.bio && (
                                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed mb-3 max-w-xl">
                                    {profile.bio}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-4 text-xs text-slate-500 font-medium">
                                {profile.university && (
                                    <span className="flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5" />
                                        {profile.university}
                                    </span>
                                )}
                                {profile.department && (
                                    <span className="flex items-center gap-1.5">
                                        <GraduationCap className="w-3.5 h-3.5" />
                                        {profile.department}
                                        {profile.yearOfStudy ? ` · Year ${profile.yearOfStudy}` : ''}
                                    </span>
                                )}
                                {profile.averageRating > 0 && (
                                    <span className="flex items-center gap-1.5 text-amber-500 font-bold">
                                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                                        {profile.averageRating.toFixed(1)}
                                        {profile.totalRatings > 0 && <span className="text-slate-400 font-medium">({profile.totalRatings})</span>}
                                    </span>
                                )}
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        {/* Follow button */}
                        {isAuthenticated && !isOwnProfile && (
                            <button
                                onClick={handleFollow}
                                className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                    isFollowing
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                        : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600'
                                }`}
                            >
                                <Users className="w-4 h-4" />
                                {isFollowing ? 'Following' : '+ Follow'}
                            </button>
                        )}
                    </div>

                    {/* Stats row */}
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 grid grid-cols-3 gap-4">
                        {[
                            { label: 'Posts', value: stats.totalPosts },
                            { label: 'Total Likes', value: stats.totalVotes },
                            { label: 'Discussions', value: stats.totalAnswers }
                        ].map(({ label, value }) => (
                            <div key={label} className="text-center">
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
                                <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-1">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Posts */}
                <div>
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5 pl-1">
                        Posts by {profile.firstName}
                    </h2>

                    {posts.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-300 dark:border-white/10 text-slate-400 italic text-sm">
                            No posts yet.
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {posts.map(post => (
                                <Link
                                    key={post._id}
                                    to={`/community/post/${post._id}`}
                                    className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-grow min-w-0">
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded">
                                                    {post.subject}
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 text-slate-500 px-2 py-0.5 rounded">
                                                    #{post.topicChannel}
                                                </span>
                                            </div>
                                            <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight leading-snug mb-2">
                                                {post.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                                                {post.body}
                                            </p>
                                        </div>
                                        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 shrink-0 mt-1 transition-colors" />
                                    </div>

                                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-white/5 text-xs text-slate-400 font-black uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5">
                                            <ThumbsUp className="w-3.5 h-3.5" />
                                            {post.upvotes?.length || 0}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            {post.answerCount || 0}
                                        </span>
                                        <span className="flex items-center gap-1.5 ml-auto normal-case font-medium text-slate-400">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(post.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommunityUserProfile;
