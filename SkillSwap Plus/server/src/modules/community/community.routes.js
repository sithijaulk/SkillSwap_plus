const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const communityController = require('./community.controller');
const auth = require('../../middleware/auth.middleware');
const { isLearnerOrMentor, isAdmin } = require('../../middleware/role.middleware');
const upload = require('../../middleware/upload.middleware');

const allowedSubjects = [
    'mathematics',
    'physics',
    'chemistry',
    'biology',
    'programming',
    'languages',
    'engineering',
    'business',
    'arts',
    'other'
];

const allowedTopicChannels = [
    'General',
    'Academic Support',
    'Skill Exchange',
    'Career Guidance',
    'Project Collaboration',
    'Research Discussion',
    'Exam Prep',
    'Student Life'
];

/**
 * ===========================
 * QUESTION ROUTES
 * ===========================
 */

// Create question
router.post('/questions', auth, upload.array('images', 5), [
    body('title')
        .trim()
        .isLength({ min: 10, max: 200 })
        .withMessage('Title must be 10-200 characters'),
    body('body')
        .trim()
        .isLength({ min: 20, max: 2000 })
        .withMessage('Question must be 20-2000 characters'),
    body('subject')
        .notEmpty()
        .withMessage('Subject is required')
        .bail()
        .isIn(allowedSubjects)
        .withMessage('Invalid subject'),
    body('topicChannel')
        .optional()
        .isIn(allowedTopicChannels)
        .withMessage('Invalid topic channel'),
    body('tags')
        .optional()
        .custom((value) => {
            if (Array.isArray(value)) {
                return true;
            }

            if (typeof value === 'string') {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    return true;
                }
            }

            throw new Error('Tags must be an array');
        })
], communityController.createQuestion);

// Get all questions
router.get('/questions', communityController.getQuestions);

// Suggestion feeds
router.get('/questions/suggestions/trending', communityController.getTrendingSuggestions);
router.get('/questions/suggestions/personalized', auth, communityController.getPersonalizedSuggestions);

// Get question by ID
router.get('/questions/:id', communityController.getQuestion);

// Update question
router.put('/questions/:id', auth, communityController.updateQuestion);

// Delete question
router.delete('/questions/:id', auth, communityController.deleteQuestion);

// Mentor: Create session from post
router.post('/questions/:id/create-session', auth, communityController.createSessionFromPost);

// Vote on question
router.post('/questions/:id/vote', auth, [
    body('voteType').isIn(['upvote', 'downvote', 'remove']).withMessage('Invalid vote type')
], communityController.voteQuestion);

// Follow question
router.post('/questions/:id/follow', auth, communityController.toggleFollowQuestion);

// Add comment to question
router.post('/questions/:id/comments', auth, [
    body('text').trim().isLength({ min: 1, max: 300 }).withMessage('Comment must be 1-300 characters')
], communityController.addQuestionComment);

/**
 * ===========================
 * ANSWER ROUTES
 * ===========================
 */

// Create answer (direct, requires question ID in body)
router.post('/answers', auth, [
    body('question').notEmpty().withMessage('Question ID is required'),
    body('body').trim().notEmpty().withMessage('Answer is required').isLength({ max: 2000 }).withMessage('Answer cannot exceed 2000 characters')
], communityController.createAnswer);

// Create answer (via question ID in URL — frontend shortcut)
router.post('/questions/:id/answers', auth, [
    body('body').trim().notEmpty().withMessage('Answer is required').isLength({ max: 2000 }).withMessage('Answer cannot exceed 2000 characters')
], (req, res, next) => {
    req.body.question = req.params.id;
    communityController.createAnswer(req, res, next);
});

// Update answer
router.put('/answers/:id', auth, communityController.updateAnswer);

// Delete answer
router.delete('/answers/:id', auth, communityController.deleteAnswer);

// Vote on answer
router.post('/answers/:id/vote', auth, [
    body('voteType').isIn(['upvote', 'downvote', 'remove']).withMessage('Invalid vote type')
], communityController.voteAnswer);

// Accept answer
router.post('/answers/:id/accept', auth, communityController.acceptAnswer);

// Add comment to answer
router.post('/answers/:id/comments', auth, [
    body('text').trim().isLength({ min: 1, max: 300 }).withMessage('Comment must be 1-300 characters')
], communityController.addComment);

// Moderation: Hide answer
router.put('/answers/:id/hide', auth, communityController.toggleHideAnswer);

/**
 * ===========================
 * MODERATION ROUTES
 * ===========================
 */

// Get all flagged content
router.get('/admin/community/flagged', auth, isAdmin, communityController.getFlaggedContent);

// Flag content
router.post('/community/flag', auth, [
    body('contentType').isIn(['question', 'answer']).withMessage('Invalid content type'),
    body('contentId').notEmpty().withMessage('Content ID is required'),
    body('reason').trim().notEmpty().withMessage('Reason is required')
], communityController.flagContent);

module.exports = router;
