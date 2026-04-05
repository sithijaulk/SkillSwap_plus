const mongoose = require('mongoose');

const fileUploadSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadType: {
        type: String,
        enum: ['skill_icon', 'skill_banner', 'profile_image', 'session_cover', 'material'],
        required: true
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true // ID of the related skill, user, etc.
    }
}, {
    timestamps: true
});

// Index for efficient queries
fileUploadSchema.index({ uploadedBy: 1, uploadType: 1 });
fileUploadSchema.index({ relatedId: 1 });

const FileUpload = mongoose.model('FileUpload', fileUploadSchema);

module.exports = FileUpload;