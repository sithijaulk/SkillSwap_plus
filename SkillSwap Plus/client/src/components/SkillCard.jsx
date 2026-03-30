import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, User, BookOpen } from 'lucide-react';

const SkillCard = ({ skill, onViewMentor }) => {
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/programs/${skill._id}`);
    };

    const handleViewMentor = (e) => {
        e.stopPropagation(); // Prevent card click
        if (onViewMentor) {
            onViewMentor(skill.mentor);
        }
    };

    return (
        <div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={handleCardClick}
        >
            {/* Skill Image */}
            {skill.image && (
                <div className="mb-4">
                    <img
                        src={`/uploads/skills/${skill.image}`}
                        alt={skill.title}
                        className="w-full h-32 object-cover rounded-lg"
                    />
                </div>
            )}

            {/* Type Badge */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    {skill.type === 'free' ? (
                        <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs font-medium">
                            🟢 Free Skill Share
                        </span>
                    ) : (
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                            💰 Paid Skill
                        </span>
                    )}
                </div>
                <div className="text-right">
                    {skill.type === 'free' ? (
                        <div className="text-lg font-bold text-green-600">FREE</div>
                    ) : (
                        <div className="text-lg font-bold text-blue-600">₹{skill.displayPrice}</div>
                    )}
                </div>
            </div>

            {/* Title and Category */}
            <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {skill.title}
                </h3>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {skill.category}
                </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
                {skill.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
                {(skill.tags || []).slice(0, 3).map((tag) => (
                    <span
                        key={tag}
                        className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded"
                    >
                        {tag}
                    </span>
                ))}
                {(skill.tags || []).length > 3 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{(skill.tags || []).length - 3} more
                    </span>
                )}
            </div>

            {/* Mentor Info and Rating */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        {skill.mentor?.profileImage ? (
                            <img
                                src={skill.mentor.profileImage}
                                alt={`${skill.mentor.firstName} ${skill.mentor.lastName}`}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="text-blue-700 dark:text-blue-300 font-semibold">
                                {(skill.mentor?.firstName || 'M').charAt(0)}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {skill.mentor?.firstName} {skill.mentor?.lastName}
                        </div>
                        <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {skill.averageRating?.toFixed(1) || '0.0'} • {skill.totalReviews || 0} reviews
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleViewMentor}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
                >
                    View Mentor
                </button>
            </div>
        </div>
    );
};

export default SkillCard;
