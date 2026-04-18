const financeService = require('./finance.service');
const { validationResult } = require('express-validator');
const Session = require('../user/session.model');
const XLSX = require('xlsx');
const config = require('../../config');
const payhereService = require('./payhere.service');
const User = require('../user/user.model');
const sendEmail = require('../../utils/sendEmail');

const normalizeAuditQuery = (query = {}) => ({
    actionType: query.actionType,
    mentorId: query.mentorId,
    adminId: query.adminId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    minAmount: query.minAmount,
    maxAmount: query.maxAmount,
    q: query.q,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    limit: query.limit,
    offset: query.offset,
});

/**
 * @route   POST /api/admin/finance/pay
 * @desc    Process a mock payment for a skill session
 * @access  Private (Learner)
 */
exports.processPayment = async (req, res, next) => {
    try {
        const { skillId, amount } = req.body;
        
        // This is a simplified version for demonstration.
        // In a real app, you'd integrate Stripe/PayPal here.
        
        const Transaction = require('./transaction.model');
        const Skill = require('../user/skill.model');
        
        const skill = await Skill.findById(skillId);
        if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });

        const programName = (skill.title || skill.name || 'Program Session').toString().trim();
        const sessionDescription = (skill.description || `Enrolled in ${programName}`).toString().slice(0, 1000);

        // Prevent duplicate active enrollments for the same learner/program pair.
        const existingEnrollment = await Session.findOne({
            learner: req.user._id,
            mentor: skill.mentor,
            skill: programName,
            sessionType: 'paid',
            status: { $in: ['pending', 'accepted', 'scheduled', 'live'] },
        });

        if (existingEnrollment) {
            return res.status(200).json({
                success: true,
                message: 'You are already enrolled in this program',
                data: {
                    session: existingEnrollment,
                },
            });
        }

        const basePrice = skill.price;
        const platformFee = basePrice * 0.25;
        const totalAmount = basePrice + platformFee;

        const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const timeHH = String(scheduledDate.getHours()).padStart(2, '0');
        const timeMM = String(scheduledDate.getMinutes()).padStart(2, '0');

        const enrolledSession = await Session.create({
            learner: req.user._id,
            mentor: skill.mentor,
            program: skill._id,
            skill: programName,
            topic: programName,
            description: sessionDescription,
            scheduledDate,
            duration: 60,
            sessionType: 'paid',
            status: 'scheduled',
            paymentStatus: 'paid',
            amount: basePrice,
            paymentMethod: 'test_card',
            date: scheduledDate,
            time: `${timeHH}:${timeMM}`,
            message: 'Auto-created after successful enrollment',
        });

        const transaction = await Transaction.create({
            learner: req.user._id,
            mentor: skill.mentor,
            skill: skillId,
            session: enrolledSession._id,
            amountPaid: totalAmount,
            platformFee,
            mentorEarning: basePrice,
            status: 'completed',
            paymentMethod: 'Mock Card',
            completedAt: new Date(),
        });

        enrolledSession.transactionId = transaction._id.toString();
        await enrolledSession.save();

        // Generate mentor earnings automatically
        await financeService.createMentorEarnings(transaction._id);

        await enrolledSession.populate('mentor', 'firstName lastName university department');

        res.status(201).json({
            success: true,
            message: 'Payment processed and earnings recorded',
            data: {
                transaction,
                session: enrolledSession,
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/finance/stats
 * @desc    Get detailed platform finance stats
 * @access  Private (Admin only)
 */
exports.getFinanceStats = async (req, res, next) => {
    try {
        const stats = await financeService.getSystemFinanceStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/finance/mentors
 * @desc    Get all mentors with their financial standing
 * @access  Private (Admin only)
 */
exports.getMentorsFinance = async (req, res, next) => {
    try {
        const mentors = await financeService.getMentorsFinancialList();
        res.json({ success: true, data: mentors });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/admin/finance/payout/:mentorId
 * @desc    Process payout for a mentor
 * @access  Private (Admin only)
 */
exports.processPayout = async (req, res, next) => {
    try {
        const payout = await financeService.processPayout(
            req.params.mentorId,
            req.user._id,
            req.body.paymentMethod
        );

        // Send payout confirmation email to mentor
        try {
            const mentor = await User.findById(req.params.mentorId).select('firstName lastName email bankDetails');
            if (mentor?.email) {
                const paidDate = new Date().toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' });
                const bankLine = mentor.bankDetails?.accountNumber
                    ? `<p style="margin:4px 0;"><strong>Bank:</strong> ${mentor.bankDetails.bankName || '—'}</p>
                       <p style="margin:4px 0;"><strong>Account No:</strong> ${mentor.bankDetails.accountNumber}</p>
                       <p style="margin:4px 0;"><strong>Branch:</strong> ${mentor.bankDetails.branchName || '—'}</p>`
                    : '';

                await sendEmail({
                    email: mentor.email,
                    subject: 'SkillSwap+ — Your Payout Has Been Processed',
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:16px;">
                            <div style="background:#4f46e5;border-radius:12px;padding:28px 32px;text-align:center;margin-bottom:28px;">
                                <h1 style="color:#fff;margin:0;font-size:22px;font-weight:900;letter-spacing:-0.5px;">SkillSwap+</h1>
                                <p style="color:#c7d2fe;margin:6px 0 0;font-size:13px;">Payout Confirmation</p>
                            </div>

                            <p style="color:#1e293b;font-size:15px;margin-bottom:6px;">Hi <strong>${mentor.firstName}</strong>,</p>
                            <p style="color:#475569;font-size:14px;line-height:1.6;margin-bottom:24px;">
                                Great news! Your payout has been successfully processed by the SkillSwap+ admin team.
                                The amount has been transferred to your registered bank account.
                            </p>

                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="color:#64748b;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Payment Details</p>
                                <p style="margin:4px 0;color:#1e293b;font-size:14px;"><strong>Amount Paid:</strong> <span style="color:#059669;font-size:18px;font-weight:900;">Rs. ${payout.amount?.toLocaleString()}</span></p>
                                <p style="margin:4px 0;color:#1e293b;font-size:14px;"><strong>Date:</strong> ${paidDate}</p>
                                <p style="margin:4px 0;color:#1e293b;font-size:14px;"><strong>Method:</strong> ${payout.paymentMethod || 'Bank Transfer'}</p>
                                ${bankLine}
                            </div>

                            <p style="color:#475569;font-size:13px;line-height:1.6;margin-bottom:24px;">
                                If you have any questions about this payment, please contact the SkillSwap+ support team.
                            </p>

                            <div style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;">
                                <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} SkillSwap+. All rights reserved.</p>
                            </div>
                        </div>
                    `
                });
            }
        } catch (emailErr) {
            console.error('Payout email failed:', emailErr.message);
        }

        res.json({ success: true, message: 'Payout successful', data: payout });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/admin/finance/payout/:mentorId/payhere
 * @desc    Initiate PayHere sandbox checkout for an admin payout
 * @access  Private (Admin only)
 */
exports.initiatePayHerePayoutCheckout = async (req, res, next) => {
    try {
        const { mentorId } = req.params;

        const { totalAmount, pendingCount } = await financeService.getPendingPayoutAmount(mentorId);
        if (!pendingCount || totalAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'No pending earnings for this mentor',
            });
        }

        const merchantId = config.PAYHERE_MERCHANT_ID;
        const merchantSecret = config.PAYHERE_MERCHANT_SECRET;
        if (!merchantId || !merchantSecret) {
            return res.status(500).json({
                success: false,
                message: 'PayHere is not configured on the server',
            });
        }

        const currency = config.PAYHERE_CURRENCY || 'LKR';
        // Keep PayHere order_id short to avoid gateway validation issues.
        const orderId = `PO-${Date.now()}`;

        const baseReturnUrl = `${config.CLIENT_URL}/admin/dashboard`;
        const returnUrl = `${baseReturnUrl}?tab=finance&payhere=success&mentorId=${encodeURIComponent(mentorId)}&order_id=${encodeURIComponent(orderId)}`;
        const cancelUrl = `${baseReturnUrl}?tab=finance&payhere=cancel&mentorId=${encodeURIComponent(mentorId)}&order_id=${encodeURIComponent(orderId)}`;

        // Demo mode: we don't verify via IPN yet, but PayHere expects a notify_url.
        const serverOrigin = `${req.protocol}://${req.get('host')}`;
        const notifyUrl = `${serverOrigin}/api/admin/finance/payhere/ipn`;

        const fields = payhereService.buildCheckoutFields({
            merchantId,
            merchantSecret,
            orderId,
            amount: totalAmount,
            currency,
            returnUrl,
            cancelUrl,
            notifyUrl,
            customer: req.user,
            items: `SkillSwap Plus - Mentor payout (${pendingCount} sessions)`,
            custom1: mentorId,
            custom2: orderId,
        });

        res.json({
            success: true,
            data: {
                checkoutUrl: config.PAYHERE_CHECKOUT_URL,
                orderId,
                mentorId,
                amount: totalAmount,
                currency,
                fields,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/finance/audit
 * @desc    Get financial audit logs
 * @access  Private (Admin only)
 */
exports.getAuditLogs = async (req, res, next) => {
    try {
        const logs = await financeService.getAuditLogs(normalizeAuditQuery(req.query));
        res.json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/finance/audit/export
 * @desc    Export financial audit logs to Excel
 * @access  Private (Admin only)
 */
exports.exportAuditLogs = async (req, res, next) => {
    try {
        const exportQuery = normalizeAuditQuery(req.query);
        exportQuery.limit = exportQuery.limit || 5000;
        exportQuery.offset = 0;

        const logs = await financeService.getAuditLogs(exportQuery);
        const rows = logs.map((log) => ({
            Action: log.actionType || '',
            Admin: `${log.admin?.firstName || ''} ${log.admin?.lastName || ''}`.trim() || '-',
            TargetMentor: `${log.targetMentor?.firstName || ''} ${log.targetMentor?.lastName || ''}`.trim() || '-',
            Amount: log.amount ?? '',
            Date: log.createdAt ? new Date(log.createdAt).toISOString() : '',
            Description: log.description || '',
            Details: log.details || ''
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const fileName = `audit-log_${new Date().toISOString().slice(0, 10)}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/admin/finance/payhere/ipn
 * @desc    PayHere IPN receiver (demo: accept and log)
 * @access  Public (PayHere callback)
 */
exports.handlePayHereIpn = async (req, res) => {
    // In this demo flow we don't verify signatures or update payouts.
    // Returning 200 avoids repeated retries from PayHere.
    res.status(200).send('OK');
};
