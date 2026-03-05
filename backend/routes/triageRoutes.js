const express = require('express');
const router = express.Router();
const { analyzeSymptoms, getHospitals, getMyMedicalHistory, getAndhraPradeshCitiesList } = require('../controllers/triageController');
const { protect } = require('../middleware/authMiddleware');

router.post('/analyze', protect, analyzeSymptoms);
router.get('/hospitals', protect, getHospitals);
router.get('/cities', protect, getAndhraPradeshCitiesList);
router.get('/history', protect, getMyMedicalHistory);

module.exports = router;
