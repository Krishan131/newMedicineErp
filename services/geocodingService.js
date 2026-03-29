const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';

const firstNonEmpty = (...values) => values.find((value) => typeof value === 'string' && value.trim());

const buildFullPostalAddress = (address = {}, displayName = '') => {
    const line1 = [address.house_number, address.road].filter(Boolean).join(' ').trim();
    const line2 = firstNonEmpty(address.neighbourhood, address.suburb, address.hamlet, address.quarter, address.residential);
    const line3 = firstNonEmpty(address.city, address.town, address.village, address.municipality, address.county);
    const line4 = firstNonEmpty(address.state_district, address.state);
    const line5 = address.postcode;
    const line6 = address.country;

    const deduped = [];
    const seen = new Set();

    [line1, line2, line3, line4, line5, line6].forEach((part) => {
        if (!part || typeof part !== 'string') return;
        const normalized = part.trim();
        if (!normalized) return;

        const key = normalized.toLowerCase();
        if (seen.has(key)) return;

        seen.add(key);
        deduped.push(normalized);
    });

    if (deduped.length > 0) {
        return deduped.join(', ');
    }

    return typeof displayName === 'string' ? displayName.trim() : '';
};

exports.reverseGeocode = async (latitude, longitude) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
        const query = new URLSearchParams({
            lat: String(latitude),
            lon: String(longitude),
            format: 'jsonv2',
            addressdetails: '1',
            zoom: '18'
        });

        const response = await fetch(`${NOMINATIM_ENDPOINT}?${query.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Accept-Language': 'en',
                'User-Agent': 'MedicineERP/1.0 (shop address lookup)'
            },
            signal: controller.signal
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json();
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        const resolvedAddress = buildFullPostalAddress(payload.address || {}, payload.display_name || '');
        return resolvedAddress || null;
    } catch (error) {
        return null;
    } finally {
        clearTimeout(timeout);
    }
};