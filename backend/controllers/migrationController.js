const Alert = require('../models/Alert');
const Report = require('../models/Report');

const migrateAlertsWithMedicalData = async (req, res) => {
    try {
        // Find all alerts
        const allAlerts = await Alert.find({});
        let migratedCount = 0;
        let failedCount = 0;

        for (const alert of allAlerts) {
            try {
                // Check if alert already has medical data
                if (alert.symptoms || alert.riskLevel || alert.riskScore) {
                    continue; // Skip already migrated alerts
                }

                // Try to find a corresponding report from the same user
                if (alert.fromUserId) {
                    // Find reports from this user created around the same time as the alert
                    const timeWindow = 2 * 60 * 1000; // 2 minutes window
                    const report = await Report.findOne({
                        userId: alert.fromUserId,
                        createdAt: {
                            $gte: new Date(alert.createdAt.getTime() - timeWindow),
                            $lte: new Date(alert.createdAt.getTime() + timeWindow)
                        }
                    });

                    if (report) {
                        // Update alert with data from report
                        await Alert.findByIdAndUpdate(alert._id, {
                            symptoms: report.symptoms || '',
                            riskLevel: report.level || '',
                            riskScore: report.score || null,
                            reportId: report._id
                        });
                        migratedCount++;
                        continue;
                    }
                }

                // If no matching report found, at least add the new fields with default values
                await Alert.findByIdAndUpdate(alert._id, {
                    symptoms: '',
                    riskLevel: '',
                    riskScore: null
                });
                migratedCount++;
            } catch (error) {
                console.error(`Failed to migrate alert ${alert._id}:`, error.message);
                failedCount++;
            }
        }

        res.json({
            message: 'Migration completed',
            totalAlerts: allAlerts.length,
            migratedCount,
            failedCount
        });
    } catch (error) {
        console.error('Migration failed:', error);
        res.status(500).json({ message: 'Migration failed', error: error.message });
    }
};

module.exports = {
    migrateAlertsWithMedicalData
};
