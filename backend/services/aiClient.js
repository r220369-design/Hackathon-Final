const DEFAULT_PROVIDER = (process.env.AI_PROVIDER || 'auto').toLowerCase();
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

const safeJsonParse = (value) => {
    const text = String(value || '').trim();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            return JSON.parse(text.slice(firstBrace, lastBrace + 1));
        }
        return null;
    }
};

const callGroq = async ({ prompt, expectJson = false, model }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is missing');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || DEFAULT_GROQ_MODEL,
                temperature: 0.2,
                response_format: expectJson ? { type: 'json_object' } : undefined,
                messages: [
                    { role: 'user', content: prompt }
                ]
            }),
            signal: controller.signal
        });

        const bodyText = await response.text();
        const bodyJson = safeJsonParse(bodyText);

        if (!response.ok) {
            const apiMessage = bodyJson?.error?.message || bodyText || `Groq request failed with status ${response.status}`;
            throw new Error(apiMessage);
        }

        const content = bodyJson?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Groq response did not include content');
        }

        return String(content);
    } finally {
        clearTimeout(timeout);
    }
};

const parseOpenRouterContent = (content) => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .map((part) => {
                if (typeof part === 'string') return part;
                if (part?.type === 'text') return part.text || '';
                return '';
            })
            .join('')
            .trim();
    }
    return '';
};

const callOpenRouter = async ({ prompt, model }) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is missing');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
                'X-Title': 'Grameen Swastha AI'
            },
            body: JSON.stringify({
                model: model || DEFAULT_OPENROUTER_MODEL,
                temperature: 0.2,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a precise healthcare assistant. Follow formatting instructions exactly and return only requested output.'
                    },
                    { role: 'user', content: prompt }
                ]
            }),
            signal: controller.signal
        });

        const bodyText = await response.text();
        const bodyJson = safeJsonParse(bodyText);

        if (!response.ok) {
            const apiMessage = bodyJson?.error?.message || bodyJson?.message || bodyText || `OpenRouter request failed with status ${response.status}`;
            throw new Error(apiMessage);
        }

        const content = parseOpenRouterContent(bodyJson?.choices?.[0]?.message?.content);
        if (!content) {
            throw new Error('OpenRouter response did not include content');
        }

        return String(content);
    } finally {
        clearTimeout(timeout);
    }
};

const callGemini = async ({ prompt, model }) => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const aiModel = genAI.getGenerativeModel({ model: model || DEFAULT_GEMINI_MODEL });
    const result = await aiModel.generateContent(prompt);
    return String(result.response.text() || '');
};

const generateAiText = async ({ prompt, expectJson = false, task = 'general', model, provider: providerOverride }) => {
    const provider = String(providerOverride || DEFAULT_PROVIDER || 'auto').toLowerCase();

    if (provider === 'groq') {
        return callGroq({ prompt, expectJson, model });
    }

    if (provider === 'openrouter') {
        return callOpenRouter({ prompt, model });
    }

    if (provider === 'gemini') {
        return callGemini({ prompt, model });
    }

    if (provider === 'auto') {
        const attempts = [];

        if (process.env.GROQ_API_KEY) {
            try {
                return await callGroq({ prompt, expectJson, model });
            } catch (error) {
                attempts.push(`groq: ${error.message}`);
            }
        }

        if (process.env.OPENROUTER_API_KEY) {
            try {
                return await callOpenRouter({ prompt, model });
            } catch (error) {
                attempts.push(`openrouter: ${error.message}`);
            }
        }

        if (process.env.GEMINI_API_KEY) {
            try {
                return await callGemini({ prompt, model });
            } catch (error) {
                attempts.push(`gemini: ${error.message}`);
            }
        }

        throw new Error(attempts.length
            ? `AI auto-provider failed: ${attempts.join(' | ')}`
            : 'AI auto-provider failed: no API key configured for GROQ, OPENROUTER, or GEMINI');
    }

    throw new Error(`Unsupported AI_PROVIDER: ${provider}. Use "auto", "groq", "openrouter", or "gemini".`);
};

module.exports = {
    generateAiText
};
