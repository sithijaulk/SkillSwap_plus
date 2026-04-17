const express = require('express');
const router = express.Router();
const Ticket = require('../user/ticket.model');
const Complaint = require('../user/complaint.model');
const Contact = require('../user/contact.model');
const User = require('../user/user.model');
const auth = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/role.middleware');
const sendEmail = require('../../utils/sendEmail');

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

        // Normalize solved-by-reply flag for legacy data consistency.
        const normalizedTickets = tickets.map((ticket) => {
            const hasAdminReply =
                ticket.repliedByAdmin === true &&
                ticket.status === 'Resolved' &&
                Array.isArray(ticket.messages) &&
                ticket.messages.length > 0;

            const plainTicket = ticket.toObject();
            plainTicket.repliedByAdmin = hasAdminReply;
            return plainTicket;
        });

        res.json({ success: true, data: normalizedTickets });
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

// Admin: Reply to ticket
router.post('/admin/tickets/:id/reply', auth, isAdmin, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === '') {
            return res.status(400).json({ success: false, message: 'Reply message is required' });
        }

        const existingTicket = await Ticket.findById(req.params.id).populate('user', 'firstName lastName email');
        if (!existingTicket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        // Update only this specific ticket: append admin reply and mark resolved.
        await Ticket.updateOne(
            { _id: req.params.id },
            {
                $push: {
                    messages: {
                        sender: req.user._id,
                        message: message.trim(),
                        createdAt: new Date()
                    }
                },
                $set: {
                    status: 'Resolved',
                    repliedByAdmin: true,
                    repliedAt: new Date()
                }
            }
        );

        const ticket = await Ticket.findById(req.params.id)
            .populate('user', 'firstName lastName email')
            .populate('messages.sender', 'firstName lastName email');

        // Send email notification to user
        try {
            const emailContent = `
                <h2>Support Ticket Reply</h2>
                <p>Hi ${existingTicket.user.firstName},</p>
                <p>An admin has replied to your support ticket: <strong>${ticket.title}</strong></p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <h3>Admin's Reply:</h3>
                <p>${message.trim()}</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p><strong>Status:</strong> Your ticket has been marked as <strong>Resolved</strong>.</p>
                <p>Log in to your SkillSwap+ dashboard to view the full conversation. If you need further assistance, feel free to create a new ticket.</p>
                <p>Best regards,<br><strong>SkillSwap+ Support Team</strong></p>
            `;

            await sendEmail({
                email: existingTicket.user.email,
                subject: `Reply to Your Support Ticket: ${ticket.title}`,
                html: emailContent
            });
        } catch (emailErr) {
            console.error('Email sending failed:', emailErr);
            // Continue even if email fails
        }

        res.json({ 
            success: true, 
            message: 'Reply added successfully', 
            data: ticket 
        });
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
