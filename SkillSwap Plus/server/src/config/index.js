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

    // PayHere (Sandbox/Live)
    PAYHERE_MERCHANT_ID: process.env.PAYHERE_MERCHANT_ID,
    // Prefer raw secret if provided; otherwise accept base64-encoded secret via PAYHERE_MERCHANT_SECRET_B64.
    PAYHERE_MERCHANT_SECRET:
        process.env.PAYHERE_MERCHANT_SECRET ||
        (process.env.PAYHERE_MERCHANT_SECRET_B64
            ? Buffer.from(process.env.PAYHERE_MERCHANT_SECRET_B64, 'base64').toString('utf8')
            : undefined),
    PAYHERE_CHECKOUT_URL: process.env.PAYHERE_CHECKOUT_URL || 'https://sandbox.payhere.lk/pay/checkout',
    PAYHERE_CURRENCY: process.env.PAYHERE_CURRENCY || 'LKR',

    // Email Configuration
    EMAIL_SERVICE: process.env.EMAIL_SERVICE,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,

    // AI Configuration
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,

    // File Upload
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
    UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
};
