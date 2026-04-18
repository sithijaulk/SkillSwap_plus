const express = require('express');
const auth = require('../../middleware/auth.middleware');
const { isMentor, authorize } = require('../../middleware/role.middleware');
const controller = require('./mentorEvaluationReport.controller');

const router = express.Router();

// Mentor routes
router.post('/', auth, isMentor, controller.submitReport);
router.get('/my', auth, isMentor, controller.getMyReports);
router.get('/my/:programId', auth, isMentor, controller.getMyReportsByProgram);

// Supervision routes
router.get('/', auth, authorize('professional', 'admin'), controller.getAllReports);
router.post('/batch-ai-evaluate', auth, authorize('professional', 'admin'), controller.batchAiEvaluate);
router.post('/:reportId/ai-evaluate', auth, authorize('professional', 'admin'), controller.aiEvaluateReport);
router.post('/:reportId/finalize', auth, authorize('professional', 'admin'), controller.finalizeEvaluation);
router.get('/:reportId', auth, authorize('professional', 'admin'), controller.getReportById);

module.exports = router;
