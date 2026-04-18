const express = require('express');
const router = express.Router();
const Material = require('./material.model');
const auth = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');

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
router.post('/', auth, authorize('mentor', 'professional'), async (req, res) => {
    try {
        const newMaterial = await Material.create({
            ...req.body,
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

        await material.remove();
        res.status(204).json({ success: true, data: null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
