const Question = require('./question.model');
const Answer = require('./answer.model');
const User = require('../user/user.model');
// Session model used by createSessionFromPost to convert community questions into mentoring sessions
const Session = require('../user/session.model');

/**
 * Community Service Layer
 * Business logic for Q&A platform
 */

class CommunityService {
    /**
     * Create a new question
     */
    async createQuestion(questionData) {
        const question = new Question(questionData);
        await question.save();
        await question.populate('author', 'firstName lastName role averageRating');
        return question;
    }//Helper function to create a session from a community post (for mentors)

    /**
     * Get questions with filtering and pagination
     */
    async getQuestions(filters = {}, options = {}) {
        const query = {};

        // Filter by status
        if (filters.status) {
            query.status = filters.status;
        }

        // Filter by subject
        if (filters.subject) {
            query.subject = filters.subject;
        }

        // Filter by topic channel
        if (filters.topicChannel) {
            query.topicChannel = filters.topicChannel;
        }

        // Filter by tags
        if (filters.tags) {
            query.tags = { $in: Array.isArray(filters.tags) ? filters.tags : [filters.tags] };
        }

        // Filter by author
        if (filters.authorId) {
            query.author = filters.authorId;
        }

        // Search in title/body
        if (filters.search) {
            query.$text = { $search: filters.search };
        }

        // Pagination
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 20;
        const skip = (page - 1) * limit;

        // Sorting
        let sort = { createdAt: -1 }; // Default: newest first
        if (options.sort === 'votes') {
            sort = { voteScore: -1, createdAt: -1 };
        } else if (options.sort === 'views') {
            sort = { views: -1, createdAt: -1 };
        } else if (options.sort === 'answers') {
            sort = { answerCount: -1, createdAt: -1 };
        }

        const questions = await Question.find(query)
            .populate('author', 'firstName lastName role averageRating')
            .populate('acceptedAnswer')
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const total = await Question.countDocuments(query);

        return {
            questions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get question by ID with answers
     */
    async getQuestionById(questionId, incrementView = true) {
        const question = await Question.findById(questionId)
            .populate('author', 'firstName lastName role averageRating')
            .populate('comments.author', 'firstName lastName')
            .populate('acceptedAnswer');

        if (!question) {
            throw new Error('Question not found');
        }

        // Increment view count
        if (incrementView) {
            question.views += 1;
            await question.save();
        }

        // Get answers
        const answers = await Answer.find({ question: questionId })
            .populate('author', 'firstName lastName role averageRating')
            .populate('comments.author', 'firstName lastName')
            .sort({ isAccepted: -1, voteScore: -1 });

        return {
            question,
            answers
        };
    }

    /**
     * Update question
     */
    async updateQuestion(questionId, userId, updateData) {
        const question = await Question.findById(questionId);

        if (!question) {
            throw new Error('Question not found');
        }

        // Check authorization
        if (question.author.toString() !== userId) {
            throw new Error('Unauthorized to edit this question');
        }

        // Save to edit history
        if (updateData.title || updateData.body) {
            question.editHistory.push({
                editedBy: userId,
                previousTitle: question.title,
                previousBody: question.body
            });
            question.editedAt = new Date();
        }

        // Update fields
        Object.assign(question, updateData);
        await question.save();

        return question;
    }

    /**
     * Delete question
     */
    async deleteQuestion(questionId, userId) {
        const question = await Question.findById(questionId);

        if (!question) {
            throw new Error('Question not found');
        }

        if (question.author.toString() !== userId) {
            throw new Error('Unauthorized to delete this question');
        }

        // Delete associated answers
        await Answer.deleteMany({ question: questionId });

        await question.deleteOne();

        return { message: 'Question deleted successfully' };
    }

    /**
     * Vote on question
     */
    async voteQuestion(questionId, userId, voteType) {
        const question = await Question.findById(questionId);

        if (!question) {
            throw new Error('Question not found');
        }

        // Remove previous votes
        question.upvotes = question.upvotes.filter(id => id.toString() !== userId);
        question.downvotes = question.downvotes.filter(id => id.toString() !== userId);

        // Add new vote
        if (voteType === 'upvote') {
            question.upvotes.push(userId);
        } else if (voteType === 'downvote') {
            question.downvotes.push(userId);
        }
        // If voteType is 'remove', just removed above

        await question.save();
        return question;
    }

    /**
     * Follow/Unfollow question
     */
    async toggleFollowQuestion(questionId, userId) {
        const question = await Question.findById(questionId);

        if (!question) {
            throw new Error('Question not found');
        }

        const isFollowing = question.followers.some(id => id.toString() === userId);

        if (isFollowing) {
            question.followers = question.followers.filter(id => id.toString() !== userId);
        } else {
            question.followers.push(userId);
        }

        await question.save();
        return question;
    }

    /**
     * Create an answer
     */
    async createAnswer(answerData) {
        // Verify question exists
        const question = await Question.findById(answerData.question);
        if (!question) {
            throw new Error('Question not found');
        }

        const answer = new Answer(answerData);
        await answer.save();

        // Update question answer count
        question.answerCount += 1;
        if (question.status === 'open') {
            question.status = 'answered';
        }
        await question.save();

        await answer.populate('author', 'firstName lastName role averageRating');

        return answer;
    }

    /**
     * Update answer
     */
    async updateAnswer(answerId, userId, updateData) {
        const answer = await Answer.findById(answerId);

        if (!answer) {
            throw new Error('Answer not found');
        }

        if (answer.author.toString() !== userId) {
            throw new Error('Unauthorized to edit this answer');
        }

        // Save to edit history
        if (updateData.body) {
            answer.editHistory.push({
                editedBy: userId,
                previousBody: answer.body
            });
            answer.editedAt = new Date();
        }

        Object.assign(answer, updateData);
        await answer.save();

        return answer;
    }

    /**
     * Delete answer
     */
    async deleteAnswer(answerId, userId) {
        const answer = await Answer.findById(answerId);

        if (!answer) {
            throw new Error('Answer not found');
        }

        if (answer.author.toString() !== userId) {
            throw new Error('Unauthorized to delete this answer');
        }

        const questionId = answer.question;

        await answer.deleteOne();

        // Update question answer count
        await Question.findByIdAndUpdate(questionId, {
            $inc: { answerCount: -1 }
        });

        return { message: 'Answer deleted successfully' };
    }

    /**
     * Vote on answer
     */
    async voteAnswer(answerId, userId, voteType) {
        const answer = await Answer.findById(answerId);

        if (!answer) {
            throw new Error('Answer not found');
        }

        // Remove previous votes
        answer.upvotes = answer.upvotes.filter(id => id.toString() !== userId);
        answer.downvotes = answer.downvotes.filter(id => id.toString() !== userId);

        // Add new vote
        if (voteType === 'upvote') {
            answer.upvotes.push(userId);
        } else if (voteType === 'downvote') {
            answer.downvotes.push(userId);
        }

        await answer.save();
        return answer;
    }

    /**
     * Accept an answer
     */
    async acceptAnswer(answerId, userId) {
        const answer = await Answer.findById(answerId);

        if (!answer) {
            throw new Error('Answer not found');
        }

        const question = await Question.findById(answer.question);

        if (!question) {
            throw new Error('Question not found');
        }

        // Only question author can accept
        if (question.author.toString() !== userId) {
            throw new Error('Only question author can accept answers');
        }

        // Remove previous accepted answer
        if (question.acceptedAnswer) {
            await Answer.findByIdAndUpdate(question.acceptedAnswer, {
                isAccepted: false,
                acceptedAt: null
            });
        }

        // Accept this answer
        answer.isAccepted = true;
        answer.acceptedAt = new Date();
        await answer.save();

        question.acceptedAnswer = answerId;
        await question.save();

        return answer;
    }

    /**
     * Add comment to answer
     */
    async addComment(answerId, userId, text) {
        const answer = await Answer.findById(answerId);

        if (!answer) {
            throw new Error('Answer not found');
        }

        answer.comments.push({
            author: userId,
            text,
            createdAt: new Date()
        });

        await answer.save();
        await answer.populate('comments.author', 'firstName lastName');

        return answer;
    }

    /**
     * Add comment to question
     */
    async addQuestionComment(questionId, userId, text) {
        const question = await Question.findById(questionId);

        if (!question) {
            throw new Error('Question not found');
        }

        question.comments.push({
            author: userId,
            text,
            createdAt: new Date()
        });

        await question.save();
        await question.populate('comments.author', 'firstName lastName');

        return question;
    }

    /**
     * Flag content (question or answer)
     */
    async flagContent(contentType, contentId, userId, reason) {
        let content;

        if (contentType === 'question') {
            content = await Question.findById(contentId);
        } else if (contentType === 'answer') {
            content = await Answer.findById(contentId);
        } else {
            throw new Error('Invalid content type');
        }

        if (!content) {
            throw new Error('Content not found');
        }

        // Add flag
        content.flagReasons.push({
            user: userId,
            reason,
            flaggedAt: new Date()
        });

        content.isFlagged = true;
        await content.save();

        return content;
    }

    /**
     * Hide an answer (moderation by question owner)
     */
    async hideAnswer(answerId, userId, userRole) {
        const answer = await Answer.findById(answerId).populate('question');
        if (!answer) throw new Error('Answer not found');

        // Only question owner or admin can hide answers
        const isOwner = answer.question.author.toString() === userId;
        const isAdmin = userRole === 'admin';

        if (!isOwner && !isAdmin) {
            throw new Error('Unauthorized to moderate this answer');
        }

        answer.isHidden = !answer.isHidden; // Toggle
        await answer.save();
        return answer;
    }

    /**
     * Create a real mentoring session from a community post (Mentor/Professional).
     * Accepts form data: topic, description, scheduledDate, duration, sessionType, amount.
     */
    async createSessionFromPost(postId, mentorId, sessionFormData = {}) {
        const question = await Question.findById(postId);
        if (!question) throw new Error('Post not found');

        const mentor = await User.findById(mentorId);
        if (!mentor || !['mentor', 'professional'].includes(mentor.role)) {
            throw new Error('Only mentors or professionals can create sessions from posts');
        }

        const learner = await User.findById(question.author);
        if (!learner) {
            throw new Error('Question author was not found');
        }

        if (learner._id.toString() === mentorId.toString()) {
            throw new Error('You cannot create a session from your own question');
        }

        const existingSession = await Session.findOne({
            sourcePost: question._id,
            mentor: mentorId,
            status: { $nin: ['cancelled'] }
        })
            .populate('learner mentor', '-password')
            .sort({ createdAt: -1 });

        if (existingSession) {
            return existingSession;
        }

        // Parse form data or use defaults
        const topic = sessionFormData.topic || `Mentoring: ${question.title}`;
        const description = sessionFormData.description || `Session created from community question: ${question.title}`;
        const duration = sessionFormData.duration || 60;
        const sessionType = sessionFormData.sessionType || 'skill_exchange';
        const amount = sessionFormData.amount || 0;

        // Use provided scheduledDate or calculate default
        let scheduledDate;
        if (sessionFormData.scheduledDate) {
            scheduledDate = new Date(sessionFormData.scheduledDate);
        } else {
            scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() + 1);
            scheduledDate.setHours(18, 0, 0, 0);
        }

        // Generate preparation date (12 hours before session)
        const preparationDate = new Date(scheduledDate.getTime() - (12 * 60 * 60 * 1000));

        const sessionData = {
            learner: learner._id,
            mentor: mentor._id,
            sourcePost: question._id,
            skill: (Array.isArray(question.tags) && question.tags.length > 0)
                ? String(question.tags[0])
                : String(question.subject || 'general'),
            topic,
            description,
            scheduledDate,
            preparationDate,
            duration,
            sessionType,
            status: 'pending',
            amount,
            paymentStatus: amount === 0 ? 'paid' : 'pending',
            meetingPlatform: 'meet',
            meetingLink: `https://meet.skillswapplus.lk/community-${question._id}`
        };

        const session = await Session.create(sessionData);
        await session.populate('learner mentor', '-password');

        return session;
    }

    /**
     * Get all flagged questions
     */
    async getFlaggedQuestions() {
        return await Question.find({ isFlagged: true })
            .populate('author', 'firstName lastName role')
            .sort({ updatedAt: -1 });
    }

    /**
     * Get all flagged answers
     */
    async getFlaggedAnswers() {
        return await Answer.find({ isFlagged: true })
            .populate('author', 'firstName lastName role')
            .populate('question', 'title')
            .sort({ updatedAt: -1 });
    }
}

module.exports = new CommunityService();
