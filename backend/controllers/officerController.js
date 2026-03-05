const User = require('../models/User');
const Report = require('../models/Report');
const Alert = require('../models/Alert');

const getCoverageVillageCodes = (officer) => {
    if (Array.isArray(officer.coveredVillageCodes) && officer.coveredVillageCodes.length > 0) {
        return officer.coveredVillageCodes;
    }
    return officer.villageCode ? [officer.villageCode] : [];
};

const getVillageDashboard = async (req, res) => {
    try {
        const coveredVillageCodes = getCoverageVillageCodes(req.user);

        if (coveredVillageCodes.length === 0) {
            return res.status(400).json({ message: 'Officer coverage is not configured' });
        }

        const users = await User.find({ villageCode: { $in: coveredVillageCodes } }).select('-password');
        const userIds = users.map((u) => u._id);

        const allReports = await Report.find({ userId: { $in: userIds } })
            .populate('userId', 'name email age isPregnant phone')
            .sort({ createdAt: -1 })
            .limit(100);

        const latestReportByUserId = new Map();
        for (const report of allReports) {
            const ownerId = String(report.userId?._id || report.userId || '');
            if (ownerId && !latestReportByUserId.has(ownerId)) {
                latestReportByUserId.set(ownerId, report);
            }
        }

        const reports = Array.from(latestReportByUserId.values())
            .filter((report) => report.caseStatus !== 'done');

        const alerts = await Alert.find({
            toUserId: req.user._id,
            villageCode: { $in: coveredVillageCodes },
            type: 'doctor-review'
        }).sort({ createdAt: -1 }).limit(100);

        const riskBuckets = reports.reduce((acc, report) => {
            acc[report.level] = (acc[report.level] || 0) + 1;
            return acc;
        }, { Low: 0, Moderate: 0, High: 0, Critical: 0 });

        res.json({
            localityType: req.user.localityType || '',
            localityName: req.user.localityName || '',
            coveredVillageCodes,
            totals: {
                users: users.length,
                reports: reports.length,
                alerts: alerts.length
            },
            riskBuckets,
            users,
            reports,
            alerts
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching village dashboard' });
    }
};

const getVillagePatients = async (req, res) => {
    try {
        const coveredVillageCodes = getCoverageVillageCodes(req.user);
        const allPatients = await User.find({ villageCode: { $in: coveredVillageCodes }, role: 'user' })
            .select('-password')
            .sort({ createdAt: -1 });

        const patientIds = allPatients.map((item) => item._id);
        const patientReports = await Report.find({ userId: { $in: patientIds } }).sort({ createdAt: -1 });

        const latestReportByUserId = new Map();
        for (const report of patientReports) {
            const ownerId = String(report.userId || '');
            if (ownerId && !latestReportByUserId.has(ownerId)) {
                latestReportByUserId.set(ownerId, report);
            }
        }

        const activePatientIdSet = new Set(
            Array.from(latestReportByUserId.entries())
                .filter(([, report]) => report.caseStatus !== 'done')
                .map(([userId]) => userId)
        );

        const patients = allPatients.filter((patient) => activePatientIdSet.has(String(patient._id)));

        res.json({ patients });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching village patients' });
    }
};

const getVillagePatientDetails = async (req, res) => {
    try {
        const coveredVillageCodes = getCoverageVillageCodes(req.user);
        const patientId = req.params.patientId;

        const patient = await User.findOne({
            _id: patientId,
            role: 'user',
            villageCode: { $in: coveredVillageCodes }
        }).select('-password');

        if (!patient) {
            return res.status(404).json({ message: 'Patient not found in your coverage area' });
        }

        const latestReport = await Report.findOne({ userId: patient._id })
            .sort({ createdAt: -1 });

        res.json({
            patient,
            latestReport
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching patient details' });
    }
};

const markPatientCaseDone = async (req, res) => {
    try {
        const coveredVillageCodes = getCoverageVillageCodes(req.user);
        const patientId = req.params.patientId;

        const patient = await User.findOne({
            _id: patientId,
            role: 'user',
            villageCode: { $in: coveredVillageCodes }
        });

        if (!patient) {
            return res.status(404).json({ message: 'Patient not found in your coverage area' });
        }

        const activeCase = await Report.findOne({
            userId: patient._id,
            caseStatus: { $ne: 'done' }
        }).sort({ createdAt: -1 });

        if (!activeCase) {
            return res.status(404).json({ message: 'No active case found for this patient' });
        }

        activeCase.caseStatus = 'done';
        activeCase.handledByOfficerId = req.user._id;
        activeCase.handledAt = new Date();
        await activeCase.save();

        res.json({ message: 'Case marked as done', reportId: activeCase._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error marking case done' });
    }
};

module.exports = {
    getVillageDashboard,
    getVillagePatients,
    getVillagePatientDetails,
    markPatientCaseDone
};
