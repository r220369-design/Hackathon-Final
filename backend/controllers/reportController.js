const Report = require('../models/Report');
const User = require('../models/User');
const { createInAppAlert } = require('../services/notificationService');
const { cleanupNonMedicalSymptomRecords } = require('../utils/medicalRecords');
const { generateAiText } = require('../services/aiClient');

const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();
const MAX_EXTRACTED_TEXT_CHARS = 12000;
const MODERATE_SCORE_MIN = 50;
const SEVERE_SCORE_MIN = 80;
const CRITICAL_SCORE_MIN = 90;

const safeRequire = (moduleName) => {
    try {
        return require(moduleName);
    } catch {
        return null;
    }
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

const extractWithGeminiVision = async (buffer, mimeType) => {
    try {
        if (!buffer || !mimeType) return '';

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return '';

        const geminiModule = safeRequire('@google/generative-ai');
        const GoogleGenerativeAI = geminiModule?.GoogleGenerativeAI;
        if (!GoogleGenerativeAI) return '';

        const modelName = 'gemini-2.5-flash';
        const genAI = new GoogleGenerativeAI(apiKey);
        const visionModel = genAI.getGenerativeModel({ model: modelName });

        const prompt = `Extract all readable text from this medical report document/image.
Return plain text only.
Preserve table-like values in separate lines when possible (test name, value, unit, reference range).
Do not add explanations.`;

        const response = await visionModel.generateContent([
            { text: prompt },
            {
                inlineData: {
                    mimeType: String(mimeType),
                    data: buffer.toString('base64')
                }
            }
        ]);

        const extracted = String(response?.response?.text?.() || '').trim();
        if (!extracted) return '';
        return buildTableAwareText(extracted);
    } catch (error) {
        console.error('Gemini vision extraction failed:', error?.message || error);
        return '';
    }
};

const buildFallbackSummary = ({ extractedText, language }) => {
    const isTelugu = String(language || '').toLowerCase().startsWith('te');
    const compactText = String(extractedText || '').replace(/\s+/g, ' ').trim().slice(0, 280);

    return {
        score: null,
        level: 'Unknown',
        possibleDiseases: [],
        isContagious: false,
        recommendationType: 'teleconsultation',
        recommendation: isTelugu
            ? 'రిపోర్ట్‌ను వైద్యుడితో పరిశీలించండి మరియు అవసరమైతే మరిన్ని పరీక్షలు చేయించుకోండి.'
            : 'Please review this report with a doctor and do further tests if needed.',
        explanation: compactText
            ? (isTelugu
                ? `రిపోర్ట్ పాఠ్యం చదవబడింది, కానీ పూర్తి AI విశ్లేషణ అందుబాటులో లేదు. చదివిన భాగం: ${compactText}`
                : `Report text was extracted, but full AI analysis is currently unavailable. Extracted snippet: ${compactText}`)
            : (isTelugu
                ? 'రిపోర్ట్ అందింది, కానీ పూర్తి AI విశ్లేషణ పూర్తికాలేదు.'
                : 'Report received, but full AI analysis could not be completed.'),
        familyPrecautions: '',
        emergencyAction: ''
    };
};

const normalizeSummary = (summary, language, extractedText) => {
    const fallback = buildFallbackSummary({ extractedText, language });
    const rawScore = summary?.score;
    const hasScore = rawScore !== null && rawScore !== undefined && String(rawScore).trim() !== '';
    const normalizedScore = hasScore ? Number(rawScore) : Number.NaN;
    const score = Number.isFinite(normalizedScore)
        ? Math.max(0, Math.min(100, normalizedScore))
        : null;

    const normalizedLevel = String(summary?.level || '').trim();
    const allowedLevels = new Set(['Low', 'Moderate', 'High', 'Critical']);
    const derivedLevel = Number.isFinite(normalizedScore)
        ? (normalizedScore >= CRITICAL_SCORE_MIN
            ? 'Critical'
            : normalizedScore >= SEVERE_SCORE_MIN
                ? 'High'
                : normalizedScore >= MODERATE_SCORE_MIN
                    ? 'Moderate'
                    : 'Low')
        : 'Unknown';

    return {
        score,
        level: allowedLevels.has(normalizedLevel) ? normalizedLevel : derivedLevel,
        possibleDiseases: Array.isArray(summary?.possibleDiseases) ? summary.possibleDiseases : fallback.possibleDiseases,
        isContagious: Boolean(summary?.isContagious),
        recommendationType: summary?.recommendationType || fallback.recommendationType,
        recommendation: summary?.recommendation || fallback.recommendation,
        explanation: summary?.explanation || fallback.explanation,
        familyPrecautions: summary?.familyPrecautions || '',
        emergencyAction: summary?.emergencyAction || ''
    };
};

const shouldForceUnknownRisk = (file, extractedText) => {
    const readableText = String(extractedText || '').trim();
    if (readableText.length >= 15) return false;

    const mimeType = String(file?.mimetype || '').toLowerCase();
    const fileName = String(file?.originalname || '').toLowerCase();

    const isTextOrTableDocument =
        mimeType.includes('text/csv')
        || mimeType.includes('text/plain')
        || mimeType.includes('spreadsheet')
        || mimeType.includes('ms-excel')
        || mimeType.includes('wordprocessingml.document')
        || fileName.endsWith('.csv')
        || fileName.endsWith('.txt')
        || fileName.endsWith('.xlsx')
        || fileName.endsWith('.xls')
        || fileName.endsWith('.docx');

    return isTextOrTableDocument;
};

const buildTableAwareText = (text) => {
    const lines = String(text || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const transformed = lines.map((line) => {
        if (line.includes('|')) return line;

        const tabSplit = line.split(/\t+/).map((part) => part.trim()).filter(Boolean);
        if (tabSplit.length >= 3) return tabSplit.join(' | ');

        const fixedWidthSplit = line.split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
        if (fixedWidthSplit.length >= 3) return fixedWidthSplit.join(' | ');

        const csvLikeSplit = line.split(',').map((part) => part.trim()).filter(Boolean);
        if (csvLikeSplit.length >= 3) return csvLikeSplit.join(' | ');

        return line;
    });

    return transformed.join('\n').slice(0, MAX_EXTRACTED_TEXT_CHARS);
};

const getRecommendationTypeByLevel = (level) => {
    const normalizedLevel = String(level || '').toLowerCase();
    if (normalizedLevel === 'critical') return 'emergency';
    if (normalizedLevel === 'high') return 'hospital-visit';
    if (normalizedLevel === 'moderate') return 'teleconsultation';
    return 'self-care';
};

const deriveLevelFromScore = (score) => {
    if (!Number.isFinite(score)) return 'Unknown';
    if (score >= CRITICAL_SCORE_MIN) return 'Critical';
    if (score >= SEVERE_SCORE_MIN) return 'High';
    if (score >= MODERATE_SCORE_MIN) return 'Moderate';
    return 'Low';
};

const parseNumberValue = (value) => {
    const text = String(value || '').replace(/,/g, '').trim();
    const match = text.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseRange = (value) => {
    const text = String(value || '').replace(/,/g, '').trim();

    const between = text.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
    if (between) {
        const low = Number(between[1]);
        const high = Number(between[2]);
        if (Number.isFinite(low) && Number.isFinite(high) && high > low) {
            return { low, high };
        }
    }

    const lessThan = text.match(/^<?\s*(-?\d+(?:\.\d+)?)$/);
    if (lessThan) {
        const high = Number(lessThan[1]);
        if (Number.isFinite(high)) return { low: Number.NEGATIVE_INFINITY, high };
    }

    const greaterThan = text.match(/^>?\s*(-?\d+(?:\.\d+)?)$/);
    if (greaterThan) {
        const low = Number(greaterThan[1]);
        if (Number.isFinite(low)) return { low, high: Number.POSITIVE_INFINITY };
    }

    return null;
};

const buildHeuristicSummaryFromLabs = ({ extractedText, language, baseSummary }) => {
    const lines = String(extractedText || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return null;

    const findings = [];
    const diseases = new Set(Array.isArray(baseSummary?.possibleDiseases) ? baseSummary.possibleDiseases : []);
    let parsedRows = 0;
    let abnormalRows = 0;
    let severeRows = 0;
    let maxDeviationRatio = 0;

    for (const line of lines) {
        if (!line.includes('|')) continue;

        const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean);
        if (cells.length < 3) continue;

        const joinedLower = cells.join(' ').toLowerCase();
        if (joinedLower.includes('test') && joinedLower.includes('value')) continue;

        const testName = cells[0] || 'Test';
        const valueCell = cells.find((cell, index) => index > 0 && parseNumberValue(cell) !== null) || '';
        const rangeCell = [...cells].reverse().find((cell) => parseRange(cell));
        const value = parseNumberValue(valueCell);
        const range = parseRange(rangeCell);

        if (value === null || !range) continue;

        parsedRows += 1;

        const below = value < range.low;
        const above = value > range.high;

        if (!below && !above) continue;

        abnormalRows += 1;

        let deviationRatio = 0;
        if (Number.isFinite(range.low) && Number.isFinite(range.high)) {
            const span = Math.max(0.0001, range.high - range.low);
            const deviation = below ? (range.low - value) : (value - range.high);
            deviationRatio = Math.max(0, deviation / span);
        } else {
            deviationRatio = 0.2;
        }

        if (deviationRatio >= 0.5) severeRows += 1;
        maxDeviationRatio = Math.max(maxDeviationRatio, deviationRatio);

        findings.push(`${testName}: ${below ? 'below' : 'above'} normal range`);

        const lowerTestName = String(testName).toLowerCase();
        if ((lowerTestName.includes('hemoglobin') || lowerTestName.includes('hb')) && below) {
            diseases.add('Anemia');
        }
        if (lowerTestName.includes('wbc') && above) {
            diseases.add('Possible infection/inflammation');
        }
        if ((lowerTestName.includes('platelet') || lowerTestName.includes('plt')) && below) {
            diseases.add('Possible low platelet condition');
        }
        if ((lowerTestName.includes('sugar') || lowerTestName.includes('glucose')) && above) {
            diseases.add('Possible blood sugar abnormality');
        }
    }

    if (!parsedRows) return null;

    const isTelugu = String(language || '').toLowerCase().startsWith('te');

    if (!abnormalRows) {
        const score = 20;
        const level = deriveLevelFromScore(score);
        return {
            ...baseSummary,
            score,
            level,
            possibleDiseases: Array.from(diseases),
            recommendationType: getRecommendationTypeByLevel(level),
            recommendation: isTelugu
                ? 'ప్రస్తుతం ప్రధాన ల్యాబ్ విలువలు సాధారణ పరిధిలో కనిపిస్తున్నాయి. లక్షణాలు ఉంటే వైద్యుడిని సంప్రదించండి.'
                : 'Most key lab values appear within normal range. If symptoms continue, consult a doctor.',
            explanation: isTelugu
                ? 'రిపోర్ట్ పట్టిక విలువలు చదివి విశ్లేషించాం. ముఖ్యమైన అసాధారణతలు కనిపించలేదు.'
                : 'Table values were parsed from the report and no major abnormalities were detected.',
        };
    }

    const computedScore = Math.round(
        Math.max(
            25,
            Math.min(
                95,
                12 + (abnormalRows * 16) + (severeRows * 10) + (maxDeviationRatio * 25)
            )
        )
    );
    const level = deriveLevelFromScore(computedScore);

    return {
        ...baseSummary,
        score: computedScore,
        level,
        possibleDiseases: Array.from(diseases),
        recommendationType: getRecommendationTypeByLevel(level),
        recommendation: isTelugu
            ? 'ల్యాబ్ విలువల్లో అసాధారణతలు ఉన్నాయి. త్వరలోనే వైద్యుడితో రిపోర్ట్‌ను సమీక్షించండి.'
            : 'Abnormal lab values were detected. Please review this report with a doctor soon.',
        explanation: isTelugu
            ? `పట్టికలో ${abnormalRows} అసాధారణ ల్యాబ్ విలువలు గుర్తించబడ్డాయి. వీటి ఆధారంగా రిస్క్ స్థాయి ${level}గా అంచనా వేశాం.`
            : `${abnormalRows} abnormal lab value(s) were identified from table rows. Risk level was estimated as ${level} based on these deviations.`,
        familyPrecautions: baseSummary?.familyPrecautions || '',
        emergencyAction: level === 'Critical'
            ? (isTelugu
                ? 'తీవ్ర లక్షణాలు ఉంటే వెంటనే అత్యవసర వైద్యసేవలు పొందండి.'
                : 'If severe symptoms are present, seek emergency care immediately.')
            : (baseSummary?.emergencyAction || '')
    };
};

const hasIncompleteAnalysisSignal = (summary) => {
    const combined = `${summary?.explanation || ''} ${summary?.recommendation || ''}`.toLowerCase();
    if (!combined.trim()) return false;

    const incompleteSignals = [
        'could not be completed',
        'analysis is currently unavailable',
        'analysis unavailable',
        'unable to analyze',
        'insufficient data',
        'insufficient information',
        'not enough data',
        'no readable medical data',
        'could not determine',
        'cannot determine',
        'విశ్లేషణ పూర్తికాలేదు',
        'చదవదగిన డేటా లేదు',
        'నిర్ణయించలేకపోయాం'
    ];

    return incompleteSignals.some((signal) => combined.includes(signal));
};

const extractReportText = async (file) => {
    if (!file?.buffer) return '';

    try {
        const mimeType = String(file.mimetype || '').toLowerCase();
        const fileName = String(file.originalname || '').toLowerCase();

        if (mimeType.includes('text/csv') || mimeType.includes('text/plain') || fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
            return buildTableAwareText(file.buffer.toString('utf-8'));
        }

        if (
            mimeType.includes('spreadsheet')
            || mimeType.includes('ms-excel')
            || fileName.endsWith('.xlsx')
            || fileName.endsWith('.xls')
        ) {
            const XLSX = safeRequire('xlsx');
            if (!XLSX) return '';

            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const allSheetText = workbook.SheetNames
                .map((sheetName) => {
                    const sheet = workbook.Sheets[sheetName];
                    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
                    return `Sheet: ${sheetName}\n${csv}`;
                })
                .join('\n\n');

            return buildTableAwareText(allSheetText);
        }

        if (
            mimeType.includes('wordprocessingml.document')
            || fileName.endsWith('.docx')
        ) {
            const mammoth = safeRequire('mammoth');
            if (!mammoth) return '';

            const doc = await mammoth.extractRawText({ buffer: file.buffer });
            return buildTableAwareText(doc.value || '');
        }

        if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
            // Try pdf-parse first (works for selectable-text PDFs)
            let pdfText = '';
            try {
                const pdfParseModule = safeRequire('pdf-parse');
                const pdfParse = typeof pdfParseModule === 'function'
                    ? pdfParseModule
                    : pdfParseModule?.default;
                if (typeof pdfParse === 'function') {
                    const parsed = await pdfParse(file.buffer);
                    pdfText = buildTableAwareText(parsed.text || '');
                }
            } catch (pdfErr) {
                console.error('pdf-parse failed, will try Gemini vision:', pdfErr?.message);
            }

            // If pdf-parse returned meaningful text, use it
            if (pdfText && pdfText.trim().length >= 15) {
                return pdfText;
            }

            // Fallback: scanned/image-based PDF — use Gemini vision OCR
            console.log('PDF text extraction returned minimal text, trying Gemini vision OCR...');
            const geminiText = await extractWithGeminiVision(file.buffer, 'application/pdf');
            return geminiText || pdfText;
        }

        if (mimeType.startsWith('image/') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp') || fileName.endsWith('.heic')) {
            return extractWithGeminiVision(file.buffer, mimeType);
        }

        return '';
    } catch (extractError) {
        console.error('Report text extraction failed:', extractError?.message || extractError);
        return '';
    }
};

const uploadAndSummarizeReport = async (req, res) => {
    try {
        const file = req.file;
        const user = req.user;

        if (!file) {
            return res.status(400).json({ message: 'Report file is required' });
        }

        const extractedText = await extractReportText(file);

          const prompt = `
You are a rural healthcare report explainer for Andhra Pradesh.
Analyze uploaded medical report and respond only valid JSON:
{
      "score": <0-100 or null if report is unreadable>,
      "level": "<Low|Moderate|High|Critical|Unknown>",
  "possibleDiseases": ["disease1", "disease2"],
  "isContagious": <true|false>,
  "recommendationType": "<self-care|teleconsultation|hospital-visit|emergency>",
  "recommendation": "<simple advice in Telugu or English based on language>",
  "explanation": "<easy explanation for rural users>",
  "familyPrecautions": "<if contagious else empty>",
  "emergencyAction": "<if critical else empty>"
}
Patient age: ${user.age}, pregnant: ${user.isPregnant}, language: ${user.language}
Important table-handling rules:
- Report may include lab tables (test name, value, unit, range, flag).
- If table data is present, prioritize abnormal/out-of-range values in scoring.
- Use table rows to infer possible conditions and severity.
- Do not ignore numeric evidence from table rows.
- If report text is insufficient/unreadable, do not guess risk score: return score as null and level as Unknown.
Scoring guidance:
- Multiple abnormal rows should increase score progressively.
- Strong out-of-range values should increase severity.
- If at least one clear abnormal value is present, avoid returning Unknown.
Output rules:
- Return only JSON. No markdown, no explanation outside JSON.
`;

        if (!extractedText) {
            return res.status(400).json({
                message: 'Could not extract readable text from this report. For images, upload a clear high-resolution photo/screenshot. You can also upload PDF, CSV, XLSX, DOCX, or TXT with selectable text.'
            });
        }

        let summary;
        try {
            const textFirstResponse = await generateAiText({
                prompt: `${prompt}\n\nExtracted report text (including possible table rows):\n${extractedText}`,
                expectJson: true,
                task: 'report-analysis',
                provider: 'gemini',
                model: 'gemini-2.5-flash'
            });
            summary = parseJsonFromModelText(textFirstResponse);
        } catch (analysisError) {
            console.error('Text-first report AI generation failed:', analysisError?.message || analysisError);
            summary = null;
        }

        if (!summary) {
            summary = buildFallbackSummary({ extractedText, language: user.language });
        }

        summary = normalizeSummary(summary, user.language, extractedText);
        if (summary.score === null && String(extractedText || '').trim().length >= 15) {
            const heuristicSummary = buildHeuristicSummaryFromLabs({
                extractedText,
                language: user.language,
                baseSummary: summary
            });
            if (heuristicSummary) {
                summary = normalizeSummary(heuristicSummary, user.language, extractedText);
            }
        }
        if (shouldForceUnknownRisk(file, extractedText)) {
            summary.score = null;
            summary.level = 'Unknown';
            if (!summary.explanation || summary.explanation === buildFallbackSummary({ extractedText, language: user.language }).explanation) {
                summary.explanation = String(user.language || '').toLowerCase().startsWith('te')
                    ? 'రిపోర్ట్ ఫైల్ అందింది, కానీ చదవదగిన డేటా లేదు. అందువల్ల రిస్క్ స్కోర్ నిర్ణయించలేకపోయాం.'
                    : 'Report file was received, but no readable medical data was found. Risk score could not be determined.';
            }
        }
        if (hasIncompleteAnalysisSignal(summary)) {
            summary.score = null;
            summary.level = 'Unknown';
            if (!summary.explanation) {
                summary.explanation = String(user.language || '').toLowerCase().startsWith('te')
                    ? 'రిపోర్ట్ విశ్లేషణ పూర్తి కాలేదు. అందువల్ల రిస్క్ స్థాయి నిర్ణయించబడలేదు.'
                    : 'Report analysis could not be completed, so risk level was not determined.';
            }
        }
        const historySummary = String(summary.explanation || summary.recommendation || 'Uploaded report analysis').trim();

        const report = await Report.create({
            userId: user._id,
            sourceType: 'medical_report',
            symptoms: historySummary,
            score: summary.score,
            level: summary.level,
            possibleDiseases: summary.possibleDiseases || [],
            recommendation: summary.recommendation,
            explanation: summary.explanation,
            isContagious: summary.isContagious || false,
            recommendationType: summary.recommendationType || 'self-care',
            familyPrecautions: summary.familyPrecautions || '',
            emergencyAction: summary.emergencyAction || '',
            reportFile: {
                fileName: file.originalname,
                mimeType: file.mimetype,
                size: file.size
            }
        });

        const normalizedLevel = String(summary.level || '').toLowerCase();
        const normalizedRecommendationType = String(summary.recommendationType || '').toLowerCase();
        const isSevereCondition = Number(summary.score) >= SEVERE_SCORE_MIN
            || normalizedLevel === 'high'
            || normalizedLevel === 'critical'
            || normalizedRecommendationType === 'hospital-visit'
            || normalizedRecommendationType === 'emergency';

        if (isSevereCondition) {
            const officers = await User.find({
                role: 'officer',
                $or: [
                    { coveredVillageCodes: user.villageCode },
                    { villageCode: user.villageCode }
                ]
            });

            for (const officer of officers) {
                await createInAppAlert({
                    toUserId: officer._id,
                    fromUserId: user._id,
                    message: `Severe report detected for ${user.email}. Risk: ${summary.level || 'Unknown'}.`,
                    type: 'doctor-review',
                    villageCode: user.villageCode,
                    status: 'sent'
                });
            }
        }

        res.status(201).json({
            reportId: report._id,
            ...summary
        });
    } catch (error) {
        console.error(`AI API Error (provider: ${AI_PROVIDER}):`, error);
        res.status(500).json({
            message: 'Error analyzing uploaded report',
            ...(process.env.NODE_ENV !== 'production' ? { error: error?.message || 'Unknown error' } : {})
        });
    }
};

const getMyMedicalReports = async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);

        await cleanupNonMedicalSymptomRecords(req.user._id);

        const reports = await Report.find({
            userId: req.user._id,
            sourceType: { $in: ['medical_report', 'symptom'] }
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('sourceType symptoms score level possibleDiseases recommendation explanation reportFile createdAt recoveryStatus recoveredAt');

        res.json({ reports });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching medical reports' });
    }
};

module.exports = {
    uploadAndSummarizeReport,
    getMyMedicalReports
};
