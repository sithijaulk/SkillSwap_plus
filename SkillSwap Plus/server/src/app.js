const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { errorHandler, notFound } = require('./middleware/error.middleware');

// Import routes
const userRoutes = require('./modules/user/user.routes');
const qualityRoutes = require('./modules/quality/quality.routes');
const communityRoutes = require('./modules/community/community.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const supportRoutes = require('./modules/user/support.routes');
const materialRoutes = require('./modules/user/material.routes');
const professionalRoutes = require('./modules/user/professional.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const assessmentRoutes = require('./modules/assessment/assessment.routes');
const mentorEvaluationRoutes = require('./modules/mentorEvaluation/mentorEvaluationReport.routes');
const path = require('path');

const app = express();

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/**
 * ===========================
 * MIDDLEWARE
 * ===========================
 */

// Security middleware
// app.use(helmet());

// CORS configuration - allow requests from client URL and handle preflight
const corsOptions = {
    origin: function(origin, callback) {
        // In development, allow localhost, 127.0.0.1 and local network IPs (e.g. 192.168.x.x)
        if (config.NODE_ENV === 'development') {
            if (
                !origin ||
                origin.includes('localhost') ||
                origin.includes('127.0.0.1') ||
                origin.includes('192.168.')
            ) {
                return callback(null, true);
            }
            return callback(new Error('CORS not allowed'));
        }

        // In production, use the specific CLIENT_URL
        if (!origin || origin === config.CLIENT_URL) {
            return callback(null, true);
        }
        return callback(new Error('CORS not allowed'));
    },
    credentials: true
};
app.use(cors(corsOptions));
// explicitly enable preflight for all routes
app.options('*', cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// app.use('/api', limiter);

/**
 * ===========================
 * ROUTES
 * ===========================
 */

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'SkillSwap+ API is running',
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV
    });
});

// API root check
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'SkillSwap+ API root is reachable'
    });
});

// API Routes
app.use('/api', userRoutes);
app.use('/api', qualityRoutes);
app.use('/api', communityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', supportRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/professional', professionalRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', assessmentRoutes);
app.use('/api/mentor-evaluation/reports', mentorEvaluationRoutes);

// Welcome route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to SkillSwap+ API',
        version: '1.0.0',
        documentation: '/api/docs'
    });
});

/**
 * ===========================
 * ERROR HANDLING
 * ===========================
 */

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
