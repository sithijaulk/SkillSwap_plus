const config = require('../config');

/**
 * Global Error Handler Middleware
 * Catches and formats all errors
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    const statusCode = error.statusCode || err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

    // Log error for debugging
    if (config.NODE_ENV === 'development' && statusCode >= 500) {
        console.error('❌ Error:', err);
    }

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = { statusCode: 404, message };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `${field} already exists`;
        error = { statusCode: 400, message };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = { statusCode: 400, message };
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = { statusCode: 401, message };
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = { statusCode: 401, message };
    }

    res.status(statusCode >= 400 ? statusCode : 500).json({
        success: false,
        message: error.message || 'Server Error',
        ...(config.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * Handle 404 Not Found
 */
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    res.status(404);
    next(error);
};

module.exports = {
    errorHandler,
    notFound
};
