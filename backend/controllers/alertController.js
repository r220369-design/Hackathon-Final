const Alert = require('../models/Alert');

const normalizeSenderName = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    const lowered = text.toLowerCase();
    if (lowered === 'undefined' || lowered === 'null' || lowered === 'not specified') return '';
    return text;
};

const buildSenderName = (alertItem) => {
    const storedName = normalizeSenderName(alertItem.fromUserName);
    if (storedName) return storedName;

    const linkedUserName = normalizeSenderName(alertItem.fromUserId?.name)
        || normalizeSenderName(alertItem.fromUserId?.phone)
        || normalizeSenderName(alertItem.fromUserId?.email);
    if (linkedUserName) return linkedUserName;

    return '';
};

const enrichAlertsWithSenderName = async (alerts) => {
    const backfillOps = [];
    const enrichedAlerts = alerts.map((alertDoc) => {
        const senderName = buildSenderName(alertDoc);
        const plain = alertDoc.toObject({ virtuals: false });

        if (!normalizeSenderName(plain.fromUserName) && senderName) {
            backfillOps.push({
                updateOne: {
                    filter: { _id: alertDoc._id },
                    update: { $set: { fromUserName: senderName } }
                }
            });
        }

        return {
            ...plain,
            senderName
        };
    });

    if (backfillOps.length > 0) {
        try {
            await Alert.bulkWrite(backfillOps);
        } catch (error) {
            console.error('Alert sender-name backfill failed:', error?.message || error);
        }
    }

    return enrichedAlerts;
};

const getMyAlerts = async (req, res) => {
    try {
        const alertDocs = await Alert.find({ toUserId: req.user._id })
            .populate('fromUserId', 'name phone email role')
            .sort({ createdAt: -1 });
        const alerts = await enrichAlertsWithSenderName(alertDocs);
        const unreadCount = alerts.reduce((count, alertItem) => count + (alertItem.read ? 0 : 1), 0);
        res.json({ alerts, unreadCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching alerts' });
    }
};

const markAlertRead = async (req, res) => {
    try {
        const alert = await Alert.findOne({ _id: req.params.id, toUserId: req.user._id });
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        alert.read = true;
        await alert.save();

        res.json(alert);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error updating alert' });
    }
};

const markAllAlertsRead = async (req, res) => {
    try {
        await Alert.updateMany(
            { toUserId: req.user._id, read: false },
            { $set: { read: true } }
        );

        const alertDocs = await Alert.find({ toUserId: req.user._id })
            .populate('fromUserId', 'name phone email role')
            .sort({ createdAt: -1 });
        const alerts = await enrichAlertsWithSenderName(alertDocs);
        res.json({ alerts, unreadCount: 0 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error updating alerts' });
    }
};

module.exports = {
    getMyAlerts,
    markAlertRead,
    markAllAlertsRead
};
