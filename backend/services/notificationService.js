const Alert = require('../models/Alert');
const twilio = require('twilio');

let twilioClient;

const getTwilioClient = () => {
    if (twilioClient) return twilioClient;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) return null;

    twilioClient = twilio(accountSid, authToken);
    return twilioClient;
};

const normalizePhoneNumber = (phone) => {
    if (!phone) return phone;
    const trimmed = String(phone).trim();
    if (trimmed.startsWith('+')) return trimmed;
    return `+91${trimmed}`;
};

const sendExternalNotification = async ({ channel, to, message }) => {
    if (channel === 'sms') {
        const client = getTwilioClient();
        const from = process.env.TWILIO_FROM_NUMBER;

        if (client && from) {
            try {
                await client.messages.create({
                    body: message,
                    from,
                    to: normalizePhoneNumber(to)
                });

                return { ok: true, mode: 'twilio' };
            } catch (error) {
                return { ok: false, error: error.message };
            }
        }
    }

    const webhook = process.env.NOTIFICATION_WEBHOOK_URL;

    if (!webhook) {
        console.log(`[Notification:${channel}] -> ${to}: ${message}`);
        return { ok: true, mode: 'mock' };
    }

    try {
        const response = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel, to, message })
        });

        if (!response.ok) {
            throw new Error(`Webhook failed with ${response.status}`);
        }

        return { ok: true, mode: 'webhook' };
    } catch (error) {
        return { ok: false, error: error.message };
    }
};

const createInAppAlert = async ({ toUserId, fromUserId, fromUserName = '', message, type, villageCode = '', channel = 'inapp', status = 'pending', reportId = null, symptoms = '', riskLevel = null, riskScore = null }) => {
    return Alert.create({ toUserId, fromUserId, fromUserName, message, type, villageCode, channel, status, reportId, symptoms, riskLevel, riskScore });
};

module.exports = {
    sendExternalNotification,
    createInAppAlert
};
