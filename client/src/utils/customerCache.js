const CACHE_PREFIX = 'medicineERP:customer:';

const getNow = () => Date.now();

export const buildCustomerCacheKey = (customerId, section) => `${CACHE_PREFIX}${customerId || 'guest'}:${section}`;

export const readCustomerCache = (key, ttlMs = 120000) => {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;

        if (!parsed.savedAt || getNow() - parsed.savedAt > ttlMs) {
            sessionStorage.removeItem(key);
            return null;
        }

        return parsed.value ?? null;
    } catch (_err) {
        return null;
    }
};

export const writeCustomerCache = (key, value) => {
    try {
        sessionStorage.setItem(key, JSON.stringify({
            savedAt: getNow(),
            value
        }));
    } catch (_err) {
        // Ignore storage write failures.
    }
};
