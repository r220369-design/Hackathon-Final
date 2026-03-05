const Report = require('../models/Report');

const MEDICAL_HINT_REGEX = /(fever|cough|cold|pain|headache|vomit|vomiting|nausea|diarrhea|chest|breath|breathing|sugar|bp|pressure|rash|injury|bleeding|pregnan|period|infection|throat|stomach|dizzy|weak|fatigue|jaundice|asthma|జ్వరం|దగ్గు|నొప్పి|తలనొప్పి|వాంతి|విరేచనాలు|ఛాతి|శ్వాస|గర్భం|బలహీనత)/i;

const NON_MEDICAL_HINT_REGEX = /(^|\b)(hi|hello|hey|thanks|thank\s*you|ok|okay|test|testing|who\s+are\s+you|how\s+are\s+you|what\s+can\s+you\s+do|good\s+morning|good\s+evening|నమస్తే|ధన్యవాదాలు)(\b|$)/i;

const isLikelyNonMedicalSymptomText = (value) => {
    const text = String(value || '').trim();
    if (!text) return true;
    if (MEDICAL_HINT_REGEX.test(text)) return false;
    if (NON_MEDICAL_HINT_REGEX.test(text)) return true;

    const words = text.split(/\s+/).filter(Boolean);
    return words.length <= 3;
};

const shouldRemoveAsNonMedicalRecord = (report) => {
    if (!report || report.sourceType !== 'symptom') return false;

    const possibleDiseasesCount = Array.isArray(report.possibleDiseases) ? report.possibleDiseases.length : 0;
    if (possibleDiseasesCount > 0) return false;

    const score = Number(report.score) || 0;
    const level = String(report.level || '').toLowerCase();
    const recommendationType = String(report.recommendationType || '').toLowerCase();

    if (score > 30) return false;
    if (!['low', 'moderate', ''].includes(level)) return false;
    if (recommendationType && recommendationType !== 'self-care') return false;

    return isLikelyNonMedicalSymptomText(report.symptoms);
};

const cleanupNonMedicalSymptomRecords = async (userId) => {
    const records = await Report.find({
        userId,
        sourceType: 'symptom'
    }).select('_id sourceType symptoms score level recommendationType possibleDiseases');

    const idsToDelete = records
        .filter(shouldRemoveAsNonMedicalRecord)
        .map((item) => item._id);

    if (!idsToDelete.length) return 0;

    const result = await Report.deleteMany({ _id: { $in: idsToDelete } });
    return result.deletedCount || 0;
};

module.exports = {
    isLikelyNonMedicalSymptomText,
    cleanupNonMedicalSymptomRecords
};
