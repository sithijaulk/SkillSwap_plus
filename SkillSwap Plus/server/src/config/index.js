require('dotenv').config();

module.exports = {
    // Server Configuration
    NODE_ENV: process.env.NODE_ENV || 'development',
    // use 5001 by default because macOS often reserves 5000 for system services
    PORT: process.env.PORT || 5001,

    // Database
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap-plus',

    // JWT Configuration
    JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-in-production',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',

    // Client Configuration
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

    // Payment Configuration
    PAYMENT_MODE: process.env.PAYMENT_MODE || 'test',
    PAYMENT_API_KEY: process.env.PAYMENT_API_KEY || 'test_key',

    // Email Configuration
    EMAIL_SERVICE: process.env.EMAIL_SERVICE,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,

    // File Upload
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
    UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
};
