/**
 * Role-based Access Control Middleware
 * Restricts access based on user roles
 */

/**
 * Check if user has required role(s)
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check if user's role is allowed
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
};

/**
 * Check if user is a learner
 */
const isLearner = authorize('learner');

/**
 * Check if user is a mentor
 */
const isMentor = authorize('mentor');

/**
 * Check if user is a professional
 */
const isProfessional = authorize('professional');

/**
 * Check if user is an admin
 */
const isAdmin = authorize('admin');

/**
 * Check if user is either learner or mentor
 */
const isLearnerOrMentor = authorize('learner', 'mentor');

/**
 * Check if user is either mentor or admin
 */
const isMentorOrAdmin = authorize('mentor', 'admin');

module.exports = {
    authorize,
    isLearner,
    isMentor,
    isProfessional,
    isAdmin,
    isLearnerOrMentor,
    isMentorOrAdmin
};
