const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sourceType: {
        type: String,
        enum: ['symptom', 'medical_report'],
        default: 'symptom'
    },
    symptoms: {
        type: String,
        default: ''
    },
    score: {
        type: Number,
        default: null
    },
    level: {
        type: String, // Low, Moderate, High, Critical
        default: 'Unknown'
    },
    possibleDiseases: [{
        type: String
    }],
    recommendation: {
        type: String,
        required: true
    },
    explanation: {
        type: String,
        required: true
    },
    isContagious: {
        type: Boolean,
        default: false
    },
    recommendationType: {
        type: String,
        enum: ['self-care', 'teleconsultation', 'hospital-visit', 'emergency'],
        default: 'self-care'
    },
    familyPrecautions: {
        type: String,
        default: ''
    },
    emergencyAction: {
        type: String,
        default: ''
    },
    caseStatus: {
        type: String,
        enum: ['open', 'done'],
        default: 'open'
    },
    handledByOfficerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    handledAt: {
        type: Date
    },
    reportFile: {
        fileName: String,
        mimeType: String,
        size: Number
    },
    recoveryStatus: {
        type: String,
        enum: ['active', 'improving', 'cured', 'worsening'],
        default: 'active'
    },
    recoveredAt: {
        type: Date,
        default: null
    },
    recoveryNotes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
