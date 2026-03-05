const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        enum: ['Low', 'Moderate', 'High', 'Critical'],
        default: 'Low'
    },
    dueAt: {
        type: Date,
        required: true
    },
    channel: {
        type: String,
        enum: ['inapp', 'sms', 'call', 'both'],
        default: 'inapp'
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending'
    },
    sentAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);
