const express = require('express');
const multer = require('multer');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { uploadAndSummarizeReport, getMyMedicalReports } = require('../controllers/reportController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload', protect, upload.single('report'), uploadAndSummarizeReport);
router.get('/me', protect, getMyMedicalReports);

module.exports = router;
