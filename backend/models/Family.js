const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
    groupCode: {
        type: String,
        required: true,
        unique: true
    },
    villageCode: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    memberCount: {
        type: Number,
        default: 1
    }
}, { timestamps: true });

module.exports = mongoose.model('Family', familySchema);
