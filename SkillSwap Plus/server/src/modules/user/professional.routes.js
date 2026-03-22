const express = require('express');
const router = express.Router();
const professionalController = require('./professional.controller');
const auth = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');

router.use(auth);
router.use(authorize('professional', 'admin'));

router.get('/mentors', professionalController.monitorMentors);
router.get('/learners', professionalController.monitorLearners);
router.get('/analytics', professionalController.getAnalytics);
router.post('/verify-mentor', professionalController.verifyMentor);
router.post('/recommend-mentor', professionalController.recommendMentor);
router.post('/evaluate-session', professionalController.evaluateSession);

module.exports = router;
