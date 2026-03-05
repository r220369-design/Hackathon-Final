const express = require('express');
const router = express.Router();
const { protect, officer } = require('../middleware/authMiddleware');
const { getMyReminders, dispatchDueReminders } = require('../controllers/reminderController');

router.get('/me', protect, getMyReminders);
router.post('/dispatch', protect, officer, dispatchDueReminders);

module.exports = router;
