const Favorite = require('./favorite.model');
const User = require('./user.model');
const Skill = require('./skill.model');

/**
 * Favorite Controller
 * Handles HTTP requests for favorite operations
 */

/**
 * @route   POST /api/favorites
 * @desc    Add item to favorites
 * @access  Private
 */
exports.addFavorite = async (req, res, next) => {
    try {
        const { favoriteType, favoriteId, notes } = req.body;

        // Validate favoriteType
        if (!['mentor', 'skill'].includes(favoriteType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid favorite type. Must be "mentor" or "skill"'
            });
        }

        // Check if the item exists
        let itemExists = false;
        if (favoriteType === 'mentor') {
            const mentor = await User.findOne({ _id: favoriteId, role: 'mentor' });
            itemExists = !!mentor;
        } else if (favoriteType === 'skill') {
            const skill = await Skill.findOne({ _id: favoriteId, isActive: true });
            itemExists = !!skill;
        }

        if (!itemExists) {
            return res.status(404).json({
                success: false,
                message: `${favoriteType} not found`
            });
        }

        // Check if already favorited
        const existingFavorite = await Favorite.findOne({
            user: req.user._id,
            favoriteType,
            favoriteId
        });

        if (existingFavorite) {
            return res.status(409).json({
                success: false,
                message: 'Item already in favorites'
            });
        }

        // Create favorite
        const favorite = new Favorite({
            user: req.user._id,
            favoriteType,
            favoriteId,
            notes: notes || ''
        });

        await favorite.save();

        res.status(201).json({
            success: true,
            message: 'Added to favorites',
            data: favorite
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/favorites
 * @desc    Get user's favorites
 * @access  Private
 */
exports.getFavorites = async (req, res, next) => {
    try {
        const { type } = req.query;

        const filter = { user: req.user._id };
        if (type && ['mentor', 'skill'].includes(type)) {
            filter.favoriteType = type;
        }

        const favorites = await Favorite.find(filter)
            .populate({
                path: 'favoriteId',
                select: type === 'mentor'
                    ? 'firstName lastName profileImage bio skills hourlyRate averageRating totalRatings'
                    : 'title description category price image type'
            })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: favorites
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/favorites/:id
 * @desc    Remove item from favorites
 * @access  Private
 */
exports.removeFavorite = async (req, res, next) => {
    try {
        const favorite = await Favorite.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!favorite) {
            return res.status(404).json({
                success: false,
                message: 'Favorite not found'
            });
        }

        res.json({
            success: true,
            message: 'Removed from favorites'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/favorites/check/:type/:id
 * @desc    Check if item is favorited
 * @access  Private
 */
exports.checkFavorite = async (req, res, next) => {
    try {
        const { type, id } = req.params;

        if (!['mentor', 'skill'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid favorite type'
            });
        }

        const favorite = await Favorite.findOne({
            user: req.user._id,
            favoriteType: type,
            favoriteId: id
        });

        res.json({
            success: true,
            data: {
                isFavorited: !!favorite,
                favoriteId: favorite?._id || null
            }
        });
    } catch (error) {
        next(error);
    }
};