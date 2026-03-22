const express = require('express');
const router = express.Router();
const Ticket = require('../user/ticket.model');
const Complaint = require('../user/complaint.model');
const Contact = require('../user/contact.model');
const auth = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/role.middleware');

// Public Contact Form
router.post('/contact', async (req, res) => {
    try {
        const contact = await Contact.create(req.body);
        res.json({ success: true, data: contact });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Tickets
router.post('/tickets', auth, async (req, res) => {
    try {
        const ticket = await Ticket.create({ ...req.body, user: req.user._id });
        res.json({ success: true, data: ticket });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/tickets/my', auth, async (req, res) => {
    try {
        const tickets = await Ticket.find({ user: req.user._id }).sort('-createdAt');
        res.json({ success: true, data: tickets });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Admin: Manage Tickets
router.get('/admin/tickets', auth, isAdmin, async (req, res) => {
    try {
        const tickets = await Ticket.find().populate('user', 'firstName lastName email').sort('-createdAt');
        res.json({ success: true, data: tickets });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/admin/tickets/:id', auth, isAdmin, async (req, res) => {
    try {
        const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: ticket });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Complaints
router.post('/complaints', auth, async (req, res) => {
    try {
        const complaint = await Complaint.create({ ...req.body, user: req.user._id });
        res.json({ success: true, data: complaint });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Admin: Manage Complaints
router.get('/admin/complaints', auth, isAdmin, async (req, res) => {
    try {
        const complaints = await Complaint.find()
            .populate('user', 'firstName lastName email')
            .populate('targetUser', 'firstName lastName email')
            .sort('-createdAt');
        res.json({ success: true, data: complaints });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
