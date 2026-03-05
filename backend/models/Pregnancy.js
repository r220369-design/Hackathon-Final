const mongoose = require('mongoose');

const pregnancySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dueDate: {
        type: String,
        required: true
    },
    monthlyCheckups: [{
        month: Number,
        date: { type: Date, default: Date.now },
        doctorNotes: String,
        riskLevel: {
            type: String,
            enum: ['Low', 'Moderate', 'High', 'Critical'],
            default: 'Low'
        },
        recommendations: String
    }],
    notes: [{
        week: Number,
        text: String,
        date: { type: Date, default: Date.now }
    }],
    babies: [{
        name: String,
        dob: String,
        vaccinations: [{
            vaccine: String,
            dueDate: String,
            completed: {
                type: Boolean,
                default: false
            },
            completedOn: String
        }]
    }]
}, { timestamps: true });

module.exports = mongoose.model('Pregnancy', pregnancySchema);
