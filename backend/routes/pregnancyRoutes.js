const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    upsertPregnancy,
    addMonthlyCheckup,
    addBaby,
    updateVaccination,
    getPregnancyData
} = require('../controllers/pregnancyController');

router.get('/me', protect, getPregnancyData);
router.post('/upsert', protect, upsertPregnancy);
router.post('/checkup', protect, addMonthlyCheckup);
router.post('/baby', protect, addBaby);
router.patch('/baby/:babyIndex/vaccination/:vaccinationIndex', protect, updateVaccination);

module.exports = router;
