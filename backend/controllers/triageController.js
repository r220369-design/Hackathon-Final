const Report = require('../models/Report');
const User = require('../models/User');
const Family = require('../models/Family');
const Reminder = require('../models/Reminder');
const { createInAppAlert } = require('../services/notificationService');
const { getNearbyHospitalsWithMeta, getCoordinatesForCity, getAndhraPradeshCities } = require('../utils/hospitals');
const { isLikelyNonMedicalSymptomText, cleanupNonMedicalSymptomRecords } = require('../utils/medicalRecords');
const { generateAiText } = require('../services/aiClient');

const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();
const MODERATE_SCORE_MIN = 50;
const SEVERE_SCORE_MIN = 80;
const CRITICAL_SCORE_MIN = 90;

const getRecommendationType = (level) => {
    const normalized = String(level || '').toLowerCase();
    if (normalized === 'critical') return 'emergency';
    if (normalized === 'high') return 'hospital-visit';
    if (normalized === 'moderate') return 'teleconsultation';
    return 'self-care';
};

const parseJsonFromModelText = (responseText) => {
    let jsonString = responseText;
    if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7);
    if (jsonString.startsWith('```')) jsonString = jsonString.slice(3);
    if (jsonString.endsWith('```')) jsonString = jsonString.slice(0, -3);

    const cleaned = String(jsonString || '').trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const candidate = cleaned.slice(firstBrace, lastBrace + 1);
            return JSON.parse(candidate);
        }
        throw new Error('Model did not return valid JSON');
    }
};

const formatConditionSummary = ({ level, symptoms, possibleDiseases = [], language = 'en' }) => {
    const lang = getPreferredLanguage(language, language);
    const normalizedSymptoms = String(symptoms || '').replace(/\s+/g, ' ').trim();
    const symptomSnippet = normalizedSymptoms.length > 120
        ? `${normalizedSymptoms.slice(0, 117)}...`
        : normalizedSymptoms;
    const diseaseSnippet = Array.isArray(possibleDiseases) && possibleDiseases.length > 0
        ? possibleDiseases.slice(0, 2).join(', ')
        : '';

    const summaryParts = [
        lang === 'te' ? `రిస్క్: ${level}` : `Risk: ${level}`,
        symptomSnippet ? (lang === 'te' ? `లక్షణాలు: ${symptomSnippet}` : `Symptoms: ${symptomSnippet}`) : '',
        diseaseSnippet ? (lang === 'te' ? `సంభావ్య పరిస్థితులు: ${diseaseSnippet}` : `Possible conditions: ${diseaseSnippet}`) : ''
    ].filter(Boolean);

    return summaryParts.join(' | ');
};

const sendOfficerSymptomAlerts = async ({ user, level, isSevereCase, subjectLabel, summaryPayload, senderName }) => {
    const officers = await User.find({
        role: 'officer',
        $or: [
            { coveredVillageCodes: user.villageCode },
            { villageCode: user.villageCode }
        ]
    }).select('_id language');

    if (!officers.length) return;

    for (const officer of officers) {
        const officerLang = getPreferredLanguage(officer.language, officer.language);
        const conditionSummary = formatConditionSummary({ ...summaryPayload, language: officerLang });
        const officerMessage = isSevereCase
            ? (officerLang === 'te'
                ? `${subjectLabel} కోసం తీవ్రమైన కేసు గుర్తించబడింది. ${conditionSummary}. తక్షణ PHC మాన్యువల్ సమీక్ష అవసరం.`
                : `Severe case flagged for ${subjectLabel}. ${conditionSummary}. Immediate manual PHC review required.`)
            : (officerLang === 'te'
                ? `${subjectLabel} నుండి కొత్త లక్షణాల కేసు సమర్పించబడింది. ${conditionSummary}. డ్యాష్‌బోర్డ్‌లో సమీక్షించండి.`
                : `New symptom case submitted by ${subjectLabel}. ${conditionSummary}. Please review in dashboard.`);

        await createInAppAlert({
            toUserId: officer._id,
            fromUserId: user._id,
            fromUserName: senderName,
            message: officerMessage,
            type: isSevereCase ? 'critical' : 'doctor-review',
            villageCode: user.villageCode,
            status: 'sent'
        });
    }
};

const sendFamilySymptomAlerts = async ({ user, preferredLanguage, level, isSevereCase, isContagious, familyPrecautions, subjectLabel, summaryPayload, senderName, reportId }) => {
    if (!user.familyGroupId) return;

    const family = await Family.findById(user.familyGroupId).select('members');
    if (!family?.members?.length) return;

    const recipientIds = family.members.filter((memberId) => String(memberId) !== String(user._id));
    if (!recipientIds.length) return;
    const recipients = await User.find({ _id: { $in: recipientIds } }).select('_id language');

    for (const recipient of recipients) {
        const recipientLang = getPreferredLanguage(recipient.language, recipient.language);
        const conditionSummary = formatConditionSummary({ ...summaryPayload, language: recipientLang });
        const localizedPrecautions = recipientLang === preferredLanguage
            ? String(familyPrecautions || '').trim()
            : '';

        // Extract symptoms and diseases from payload
        const symptoms = String(summaryPayload.symptoms || '').trim();
        const symptomsSnippet = symptoms.length > 100 ? `${symptoms.slice(0, 100)}...` : symptoms;
        const possibleDiseases = summaryPayload.possibleDiseases && summaryPayload.possibleDiseases.length > 0 
            ? summaryPayload.possibleDiseases.slice(0, 2).join(', ')
            : '';

        let familyMessage;
        if (isSevereCase) {
            if (recipientLang === 'te') {
                familyMessage = `🚨 ${subjectLabel} కు తీవ్రమైన ఆరోగ్య ప్రమాదం గుర్తించబడింది\n\nలక్షణాలు: ${symptomsSnippet}\nస్థితి: ${conditionSummary}\n\nదయచేసి PHC కి సంప్రదించండి.`;
            } else {
                familyMessage = `🚨 Severe health risk detected for ${subjectLabel}\n\nSymptoms: ${symptomsSnippet}\nCondition: ${conditionSummary}\n\nPlease contact PHC immediately.`;
            }
        } else if (isContagious) {
            if (recipientLang === 'te') {
                familyMessage = `⚠️ ${subjectLabel} కు అంటువ్యాధి నష్టం ఉండవచ్చు\n\nలక్షణాలు: ${symptomsSnippet}\nస్థితి: ${conditionSummary}\n${localizedPrecautions ? `జాగ్రత్తలు: ${localizedPrecautions}` : ''}`;
            } else {
                familyMessage = `⚠️ Contagious risk detected for ${subjectLabel}\n\nSymptoms: ${symptomsSnippet}\nCondition: ${conditionSummary}\n${localizedPrecautions ? `Precautions: ${localizedPrecautions}` : ''}`;
            }
        } else {
            if (recipientLang === 'te') {
                familyMessage = `ℹ️ ${subjectLabel} ఆరోగ్య లక్షణాలు నమోదు చేశారు\n\nలక్షణాలు: ${symptomsSnippet}\nస్థితి: ${conditionSummary}\n\nదయచేసి పరిస్థితిని గమనించండి.`;
            } else {
                familyMessage = `ℹ️ ${subjectLabel} has submitted health symptoms\n\nSymptoms: ${symptomsSnippet}\nCondition: ${conditionSummary}\n\nPlease monitor the situation.`;
            }
        }

        await createInAppAlert({
            toUserId: recipient._id,
            fromUserId: user._id,
            fromUserName: senderName,
            message: familyMessage,
            type: isSevereCase ? 'critical' : (isContagious ? 'contagious' : 'general'),
            villageCode: user.villageCode,
            status: 'sent',
            reportId: reportId,
            symptoms: symptoms,
            riskLevel: String(level || '').toLowerCase(),
            riskScore: summaryPayload.riskScore || null
        });
    }
};


const createSeverityReminder = async ({ user, reportId, level }) => {
    const normalizedLevel = String(level || 'Low').toLowerCase();
    const followUpPlanByLevel = {
        critical: [
            { hours: 6 },
            { days: 1 },
            { days: 3 }
        ],
        high: [
            { hours: 12 },
            { days: 2 },
            { days: 5 }
        ],
        moderate: [
            { days: 1 },
            { days: 3 }
        ],
        low: [
            { days: 2 }
        ]
    };

    const followUps = followUpPlanByLevel[normalizedLevel] || followUpPlanByLevel.low;
    const isTelugu = getPreferredLanguage(user.language, user.language) === 'te';
    const reminderTitle = isTelugu ? 'ఆరోగ్య స్థితి ఫాలో-అప్' : 'Health status follow-up';
    const baseMessage = isTelugu
        ? `మీ పరిస్థితి ఇప్పుడు ఎలా ఉంది? చాట్‌బాట్‌లో తాజా లక్షణాలు అప్‌డేట్ చేయండి. రిస్క్ స్థాయి: ${level}`
        : `How is your condition now? Please update your latest symptoms in chat. Risk level: ${level}`;

    for (const slot of followUps) {
        const dueAt = new Date();
        if (slot.hours) {
            dueAt.setHours(dueAt.getHours() + slot.hours);
        }
        if (slot.days) {
            dueAt.setDate(dueAt.getDate() + slot.days);
        }

        const dueStart = new Date(dueAt.getTime() - (45 * 60 * 1000));
        const dueEnd = new Date(dueAt.getTime() + (45 * 60 * 1000));

        const duplicate = await Reminder.findOne({
            userId: user._id,
            title: reminderTitle,
            status: 'pending',
            dueAt: { $gte: dueStart, $lte: dueEnd }
        }).select('_id');

        if (duplicate) {
            continue;
        }

        await Reminder.create({
            userId: user._id,
            reportId,
            title: reminderTitle,
            message: baseMessage,
            severity: level,
            dueAt,
            channel: user.notificationPreference || 'inapp'
        });
    }
};

const getPreferredLanguage = (requestedLanguage, userLanguage) => {
    const lang = String(requestedLanguage || userLanguage || 'en').toLowerCase();
    if (lang === 'te' || lang.startsWith('te-') || lang.includes('telugu')) return 'te';
    return 'en';
};

const hasTeluguText = (value) => /[\u0C00-\u0C7F]/.test(String(value || ''));

const ensureTeluguResponse = async (analysis) => {
    const recommendation = String(analysis.recommendation || '');
    const explanation = String(analysis.explanation || '');
    const familyPrecautions = String(analysis.familyPrecautions || '');
    const emergencyAction = String(analysis.emergencyAction || '');

    const alreadyTelugu = [recommendation, explanation, familyPrecautions, emergencyAction]
        .filter((field) => field.trim().length > 0)
        .every((field) => hasTeluguText(field));

    if (alreadyTelugu) return analysis;

    const translationPrompt = `
Translate the following medical guidance fields into Telugu (Telugu script only).
Keep meaning exactly the same. Return ONLY valid JSON.
{
  "recommendation": "<Telugu>",
  "explanation": "<Telugu>",
  "familyPrecautions": "<Telugu or empty>",
  "emergencyAction": "<Telugu or empty>"
}
Input JSON:
${JSON.stringify({ recommendation, explanation, familyPrecautions, emergencyAction })}
`;

    const translatedText = await generateAiText({
        prompt: translationPrompt,
        expectJson: true,
        task: 'triage-translation'
    });
    const translated = parseJsonFromModelText(translatedText);

    return {
        ...analysis,
        recommendation: translated.recommendation || recommendation,
        explanation: translated.explanation || explanation,
        familyPrecautions: translated.familyPrecautions || familyPrecautions,
        emergencyAction: translated.emergencyAction || emergencyAction
    };
};

const getRecentHistoryForPrompt = async (userId) => {
    const historyReports = await Report.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('symptoms score level possibleDiseases recommendationType createdAt');

    return historyReports.map((item) => ({
        date: item.createdAt,
        symptoms: item.symptoms,
        score: item.score,
        level: item.level,
        possibleDiseases: item.possibleDiseases,
        recommendationType: item.recommendationType
    }));
};

// @desc    Analyze symptoms using AI
// @route   POST /api/triage/analyze
// @access  Private
const analyzeSymptoms = async (req, res) => {
    try {
        const { symptomText, language, location } = req.body;
        const user = req.user; // from protect middleware
        const preferredLanguage = getPreferredLanguage(language, user.language);

        if (!symptomText) {
            return res.status(400).json({ message: 'Symptom text is required' });
        }

        const recentHistory = await getRecentHistoryForPrompt(user._id);

        const prompt = `
You are a rural health triage assistant for Andhra Pradesh, India.
Patient symptoms: "${symptomText}"
Age: ${user.age} | Pregnant: ${user.isPregnant} | Preferred language: ${preferredLanguage}
Patient recent health history (latest 5 records, JSON): ${JSON.stringify(recentHistory)}
 
Respond ONLY in valid JSON:
{
    "isMedicalSymptomInput": <true|false>,
    "symptomSummary": "<only clinical symptoms from user input, concise, no greetings/chitchat>",
  "score": <0-100>,
  "level": "<Low|Moderate|High|Critical>",
  "possibleDiseases": ["disease1", "disease2"],
  "isContagious": <true|false>,
    "recommendationType": "<self-care|teleconsultation|hospital-visit|emergency>",
    "recommendation": "<advice in preferred language>",
    "explanation": "<why this score using current symptoms + history, in preferred language>",
    "clarificationQuestion": "<if not medical symptom input, ask user to provide concrete symptoms>",
  "familyPrecautions": "<if contagious, else empty>",
  "emergencyAction": "<if Critical, else empty>"
}
Rules:
- Use patient history trends along with current symptoms.
- symptomSummary must include only symptom phrases (for history storage), not full chat sentences.
- If preferred language is te, recommendation and explanation must be in Telugu script.
- If preferred language is en, recommendation and explanation must be in simple English.
- age>60 or pregnant = +10 score.
- No extra text, JSON only.
`;

        let analysis;
        try {
            const responseText = await generateAiText({
                prompt,
                expectJson: true,
                task: 'triage-analysis'
            });
            analysis = parseJsonFromModelText(responseText);
        } catch (modelError) {
            console.error('AI triage generation failed:', modelError?.message || modelError);
            return res.status(503).json({ message: 'AI service is currently unavailable. Please try again.' });
        }

        if (preferredLanguage === 'te') {
            try {
                analysis = await ensureTeluguResponse(analysis);
            } catch (translationError) {
                console.error('Failed to enforce Telugu response:', translationError);
            }
        }

        const isMedicalSymptomInput = analysis.isMedicalSymptomInput !== false;
        if (!isMedicalSymptomInput) {
            return res.status(200).json({
                isMedicalSymptomInput: false,
                reportId: null,
                historyRecorded: false,
                recommendationType: 'self-care',
                recommendation: analysis.recommendation || (preferredLanguage === 'te'
                    ? 'దయచేసి జ్వరం, దగ్గు, నొప్పి వంటి స్పష్టమైన లక్షణాలను చెప్పండి.'
                    : 'Please share specific symptoms like fever, cough, or pain.'),
                explanation: analysis.explanation || '',
                clarificationQuestion: analysis.clarificationQuestion || (preferredLanguage === 'te'
                    ? 'మీకు ఏమి సమస్య ఉంది? ఎప్పటి నుండి ఉంది?'
                    : 'What exact symptoms do you have, and since when?'),
                nearbyHospitals: []
            });
        }

        let score = Number(analysis.score) || 0;

        if (user.age > 60 || user.isPregnant) {
            score += 10;
        }
        score = Math.max(0, Math.min(100, score));

        let level = analysis.level;
        if (!level) {
            if (score >= CRITICAL_SCORE_MIN) level = 'Critical';
            else if (score >= SEVERE_SCORE_MIN) level = 'High';
            else if (score >= MODERATE_SCORE_MIN) level = 'Moderate';
            else level = 'Low';
        }

        if (location?.lat !== undefined && location?.lng !== undefined) {
            await User.findByIdAndUpdate(user._id, {
                location: {
                    lat: Number(location.lat),
                    lng: Number(location.lng)
                }
            });
        }

        const recommendationType = analysis.recommendationType || getRecommendationType(level);
        const symptomsForHistory = String(analysis.symptomSummary || '').trim()
            || (Array.isArray(analysis.possibleDiseases) ? analysis.possibleDiseases.join(', ') : '')
            || 'Symptom details provided';

        const normalizedLevel = String(level || '').toLowerCase();
        const isModerateCase = score >= MODERATE_SCORE_MIN || normalizedLevel === 'moderate' || normalizedLevel === 'high' || normalizedLevel === 'critical';
        const isSevereCase = score >= SEVERE_SCORE_MIN || normalizedLevel === 'high' || normalizedLevel === 'critical' || recommendationType === 'hospital-visit' || recommendationType === 'emergency';

        if (isSevereCase) {
            analysis.recommendation = preferredLanguage === 'te'
                ? 'ఆందోళన చెందవద్దు. మీ వివరాలను ఉన్నత అధికారులకు పంపిస్తున్నాం. వారు త్వరలోనే మీతో సంప్రదిస్తారు.'
                : "Don't panic. We are sending your details to higher officers now. They will contact you shortly.";
            analysis.explanation = preferredLanguage === 'te'
                ? 'ఇది తీవ్రమైన కేసుగా గుర్తించబడింది. కుటుంబ సభ్యులు మరియు PHC అధికారులకు అలర్ట్ పంపించాం. మాన్యువల్ సమీక్ష జరుగుతుంది.'
                : 'This case is marked severe. Alerts have been sent to family members and PHC officers for manual review.';
        }

        if (isLikelyNonMedicalSymptomText(symptomsForHistory)) {
            return res.status(200).json({
                isMedicalSymptomInput: false,
                reportId: null,
                historyRecorded: false,
                recommendationType: 'self-care',
                recommendation: preferredLanguage === 'te'
                    ? 'ఇది వైద్య లక్షణంగా కనిపించడం లేదు. దయచేసి జ్వరం, దగ్గు, నొప్పి వంటి స్పష్టమైన లక్షణాలు చెప్పండి.'
                    : 'This does not appear to be a medical symptom input. Please share specific symptoms like fever, cough, or pain.',
                explanation: '',
                clarificationQuestion: preferredLanguage === 'te'
                    ? 'మీకు ఉన్న ఆరోగ్య లక్షణాలు ఏమిటి? ఎప్పటి నుండి ఉన్నాయి?'
                    : 'What health symptoms are you experiencing, and since when?',
                nearbyHospitals: []
            });
        }

        const nearbyHospitalsResult = await getNearbyHospitalsWithMeta(location?.lat, location?.lng, 5);
        const nearbyHospitals = nearbyHospitalsResult.hospitals;

        // Save to Report collection
        const report = await Report.create({
            userId: user._id,
            sourceType: 'symptom',
            symptoms: symptomsForHistory,
            score,
            level,
            possibleDiseases: analysis.possibleDiseases,
            recommendation: analysis.recommendation,
            explanation: analysis.explanation,
            isContagious: analysis.isContagious,
            recommendationType,
            familyPrecautions: analysis.familyPrecautions || '',
            emergencyAction: analysis.emergencyAction || ''
        });

        const senderName = user.name || user.phone || user.email || 'A family member';
        const subjectLabel = senderName;
        const summaryPayload = {
            level,
            symptoms: symptomsForHistory,
            possibleDiseases: analysis.possibleDiseases
        };

        await sendOfficerSymptomAlerts({ user, level, isSevereCase, subjectLabel, summaryPayload, senderName });
        await sendFamilySymptomAlerts({
            user,
            preferredLanguage,
            level,
            isSevereCase,
            isContagious: Boolean(analysis.isContagious),
            familyPrecautions: analysis.familyPrecautions,
            subjectLabel,
            summaryPayload,
            senderName,
            reportId: report._id
        });

        await createSeverityReminder({ user, reportId: report._id, level });

        res.status(201).json({
            reportId: report._id,
            ...analysis,
            isMedicalSymptomInput: true,
            historyRecorded: true,
            score,
            level,
            recommendationType,
            hospitalsSource: nearbyHospitalsResult.source,
            nearbyHospitals
        });

    } catch (error) {
        console.error(`AI API Error (provider: ${AI_PROVIDER}):`, error);
        res.status(500).json({ message: 'Error analyzing symptoms with AI' });
    }
};

const getHospitals = async (req, res) => {
    try {
        const { lat, lng, city, limit } = req.query;

        let resolvedLat = lat;
        let resolvedLng = lng;

        if ((resolvedLat === undefined || resolvedLng === undefined) && city) {
            const coordinates = await getCoordinatesForCity(city);
            if (!coordinates) {
                return res.status(400).json({ message: 'Unable to resolve city location. Please try another Andhra Pradesh city.' });
            }
            resolvedLat = coordinates.lat;
            resolvedLng = coordinates.lng;
        }

        if (resolvedLat === undefined || resolvedLng === undefined) {
            return res.status(400).json({ message: 'Current location (lat, lng) or city is required' });
        }

        const parsedLat = Number(resolvedLat);
        const parsedLng = Number(resolvedLng);
        if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
            return res.status(400).json({ message: 'Invalid location coordinates' });
        }

        const hospitalsResult = await getNearbyHospitalsWithMeta(parsedLat, parsedLng, Number(limit) || 5);
        res.json({ hospitals: hospitalsResult.hospitals, source: hospitalsResult.source });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching hospital list' });
    }
};

const getAndhraPradeshCitiesList = async (req, res) => {
    try {
        const query = String(req.query.query || '').trim().toLowerCase();
        const cities = await getAndhraPradeshCities();
        const filtered = query
            ? cities.filter((city) => city.toLowerCase().includes(query)).slice(0, 100)
            : cities.slice(0, 300);

        res.json({ cities: filtered });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching Andhra Pradesh cities' });
    }
};

const getMyMedicalHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = Math.min(Number(req.query.limit) || 20, 100);

        await cleanupNonMedicalSymptomRecords(userId);

        const historyFilter = { userId, sourceType: { $in: ['symptom', 'medical_report'] } };

        const records = await Report.find(historyFilter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('sourceType symptoms score level possibleDiseases recommendation explanation isContagious recommendationType familyPrecautions emergencyAction createdAt');

        const totalRecords = await Report.countDocuments(historyFilter);
        const averageScore = records.length
            ? Math.round(records.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / records.length)
            : 0;

        const latestScore = records[0]?.score ?? null;
        const previousScore = records[1]?.score ?? null;
        const scoreTrend = latestScore === null || previousScore === null
            ? 'stable'
            : latestScore > previousScore
                ? 'worsening'
                : latestScore < previousScore
                    ? 'improving'
                    : 'stable';

        res.json({
            totalRecords,
            averageScore,
            latestScore,
            scoreTrend,
            records
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching medical history' });
    }
};

module.exports = { analyzeSymptoms, getHospitals, getMyMedicalHistory, getAndhraPradeshCitiesList };
