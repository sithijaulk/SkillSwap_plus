const express = require('express');
const router = express.Router();
const Material = require('./material.model');
const auth = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');
const { upload, getFileType } = require('../../middleware/materialUpload.middleware');

// Public: Get all materials
router.get('/', async (req, res) => {
    try {
        const materials = await Material.find().populate('mentor', 'firstName lastName');
        res.status(200).json({ success: true, data: materials });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Protected: Get mentor's materials
router.get('/my', auth, authorize('mentor', 'professional'), async (req, res) => {
    try {
        const materials = await Material.find({ mentor: req.user._id });
        res.status(200).json({ success: true, data: materials });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Protected: Create material (Mentor only)
router.post('/', auth, authorize('mentor', 'professional'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File is required' });
        }

        const newMaterial = await Material.create({
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            type: getFileType(req.file.mimetype),
            url: `/uploads/materials/${req.file.filename}`,
            mentor: req.user._id
        });
        res.status(201).json({ success: true, data: newMaterial });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Protected: Delete material
router.delete('/:id', auth, authorize('mentor', 'professional', 'admin'), async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material) return res.status(404).json({ success: false, message: 'Not found' });
        
        // Only owner or admin can delete
        if (material.mentor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        await Material.deleteOne({ _id: req.params.id });
        res.status(200).json({ success: true, data: null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
