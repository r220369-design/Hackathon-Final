const express = require('express');
const router = express.Router();
const { markAsRecovered, getHealthTrend, submitCureUpdate } = require('../controllers/recoveryController');
const { protect } = require('../middleware/authMiddleware');

// Mark a report as recovered/cured
router.post('/mark-recovered', protect, markAsRecovered);

// Get health trend and recalculated score
router.get('/health-trend', protect, getHealthTrend);

// Submit natural language cure update (parses message to detect recovery)
router.post('/cure-update', protect, submitCureUpdate);

module.exports = router;
