const communityService = require('./community.service');
const { validationResult } = require('express-validator');

/**
 * Community Controller
 * Handles Q&A platform operations
 */

/**
 * @route   POST /api/questions
 * @desc    Create a question
 * @access  Private
 */
exports.createQuestion = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        let parsedTags = [];
        if (req.body.tags) {
            try {
                parsedTags = Array.isArray(req.body.tags)
                    ? req.body.tags
                    : JSON.parse(req.body.tags || '[]');
            } catch (parseError) {
                return res.status(400).json({
                    success: false,
                    message: 'Tags must be a valid JSON array'
                });
            }
        }

        const images = req.files ? req.files.map(file => ({
            url: `/uploads/community/${file.filename}`,
            filePath: file.path,
            caption: (req.body.title || '').trim()
        })) : [];

        const questionData = {
            ...req.body,
            author: req.user._id,
            images,
            title: (req.body.title || '').trim(),
            body: (req.body.body || '').trim(),
            tags: parsedTags
        };

        const question = await communityService.createQuestion(questionData);

        res.status(201).json({
            success: true,
            message: 'Question posted successfully',
            data: question
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/questions
 * @desc    Get all questions with filters
 * @access  Public
 */
exports.getQuestions = async (req, res, next) => {
    try {
        const filters = {
            status: req.query.status,
            subject: req.query.subject,
            topicChannel: req.query.topicChannel,
            tags: req.query.tags,
            search: req.query.search,
            authorId: req.query.authorId
        };

        const options = {
            page: req.query.page,
            limit: req.query.limit,
            sort: req.query.sort
        };

        const result = await communityService.getQuestions(filters, options);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/questions/suggestions/trending
 * @desc    Get globally trending questions
 * @access  Public
 */
exports.getTrendingSuggestions = async (req, res, next) => {
    try {
        const questions = await communityService.getTrendingSuggestions({
            limit: req.query.limit,
            windowDays: req.query.windowDays
        });

        res.json({
            success: true,
            data: questions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/questions/suggestions/personalized
 * @desc    Get personalized question suggestions for authenticated user
 * @access  Private
 */
exports.getPersonalizedSuggestions = async (req, res, next) => {
    try {
        const questions = await communityService.getPersonalizedSuggestions(req.user._id.toString(), {
            limit: req.query.limit,
            windowDays: req.query.windowDays
        });

        res.json({
            success: true,
            data: questions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/questions/:id
 * @desc    Get question by ID
 * @access  Public
 */
exports.getQuestion = async (req, res, next) => {
    try {
        const result = await communityService.getQuestionById(req.params.id, true);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/questions/:id
 * @desc    Update question
 * @access  Private (Author only)
 */
exports.updateQuestion = async (req, res, next) => {
    try {
        const question = await communityService.updateQuestion(
            req.params.id,
            req.user._id.toString(),
            req.body
        );

        res.json({
            success: true,
            message: 'Question updated successfully',
            data: question
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/questions/:id
 * @desc    Delete question
 * @access  Private (Author only)
 */
exports.deleteQuestion = async (req, res, next) => {
    try {
        const result = await communityService.deleteQuestion(
            req.params.id,
            req.user._id.toString()
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/questions/:id/vote
 * @desc    Vote on question
 * @access  Private
 */
exports.voteQuestion = async (req, res, next) => {
    try {
        const { voteType } = req.body;

        const question = await communityService.voteQuestion(
            req.params.id,
            req.user._id.toString(),
            voteType
        );

        res.json({
            success: true,
            message: 'Vote recorded',
            data: question
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/questions/:id/follow
 * @desc    Follow/Unfollow question
 * @access  Private
 */
exports.toggleFollowQuestion = async (req, res, next) => {
    try {
        const question = await communityService.toggleFollowQuestion(
            req.params.id,
            req.user._id.toString()
        );

        res.json({
            success: true,
            message: question.followers.some(id => id.toString() === req.user?._id?.toString()) ? 'Followed' : 'Unfollowed',
            data: question
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/questions/:id/comments
 * @desc    Add comment to question
 * @access  Private
 */
exports.addQuestionComment = async (req, res, next) => {
    try {
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        const question = await communityService.addQuestionComment(
            req.params.id,
            req.user._id.toString(),
            text
        );

        res.json({
            success: true,
            message: 'Comment added to question',
            data: question
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/answers
 * @desc    Post an answer
 * @access  Private
 */
exports.createAnswer = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const answerData = {
            ...req.body,
            author: req.user._id
        };

        const answer = await communityService.createAnswer(answerData);

        res.status(201).json({
            success: true,
            message: 'Answer posted successfully',
            data: answer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/answers/:id
 * @desc    Update answer
 * @access  Private (Author only)
 */
exports.updateAnswer = async (req, res, next) => {
    try {
        const answer = await communityService.updateAnswer(
            req.params.id,
            req.user._id.toString(),
            req.body
        );

        res.json({
            success: true,
            message: 'Answer updated successfully',
            data: answer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/answers/:id
 * @desc    Delete answer
 * @access  Private (Author only)
 */
exports.deleteAnswer = async (req, res, next) => {
    try {
        const result = await communityService.deleteAnswer(
            req.params.id,
            req.user._id.toString()
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/answers/:id/vote
 * @desc    Vote on answer
 * @access  Private
 */
exports.voteAnswer = async (req, res, next) => {
    try {
        const { voteType } = req.body;

        const answer = await communityService.voteAnswer(
            req.params.id,
            req.user._id.toString(),
            voteType
        );

        res.json({
            success: true,
            message: 'Vote recorded',
            data: answer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/answers/:id/accept
 * @desc    Accept an answer
 * @access  Private (Question author only)
 */
exports.acceptAnswer = async (req, res, next) => {
    try {
        const answer = await communityService.acceptAnswer(
            req.params.id,
            req.user._id.toString()
        );

        res.json({
            success: true,
            message: 'Answer accepted',
            data: answer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/answers/:id/comments
 * @desc    Add comment to answer
 * @access  Private
 */
exports.addComment = async (req, res, next) => {
    try {
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        const answer = await communityService.addComment(
            req.params.id,
            req.user._id.toString(),
            text
        );

        res.json({
            success: true,
            message: 'Comment added',
            data: answer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/community/flag
 * @desc    Flag content
 * @access  Private
 */
exports.flagContent = async (req, res, next) => {
    try {
        const { contentType, contentId, reason } = req.body;

        const content = await communityService.flagContent(
            contentType,
            contentId,
            req.user._id.toString(),
            reason
        );

        res.json({
            success: true,
            message: 'Content flagged for review',
            data: content
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/answers/:id/hide
 * @desc    Toggle hide answer (Moderation)
 * @access  Private (Question Author or Admin)
 */
exports.toggleHideAnswer = async (req, res, next) => {
    try {
        const answer = await communityService.hideAnswer(
            req.params.id,
            req.user._id.toString(),
            req.user.role
        );

        res.json({
            success: true,
            message: answer.isHidden ? 'Answer hidden' : 'Answer restored',
            data: answer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/questions/:id/create-session
 * @desc    Initialize session from community post with mentor-provided details
 * @access  Private (Mentor/Professional only)
 */
exports.createSessionFromPost = async (req, res, next) => {
    try {
        const sessionFormData = {
            topic: req.body.topic,
            description: req.body.description,
            scheduledDate: req.body.scheduledDate,
            duration: req.body.duration,
            sessionType: req.body.sessionType,
            amount: req.body.amount
        };

        const sessionData = await communityService.createSessionFromPost(
            req.params.id,
            req.user._id.toString(),
            sessionFormData
        );

        res.json({
            success: true,
            message: 'Session created from post',
            data: sessionData
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/community/flagged
 * @desc    Get all flagged questions and answers
 * @access  Private (Admin only)
 */
exports.getFlaggedContent = async (req, res, next) => {
    try {
        const [questions, answers] = await Promise.all([
            communityService.getFlaggedQuestions(),
            communityService.getFlaggedAnswers()
        ]);

        res.json({
            success: true,
            data: { questions, answers }
        });
    } catch (error) {
        next(error);
    }
};
