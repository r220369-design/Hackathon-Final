const express = require('express');
const router = express.Router();
const { protect, officer } = require('../middleware/authMiddleware');
const { getVillageDashboard, getVillagePatients, getVillagePatientDetails, markPatientCaseDone } = require('../controllers/officerController');

router.get('/dashboard', protect, officer, getVillageDashboard);
router.get('/patients', protect, officer, getVillagePatients);
router.get('/patients/:patientId', protect, officer, getVillagePatientDetails);
router.patch('/patients/:patientId/complete-case', protect, officer, markPatientCaseDone);

module.exports = router;
