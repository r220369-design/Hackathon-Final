const Reminder = require('../models/Reminder');
const { createInAppAlert, sendExternalNotification } = require('./notificationService');

const dispatchDueRemindersCore = async () => {
    const now = new Date();
    const reminders = await Reminder.find({ status: 'pending', dueAt: { $lte: now } }).populate('userId', 'phone notificationPreference villageCode');

    let sent = 0;
    let failed = 0;

    for (const reminder of reminders) {
        const user = reminder.userId;
        const preferred = reminder.channel || user.notificationPreference || 'inapp';

        await createInAppAlert({
            toUserId: user._id,
            message: reminder.message,
            type: 'reminder',
            villageCode: user.villageCode,
            channel: 'inapp',
            status: 'sent'
        });

        if (preferred !== 'inapp') {
            const channels = preferred === 'both' ? ['sms', 'call'] : [preferred];
            for (const channel of channels) {
                const response = await sendExternalNotification({
                    channel,
                    to: user.phone,
                    message: reminder.message
                });

                await createInAppAlert({
                    toUserId: user._id,
                    message: `[${channel.toUpperCase()}] ${reminder.message}`,
                    type: 'reminder',
                    villageCode: user.villageCode,
                    channel,
                    status: response.ok ? 'sent' : 'failed'
                });

                if (!response.ok) {
                    failed += 1;
                }
            }
        }

        reminder.status = 'sent';
        reminder.sentAt = new Date();
        await reminder.save();
        sent += 1;
    }

    return { sent, failed };
};

module.exports = { dispatchDueRemindersCore };
