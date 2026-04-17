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
        enum: ['skill_icon', 'skill_banner', 'skill_image', 'profile_image', 'session_cover', 'material'],
        required: true
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false // ID of the related skill, user, etc. (Optional for initial uploads)
    }
}, {
    timestamps: true
});

// Index for efficient queries
fileUploadSchema.index({ uploadedBy: 1, uploadType: 1 });
fileUploadSchema.index({ relatedId: 1 });

const FileUpload = mongoose.model('FileUpload', fileUploadSchema);

module.exports = FileUpload;