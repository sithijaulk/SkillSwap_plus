const mongoose = require('mongoose');
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
        if (sort === 'top_rated') {
            sortOption = { 'mentor.averageRating': -1 };
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const skillDocs = await Skill.find(query)
            .populate('mentor', 'firstName lastName university department yearOfStudy averageRating totalRatings profileImage')
            .sort(sortOption);

        const embeddedPipeline = [
            { $match: { role: 'mentor', isActive: true } },
            { $unwind: '$skills' },
            { $match: { 'skills.isActive': true } }
        ];

        if (mentorId) {
            embeddedPipeline.splice(1, 0, { $match: { _id: mongoose.Types.ObjectId(mentorId) } });
        }

        if (category && category !== 'all') {
            embeddedPipeline.push({ $match: { 'skills.category': category } });
        }

        if (type && type !== 'all') {
            if (type === 'free') {
                embeddedPipeline.push({ $match: { 'skills.hourlyRate': 0 } });
            } else if (type === 'paid') {
                embeddedPipeline.push({ $match: { 'skills.hourlyRate': { $gt: 0 } } });
            }
        }

        if (minPrice || maxPrice) {
            if (minPrice) {
                embeddedPipeline.push({ $match: { 'skills.hourlyRate': { $gte: parseFloat(minPrice) } } });
            }
            if (maxPrice) {
                embeddedPipeline.push({ $match: { 'skills.hourlyRate': { $lte: parseFloat(maxPrice) } } });
            }
        }

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            embeddedPipeline.push({
                $match: {
                    $or: [
                        { 'skills.name': searchRegex },
                        { 'skills.description': searchRegex },
                        { 'skills.category': searchRegex },
                        { 'skills.tags': searchRegex },
                        { firstName: searchRegex },
                        { lastName: searchRegex }
                    ]
                }
            });
        }

        embeddedPipeline.push({
            $project: {
                _id: '$skills._id',
                title: '$skills.name',
                description: '$skills.description',
                category: '$skills.category',
                level: '$skills.level',
                type: {
                    $cond: [{ $gt: ['$skills.hourlyRate', 0] }, 'paid', 'free']
                },
                price: '$skills.hourlyRate',
                tags: '$skills.tags',
                image: '$skills.image',
                requiredKnowledge: '$skills.requiredKnowledge',
                materials: '$skills.materials',
                isActive: '$skills.isActive',
                createdAt: '$skills.createdAt',
                mentor: {
                    _id: '$_id',
                    firstName: '$firstName',
                    lastName: '$lastName',
                    university: '$university',
                    department: '$department',
                    yearOfStudy: '$yearOfStudy',
                    averageRating: '$averageRating',
                    totalRatings: '$totalRatings',
                    profileImage: '$profileImage'
                }
            }
        });

        const embeddedSkills = await User.aggregate(embeddedPipeline);

        let skills = skillDocs.map(skill => skill.toObject());
        skills = [...skills, ...embeddedSkills];

        const sortCombinedSkills = (list) => {
            if (sort === 'price_low') {
                return list.sort((a, b) => (a.price || 0) - (b.price || 0));
            }
            if (sort === 'price_high') {
                return list.sort((a, b) => (b.price || 0) - (a.price || 0));
            }
            if (sort === 'top_rated') {
                return list.sort((a, b) => (b.mentor?.averageRating || 0) - (a.mentor?.averageRating || 0));
            }
            return list.sort((a, b) => new Date(b.createdAt || b.updatedAt || Date.now()) - new Date(a.createdAt || a.updatedAt || Date.now()));
        };

        skills = sortCombinedSkills(skills);

        const total = skills.length;
        const pagedSkills = skills.slice(skip, skip + parseInt(limit));

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
                        allReviews: row.recentReviews || [],
                        recentReviews: (row.recentReviews || []).slice(0, 2),
                    },
                ])
            );
        }

        // Apply 25% platform fee markup for display (only for paid skills)
        const displaySkills = pagedSkills.map(skill => {
            const skillObj = typeof skill.toObject === 'function' ? skill.toObject() : { ...skill };
            if (skillObj.type === 'paid' && skillObj.price > 0) {
                skillObj.displayPrice = Math.round(skillObj.price * 1.25 * 100) / 100; // Round to 2 decimal places
                skillObj.basePrice = skillObj.price;
                skillObj.platformFee = Math.round(skillObj.price * 0.25 * 100) / 100;
            } else {
                skillObj.displayPrice = 0;
                skillObj.basePrice = 0;
                skillObj.platformFee = 0;
                if (!skillObj.type) {
                    skillObj.type = 'free';
                }
            }

            // Add reputation data (existing logic)
            const repKey = toProgramKey(skillObj.mentor?._id, skillObj.title || skillObj.name);
            const rep = reputationByKey.get(repKey);
            skillObj.averageRating = rep ? rep.averageRating : 0;
            skillObj.recommendationRate = rep ? rep.recommendationRate : 0;
            skillObj.totalReviews = rep ? rep.totalReviews : 0;
            skillObj.allReviews = rep ? rep.allReviews : [];
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

// Get a specific skill by ID
exports.getSkill = async (req, res) => {
    try {
        let skill = await Skill.findById(req.params.id).populate('mentor', 'firstName lastName university department yearOfStudy averageRating totalRatings profileImage');
        let skillObj = null;

        if (!skill) {
            const user = await User.findOne({ 'skills._id': req.params.id }).select('firstName lastName university department yearOfStudy averageRating totalRatings profileImage skills');
            if (user) {
                const embedded = user.skills.id(req.params.id);
                if (embedded) {
                    skillObj = {
                        _id: embedded._id,
                        title: embedded.name,
                        description: embedded.description,
                        category: embedded.category,
                        type: embedded.hourlyRate > 0 ? 'paid' : 'free',
                        price: embedded.hourlyRate,
                        tags: embedded.tags,
                        image: embedded.image,
                        requiredKnowledge: embedded.requiredKnowledge || '',
                        materials: embedded.materials || [],
                        mentor: {
                            _id: user._id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            university: user.university,
                            department: user.department,
                            yearOfStudy: user.yearOfStudy,
                            averageRating: user.averageRating,
                            totalRatings: user.totalRatings,
                            profileImage: user.profileImage
                        }
                    };
                }
            }
        }

        if (!skill && !skillObj) {
            return res.status(404).json({
                success: false,
                message: 'Skill not found'
            });
        }

        if (!skillObj) {
            skillObj = skill.toObject();
        }

        if (skillObj.type === 'paid' && skillObj.price > 0) {
            skillObj.displayPrice = Math.round(skillObj.price * 1.25 * 100) / 100;
            skillObj.basePrice = skillObj.price;
            skillObj.platformFee = Math.round(skillObj.price * 0.25 * 100) / 100;
        } else {
            skillObj.displayPrice = 0;
            skillObj.basePrice = 0;
            skillObj.platformFee = 0;
            if (!skillObj.type) {
                skillObj.type = 'free';
            }
        }

        res.status(200).json({
            success: true,
            data: skillObj
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
        const skillDocs = await Skill.find({ mentor: req.user._id }).sort({ createdAt: -1 });
        const user = await User.findById(req.user._id).select('skills');
        const embeddedSkills = (user?.skills || [])
            .filter(skill => skill.isActive)
            .map(skill => ({
                _id: skill._id,
                title: skill.name,
                description: skill.description,
                category: skill.category,
                level: skill.level,
                type: skill.hourlyRate > 0 ? 'paid' : 'free',
                price: skill.hourlyRate,
                tags: skill.tags,
                image: skill.image,
                requiredKnowledge: skill.requiredKnowledge || '',
                materials: skill.materials || [],
                isActive: skill.isActive,
                createdAt: skill.createdAt,
                mentor: req.user._id
            }));

        const combinedSkills = [...skillDocs.map(skill => skill.toObject()), ...embeddedSkills];

        res.status(200).json({
            success: true,
            data: combinedSkills
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
        const skillId = req.params.skillId || req.params.id;
        let skill = await Skill.findById(skillId);
        if (skill) {
            if (skill.mentor.toString() !== req.user._id.toString()) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }
            const updatedSkill = await Skill.findByIdAndUpdate(skillId, req.body, { new: true, runValidators: true });
            return res.status(200).json({ success: true, data: updatedSkill });
        }

        // Fallback to legacy embedded user skills
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const embeddedSkill = user.skills.id(skillId);
        if (!embeddedSkill) return res.status(404).json({ success: false, message: 'Skill not found' });

        if (req.body.title !== undefined) embeddedSkill.name = req.body.title;
        if (req.body.description !== undefined) embeddedSkill.description = req.body.description;
        if (req.body.category !== undefined) embeddedSkill.category = req.body.category;
        if (req.body.level !== undefined) embeddedSkill.level = req.body.level;
        if (req.body.price !== undefined) embeddedSkill.hourlyRate = req.body.price;
        if (req.body.tags !== undefined) embeddedSkill.tags = Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags];
        if (req.body.image !== undefined) embeddedSkill.image = req.body.image;
        if (req.body.requiredKnowledge !== undefined) embeddedSkill.requiredKnowledge = req.body.requiredKnowledge;
        if (req.body.materials !== undefined) embeddedSkill.materials = req.body.materials;
        if (req.body.isActive !== undefined) embeddedSkill.isActive = !!req.body.isActive;

        await user.save();

        res.status(200).json({ success: true, data: embeddedSkill });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete a skill
exports.deleteSkill = async (req, res) => {
    try {
        const skillId = req.params.skillId || req.params.id;
        let skill = await Skill.findById(skillId);
        if (skill) {
            if (skill.mentor.toString() !== req.user._id.toString()) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }
            await skill.deleteOne();
            return res.status(200).json({ success: true, message: 'Skill deleted' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const embeddedSkill = user.skills.id(skillId);
        if (!embeddedSkill) return res.status(404).json({ success: false, message: 'Skill not found' });

        embeddedSkill.remove();
        await user.save();

        res.status(200).json({ success: true, message: 'Skill deleted' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
