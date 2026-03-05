const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMyAlerts, markAlertRead, markAllAlertsRead } = require('../controllers/alertController');

router.get('/me', protect, getMyAlerts);
router.patch('/read-all', protect, markAllAlertsRead);
router.patch('/:id/read', protect, markAlertRead);

module.exports = router;
