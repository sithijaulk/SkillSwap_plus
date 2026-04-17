import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { buildAssetUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import Modal from '../components/common/Modal';
import {
    Star,
    Clock,
    User,
    BookOpen,
    CreditCard,
    Heart,
    Share2,
    Flag,
    Calendar,
    MessageCircle,
    Award,
    CheckCircle,
    ArrowLeft
} from 'lucide-react';

const ProgramDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const { showToast } = useToast();

    const [skill, setSkill] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);
    const [availability, setAvailability] = useState([]);

    const [formData, setFormData] = useState({
        cardNumber: '',
        expiry: '',
        phone: user?.phone || ''
    });

    const typeKey = skill?.type ? String(skill.type).toLowerCase() : (skill?.price > 0 ? 'paid' : 'free');
    const isFreeProgram = typeKey === 'free' || typeKey === 'skill share';

    useEffect(() => {
        fetchSkillDetails();
        if (isAuthenticated) {
            checkIfFavorited();
            fetchAvailability();
        }
    }, [id, isAuthenticated]);

    const fetchSkillDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/skills/${id}`);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Skill not found');
            }

            const skillData = response.data.data || {};
            if (!skillData.type) {
                skillData.type = skillData.price > 0 ? 'paid' : 'free';
            }
            if (skillData.type === 'paid' && skillData.price > 0) {
                skillData.basePrice = skillData.price;
                skillData.platformFee = Math.round(skillData.price * 0.25 * 100) / 100;
                skillData.displayPrice = Math.round(skillData.price * 1.25 * 100) / 100;
            } else {
                skillData.basePrice = 0;
                skillData.platformFee = 0;
                skillData.displayPrice = 0;
            }

            setSkill(skillData);
        } catch (error) {
            console.error('Error fetching skill details:', error);
            showToast('Failed to load skill details', 'error');
            navigate('/programs');
        } finally {
            setLoading(false);
        }
    };

    const checkIfFavorited = async () => {
        try {
            const response = await api.get(`/favorites/check/skill/${id}`);
            setIsFavorited(response.data.data.isFavorited);
        } catch (error) {
            console.error('Error checking favorite status:', error);
        }
    };

    const fetchAvailability = async () => {
        try {
            const response = await api.get(`/availability/mentor/${skill?.mentor?._id}`);
            setAvailability(response.data.data || []);
        } catch (error) {
            console.error('Error fetching availability:', error);
        }
    };

    const handleFavorite = async () => {
        if (!isAuthenticated) {
            showToast('Please login to add favorites', 'info');
            navigate('/login');
            return;
        }

        try {
            if (isFavorited) {
                // Remove from favorites
                const response = await api.get(`/favorites/check/skill/${id}`);
                if (response.data.data.favoriteId) {
                    await api.delete(`/favorites/${response.data.data.favoriteId}`);
                    setIsFavorited(false);
                    showToast('Removed from favorites', 'success');
                }
            } else {
                // Add to favorites
                await api.post('/favorites', {
                    favoriteType: 'skill',
                    favoriteId: id
                });
                setIsFavorited(true);
                showToast('Added to favorites', 'success');
            }
        } catch (error) {
            console.error('Error updating favorites:', error);
            showToast('Failed to update favorites', 'error');
        }
    };

    const handleBuy = () => {
        if (!isAuthenticated) {
            showToast('Please login to purchase', 'info');
            navigate('/login');
            return;
        }

        if (isFreeProgram) {
            handleEnroll();
        } else {
            setIsBuyModalOpen(true);
        }
    };

    const handleEnroll = async () => {
        // For free skills, directly enroll
        const mentorId = skill?.mentor?._id || skill?.mentor;
        navigate(`/sessions/book/${mentorId || ''}`, {
            state: {
                skillId: id,
                skill: skill
            }
        });
    };

    const handlePayment = async (e) => {
        e.preventDefault();

        if (!formData.cardNumber || !formData.expiry || !formData.phone) {
            showToast('Please fill all payment fields', 'error');
            return;
        }

        if (!/^\d{10}$/.test(formData.phone)) {
            showToast('Phone number must be exactly 10 digits', 'error');
            return;
        }

        setIsProcessing(true);

        try {
            await api.post('/admin/finance/pay', {
                skillId: id,
                phone: formData.phone,
            });

            setIsBuyModalOpen(false);
            showToast('Payment successful! Program added to My Learning.', 'success');
            navigate('/learner/dashboard?tab=my-learning');
        } catch (error) {
            console.error('Payment failed:', error);
            showToast(error.response?.data?.message || 'Payment failed. Please try again.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReport = () => {
        // Implement report functionality
        showToast('Report functionality coming soon', 'info');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!skill) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Skill Not Found</h2>
                    <button
                        onClick={() => navigate('/programs')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Back to Programs
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <button
                        onClick={() => navigate('/programs')}
                        className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4"
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Back to Programs
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Skill Header */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        {skill.type === 'free' ? (
                                            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                                                🟢 Free Skill Share
                                            </span>
                                        ) : (
                                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                                                💰 Paid Skill
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                        {skill.title}
                                    </h1>
                                    <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300">
                                        <div className="flex items-center gap-1">
                                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                            <span className="font-medium">{skill.averageRating?.toFixed(1) || '0.0'}</span>
                                            <span className="text-sm">({skill.totalReviews || 0} reviews)</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <User className="h-5 w-5" />
                                            <span>{skill.mentor?.firstName} {skill.mentor?.lastName}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleFavorite}
                                        className={`p-2 rounded-lg border ${
                                            isFavorited
                                                ? 'bg-red-50 border-red-200 text-red-600'
                                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => showToast('Share functionality coming soon', 'info')}
                                        className="p-2 rounded-lg border bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                    >
                                        <Share2 className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={handleReport}
                                        className="p-2 rounded-lg border bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                    >
                                        <Flag className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Skill Image */}
                            {skill.image && (
                                <div className="mb-6">
                                    <img
                                        src={buildAssetUrl(`/uploads/skills/${skill.image}`)}
                                        alt={skill.title}
                                        className="w-full h-64 object-cover rounded-lg"
                                    />
                                </div>
                            )}

                            {/* Description */}
                            <div className="prose dark:prose-invert max-w-none">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {skill.description}
                                </p>
                            </div>

                            {/* Requirements */}
                            {skill.requiredKnowledge && (
                                <div className="mt-6">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Requirements</h3>
                                    <p className="text-gray-700 dark:text-gray-300">
                                        {skill.requiredKnowledge}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Mentor Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">About the Mentor</h3>
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                    {skill.mentor?.profileImage ? (
                                        <img
                                            src={skill.mentor.profileImage}
                                            alt={`${skill.mentor.firstName} ${skill.mentor.lastName}`}
                                            className="w-16 h-16 rounded-full object-cover"
                                        />
                                    ) : (
                                        <User className="h-8 w-8 text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                        {skill.mentor?.firstName} {skill.mentor?.lastName}
                                    </h4>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {skill.mentor?.university && `${skill.mentor.university}`}
                                        {skill.mentor?.department && ` • ${skill.mentor.department}`}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center gap-1">
                                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                            <span className="text-sm font-medium">{skill.mentor?.averageRating?.toFixed(1) || '0.0'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Award className="h-4 w-4 text-blue-600" />
                                            <span className="text-sm">{skill.mentor?.totalRatings || 0} sessions</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reviews Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Reviews</h3>
                            {skill.totalReviews > 0 ? (
                                <div className="space-y-4">
                                    {(() => {
                                        const visibleReviews = Array.isArray(skill.allReviews) && skill.allReviews.length > 0
                                            ? skill.allReviews
                                            : (Array.isArray(skill.recentReviews) ? skill.recentReviews : []);

                                        return (
                                            <>
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-2">
                                        <div className="flex">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`h-5 w-5 ${
                                                        star <= Math.round(skill.averageRating)
                                                            ? 'fill-yellow-400 text-yellow-400'
                                                            : 'text-gray-300'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="font-medium">{skill.averageRating?.toFixed(1)}</span>
                                        <span className="text-gray-600 dark:text-gray-300">
                                            ({skill.totalReviews} reviews)
                                        </span>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                            {skill.recommendationRate}% Recommend
                                        </span>
                                    </div>

                                    {visibleReviews.length > 0 && (
                                        <div className="space-y-3">
                                            {visibleReviews.map((review, idx) => {
                                                const reviewerName = review.isAnonymous
                                                    ? 'Anonymous Learner'
                                                    : `${review.learnerFirstName || ''} ${review.learnerLastName || ''}`.trim() || 'Learner';

                                                return (
                                                    <div key={`${review.submittedAt || 'r'}-${idx}`} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40">
                                                        <div className="flex items-center justify-between gap-3 mb-2">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{reviewerName}</p>
                                                            <div className="flex items-center gap-1 text-amber-500">
                                                                <Star className="h-4 w-4 fill-current" />
                                                                <span className="text-sm font-semibold">{Number(review.rating || 0).toFixed(1)}</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                                            {review.writtenReview}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4">
                                    <p className="text-gray-600 dark:text-gray-300">New Program • No reviews yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Pricing Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-6">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Pricing</h3>

                            {skill.type === 'free' ? (
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-600 mb-2">FREE</div>
                                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                                        Join this skill sharing session at no cost
                                    </p>
                                    <button
                                        onClick={handleBuy}
                                        className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
                                    >
                                        Join Now
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 dark:text-gray-300">Base Price</span>
                                        <span className="font-medium">₹{skill.basePrice}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 dark:text-gray-300">Platform Fee (25%)</span>
                                        <span className="font-medium">₹{skill.platformFee}</span>
                                    </div>
                                    <hr className="border-gray-200 dark:border-gray-700" />
                                    <div className="flex justify-between items-center text-lg font-semibold">
                                        <span>Total</span>
                                        <span className="text-blue-600">₹{skill.displayPrice}</span>
                                    </div>

                                    <button
                                        onClick={handleBuy}
                                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors mt-6"
                                    >
                                        Buy Now
                                    </button>
                                </div>
                            )}

                            <div className="mt-6 space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span>1-on-1 personalized learning</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span>Flexible scheduling</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span>Progress tracking</span>
                                </div>
                            </div>
                        </div>

                        {/* Availability Calendar */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                            <AvailabilityCalendar mentorId={skill?.mentor?._id} readOnly title="Mentor Availability" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {isBuyModalOpen && (
                <Modal
                    isOpen={isBuyModalOpen}
                    onClose={() => setIsBuyModalOpen(false)}
                    title="Complete Payment"
                >
                    <form onSubmit={handlePayment} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Card Number
                            </label>
                            <input
                                type="text"
                                value={formData.cardNumber}
                                onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                                placeholder="1234 5678 9012 3456"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Expiry Date
                                </label>
                                <input
                                    type="text"
                                    value={formData.expiry}
                                    onChange={(e) => setFormData({...formData, expiry: e.target.value})}
                                    placeholder="MM/YY"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setFormData({...formData, phone: value});
                                    }}
                                    placeholder="10-digit number"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    maxLength={10}
                                    required
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600 dark:text-gray-300">Skill Price</span>
                                <span>₹{skill.basePrice}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600 dark:text-gray-300">Platform Fee</span>
                                <span>₹{skill.platformFee}</span>
                            </div>
                            <hr className="border-gray-300 dark:border-gray-600 mb-2" />
                            <div className="flex justify-between items-center font-semibold">
                                <span>Total</span>
                                <span className="text-blue-600">₹{skill.displayPrice}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsBuyModalOpen(false)}
                                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Processing...' : `Pay ₹${skill.displayPrice}`}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default ProgramDetails;