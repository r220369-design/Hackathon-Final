const Reminder = require('../models/Reminder');
const { dispatchDueRemindersCore } = require('../services/reminderService');

const getMyReminders = async (req, res) => {
    try {
        const reminders = await Reminder.find({ userId: req.user._id }).sort({ dueAt: 1 });
        res.json({ reminders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching reminders' });
    }
};

const dispatchDueReminders = async (req, res) => {
    try {
        const { sent, failed } = await dispatchDueRemindersCore();
        res.json({ sent, failed });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error dispatching reminders' });
    }
};

module.exports = {
    getMyReminders,
    dispatchDueReminders
};
