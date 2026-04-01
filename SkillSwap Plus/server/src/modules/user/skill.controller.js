const Skill = require('./skill.model');
const User = require('./user.model');
const PostSessionFeedback = require('./postSessionFeedback.model');

// Create a new skill
exports.createSkill = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            type, // 'free' or 'paid'
            price,
            requiredKnowledge,
            materials,
            image // File upload ID from previous upload
        } = req.body;

        // Validate type
        if (!['free', 'paid'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be either "free" or "paid"'
            });
        }

        // Validate price based on type
        if (type === 'free' && price !== 0) {
            return res.status(400).json({
                success: false,
                message: 'Price must be 0 for free skills'
            });
        }

        if (type === 'paid' && (!price || price <= 0)) {
            return res.status(400).json({
                success: false,
                message: 'Price must be greater than 0 for paid skills'
            });
        }

        const payload = {
            mentor: req.user._id.toString(),
            title,
            description,
            category,
            type,
            price: type === 'free' ? 0 : parseFloat(price),
            requiredKnowledge,
            materials,
            image: image || null
        };

        const skill = await Skill.create(payload);

        res.status(201).json({
            success: true,
            message: 'Skill created successfully',
            data: skill
        });
    } catch (error) {
        console.error('Skill Creation Failed:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get all skills (public) with advanced filters
exports.getSkills = async (req, res) => {
    try {
        const {
            search,
            category,
            sort,
            type, // 'free', 'paid', or 'all'
            minPrice,
            maxPrice,
            availability, // 'available', 'all'
            mentorId,
            page = 1,
            limit = 20
        } = req.query;

        let query = { isActive: true };

        // Category filter
        if (category && category !== 'all') {
            query.category = category;
        }

        // Type filter (free/paid)
        if (type && type !== 'all') {
            if (type === 'free') {
                query.type = 'free';
            } else if (type === 'paid') {
                query.type = 'paid';
            }
        }

        // Price range filter (only for paid skills)
        if (minPrice || maxPrice) {
            query.type = 'paid'; // Only filter paid skills by price
            if (minPrice) {
                query.price = { ...query.price, $gte: parseFloat(minPrice) };
            }
            if (maxPrice) {
                query.price = { ...query.price, $lte: parseFloat(maxPrice) };
            }
        }

        // Mentor filter
        if (mentorId) {
            query.mentor = mentorId;
        }

        // Search filter
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        // Availability filter
        let mentorIdsWithAvailability = null;
        if (availability === 'available') {
            // This would require checking mentor availability
            // For now, we'll skip this complex filter and implement it later
            // mentorIdsWithAvailability = await getMentorsWithAvailability();
        }

        // Sorting
        let sortOption = { createdAt: -1 };
        if (sort === 'price_low') {
            sortOption = { price: 1 };
            query.type = 'paid'; // Only sort paid skills by price
        }
        if (sort === 'price_high') {
            sortOption = { price: -1 };
            query.type = 'paid';
        }
        if (sort === 'rating') {
            sortOption = { 'mentor.averageRating': -1 };
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const skills = await Skill.find(query)
            .populate('mentor', 'firstName lastName university department yearOfStudy averageRating totalRatings profileImage')
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Skill.countDocuments(query);

        // Sort by mentor rating if requested (manually)
        if (sort === 'top_rated') {
            skills.sort((a, b) => (b.mentor?.averageRating || 0) - (a.mentor?.averageRating || 0));
        }

        // ===========================
        // Reputation summary (public)
        // ===========================
        // Aggregate feedback per session.skill (string) for completed sessions only.
        // Then map it back onto each Skill card by matching the Skill title/name.
        const normalizeKey = (value) => (value || '').toString().trim().toLowerCase();
        const toProgramKey = (mentorId, value) => `${(mentorId || '').toString()}::${normalizeKey(value)}`;

        const programKeys = skills
            .map((s) => toProgramKey(s.mentor?._id, s.title || s.name))
            .filter((k) => !k.endsWith('::'))
            .filter(Boolean);

        let reputationByKey = new Map();
        if (programKeys.length > 0) {
            const reputationRows = await PostSessionFeedback.aggregate([
                {
                    $lookup: {
                        from: 'sessions',
                        localField: 'sessionId',
                        foreignField: '_id',
                        as: 'session',
                    },
                },
                { $unwind: '$session' },
                {
                    $addFields: {
                        sessionStatusKey: {
                            $toLower: {
                                $trim: {
                                    input: { $ifNull: ['$session.status', ''] },
                                },
                            },
                        },
                        sessionMentorKey: {
                            $toString: { $ifNull: ['$session.mentor', ''] },
                        },
                        sessionSkillOrTopicKey: {
                            $toLower: {
                                $trim: {
                                    input: { $ifNull: ['$session.skill', { $ifNull: ['$session.topic', ''] }] },
                                },
                            },
                        },
                        sessionProgramKey: {
                            $concat: [
                                { $toString: { $ifNull: ['$session.mentor', ''] } },
                                '::',
                                {
                                    $toLower: {
                                        $trim: {
                                            input: { $ifNull: ['$session.skill', { $ifNull: ['$session.topic', ''] }] },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
                {
                    $match: {
                        sessionStatusKey: 'completed',
                        sessionProgramKey: { $in: programKeys },
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'learnerId',
                        foreignField: '_id',
                        as: 'learner',
                    },
                },
                { $unwind: { path: '$learner', preserveNullAndEmptyArrays: true } },
                { $sort: { submittedAt: -1, createdAt: -1 } },
                {
                    $group: {
                        _id: '$sessionProgramKey',
                        averageRating: { $avg: '$rating' },
                        totalReviews: { $sum: 1 },
                        recommendCount: {
                            $sum: {
                                $cond: [{ $eq: ['$wouldRecommend', true] }, 1, 0],
                            },
                        },
                        recentReviews: {
                            $push: {
                                rating: '$rating',
                                writtenReview: '$writtenReview',
                                isAnonymous: '$isAnonymous',
                                submittedAt: '$submittedAt',
                                learnerFirstName: '$learner.firstName',
                                learnerLastName: '$learner.lastName',
                            },
                        },
                    },
                },
            ]);

            reputationByKey = new Map(
                reputationRows.map((row) => [
                    row._id,
                    {
                        averageRating: Number(row.averageRating || 0),
                        totalReviews: Number(row.totalReviews || 0),
                        recommendationRate:
                            row.totalReviews > 0 ? Math.round((row.recommendCount / row.totalReviews) * 100) : 0,
                        recentReviews: (row.recentReviews || []).slice(0, 2),
                    },
                ])
            );
        }

        // Apply 25% platform fee markup for display (only for paid skills)
        const displaySkills = skills.map(skill => {
            const skillObj = skill.toObject();
            if (skill.type === 'paid' && skill.price > 0) {
                skillObj.displayPrice = Math.round(skill.price * 1.25 * 100) / 100; // Round to 2 decimal places
                skillObj.basePrice = skill.price;
                skillObj.platformFee = Math.round(skill.price * 0.25 * 100) / 100;
            } else {
                skillObj.displayPrice = 0;
                skillObj.basePrice = 0;
                skillObj.platformFee = 0;
            }

            // Add reputation data (existing logic)
            const repKey = toProgramKey(skillObj.mentor?._id, skillObj.title || skillObj.name);
            const rep = reputationByKey.get(repKey);
            skillObj.averageRating = rep ? rep.averageRating : 0;
            skillObj.recommendationRate = rep ? rep.recommendationRate : 0;
            skillObj.totalReviews = rep ? rep.totalReviews : 0;
            skillObj.recentReviews = rep ? rep.recentReviews : [];

            return skillObj;
        });

        res.status(200).json({
            success: true,
            count: displaySkills.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: displaySkills
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get mentor's own skills
exports.getMySkills = async (req, res) => {
    try {
        const skills = await Skill.find({ mentor: req.user._id });
        res.status(200).json({
            success: true,
            data: skills
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Update a skill
exports.updateSkill = async (req, res) => {
    try {
        const skill = await Skill.findById(req.params.id);
        if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });

        if (skill.mentor.toString() !== req.user._id.toString()) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const updatedSkill = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.status(200).json({ success: true, data: updatedSkill });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete a skill
exports.deleteSkill = async (req, res) => {
    try {
        const skill = await Skill.findById(req.params.id);
        if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });

        if (skill.mentor.toString() !== req.user._id.toString()) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        await skill.deleteOne();
        res.status(200).json({ success: true, message: 'Skill deleted' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
