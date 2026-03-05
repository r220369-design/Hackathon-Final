const express = require('express');
const router = express.Router();
const { registerUser, loginUser, requestSmsLoginOtp, verifySmsLoginOtp, getUserProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/login/sms/request', requestSmsLoginOtp);
router.post('/login/sms/verify', verifySmsLoginOtp);
router.get('/profile', protect, getUserProfile);

module.exports = router;
