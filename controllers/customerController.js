const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Sales = require('../models/Sales');
const Medicine = require('../models/Medicine');
const CustomerReminder = require('../models/CustomerReminder');
const { generateGeminiCustomerReply } = require('../services/chatService');

const EXPIRING_SOON_DAYS = 15;
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_SEARCH_RADIUS_KM = 5;
const CHAT_BOT_NAME = 'Medi';
const CHAT_MESSAGE_MAX_LENGTH = 600;
const CHAT_RECENT_SALES_LIMIT = 12;
const CHAT_ACTIVE_REMINDERS_LIMIT = 8;
const CHAT_DEFAULT_REQUESTS_PER_WINDOW = 14;
const CHAT_DEFAULT_RATE_WINDOW_MS = 60 * 1000;
const CHAT_DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const CHAT_MEDICAL_DISCLAIMER = 'This is general information and not medical advice. Please consult your doctor before changing medicine, dosage, or diet.';
const CHAT_FALLBACK_REPLY = 'I could not process that right now. Please try again in a moment.';
const CHAT_EMERGENCY_REPLY = `I am ${CHAT_BOT_NAME}. Your message may indicate a medical emergency. Please contact emergency services or your doctor immediately.`;
const CHAT_QUOTA_REPLY = `${CHAT_BOT_NAME} is temporarily busy because AI quota is reached. I will still help in quick mode.`;
const CHAT_INVALID_KEY_REPLY = `${CHAT_BOT_NAME} is temporarily unavailable due to configuration issues. Please try again later.`;
const CHAT_TIMEOUT_REPLY = `${CHAT_BOT_NAME} timed out while generating a response. Here is quick local guidance.`;
const CHAT_OFF_TOPIC_REPLY = `I am ${CHAT_BOT_NAME}. I can help with health, wellness, diet, sleep, exercise, and medicine-related questions, including uses, common side effects, and food timing guidance.`;
const CHAT_HIGH_RISK_REPLY = `I am ${CHAT_BOT_NAME}. I can share general wellness guidance, but I cannot diagnose conditions or change medicine dosage. Please consult your doctor for that. If you want, I can help you prepare questions for your doctor.`;
const CHAT_CASUAL_REPLY = `Hi, I am ${CHAT_BOT_NAME}. I am here to help with health and wellness guidance, plus your medicine reminders and purchase-related questions.`;
const CHAT_EMERGENCY_PATTERN = /\b(chest pain|shortness of breath|difficulty breathing|faint|seizure|stroke|unconscious|suicidal|severe bleeding)\b/i;
const CHAT_EXPIRY_QUERY_PATTERN = /\b(expiry|expire|expiring|reminder|validity)\b/i;
const CHAT_PURCHASE_QUERY_PATTERN = /\b(purchase|history|bought|buy|shop|bill|invoice|spent|total)\b/i;
const CHAT_DIET_QUERY_PATTERN = /\b(diet|eat|food|meal|nutrition|health|healthy|exercise|routine|lifestyle)\b/i;
const CHAT_MEDICINE_QUERY_PATTERN = /\b(medicine|medicines|medication|tablet|tablets|capsule|capsules|syrup|drop|drops|drug|prescription|refill|side effect|supplement|vitamin|injection|inhaler|insulin|calcium|iron|zinc|b12|d3|omega|reminder|expiry|purchase|invoice|bill|shop)\b/i;
const CHAT_MEDICATION_INFO_PATTERN = /\b(used for|use for|use of|uses|uses of|side effect|side effects|can i take|when to take|how to take|before food|after food|empty stomach|with food|without food|missed dose|drug interaction|interactions|is it safe)\b/i;
const CHAT_MEDICINE_UNIT_PATTERN = /\b\d+\s?(mg|mcg|g|ml|iu)\b/i;
const CHAT_MEDICINE_NAME_SUFFIX_PATTERN = /\b[a-z]{4,}(statin|pril|sartan|olol|prazole|mycin|cillin|formin|xaban|dipine|azole|mab|vir|setron)\b/i;
const CHAT_WELLNESS_QUERY_PATTERN = /\b(health|wellness|diet|food|eat|meal|nutrition|exercise|workout|walking|sleep|stress|hydration|water|lifestyle|fitness|immune|bp|blood pressure|sugar|diabetes|cholesterol|heart|mental)\b/i;
const CHAT_CASUAL_PATTERN = /\b(hi|hello|hey|thanks|thank you|good morning|good evening|how are you)\b/i;
const CHAT_DOSAGE_QUERY_PATTERN = /\b(dose|dosage|dose change|change dose|increase dose|decrease dose|stop medicine|start medicine|double dose|skip dose)\b/i;
const CHAT_DIAGNOSIS_QUERY_PATTERN = /\b(diagnose|diagnosis|disease|condition do i have|what illness)\b/i;
const CHAT_CONSUMED_PATTERN = /\b(consumed|already consumed|already taken|already took|already used|finished|completed)\b/i;
const CHAT_OVER_REFUSAL_PATTERN = /\b(i cannot provide|i can't provide|not qualified|i am not a doctor|cannot offer medical advice|unable to help with health)\b/i;
const CHAT_REPEAT_INTRO_PATTERN = /^(hello|hi|hey)([\s\S]{0,120})\b(i am|i'm)\s+medi\b[^\n]*\n*/i;
const CHAT_INCOMPLETE_END_PATTERN = /(here are\s*:?)$|(:\s*)$|(and\s*)$|(for example\s*:?)$/i;
const CHAT_MEDICINE_MENTION_PATTERN = /\b(purchase|purchases|medicine|medicines|reminder|reminders|tablet|capsule|invoice|bill|from your records|based on your recent purchases)\b/i;
const CHAT_SYSTEM_INSTRUCTION = [
    `Your name is ${CHAT_BOT_NAME}. You are a warm and friendly pharmacy health assistant for customers.`,
    'Use provided purchase and reminder facts when available, and answer in a practical way.',
    'Only mention customer-specific medicine history/reminders when user asks about medicines, purchases, expiry, reminders, or refills.',
    'For medicine information questions about any medicine, provide general uses, common side effects, and food timing guidance even if that medicine is not in purchase records.',
    'Active reminders represent pending/unconsumed medicines. Give expiry warnings only for items listed in activeReminders.',
    'If customer indicates a medicine is already consumed, do not warn them to avoid using that consumed dose.',
    'Do not start every response with greetings or reintroducing yourself. Keep responses direct and helpful.',
    'For general health or diet questions, provide safe, non-prescriptive wellness suggestions (hydration, balanced meals, sleep, activity, consistency with medicine timings).',
    'Do not diagnose diseases, prescribe new medicines, or change dosage.',
    'If asked for diagnosis or dosage changes, politely refuse and suggest consulting a licensed doctor.',
    'If emergency symptoms are mentioned, tell the user to seek urgent medical help immediately.',
    'Avoid generic refusal when the user asks harmless wellness questions; give concise actionable tips.',
    'Use short bullet points where useful.'
].join(' ');
const chatRateWindowByCustomer = new Map();
const chatResponseCacheByCustomer = new Map();

const parsePositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const CHAT_REQUESTS_PER_WINDOW = parsePositiveInteger(process.env.CHAT_PER_MINUTE_LIMIT, CHAT_DEFAULT_REQUESTS_PER_WINDOW);
const CHAT_RATE_WINDOW_MS = parsePositiveInteger(process.env.CHAT_RATE_WINDOW_MS, CHAT_DEFAULT_RATE_WINDOW_MS);
const CHAT_CACHE_TTL_MS = parsePositiveInteger(process.env.CHAT_CACHE_TTL_MS, CHAT_DEFAULT_CACHE_TTL_MS);

const normalizePhone = (value = '') => value.toString().replace(/\D/g, '');
const parseCoordinateNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};
const hasCoordinates = (location) => (
    !!location &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2 &&
    Number.isFinite(location.coordinates[0]) &&
    Number.isFinite(location.coordinates[1])
);
const toLocationPayload = (location) => {
    if (!hasCoordinates(location)) return null;

    return {
        latitude: location.coordinates[1],
        longitude: location.coordinates[0]
    };
};
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildPhoneCandidates = (phone) => {
    const normalized = normalizePhone(phone);
    const candidates = new Set([normalized]);

    if (normalized.length === 10) {
        candidates.add(`91${normalized}`);
    }

    if (normalized.length > 10 && normalized.startsWith('91')) {
        candidates.add(normalized.slice(-10));
    }

    return Array.from(candidates);
};
const buildItemKey = (saleId, itemIndex) => `${saleId}:${itemIndex}`;
const normalizeWhitespace = (value = '') => value.toString().replace(/\s+/g, ' ').trim();
const toISODate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
};

const formatReminderLine = (reminder) => {
    const label = reminder.medicineName || 'Medicine';
    const expiryText = reminder.expiryDate || 'unknown expiry';

    if (reminder.status === 'expired') {
        return `${label}: expired ${Math.abs(reminder.daysLeft)} day(s) ago (expiry ${expiryText})`;
    }

    return `${label}: ${reminder.daysLeft} day(s) left (expiry ${expiryText})`;
};

const buildLocalFallbackReply = ({ message, context }) => {
    const normalizedMessage = message.toLowerCase();
    const reminders = context.activeReminders || [];
    const sales = context.recentSales || [];

    if (CHAT_EXPIRY_QUERY_PATTERN.test(normalizedMessage)) {
        if (!reminders.length) {
            return 'I could not reach the AI service right now. From your current records, I do not see active expiry reminders.';
        }

        const topReminders = reminders.slice(0, 5).map((reminder) => `- ${formatReminderLine(reminder)}`).join('\n');
        return `I could not reach the AI service right now, but here is a quick expiry summary from your records:\n${topReminders}`;
    }

    if (CHAT_PURCHASE_QUERY_PATTERN.test(normalizedMessage)) {
        if (!sales.length) {
            return 'I could not reach the AI service right now. I also do not see recent purchases in your history.';
        }

        const latestSale = sales[0];
        const itemsPreview = (latestSale.items || []).slice(0, 3).map((item) => item.medicineName).filter(Boolean).join(', ');
        const latestDate = latestSale.saleDate || 'unknown date';

        return `I could not reach the AI service right now, but your records show ${sales.length} recent purchase(s). Latest purchase: ${latestDate} from ${latestSale.shopName || 'Medicine Shop'}${itemsPreview ? ` (items: ${itemsPreview})` : ''}.`;
    }

    if (CHAT_MEDICATION_INFO_PATTERN.test(normalizedMessage)
        || CHAT_MEDICINE_UNIT_PATTERN.test(normalizedMessage)
        || CHAT_MEDICINE_NAME_SUFFIX_PATTERN.test(normalizedMessage)) {
        return [
            'I could not reach the AI service right now, but I can still help with general medicine information.',
            '- Ask about medicine use, common side effects, before/after food, and missed dose guidance.',
            '- Follow your prescription label for exact dose and duration.',
            '- Get urgent medical help for severe allergy signs such as breathing trouble, face swelling, or widespread rash.'
        ].join('\n');
    }

    if (CHAT_MEDICINE_QUERY_PATTERN.test(normalizedMessage)) {
        if (!reminders.length && !sales.length) {
            return 'I could not reach the AI service right now. I do not see medicine history in your records yet.';
        }

        if (reminders.length) {
            return `I could not reach the AI service right now. Quick medicine update: ${formatReminderLine(reminders[0])}.`;
        }

        const latestSale = sales[0];
        return `I could not reach the AI service right now. Your latest medicine purchase is from ${latestSale.shopName || 'Medicine Shop'} on ${latestSale.saleDate || 'unknown date'}.`;
    }

    if (CHAT_DIET_QUERY_PATTERN.test(normalizedMessage)) {
        return [
            'I could not reach the AI service right now. General wellness suggestions:',
            '- Stay hydrated and eat balanced meals with vegetables, fruits, and protein.',
            '- Avoid alcohol and smoking while taking regular medicines unless your doctor says otherwise.',
            '- Keep medicine timings consistent and avoid skipping doses.',
            '- If you have kidney, liver, sugar, or BP conditions, confirm diet restrictions with your doctor.'
        ].join('\n');
    }

    return [
        'I could not reach the AI service right now, but here are quick wellness tips:',
        '- Drink enough water and avoid long gaps between meals.',
        '- Keep a regular sleep schedule and include light movement daily.',
        '- Ask me specific medicine questions if you want purchase or reminder details.'
    ].join('\n');
};

const buildGenericGuidanceReply = ({ message, context }) => {
    const normalizedMessage = message.toLowerCase();
    const reminders = context.activeReminders || [];
    const sales = context.recentSales || [];

    if (CHAT_EXPIRY_QUERY_PATTERN.test(normalizedMessage)) {
        if (!reminders.length) {
            return [
                'I do not see active expiry alerts in your current records.',
                '- Keep medicines in a cool, dry place and check strips monthly.',
                '- Mark a reminder 7 to 10 days before expiry so you can replace on time.'
            ].join('\n');
        }

        const topReminders = reminders.slice(0, 4).map((reminder) => `- ${formatReminderLine(reminder)}`).join('\n');
        return [
            'Here is your quick expiry summary:',
            topReminders,
            'Tip: finish near-expiry medicines first only if your doctor advised and medicine condition is normal.'
        ].join('\n');
    }

    if (CHAT_PURCHASE_QUERY_PATTERN.test(normalizedMessage)) {
        if (!sales.length) {
            return 'I do not see recent purchases yet. Once you buy medicines, I can summarize your history and reminders.';
        }

        const latestSale = sales[0];
        const itemNames = (latestSale.items || []).slice(0, 3).map((item) => item.medicineName).filter(Boolean).join(', ');
        const latestDate = latestSale.saleDate || 'unknown date';

        return [
            `Your latest purchase is on ${latestDate} from ${latestSale.shopName || 'Medicine Shop'}.`,
            itemNames ? `Top items: ${itemNames}.` : null,
            'If you want, ask: "which medicine may run out first?" and I will help plan refills.'
        ].filter(Boolean).join('\n');
    }

    return [
        'Here are safe general wellness tips that usually help while on regular medicines:',
        '- Stay hydrated through the day and avoid long gaps between meals.',
        '- Prefer balanced plates: vegetables, protein, whole grains, and fruit.',
        '- Keep medicine timings consistent and set reminders to avoid missed doses.',
        '- Limit alcohol, smoking, and heavily processed food unless your doctor allows.',
        '- Sleep 7 to 8 hours and include light daily movement like walking.'
    ].join('\n');
};

const collectRecentMedicineNames = (context, limit = 4) => {
    const seen = new Set();
    const names = [];

    (context.recentSales || []).forEach((sale) => {
        (sale.items || []).forEach((item) => {
            const name = normalizeWhitespace(item.medicineName || '');
            if (!name) {
                return;
            }

            const key = name.toLowerCase();
            if (seen.has(key)) {
                return;
            }

            seen.add(key);
            names.push(name);
        });
    });

    return names.slice(0, limit);
};

const buildPurchaseAwareDietReply = ({ context }) => {
    const medicines = collectRecentMedicineNames(context, 4);
    const medicineLine = medicines.length
        ? `I can see recent medicines like: ${medicines.join(', ')}.`
        : 'I do not have enough medicine purchase context yet, so I will give general guidance.';

    return [
        medicineLine,
        'Here is a practical food plan that is usually safe for wellness:',
        '- Prefer simple balanced meals: vegetables + protein + whole grains.',
        '- Keep hydration steady through the day and avoid long fasting gaps.',
        '- Limit very spicy, oily, and late-night heavy meals if you get acidity.',
        '- Include calcium-supporting foods like curd/yogurt, milk, paneer, sesame, and leafy greens if suitable for you.',
        '- Keep tea/coffee moderate around supplement timings.',
        '- If you have diabetes, kidney, liver, thyroid, or BP issues, confirm a personalized plan with your doctor.'
    ].join('\n');
};

const buildStructuredReply = ({ quickAnswer, actionItems = [], note }) => {
    const normalizedQuick = normalizeWhitespace(quickAnswer || 'Here is a quick answer for you.');
    const normalizedActions = actionItems
        .map((item) => normalizeWhitespace(item).replace(/^-\s*/, ''))
        .filter(Boolean)
        .slice(0, 5);

    if (!normalizedActions.length) {
        normalizedActions.push('Stay hydrated, eat balanced meals, and maintain regular sleep and activity.');
    }

    const normalizedNote = normalizeWhitespace(
        note || 'Consult your doctor for diagnosis, prescription, or dosage changes.'
    );

    return [
        'Quick answer:',
        normalizedQuick,
        '',
        'Action plan:',
        ...normalizedActions.map((item) => `- ${item}`),
        '',
        'Note:',
        normalizedNote
    ].join('\n');
};

const ensureStructuredReply = ({ reply, intent }) => {
    const trimmed = normalizeWhitespace(reply || '');
    if (!trimmed) {
        return buildStructuredReply({
            quickAnswer: 'I could not generate a detailed response right now.',
            actionItems: ['Please try the question again in a clearer way.']
        });
    }

    if (/quick answer:/i.test(trimmed) && /action plan:/i.test(trimmed)) {
        return reply;
    }

    const lines = (reply || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const bulletItems = lines
        .filter((line) => /^[-*]\s+/.test(line))
        .map((line) => line.replace(/^[-*]\s+/, '').trim());

    const plainLines = lines.filter((line) => !/^[-*]\s+/.test(line));

    let quickAnswer = plainLines[0] || trimmed;
    let actionItems = bulletItems.length ? bulletItems : plainLines.slice(1);

    if (!actionItems.length) {
        const sentences = trimmed
            .split(/(?<=[.!?])\s+/)
            .map((sentence) => sentence.trim())
            .filter(Boolean);

        if (sentences.length > 1) {
            quickAnswer = sentences[0];
            actionItems = sentences.slice(1, 5);
        }
    }

    return buildStructuredReply({
        quickAnswer,
        actionItems,
        note: intent?.asksHighRisk
            ? 'Please consult your doctor for diagnosis or dosage changes.'
            : 'If symptoms persist or worsen, consult your doctor.'
    });
};

const buildConsumedAcknowledgementReply = () => buildStructuredReply({
    quickAnswer: 'If that medicine is already consumed, no action is needed for that past dose.',
    actionItems: [
        'Use the reminders section for pending medicines only.',
        'Mark medicines as consumed to keep reminders accurate.',
        'Ask me for active reminders if you want current pending medicine status.'
    ],
    note: 'If you feel any unusual symptoms after a dose, contact your doctor.'
});

const sanitizeAssistantReply = (reply = '') => {
    if (!reply) {
        return '';
    }

    let cleaned = reply.trim();
    cleaned = cleaned.replace(CHAT_REPEAT_INTRO_PATTERN, '').trim();

    if (!cleaned) {
        return reply.trim();
    }

    return cleaned;
};

const isLikelyIncompleteReply = (reply = '') => {
    const trimmed = normalizeWhitespace(reply);
    if (!trimmed) {
        return true;
    }

    if (trimmed.length < 50) {
        return true;
    }

    return CHAT_INCOMPLETE_END_PATTERN.test(trimmed.toLowerCase());
};

const shouldHideMedicineDetailsForIntent = ({ intent, reply }) => {
    if (intent.asksMedicine) {
        return false;
    }

    return CHAT_MEDICINE_MENTION_PATTERN.test(reply.toLowerCase());
};

const buildIntentAwareFallbackReply = ({ intent, message, context }) => {
    if (intent.asksMedicine && intent.asksWellness) {
        return buildPurchaseAwareDietReply({ context });
    }

    if (intent.asksMedicine) {
        return buildLocalFallbackReply({ message, context });
    }

    return buildGenericGuidanceReply({ message, context });
};

const isHighRiskMedicalRequest = (message) => (
    CHAT_EMERGENCY_PATTERN.test(message)
    || CHAT_DOSAGE_QUERY_PATTERN.test(message)
    || CHAT_DIAGNOSIS_QUERY_PATTERN.test(message)
);

const shouldReplaceOverRestrictiveReply = ({ message, reply }) => {
    if (!CHAT_OVER_REFUSAL_PATTERN.test(reply)) {
        return false;
    }

    if (isHighRiskMedicalRequest(message)) {
        return false;
    }

    if (!CHAT_DIET_QUERY_PATTERN.test(message)
        && !CHAT_PURCHASE_QUERY_PATTERN.test(message)
        && !CHAT_EXPIRY_QUERY_PATTERN.test(message)
        && !CHAT_MEDICINE_QUERY_PATTERN.test(message)
        && !CHAT_MEDICATION_INFO_PATTERN.test(message)
        && !CHAT_MEDICINE_UNIT_PATTERN.test(message)
        && !CHAT_MEDICINE_NAME_SUFFIX_PATTERN.test(message)) {
        return false;
    }

    return true;
};

const getChatIntent = (message) => {
    const normalizedMessage = message.toLowerCase();
    const asksMedicationInfo = CHAT_MEDICATION_INFO_PATTERN.test(normalizedMessage)
        || CHAT_MEDICINE_UNIT_PATTERN.test(normalizedMessage)
        || CHAT_MEDICINE_NAME_SUFFIX_PATTERN.test(normalizedMessage);
    const asksMedicine = CHAT_MEDICINE_QUERY_PATTERN.test(normalizedMessage)
        || CHAT_EXPIRY_QUERY_PATTERN.test(normalizedMessage)
        || CHAT_PURCHASE_QUERY_PATTERN.test(normalizedMessage)
        || asksMedicationInfo;
    const asksWellness = CHAT_WELLNESS_QUERY_PATTERN.test(normalizedMessage)
        || CHAT_DIET_QUERY_PATTERN.test(normalizedMessage);
    const asksHighRisk = CHAT_DOSAGE_QUERY_PATTERN.test(normalizedMessage)
        || CHAT_DIAGNOSIS_QUERY_PATTERN.test(normalizedMessage);
    const isEmergency = CHAT_EMERGENCY_PATTERN.test(normalizedMessage);
    const mentionsConsumed = CHAT_CONSUMED_PATTERN.test(normalizedMessage);
    const isCasual = CHAT_CASUAL_PATTERN.test(normalizedMessage);
    const isHealthRelated = asksMedicine || asksWellness || asksHighRisk || isEmergency || asksMedicationInfo;

    return {
        asksMedicine,
        asksWellness,
        asksHighRisk,
        isEmergency,
        mentionsConsumed,
        isCasual,
        isHealthRelated
    };
};

const getCustomerChatCache = (customerId) => {
    const key = customerId.toString();
    const cache = chatResponseCacheByCustomer.get(key);
    if (cache) {
        return cache;
    }

    const newCache = new Map();
    chatResponseCacheByCustomer.set(key, newCache);
    return newCache;
};

const buildChatContextFingerprint = (context) => {
    const firstReminder = context.activeReminders?.[0] || null;
    const firstSale = context.recentSales?.[0] || null;

    return JSON.stringify({
        remindersCount: context.activeReminders?.length || 0,
        firstReminder: firstReminder ? {
            medicineName: firstReminder.medicineName,
            status: firstReminder.status,
            daysLeft: firstReminder.daysLeft,
            expiryDate: firstReminder.expiryDate
        } : null,
        salesCount: context.recentSales?.length || 0,
        firstSale: firstSale ? {
            saleDate: firstSale.saleDate,
            shopName: firstSale.shopName,
            totalAmount: firstSale.totalAmount
        } : null
    });
};

const getCachedCustomerChatResponse = ({ customerId, message, contextFingerprint, cacheKey }) => {
    const cache = getCustomerChatCache(customerId);
    const finalCacheKey = cacheKey || `${message.toLowerCase()}::${contextFingerprint}`;
    const row = cache.get(finalCacheKey);

    if (!row) {
        return null;
    }

    if (row.expiresAt < Date.now()) {
        cache.delete(finalCacheKey);
        return null;
    }

    return {
        cacheKey: finalCacheKey,
        payload: row.payload
    };
};

const setCachedCustomerChatResponse = ({ customerId, cacheKey, payload }) => {
    const cache = getCustomerChatCache(customerId);
    cache.set(cacheKey, {
        expiresAt: Date.now() + CHAT_CACHE_TTL_MS,
        payload
    });

    if (cache.size > 60) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) {
            cache.delete(oldestKey);
        }
    }
};

const classifyGeminiError = (errorMessage = '') => {
    const normalized = errorMessage.toLowerCase();

    if (normalized.includes('quota exceeded') || normalized.includes('resource has been exhausted')) {
        return {
            type: 'quota_exceeded',
            reply: CHAT_QUOTA_REPLY
        };
    }

    if (normalized.includes('api key') && normalized.includes('valid')) {
        return {
            type: 'invalid_key',
            reply: CHAT_INVALID_KEY_REPLY
        };
    }

    if (normalized.includes('timed out')) {
        return {
            type: 'timeout',
            reply: CHAT_TIMEOUT_REPLY
        };
    }

    return {
        type: 'provider_error',
        reply: CHAT_FALLBACK_REPLY
    };
};

const registerCustomerChatRequest = (customerId) => {
    const key = customerId.toString();
    const now = Date.now();
    const earliestAllowedTime = now - CHAT_RATE_WINDOW_MS;
    const recentRequests = (chatRateWindowByCustomer.get(key) || [])
        .filter((timestamp) => timestamp >= earliestAllowedTime);

    if (recentRequests.length >= CHAT_REQUESTS_PER_WINDOW) {
        const retryAfterMs = recentRequests[0] + CHAT_RATE_WINDOW_MS - now;
        return {
            allowed: false,
            retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000))
        };
    }

    recentRequests.push(now);
    chatRateWindowByCustomer.set(key, recentRequests);

    return {
        allowed: true,
        retryAfterSeconds: 0
    };
};

const signCustomerToken = (customer) => new Promise((resolve, reject) => {
    const payload = {
        customer: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone
        }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
        if (err) {
            reject(err);
            return;
        }
        resolve(token);
    });
});

const toCustomerPayload = (customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email || '',
    isLocationEnabled: !!customer.isLocationEnabled,
    location: toLocationPayload(customer.location),
    locationUpdatedAt: customer.locationUpdatedAt || null
});

const getCustomerReminderRows = async ({ customerId, phoneCandidates }) => {
    const sales = await Sales.find({ customerContact: { $in: phoneCandidates } })
        .sort({ createdAt: -1 })
        .populate('soldBy', 'username shopName')
        .lean();

    if (!sales.length) {
        return [];
    }

    const saleIds = sales.map((sale) => sale._id);

    const consumedRows = await CustomerReminder.find({
        customer: customerId,
        sale: { $in: saleIds }
    })
        .select('itemKey')
        .lean();

    const consumedKeys = new Set(consumedRows.map((row) => row.itemKey));

    const missingExpiryMedicineIds = new Set();
    sales.forEach((sale) => {
        sale.items.forEach((item) => {
            if (!item.expiryDate && item.medicine) {
                missingExpiryMedicineIds.add(item.medicine.toString());
            }
        });
    });

    const fallbackExpiryMap = new Map();
    if (missingExpiryMedicineIds.size > 0) {
        const medicines = await Medicine.find({
            _id: { $in: Array.from(missingExpiryMedicineIds) }
        })
            .select('_id expiryDate')
            .lean();

        medicines.forEach((medicine) => {
            fallbackExpiryMap.set(medicine._id.toString(), medicine.expiryDate);
        });
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const reminders = [];

    sales.forEach((sale) => {
        sale.items.forEach((item, itemIndex) => {
            const itemKey = buildItemKey(sale._id, itemIndex);
            if (consumedKeys.has(itemKey)) {
                return;
            }

            let expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
            if (!expiryDate && item.medicine) {
                const fallback = fallbackExpiryMap.get(item.medicine.toString());
                if (fallback) {
                    expiryDate = new Date(fallback);
                }
            }

            if (!expiryDate || Number.isNaN(expiryDate.getTime())) {
                return;
            }

            const startOfExpiry = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
            const daysLeft = Math.floor((startOfExpiry - startOfToday) / MS_IN_DAY);

            let status = 'safe';
            if (daysLeft < 0) {
                status = 'expired';
            } else if (daysLeft <= EXPIRING_SOON_DAYS) {
                status = 'expiring-soon';
            }

            reminders.push({
                itemKey,
                saleId: sale._id,
                itemIndex,
                medicineName: item.name,
                quantity: item.quantity,
                purchaseDate: item.purchaseDate || sale.createdAt,
                expiryDate,
                daysLeft,
                status,
                shopName: sale.soldBy?.shopName || sale.soldBy?.username || 'Medicine Shop'
            });
        });
    });

    reminders.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    return reminders;
};

const buildCustomerChatContext = async ({ customerId, customerPhone }) => {
    const phoneCandidates = buildPhoneCandidates(customerPhone).filter(Boolean);

    if (!phoneCandidates.length) {
        return {
            recentSales: [],
            activeReminders: []
        };
    }

    const [sales, reminders] = await Promise.all([
        Sales.find({ customerContact: { $in: phoneCandidates } })
            .sort({ createdAt: -1 })
            .limit(CHAT_RECENT_SALES_LIMIT)
            .populate('soldBy', 'username shopName')
            .lean(),
        getCustomerReminderRows({ customerId, phoneCandidates })
    ]);

    const recentSales = sales.map((sale) => ({
        saleDate: toISODate(sale.createdAt),
        shopName: sale.soldBy?.shopName || sale.soldBy?.username || 'Medicine Shop',
        totalAmount: sale.totalAmount,
        items: sale.items.slice(0, 6).map((item) => ({
            medicineName: item.name,
            quantity: item.quantity,
            purchaseDate: toISODate(item.purchaseDate || sale.createdAt)
        }))
    }));

    const activeReminders = reminders
        .slice(0, CHAT_ACTIVE_REMINDERS_LIMIT)
        .map((reminder) => ({
            medicineName: reminder.medicineName,
            status: reminder.status,
            daysLeft: reminder.daysLeft,
            expiryDate: toISODate(reminder.expiryDate),
            purchaseDate: toISODate(reminder.purchaseDate),
            shopName: reminder.shopName
        }));

    return {
        recentSales,
        activeReminders
    };
};

// @route   POST api/customer/register
// @desc    Register customer account
// @access  Public
exports.registerCustomer = async (req, res) => {
    const { name, phone, password, email } = req.body;

    try {
        if (!name || !phone || !password) {
            return res.status(400).json({ msg: 'Name, phone and password are required' });
        }

        const normalizedPhone = normalizePhone(phone);
        if (normalizedPhone.length < 10) {
            return res.status(400).json({ msg: 'Please provide a valid phone number' });
        }

        const existingByPhone = await Customer.findOne({ phone: normalizedPhone });
        if (existingByPhone) {
            return res.status(400).json({ msg: 'An account already exists with this phone number' });
        }

        const normalizedEmail = email ? email.trim().toLowerCase() : undefined;
        if (normalizedEmail) {
            const existingByEmail = await Customer.findOne({ email: normalizedEmail });
            if (existingByEmail) {
                return res.status(400).json({ msg: 'An account already exists with this email' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const customer = await Customer.create({
            name: name.trim(),
            phone: normalizedPhone,
            email: normalizedEmail,
            password: hashedPassword
        });

        const token = await signCustomerToken(customer);

        return res.status(201).json({
            token,
            customer: toCustomerPayload(customer)
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   POST api/customer/login
// @desc    Login customer with name + phone + password
// @access  Public
exports.loginCustomer = async (req, res) => {
    const { name, phone, password } = req.body;

    try {
        if (!name || !phone || !password) {
            return res.status(400).json({ msg: 'Name, phone and password are required' });
        }

        const normalizedPhone = normalizePhone(phone);
        const customer = await Customer.findOne({ phone: normalizedPhone });

        if (!customer) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        if (customer.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, customer.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const token = await signCustomerToken(customer);

        return res.json({
            token,
            customer: toCustomerPayload(customer)
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   GET api/customer/me
// @desc    Get customer profile
// @access  Private (Customer)
exports.getCustomerProfile = async (req, res) => {
    try {
        const customer = await Customer.findById(req.customer.id);

        if (!customer) {
            return res.status(404).json({ msg: 'Customer not found' });
        }

        return res.json({ customer: toCustomerPayload(customer) });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   PUT api/customer/me
// @desc    Update customer profile
// @access  Private (Customer)
exports.updateCustomerProfile = async (req, res) => {
    const { name, email } = req.body;

    try {
        if (!name || !name.trim()) {
            return res.status(400).json({ msg: 'Name is required' });
        }

        const customer = await Customer.findById(req.customer.id);
        if (!customer) {
            return res.status(404).json({ msg: 'Customer not found' });
        }

        const normalizedEmail = email ? email.trim().toLowerCase() : '';
        if (normalizedEmail) {
            const existingCustomer = await Customer.findOne({
                email: normalizedEmail,
                _id: { $ne: customer._id }
            });

            if (existingCustomer) {
                return res.status(400).json({ msg: 'Email is already used by another account' });
            }

            customer.email = normalizedEmail;
        } else {
            customer.email = undefined;
        }

        customer.name = name.trim();
        await customer.save();

        const token = await signCustomerToken(customer);

        return res.json({
            token,
            customer: toCustomerPayload(customer)
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   PATCH api/customer/password
// @desc    Change customer password
// @access  Private (Customer)
exports.changeCustomerPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ msg: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ msg: 'New password must be at least 6 characters long' });
        }

        const customer = await Customer.findById(req.customer.id);
        if (!customer) {
            return res.status(404).json({ msg: 'Customer not found' });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, customer.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ msg: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        customer.password = await bcrypt.hash(newPassword, salt);
        await customer.save();

        return res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   PATCH api/customer/location
// @desc    Save customer location and enable/disable location service
// @access  Private (Customer)
exports.updateCustomerLocation = async (req, res) => {
    const { latitude, longitude, isLocationEnabled } = req.body;

    try {
        const customer = await Customer.findById(req.customer.id);
        if (!customer) {
            return res.status(404).json({ msg: 'Customer not found' });
        }

        const hasLocationPayload = latitude !== undefined || longitude !== undefined;

        if (hasLocationPayload) {
            if (latitude === undefined || longitude === undefined) {
                return res.status(400).json({ msg: 'Both latitude and longitude are required' });
            }

            const parsedLatitude = parseCoordinateNumber(latitude);
            const parsedLongitude = parseCoordinateNumber(longitude);

            if (parsedLatitude === null || parsedLongitude === null) {
                return res.status(400).json({ msg: 'Latitude and longitude must be valid numbers' });
            }

            if (parsedLatitude < -90 || parsedLatitude > 90 || parsedLongitude < -180 || parsedLongitude > 180) {
                return res.status(400).json({ msg: 'Location coordinates are out of range' });
            }

            customer.location = {
                type: 'Point',
                coordinates: [parsedLongitude, parsedLatitude]
            };
            customer.locationUpdatedAt = new Date();
        }

        if (typeof isLocationEnabled === 'boolean') {
            if (isLocationEnabled && !hasCoordinates(customer.location)) {
                return res.status(400).json({ msg: 'Detect location first before enabling location service' });
            }

            customer.isLocationEnabled = isLocationEnabled;
        }

        if (!hasLocationPayload && typeof isLocationEnabled !== 'boolean') {
            return res.status(400).json({ msg: 'No location changes provided' });
        }

        await customer.save();

        return res.json({ customer: toCustomerPayload(customer) });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   GET api/customer/search-medicines
// @desc    Search medicines from nearby live shops
// @access  Private (Customer)
exports.searchMedicinesFromLiveShops = async (req, res) => {
    const queryText = (req.query.q || '').toString().trim();
    const radiusKmRaw = req.query.radiusKm;

    try {
        if (!queryText) {
            return res.status(400).json({ msg: 'Search query is required' });
        }

        const radiusKm = radiusKmRaw !== undefined ? Number(radiusKmRaw) : DEFAULT_SEARCH_RADIUS_KM;
        if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
            return res.status(400).json({ msg: 'radiusKm must be a number between 0 and 100' });
        }

        const customer = await Customer.findById(req.customer.id).select('location isLocationEnabled');
        if (!customer) {
            return res.status(404).json({ msg: 'Customer not found' });
        }

        if (!customer.isLocationEnabled || !hasCoordinates(customer.location)) {
            return res.status(400).json({ msg: 'Enable and detect your location before searching nearby shops' });
        }

        const radiusMeters = radiusKm * 1000;

        const nearbyShops = await User.aggregate([
            {
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: customer.location.coordinates
                    },
                    distanceField: 'distanceMeters',
                    maxDistance: radiusMeters,
                    spherical: true,
                    query: {
                        isLive: true,
                        isLocationEnabled: true,
                        'shopLocation.coordinates.1': { $exists: true }
                    }
                }
            },
            {
                $project: {
                    shopName: 1,
                    shopAddress: 1,
                    shopPhone: 1,
                    shopDescription: 1,
                    shopLocation: 1,
                    distanceMeters: 1
                }
            }
        ]);

        if (!nearbyShops.length) {
            return res.json({ query: queryText, radiusKm, results: [] });
        }

        const shopMap = new Map();
        const shopIds = [];
        nearbyShops.forEach((shop) => {
            shopMap.set(shop._id.toString(), shop);
            shopIds.push(shop._id);
        });

        const medicines = await Medicine.find({
            user: { $in: shopIds },
            quantity: { $gt: 0 },
            name: { $regex: escapeRegex(queryText), $options: 'i' }
        })
            .select('name price quantity expiryDate manufacturer user')
            .lean();

        const results = medicines
            .map((medicine) => {
                const shop = shopMap.get(medicine.user.toString());
                if (!shop) return null;

                const shopLocationPayload = toLocationPayload(shop.shopLocation);

                return {
                    medicineId: medicine._id,
                    medicineName: medicine.name,
                    manufacturer: medicine.manufacturer,
                    price: medicine.price,
                    quantity: medicine.quantity,
                    expiryDate: medicine.expiryDate,
                    shopId: shop._id,
                    shopName: shop.shopName,
                    shopAddress: shop.shopAddress || '',
                    shopPhone: shop.shopPhone || '',
                    shopDescription: shop.shopDescription || '',
                    shopLocation: shopLocationPayload,
                    distanceMeters: Math.round(shop.distanceMeters),
                    distanceKm: Number((shop.distanceMeters / 1000).toFixed(2))
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                if (a.distanceMeters !== b.distanceMeters) {
                    return a.distanceMeters - b.distanceMeters;
                }
                return a.price - b.price;
            });

        return res.json({ query: queryText, radiusKm, results });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   GET api/customer/history
// @desc    Get purchase history for logged in customer
// @access  Private (Customer)
exports.getCustomerHistory = async (req, res) => {
    try {
        const phoneCandidates = buildPhoneCandidates(req.customer.phone);

        const history = await Sales.find({ customerContact: { $in: phoneCandidates } })
            .sort({ createdAt: -1 })
            .populate('soldBy', 'username shopName');

        return res.json(history);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   GET api/customer/reminders
// @desc    Get active reminders for logged in customer
// @access  Private (Customer)
exports.getCustomerReminders = async (req, res) => {
    try {
        const phoneCandidates = buildPhoneCandidates(req.customer.phone);
        const reminders = await getCustomerReminderRows({
            customerId: req.customer.id,
            phoneCandidates
        });

        return res.json({ thresholdDays: EXPIRING_SOON_DAYS, reminders });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   POST api/customer/chat
// @desc    Ask chatbot questions using customer purchase and reminder context
// @access  Private (Customer)
exports.customerChat = async (req, res) => {
    const rawMessage = req.body?.message;

    try {
        if (typeof rawMessage !== 'string') {
            return res.status(400).json({ msg: 'message is required' });
        }

        const message = normalizeWhitespace(rawMessage);
        if (!message) {
            return res.status(400).json({ msg: 'message cannot be empty' });
        }

        if (message.length > CHAT_MESSAGE_MAX_LENGTH) {
            return res.status(400).json({ msg: `message must be under ${CHAT_MESSAGE_MAX_LENGTH} characters` });
        }

        const intent = getChatIntent(message);

        if (intent.isCasual && !intent.isHealthRelated) {
            return res.json({
                reply: CHAT_CASUAL_REPLY,
                disclaimer: CHAT_MEDICAL_DISCLAIMER,
                sources: {
                    recentSalesCount: 0,
                    activeReminderCount: 0
                },
                meta: {
                    casual: true,
                    generatedAt: new Date().toISOString()
                }
            });
        }

        if (!intent.isHealthRelated) {
            return res.json({
                reply: CHAT_OFF_TOPIC_REPLY,
                disclaimer: CHAT_MEDICAL_DISCLAIMER,
                sources: {
                    recentSalesCount: 0,
                    activeReminderCount: 0
                },
                meta: {
                    offTopic: true,
                    generatedAt: new Date().toISOString()
                }
            });
        }

        if (intent.isEmergency) {
            return res.json({
                reply: CHAT_EMERGENCY_REPLY,
                disclaimer: CHAT_MEDICAL_DISCLAIMER,
                sources: {
                    recentSalesCount: 0,
                    activeReminderCount: 0
                },
                meta: {
                    escalated: true,
                    generatedAt: new Date().toISOString()
                }
            });
        }

        if (intent.asksHighRisk) {
            return res.json({
                reply: CHAT_HIGH_RISK_REPLY,
                disclaimer: CHAT_MEDICAL_DISCLAIMER,
                sources: {
                    recentSalesCount: 0,
                    activeReminderCount: 0
                },
                meta: {
                    highRiskTopic: true,
                    generatedAt: new Date().toISOString()
                }
            });
        }

        let context = {
            recentSales: [],
            activeReminders: []
        };

        if (intent.asksMedicine) {
            const customer = await Customer.findById(req.customer.id).select('phone').lean();
            if (!customer) {
                return res.status(404).json({ msg: 'Customer not found' });
            }

            context = await buildCustomerChatContext({
                customerId: req.customer.id,
                customerPhone: customer.phone
            });

            if (intent.mentionsConsumed && context.activeReminders.length) {
                const normalizedMessage = message.toLowerCase();
                const filtered = context.activeReminders.filter((reminder) => {
                    const medicineName = normalizeWhitespace(reminder.medicineName || '').toLowerCase();
                    return !medicineName || !normalizedMessage.includes(medicineName);
                });

                context.activeReminders = filtered.length < context.activeReminders.length ? filtered : [];
            }
        }

        const contextFingerprint = intent.asksMedicine
            ? buildChatContextFingerprint(context)
            : 'wellness-topic';
        const cacheKey = `${message.toLowerCase()}::${intent.asksMedicine ? 'medicine' : 'wellness'}::${contextFingerprint}`;
        const cached = getCachedCustomerChatResponse({
            customerId: req.customer.id,
            message,
            contextFingerprint,
            cacheKey
        });

        if (cached) {
            return res.json({
                ...cached.payload,
                meta: {
                    ...(cached.payload.meta || {}),
                    cached: true,
                    generatedAt: new Date().toISOString()
                }
            });
        }

        const rateState = registerCustomerChatRequest(req.customer.id);
        if (!rateState.allowed) {
            const quickReply = buildIntentAwareFallbackReply({ intent, message, context });
            const quickModeMessage = `Quick mode is active for about ${rateState.retryAfterSeconds} seconds because of high message frequency.`;

            const quickResponsePayload = {
                reply: ensureStructuredReply({
                    reply: `${quickModeMessage}\n\n${quickReply}`,
                    intent
                }),
                disclaimer: CHAT_MEDICAL_DISCLAIMER,
                sources: {
                    recentSalesCount: context.recentSales.length,
                    activeReminderCount: context.activeReminders.length
                },
                meta: {
                    rateLimited: true,
                    cached: false,
                    generatedAt: new Date().toISOString()
                }
            };

            setCachedCustomerChatResponse({
                customerId: req.customer.id,
                cacheKey,
                payload: quickResponsePayload
            });

            return res.json(quickResponsePayload);
        }

        const contextText = intent.asksMedicine
            ? JSON.stringify({
                note: 'Medicine context requested by customer query',
                thresholdDays: EXPIRING_SOON_DAYS,
                recentSales: context.recentSales,
                activeReminders: context.activeReminders
            }, null, 2)
            : JSON.stringify({
                note: 'General health/wellness query. Do not include customer-specific medicine history unless asked.'
            }, null, 2);

        let reply = CHAT_FALLBACK_REPLY;
        let model = null;
        let providerErrorType = null;

        try {
            const aiResult = await generateGeminiCustomerReply({
                message,
                contextText,
                systemInstruction: CHAT_SYSTEM_INSTRUCTION
            });

            reply = aiResult.reply;
            model = aiResult.model;

            reply = sanitizeAssistantReply(reply);

            if (intent.mentionsConsumed && /(expired|do not use|don't use)/i.test(reply.toLowerCase())) {
                reply = buildConsumedAcknowledgementReply();
            }

            if (shouldHideMedicineDetailsForIntent({ intent, reply })) {
                reply = buildGenericGuidanceReply({ message, context });
            }

            if (intent.asksMedicine && intent.asksWellness && isLikelyIncompleteReply(reply)) {
                reply = buildPurchaseAwareDietReply({ context });
            }

            if (shouldReplaceOverRestrictiveReply({ message, reply })) {
                reply = buildIntentAwareFallbackReply({ intent, message, context });
            }

            reply = ensureStructuredReply({ reply, intent });
        } catch (serviceErr) {
            const providerFailure = classifyGeminiError(serviceErr.message);
            const quickReply = buildIntentAwareFallbackReply({ intent, message, context });

            reply = ensureStructuredReply({
                reply: `${providerFailure.reply}\n\n${quickReply}`,
                intent
            });
            providerErrorType = providerFailure.type;
            console.error('Gemini chat error:', serviceErr.message);
        }

        const responsePayload = {
            reply,
            disclaimer: CHAT_MEDICAL_DISCLAIMER,
            sources: {
                recentSalesCount: context.recentSales.length,
                activeReminderCount: context.activeReminders.length
            },
            meta: {
                model,
                providerErrorType,
                topic: intent.asksMedicine ? 'medicine' : 'wellness',
                cached: false,
                generatedAt: new Date().toISOString()
            }
        };

        setCachedCustomerChatResponse({
            customerId: req.customer.id,
            cacheKey,
            payload: responsePayload
        });

        return res.json(responsePayload);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   PATCH api/customer/reminders/consume
// @desc    Mark a reminder as consumed for logged in customer
// @access  Private (Customer)
exports.markReminderConsumed = async (req, res) => {
    const { saleId, itemIndex } = req.body;

    try {
        if (!saleId || itemIndex === undefined) {
            return res.status(400).json({ msg: 'saleId and itemIndex are required' });
        }

        if (!mongoose.Types.ObjectId.isValid(saleId)) {
            return res.status(400).json({ msg: 'Invalid saleId' });
        }

        const parsedItemIndex = Number.parseInt(itemIndex, 10);
        if (Number.isNaN(parsedItemIndex) || parsedItemIndex < 0) {
            return res.status(400).json({ msg: 'Invalid itemIndex' });
        }

        const sale = await Sales.findOne({
            _id: saleId,
            customerContact: { $in: buildPhoneCandidates(req.customer.phone) }
        }).select('_id items');

        if (!sale) {
            return res.status(404).json({ msg: 'Sale not found for this customer' });
        }

        if (parsedItemIndex >= sale.items.length) {
            return res.status(404).json({ msg: 'Reminder item not found' });
        }

        const itemKey = buildItemKey(sale._id, parsedItemIndex);

        await CustomerReminder.findOneAndUpdate(
            { customer: req.customer.id, itemKey },
            {
                customer: req.customer.id,
                sale: sale._id,
                itemIndex: parsedItemIndex,
                itemKey,
                consumedAt: new Date()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.json({ msg: 'Reminder marked as consumed', itemKey });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};
