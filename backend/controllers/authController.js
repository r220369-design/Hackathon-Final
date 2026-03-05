const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { sendExternalNotification } = require('../services/notificationService');
const { getOfficerCoverageByCode } = require('../config/officerCoverage');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, phone, role, language, age, isPregnant, villageCode, notificationPreference, officerCode } = req.body;
        const normalizedRole = role || 'user';
        const normalizedEmail = String(email || '').trim().toLowerCase();

        let officerProfile = null;
        if (normalizedRole === 'officer') {
            officerProfile = getOfficerCoverageByCode(officerCode);
            if (!officerProfile) {
                return res.status(400).json({ message: 'Invalid officer code' });
            }
        } else if (!String(villageCode || '').trim()) {
            return res.status(400).json({ message: 'Village code is required' });
        }

        if (normalizedEmail) {
            const userExists = await User.findOne({ email: normalizedEmail });
            if (userExists) {
                return res.status(400).json({ message: 'User already exists' });
            }
        }

        const user = await User.create({
            name: name || '',
            email: normalizedEmail || undefined,
            password,
            phone,
            role: normalizedRole,
            language: language || 'te',
            age,
            isPregnant: isPregnant || false,
            villageCode: normalizedRole === 'officer'
                ? officerProfile.coveredVillageCodes[0]
                : villageCode,
            officerCode: normalizedRole === 'officer' ? officerProfile.officerCode : '',
            localityType: normalizedRole === 'officer' ? officerProfile.localityType : '',
            localityName: normalizedRole === 'officer' ? officerProfile.localityName : '',
            coveredVillageCodes: normalizedRole === 'officer' ? officerProfile.coveredVillageCodes : [],
            notificationPreference: notificationPreference || 'inapp'
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                language: user.language,
                age: user.age,
                isPregnant: user.isPregnant,
                villageCode: user.villageCode,
                officerCode: user.officerCode,
                localityType: user.localityType,
                localityName: user.localityName,
                coveredVillageCodes: user.coveredVillageCodes,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Server Error',
            ...(process.env.NODE_ENV !== 'production' ? { error: error.message } : {})
        });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                language: user.language,
                age: user.age,
                isPregnant: user.isPregnant,
                villageCode: user.villageCode,
                officerCode: user.officerCode,
                localityType: user.localityType,
                localityName: user.localityName,
                coveredVillageCodes: user.coveredVillageCodes,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Request SMS OTP for user login
// @route   POST /api/auth/login/sms/request
// @access  Public
const requestSmsLoginOtp = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        const user = await User.findOne({ phone, role: 'user' });

        if (!user) {
            return res.status(404).json({ message: 'User not found for this phone number' });
        }

        const otp = String(crypto.randomInt(100000, 1000000));
        const otpHash = await bcrypt.hash(otp, 10);

        user.loginOtpHash = otpHash;
        user.loginOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        user.loginOtpAttempts = 0;
        await user.save();

        const message = `Your Ayushseva AI login OTP is ${otp}. It is valid for 10 minutes.`;
        const smsResult = await sendExternalNotification({
            channel: 'sms',
            to: user.phone,
            message
        });

        if (!smsResult.ok) {
            return res.status(500).json({
                message: 'Failed to send OTP SMS',
                ...(process.env.NODE_ENV !== 'production' ? { error: smsResult.error } : {})
            });
        }

        res.json({ message: 'OTP sent to registered phone number' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Verify SMS OTP and login user
// @route   POST /api/auth/login/sms/verify
// @access  Public
const verifySmsLoginOtp = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ message: 'Phone and OTP are required' });
        }

        const user = await User.findOne({ phone, role: 'user' });

        if (!user || !user.loginOtpHash || !user.loginOtpExpiresAt) {
            return res.status(401).json({ message: 'OTP not requested or invalid' });
        }

        if (user.loginOtpAttempts >= 5) {
            return res.status(429).json({ message: 'Too many failed attempts. Request a new OTP.' });
        }

        if (user.loginOtpExpiresAt.getTime() < Date.now()) {
            return res.status(401).json({ message: 'OTP expired. Request a new OTP.' });
        }

        const isOtpValid = await bcrypt.compare(String(otp), user.loginOtpHash);

        if (!isOtpValid) {
            user.loginOtpAttempts += 1;
            await user.save();
            return res.status(401).json({ message: 'Invalid OTP' });
        }

        user.loginOtpHash = undefined;
        user.loginOtpExpiresAt = undefined;
        user.loginOtpAttempts = 0;
        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            language: user.language,
            age: user.age,
            isPregnant: user.isPregnant,
            villageCode: user.villageCode,
            officerCode: user.officerCode,
            localityType: user.localityType,
            localityName: user.localityName,
            coveredVillageCodes: user.coveredVillageCodes,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    requestSmsLoginOtp,
    verifySmsLoginOtp,
    getUserProfile,
};
