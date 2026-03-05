const express = require('express');
const router = express.Router();
const { migrateAlertsWithMedicalData } = require('../controllers/migrationController');

// Migration endpoint to backfill existing alerts with medical data
router.post('/migrate-alerts', migrateAlertsWithMedicalData);

module.exports = router;
