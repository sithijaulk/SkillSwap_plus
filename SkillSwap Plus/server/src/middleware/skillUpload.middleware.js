const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure skill images upload directory exists
const skillUploadDir = path.join(__dirname, '../../uploads/skills');
if (!fs.existsSync(skillUploadDir)) {
    fs.mkdirSync(skillUploadDir, { recursive: true });
}

// Storage configuration for skill images
const skillImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, skillUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'skill-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for skill images (JPG/PNG/WEBP only as per requirements)
const skillImageFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only JPG, PNG, and WEBP image files are allowed for skill images!'), false);
    }
};

// Multer upload instance for skill images
const skillImageUpload = multer({
    storage: skillImageStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: skillImageFilter
});

module.exports = {
    skillImageUpload
};