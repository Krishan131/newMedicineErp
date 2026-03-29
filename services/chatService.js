const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-1.5-flash';
const DEFAULT_MAX_OUTPUT_TOKENS = 400;
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_TIMEOUT_MS = 15000;

const parsePositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseTemperature = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    if (parsed < 0) return 0;
    if (parsed > 1) return 1;
    return parsed;
};

const extractGeminiText = (responseData) => {
    const candidates = Array.isArray(responseData?.candidates) ? responseData.candidates : [];
    if (!candidates.length) {
        return '';
    }

    const parts = Array.isArray(candidates[0]?.content?.parts)
        ? candidates[0].content.parts
        : [];

    return parts
        .map((part) => part?.text)
        .filter(Boolean)
        .join('\n')
        .trim();
};

const buildGeminiUrl = (model, apiKey) => (
    `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
);

const generateGeminiCustomerReply = async ({ message, contextText, systemInstruction }) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('Missing GEMINI_API_KEY environment variable');
    }

    if (typeof fetch !== 'function') {
        throw new Error('Global fetch is unavailable. Use Node.js 18+ runtime');
    }

    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const maxOutputTokens = parsePositiveInteger(process.env.GEMINI_MAX_OUTPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS);
    const temperature = parseTemperature(process.env.GEMINI_TEMPERATURE, DEFAULT_TEMPERATURE);
    const timeoutMs = parsePositiveInteger(process.env.CHAT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);

    const requestPayload = {
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        contents: [
            {
                role: 'user',
                parts: [{ text: `Customer question:\n${message}\n\nCustomer facts:\n${contextText}` }]
            }
        ],
        generationConfig: {
            temperature,
            maxOutputTokens
        }
    };

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(buildGeminiUrl(model, apiKey), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestPayload),
            signal: controller.signal
        });

        const rawBody = await response.text();
        let responseData = {};

        if (rawBody) {
            try {
                responseData = JSON.parse(rawBody);
            } catch (err) {
                responseData = {};
            }
        }

        if (!response.ok) {
            const providerMessage = responseData?.error?.message || `Gemini request failed with status ${response.status}`;
            throw new Error(providerMessage);
        }

        const reply = extractGeminiText(responseData);
        if (!reply) {
            throw new Error('Gemini returned an empty response');
        }

        return { reply, model };
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('Gemini request timed out');
        }

        throw err;
    } finally {
        clearTimeout(timeoutHandle);
    }
};

module.exports = {
    generateGeminiCustomerReply
};
