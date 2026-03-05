const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    toUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    fromUserName: {
        type: String,
        default: ''
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['reminder', 'contagious', 'critical', 'general', 'doctor-review', 'vaccination'],
        required: true
    },
    villageCode: {
        type: String,
        default: ''
    },
    channel: {
        type: String,
        enum: ['inapp', 'sms', 'call'],
        default: 'inapp'
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending'
    },
    read: {
        type: Boolean,
        default: false
    },
    // Additional medical details for context
    reportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report'
    },
    symptoms: {
        type: String,
        default: ''
    },
    riskScore: {
        type: Number,
        default: null
    },
    riskLevel: {
        type: String,
        enum: ['low', 'moderate', 'high', 'critical'],
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
