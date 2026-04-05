const Material = require('./material.model');
const path = require('path');
const fs = require('fs');

/**
 * Material Controller
 * Handles material resource operations
 */

// Create material
exports.createMaterial = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File is required' });
        }

        const getFileType = (filename) => {
            const ext = path.extname(filename).toLowerCase();
            if (ext === '.pdf') return 'pdf';
            if (['.mp4', '.webm', '.ogg', '.mov'].includes(ext)) return 'video';
            if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return 'image';
            return 'other';
        };

        const material = new Material({
            title: req.body.title || 'Untitled Resource',
            description: req.body.description || '',
            category: req.body.category || 'General',
            url: `/uploads/materials/${req.file.filename}`,
            type: getFileType(req.file.filename),
            mentor: req.user._id,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
        });

        await material.save();
        res.status(201).json({ success: true, data: material });
    } catch (error) {
        next(error);
    }
};

// Get all materials (optional filter by mentor)
exports.getMaterials = async (req, res, next) => {
    try {
        const query = {};
        if (req.query.mentorId) {
            query.mentor = req.query.mentorId;
        }

        const materials = await Material.find(query)
            .populate('mentor', 'firstName lastName profileImage')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: materials });
    } catch (error) {
        next(error);
    }
};

// Get my materials
exports.getMyMaterials = async (req, res, next) => {
    try {
        const materials = await Material.find({ mentor: req.user._id })
            .sort({ createdAt: -1 });
        res.json({ success: true, data: materials });
    } catch (error) {
        next(error);
    }
};

// Delete material
exports.deleteMaterial = async (req, res, next) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        if (material.mentor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Optional: delete physical file
        const filePath = path.join(__dirname, '../../../', material.url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await Material.deleteOne({ _id: req.params.id });
        res.json({ success: true, message: 'Material deleted' });
    } catch (error) {
        next(error);
    }
};
