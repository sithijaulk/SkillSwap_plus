const MentorEvaluationReport = require('./mentorEvaluationReport.model');
const mentorEvaluationService = require('./mentorEvaluation.service');
const Skill = require('../user/skill.model');
const User = require('../user/user.model');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toHttpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const normalizeStringArray = (value) => {
    if (!Array.isArray(value)) return [];

    return [...new Set(value
        .map((item) => (item || '').toString().trim())
        .filter(Boolean))];
};

const gradeFromMps = (mps) => {
    if (mps >= 4.5) return 'Platinum';
    if (mps >= 3.5) return 'Gold';
    if (mps >= 2.5) return 'Silver';
    if (mps >= 1.5) return 'Bronze';
    return 'None';
};

const groupReportsByProgram = (reports) => {
    const map = new Map();

    for (const report of reports) {
        const programId = report?.program?._id?.toString?.() || report?.program?.toString?.() || 'unknown-program';
        const programTitle = report?.program?.title || report?.programTitle || 'Program';
        const programCategory = report?.program?.category || 'General';

        if (!map.has(programId)) {
            map.set(programId, {
                programId,
                programTitle,
                programCategory,
                reports: [],
            });
        }

        map.get(programId).reports.push(report);
    }

    return Array.from(map.values());
};

const groupReportsByMentor = (reports) => {
    const mentorMap = new Map();

    for (const report of reports) {
        const mentorId = report?.mentor?._id?.toString?.() || report?.mentor?.toString?.() || 'unknown-mentor';
        const mentorName = `${report?.mentor?.firstName || ''} ${report?.mentor?.lastName || ''}`.trim() || 'Mentor';

        if (!mentorMap.has(mentorId)) {
            mentorMap.set(mentorId, {
                mentorId,
                mentorName,
                currentMps: Number(report?.mentor?.mps || 0),
                currentGrade: report?.mentor?.grade || 'None',
                programs: new Map(),
            });
        }

        const mentorBucket = mentorMap.get(mentorId);
        const programId = report?.program?._id?.toString?.() || report?.program?.toString?.() || 'unknown-program';

        if (!mentorBucket.programs.has(programId)) {
            mentorBucket.programs.set(programId, {
                programId,
                programTitle: report?.program?.title || report?.programTitle || 'Program',
                programCategory: report?.program?.category || 'General',
                reports: [],
            });
        }

        mentorBucket.programs.get(programId).reports.push(report);
    }

    return Array.from(mentorMap.values()).map((group) => ({
        mentorId: group.mentorId,
        mentorName: group.mentorName,
        currentMps: group.currentMps,
        currentGrade: group.currentGrade,
        programs: Array.from(group.programs.values()),
    }));
};

const recalculateMentorMps = async (mentorId) => {
    const reports = await MentorEvaluationReport.find({
        mentor: mentorId,
        status: 'evaluated',
        'supervisorReview.isFinalized': true,
    })
        .sort({ 'supervisorReview.reviewedAt': -1, updatedAt: -1 })
        .limit(10)
        .lean();

    if (reports.length === 0) {
        const updated = await User.findByIdAndUpdate(
            mentorId,
            { mps: 0, grade: 'None' },
            { new: true }
        ).select('-password');

        return updated;
    }

    const weights = [1.0, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.55];

    let weightedSum = 0;
    let totalWeight = 0;

    reports.forEach((report, index) => {
        const score = Number(report?.supervisorReview?.finalMpsScore || 0);
        const weight = weights[index] || 0.55;
        weightedSum += score * weight;
        totalWeight += weight;
    });

    const newMps = Number(clamp(weightedSum / totalWeight, 0, 5).toFixed(2));
    const newGrade = gradeFromMps(newMps);

    const updatedMentor = await User.findByIdAndUpdate(
        mentorId,
        { mps: newMps, grade: newGrade },
        { new: true }
    ).select('-password');

    return updatedMentor;
};

exports.submitReport = async (req, res, next) => {
    try {
        const {
            programId,
            programTitle,
            reportPeriod,
            teachingMethodology,
            courseWorkDescription,
            lectureMaterialsSummary,
            learnerProgressObservations,
            challengesFaced,
            improvementPlans,
            attachedMaterialUrls,
        } = req.body;

        if (!programId) throw toHttpError('programId is required', 400);

        const skill = await Skill.findById(programId);
        if (!skill) throw toHttpError('Program not found', 404);

        if (skill.mentor.toString() !== req.user._id.toString()) {
            throw toHttpError('You can submit reports only for your own programs', 403);
        }

        if (!teachingMethodology || teachingMethodology.trim().length < 100) {
            throw toHttpError('teachingMethodology must be at least 100 characters', 400);
        }

        const report = await MentorEvaluationReport.create({
            mentor: req.user._id,
            program: skill._id,
            programTitle: (programTitle || skill.title || '').toString().trim() || 'Program',
            reportPeriod: (reportPeriod || '').toString().trim(),
            teachingMethodology,
            courseWorkDescription,
            lectureMaterialsSummary,
            learnerProgressObservations,
            challengesFaced,
            improvementPlans,
            attachedMaterialUrls: normalizeStringArray(attachedMaterialUrls),
            status: 'submitted',
            submittedAt: new Date(),
        });

        res.status(201).json({
            success: true,
            message: 'Evaluation report submitted successfully',
            data: report,
        });
    } catch (error) {
        next(error);
    }
};

exports.getMyReports = async (req, res, next) => {
    try {
        const query = { mentor: req.user._id };
        if (req.query.status) query.status = req.query.status;

        const reports = await MentorEvaluationReport.find(query)
            .populate('program', 'title category')
            .sort({ submittedAt: -1, createdAt: -1 });

        const groups = groupReportsByProgram(reports);

        res.json({
            success: true,
            message: 'Mentor reports fetched successfully',
            data: {
                groups,
                reports,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.getMyReportsByProgram = async (req, res, next) => {
    try {
        const { programId } = req.params;

        const skill = await Skill.findById(programId);
        if (!skill) throw toHttpError('Program not found', 404);

        if (skill.mentor.toString() !== req.user._id.toString()) {
            throw toHttpError('Access denied for this program', 403);
        }

        const query = { mentor: req.user._id, program: programId };
        if (req.query.status) query.status = req.query.status;

        const reports = await MentorEvaluationReport.find(query)
            .populate('program', 'title category')
            .sort({ submittedAt: -1, createdAt: -1 });

        res.json({
            success: true,
            message: 'Program reports fetched successfully',
            data: reports,
        });
    } catch (error) {
        next(error);
    }
};

exports.getAllReports = async (req, res, next) => {
    try {
        const query = {};

        if (req.query.mentorId) query.mentor = req.query.mentorId;
        if (req.query.status) query.status = req.query.status;

        const reports = await MentorEvaluationReport.find(query)
            .populate('mentor', 'firstName lastName mps grade')
            .populate('program', 'title category')
            .sort({ submittedAt: -1, createdAt: -1 });

        const grouped = groupReportsByMentor(reports);

        res.json({
            success: true,
            message: 'Mentor evaluation reports fetched successfully',
            data: grouped,
        });
    } catch (error) {
        next(error);
    }
};

exports.getReportById = async (req, res, next) => {
    try {
        const report = await MentorEvaluationReport.findById(req.params.reportId)
            .populate('mentor', 'firstName lastName email mps grade')
            .populate('program', 'title category description')
            .populate('supervisorReview.reviewedBy', 'firstName lastName role');

        if (!report) throw toHttpError('Report not found', 404);

        res.json({
            success: true,
            message: 'Evaluation report fetched successfully',
            data: report,
        });
    } catch (error) {
        next(error);
    }
};

exports.aiEvaluateReport = async (req, res, next) => {
    try {
        const report = await MentorEvaluationReport.findById(req.params.reportId)
            .populate('mentor', 'firstName lastName email')
            .populate('program', 'title category');

        if (!report) throw toHttpError('Report not found', 404);

        const evaluation = await mentorEvaluationService.evaluateMentorReport(report);

        report.aiEvaluation = {
            teachingScore: evaluation.teachingScore,
            courseWorkScore: evaluation.courseWorkScore,
            materialsScore: evaluation.materialsScore,
            overallScore: evaluation.overallScore,
            mpsContribution: evaluation.mpsContribution,
            strengths: evaluation.strengths,
            improvementAreas: evaluation.improvementAreas,
            detailedFeedback: evaluation.detailedFeedback,
            evaluatedAt: evaluation.evaluatedAt || new Date(),
            evaluatedBy: evaluation.evaluatedBy || 'ai-fallback',
        };

        report.status = 'under_review';
        await report.save();

        res.json({
            success: true,
            message: 'AI evaluation completed',
            data: report,
        });
    } catch (error) {
        next(error);
    }
};

exports.finalizeEvaluation = async (req, res, next) => {
    try {
        const report = await MentorEvaluationReport.findById(req.params.reportId)
            .populate('mentor', 'firstName lastName email mps grade');

        if (!report) throw toHttpError('Report not found', 404);

        const { supervisorNotes, finalMpsScore } = req.body;

        let resolvedMpsScore = finalMpsScore;
        if (resolvedMpsScore === undefined || resolvedMpsScore === null || resolvedMpsScore === '') {
            resolvedMpsScore = report?.aiEvaluation?.mpsContribution;
        }

        const numericFinalMps = Number(resolvedMpsScore);
        if (Number.isNaN(numericFinalMps) || numericFinalMps < 0 || numericFinalMps > 5) {
            throw toHttpError('finalMpsScore must be between 0 and 5', 400);
        }

        report.supervisorReview = {
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
            supervisorNotes: (supervisorNotes || '').toString().trim(),
            finalMpsScore: Number(numericFinalMps.toFixed(2)),
            isFinalized: true,
        };

        report.status = 'evaluated';
        await report.save();

        const updatedMentor = await recalculateMentorMps(report.mentor._id);

        res.json({
            success: true,
            message: 'Evaluation finalized and mentor MPS updated',
            data: {
                report,
                mentor: updatedMentor,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.batchAiEvaluate = async (req, res, next) => {
    try {
        const reportIds = Array.isArray(req.body?.reportIds) ? req.body.reportIds : [];
        if (reportIds.length === 0) {
            throw toHttpError('reportIds must be a non-empty array', 400);
        }

        const reports = await MentorEvaluationReport.find({ _id: { $in: reportIds } })
            .populate('mentor', 'firstName lastName email')
            .populate('program', 'title category');

        const results = [];

        for (const report of reports) {
            try {
                const evaluation = await mentorEvaluationService.evaluateMentorReport(report);

                report.aiEvaluation = {
                    teachingScore: evaluation.teachingScore,
                    courseWorkScore: evaluation.courseWorkScore,
                    materialsScore: evaluation.materialsScore,
                    overallScore: evaluation.overallScore,
                    mpsContribution: evaluation.mpsContribution,
                    strengths: evaluation.strengths,
                    improvementAreas: evaluation.improvementAreas,
                    detailedFeedback: evaluation.detailedFeedback,
                    evaluatedAt: evaluation.evaluatedAt || new Date(),
                    evaluatedBy: evaluation.evaluatedBy || 'ai-fallback',
                };
                report.status = 'under_review';
                await report.save();

                results.push({
                    reportId: report._id,
                    success: true,
                    overallScore: report.aiEvaluation.overallScore,
                    mpsContribution: report.aiEvaluation.mpsContribution,
                });
            } catch (error) {
                results.push({
                    reportId: report._id,
                    success: false,
                    message: error.message,
                });
            }
        }

        res.json({
            success: true,
            message: 'Batch AI evaluation completed',
            data: results,
        });
    } catch (error) {
        next(error);
    }
};
