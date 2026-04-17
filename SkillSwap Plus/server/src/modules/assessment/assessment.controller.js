const assessmentService = require('./assessment.service');
const Skill = require('../user/skill.model');

const toId = (v) => v?.toString?.() || String(v || '');

const ensureAssessmentAccess = async (req, learnerId, programId) => {
    const role = req.user.role;
    if (role === 'learner') {
        if (toId(req.user._id) !== toId(learnerId)) {
            throw new Error('Access denied');
        }
        return;
    }

    if (role === 'mentor') {
        const program = await Skill.findById(programId).select('mentor');
        if (!program || toId(program.mentor) !== toId(req.user._id)) {
            throw new Error('Access denied');
        }
    }
};

exports.generateAssessment = async (req, res, next) => {
    try {
        const assessment = await assessmentService.generateAssessment(
            req.params.programId,
            req.user._id,
            { forceRegenerate: !!req.body?.forceRegenerate }
        );

        res.json({
            success: true,
            message: 'Assessment generated successfully',
            data: assessment,
        });
    } catch (error) {
        next(error);
    }
};

exports.getAssessmentForLearner = async (req, res, next) => {
    try {
        const { learnerId, programId } = req.params;
        await ensureAssessmentAccess(req, learnerId, programId);

        const result = await assessmentService.getLearnerAssessment(learnerId, programId, req.user);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

exports.submitAssessment = async (req, res, next) => {
    try {
        if (req.user.role !== 'learner') {
            return res.status(403).json({ success: false, message: 'Only learners can submit assessments' });
        }

        const result = await assessmentService.submitAssessment(req.user._id, req.body);

        res.json({
            success: true,
            message: 'Assessment submitted and graded successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

exports.getReport = async (req, res, next) => {
    try {
        const { learnerId, programId } = req.params;
        await ensureAssessmentAccess(req, learnerId, programId);

        const result = await assessmentService.getReport(learnerId, programId, req.user);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

exports.finalizeGrade = async (req, res, next) => {
    try {
        if (!['professional', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Only academic supervisors can finalize grades' });
        }

        const result = await assessmentService.finalizeGrade(req.body, req.user._id);

        res.json({
            success: true,
            message: 'Grade finalized successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

exports.getMyResults = async (req, res, next) => {
    try {
        if (req.user.role !== 'learner') {
            return res.status(403).json({ success: false, message: 'Only learners can view this endpoint' });
        }

        const reports = await assessmentService.getLearnerResults(req.user._id);
        res.json({ success: true, count: reports.length, data: reports });
    } catch (error) {
        next(error);
    }
};

exports.getMentorInsights = async (req, res, next) => {
    try {
        if (req.user.role !== 'mentor') {
            return res.status(403).json({ success: false, message: 'Only mentors can view insights' });
        }

        const insights = await assessmentService.getMentorInsights(req.user._id);
        res.json({ success: true, data: insights });
    } catch (error) {
        next(error);
    }
};

exports.getSupervisionReports = async (req, res, next) => {
    try {
        if (!['professional', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Only academic supervisors can view reports' });
        }

        const reports = await assessmentService.getSupervisionReports();
        res.json({ success: true, count: reports.length, data: reports });
    } catch (error) {
        next(error);
    }
};

exports.getSupervisionReportDetail = async (req, res, next) => {
    try {
        if (!['professional', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Only academic supervisors can view report details' });
        }

        const detail = await assessmentService.getSupervisionReportDetail(req.params.reportId);
        res.json({ success: true, data: detail });
    } catch (error) {
        next(error);
    }
};
