const Skill = require('./skill.model');
const User = require('./user.model');
const PostSessionFeedback = require('./postSessionFeedback.model');

// Create a new skill
exports.createSkill = async (req, res) => {
    try {
        // Accept both title and legacy name field, but store as title
        const { title, name, description, category, price, type, requiredKnowledge, materials } = req.body;

        console.log('User in req:', req.user);
        const payload = {
            mentor: req.user._id.toString(),
            title: title || name,
            description,
            category,
            price,
            type,
            requiredKnowledge,
            materials
        };
        console.log('Skill creation payload:', payload);
        const skill = await Skill.create(payload);
        console.log('Skill created successfully:', skill._id);

        res.status(201).json({
            success: true,
            data: skill
        });
    } catch (error) {
        console.error('CRITICAL: Skill Creation Failed!', error);
        res.status(400).json({
            success: false,
            message: error.message,
            stack: error.stack
        });
    }
};

// Get all skills (public) with filters
exports.getSkills = async (req, res) => {
    try {
        const { search, category, sort } = req.query;
        let query = { isActive: true };

        if (category && category !== 'all') {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        let sortOption = { createdAt: -1 };
        if (sort === 'price_low') sortOption = { price: 1 };
        if (sort === 'price_high') sortOption = { price: -1 };
        // Note: For 'top_rated' we sort by mentor.averageRating, but find() doesn't sort by populated fields easily.
        // For now, we'll implement price and newest, and top_rated will be handled as default newest or a separate logic.

        const skills = await Skill.find(query)
            .populate('mentor', 'firstName lastName university averageRating')
            .sort(sortOption);

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

        const skillKeys = skills
            .map((s) => normalizeKey(s.title || s.name))
            .filter(Boolean);

        let reputationByKey = new Map();
        if (skillKeys.length > 0) {
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
                { $match: { 'session.status': 'completed' } },
                {
                    $addFields: {
                        sessionSkillKey: {
                            $toLower: {
                                $trim: {
                                    input: { $ifNull: ['$session.skill', ''] },
                                },
                            },
                        },
                    },
                },
                { $match: { sessionSkillKey: { $in: skillKeys } } },
                {
                    $group: {
                        _id: '$sessionSkillKey',
                        averageRating: { $avg: '$rating' },
                        totalReviews: { $sum: 1 },
                        recommendCount: {
                            $sum: {
                                $cond: [{ $eq: ['$wouldRecommend', true] }, 1, 0],
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
                    },
                ])
            );
        }

        // Apply 25% platform fee markup for display
        const displaySkills = skills.map(skill => {
            const skillObj = skill.toObject();
            if (skill.type === 'Buy Now') {
                skillObj.displayPrice = skill.price * 1.25;
            }

            const repKey = normalizeKey(skillObj.title || skillObj.name);
            const rep = reputationByKey.get(repKey);
            skillObj.averageRating = rep ? rep.averageRating : 0;
            skillObj.recommendationRate = rep ? rep.recommendationRate : 0;
            skillObj.totalReviews = rep ? rep.totalReviews : 0;

            return skillObj;
        });

        res.status(200).json({
            success: true,
            count: displaySkills.length,
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
