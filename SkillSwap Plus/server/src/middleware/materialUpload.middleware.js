const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../../../uploads/materials');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Map extensions to generic types for database model mapping
const getFileType = (mimetype) => {
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('image/')) return 'other';
    if (mimetype === 'application/pdf') return 'pdf';
    return 'other';
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Create unique suffix
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'material-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/pdf', 
        'image/jpeg', 
        'image/png', 
        'image/webp',
        'video/mp4',
        'video/webm'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type! Only PDF, Images, and MP4/WEBM are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        // Limit to 50MB
        fileSize: 50 * 1024 * 1024
    },
    fileFilter: fileFilter
});

module.exports = { upload, getFileType };
