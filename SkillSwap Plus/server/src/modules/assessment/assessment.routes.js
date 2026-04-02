const express = require('express');
const assessmentController = require('./assessment.controller');
const auth = require('../../middleware/auth.middleware');
const { authorize, isLearner, isMentor } = require('../../middleware/role.middleware');

const router = express.Router();

router.post('/generate-assessment/:programId', auth, authorize('mentor', 'professional', 'admin'), assessmentController.generateAssessment);
router.post('/submit-assessment', auth, isLearner, assessmentController.submitAssessment);
router.post('/finalize-grade', auth, authorize('professional', 'admin'), assessmentController.finalizeGrade);

// Helper endpoints for dashboards
router.get('/assessment/my-results', auth, isLearner, assessmentController.getMyResults);
router.get('/assessment/mentor/insights', auth, isMentor, assessmentController.getMentorInsights);
router.get('/assessment/supervision/reports', auth, authorize('professional', 'admin'), assessmentController.getSupervisionReports);
router.get('/assessment/:learnerId/:programId', auth, assessmentController.getAssessmentForLearner);
router.get('/report/:learnerId/:programId', auth, assessmentController.getReport);

module.exports = router;
