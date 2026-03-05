const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: undefined,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'officer'],
        default: 'user'
    },
    language: {
        type: String,
        enum: ['te', 'en'],
        default: 'te'
    },
    age: {
        type: Number,
        required: true
    },
    isPregnant: {
        type: Boolean,
        default: false
    },
    villageCode: {
        type: String,
        required: function () {
            return this.role !== 'officer';
        },
        default: ''
    },
    officerCode: {
        type: String,
        default: ''
    },
    localityType: {
        type: String,
        enum: ['phc', 'municipality', ''],
        default: ''
    },
    localityName: {
        type: String,
        default: ''
    },
    coveredVillageCodes: [{
        type: String
    }],
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },
    notificationPreference: {
        type: String,
        enum: ['sms', 'call', 'both', 'inapp'],
        default: 'inapp'
    },
    familyGroupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Family'
    },
    loginOtpHash: {
        type: String
    },
    loginOtpExpiresAt: {
        type: Date
    },
    loginOtpAttempts: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
