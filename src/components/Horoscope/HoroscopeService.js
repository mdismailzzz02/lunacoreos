// HoroscopeService.js
// All FreeAstroAPI calls for Ismail's horoscope data
// Birth: 18 April 1997, 1:00 AM, Lucknow, India

const API_KEY = import.meta.env.VITE_FREEASTRO_KEY;
const BASE_URL = 'https://api.freeastroapi.com';

// Ismail's birth data — hardcoded, never changes
const BIRTH_DATA = {
    year: 1997,
    month: 4,
    day: 18,
    hour: 1,
    minute: 0,
    city: 'Lucknow',
    lat: 26.8467,
    lng: 80.9462,
    tz_str: 'Asia/Kolkata',
    time_known: true,
};

function cacheGet(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { data, expiry } = JSON.parse(raw);
        if (Date.now() > expiry) { localStorage.removeItem(key); return null; }
        return data;
    } catch { return null; }
}

function cacheSet(key, data, ttlMs) {
    try {
        localStorage.setItem(key, JSON.stringify({ data, expiry: Date.now() + ttlMs }));
    } catch { /* storage full — skip cache */ }
}

async function getFallbackData(path) {
    try {
        const res = await fetch('/astro_fallback.json');
        if (res.ok) {
            const data = await res.json();
            if (path.includes('/horoscope/daily/sign')) return data.sign;
            if (path.includes('/numerology/profile')) return data.num;
            if (path.includes('/horoscope/daily/personal')) return data.personal;
            if (path.includes('/vedic/chart') || path.includes('/western/natal')) return data.vedic || data.personal; // approximate fallback
            if (path.includes('/utilities/moon-phase')) return data.moon;
        }
    } catch (e) {
        // ignore
    }
    return null;
}

async function post(path, body) {
    const errorCacheKey = `err_${path}`;
    if (cacheGet(errorCacheKey)) throw new Error(cacheGet(errorCacheKey));

    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        if (res.status === 429) {
            const fallback = await getFallbackData(path);
            if (fallback) return fallback;
        }
        const errMsg = `FreeAstroAPI ${path} failed: ${res.status}`;
        cacheSet(errorCacheKey, errMsg, 60 * 1000); // block retries for 1 min
        throw new Error(errMsg);
    }
    return res.json();
}

async function get(path) {
    const errorCacheKey = `err_${path}`;
    if (cacheGet(errorCacheKey)) throw new Error(cacheGet(errorCacheKey));

    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'x-api-key': API_KEY }
    });
    if (!res.ok) {
        if (res.status === 429) {
            const fallback = await getFallbackData(path);
            if (fallback) return fallback;
        }
        const errMsg = `FreeAstroAPI ${path} failed: ${res.status}`;
        cacheSet(errorCacheKey, errMsg, 60 * 1000); // block retries for 1 min
        throw new Error(errMsg);
    }
    return res.json();
}

// ---------- Public API ----------

// Ismail's sun sign (Aries) — used for plain-text daily horoscope
const SUN_SIGN = 'aries';

export async function fetchDailySignHoroscope() {
    const today = new Date().toLocaleDateString('en-CA');
    const CACHE_KEY = `astro_daily_sign_${today}`;
    const cached = cacheGet(CACHE_KEY);
    if (cached) return cached;

    const data = await get(`/api/v1/horoscope/daily/sign?sign=${SUN_SIGN}&date=${today}`);
    cacheSet(CACHE_KEY, data, 24 * 60 * 60 * 1000); // 24 hrs
    return data;
}

export async function fetchNatalChart() {
    const CACHE_KEY = 'astro_natal_chart';
    const cached = cacheGet(CACHE_KEY);
    if (cached) return cached;

    const data = await post('/api/v1/natal/calculate', {
        name: 'Mohd Ismail',
        year: BIRTH_DATA.year,
        month: BIRTH_DATA.month,
        day: BIRTH_DATA.day,
        hour: BIRTH_DATA.hour,
        minute: BIRTH_DATA.minute,
        city: BIRTH_DATA.city,
        lat: BIRTH_DATA.lat,
        lng: BIRTH_DATA.lng,
        tz_str: BIRTH_DATA.tz_str,
        time_known: true,
    });
    cacheSet(CACHE_KEY, data, 30 * 24 * 60 * 60 * 1000); // 30 days
    return data;
}

export async function fetchNatalSvg() {
    const CACHE_KEY = 'astro_natal_svg';
    const cached = cacheGet(CACHE_KEY);
    if (cached) return cached;

    const data = await post('/api/v1/natal/chart-svg', {
        year: BIRTH_DATA.year,
        month: BIRTH_DATA.month,
        day: BIRTH_DATA.day,
        hour: BIRTH_DATA.hour,
        minute: BIRTH_DATA.minute,
        city: BIRTH_DATA.city,
        lat: BIRTH_DATA.lat,
        lng: BIRTH_DATA.lng,
        tz_str: BIRTH_DATA.tz_str,
        time_known: true,
    });
    cacheSet(CACHE_KEY, data, 30 * 24 * 60 * 60 * 1000); // 30 days
    return data;
}

export async function fetchDailyHoroscope() {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const CACHE_KEY = `astro_daily_v3_${today}`;
    const cached = cacheGet(CACHE_KEY);
    if (cached) return cached;

    // V3 endpoint uses a nested "birth" object
    const data = await post('/api/v3/horoscope/daily/personal', {
        birth: {
            year: BIRTH_DATA.year,
            month: BIRTH_DATA.month,
            day: BIRTH_DATA.day,
            hour: BIRTH_DATA.hour,
            minute: BIRTH_DATA.minute,
            city: BIRTH_DATA.city,
            lat: BIRTH_DATA.lat,
            lng: BIRTH_DATA.lng,
            tz_str: BIRTH_DATA.tz_str,
            time_known: true,
        },
        date: today,
        tz_str: 'Asia/Kolkata',
    });
    cacheSet(CACHE_KEY, data, 24 * 60 * 60 * 1000); // 24 hrs
    return data;
}

export async function fetchMoonPhase() {
    const CACHE_KEY = 'astro_moon_phase';
    const cached = cacheGet(CACHE_KEY);
    if (cached) return cached;

    const now = new Date();
    // Correct path: /api/v1/moon/phase — uses ?date=ISO&lat=&lon=
    const isoDate = now.toISOString().slice(0, 19); // 2026-08-21T23:27:00
    const params = new URLSearchParams({
        date: isoDate,
        lat: BIRTH_DATA.lat,
        lon: BIRTH_DATA.lng, // API uses "lon" not "lng"
        include_zodiac: 'true',
    });
    const data = await get(`/api/v1/moon/phase?${params.toString()}`);
    cacheSet(CACHE_KEY, data, 4 * 60 * 60 * 1000); // 4 hrs
    return data;
}


export async function fetchVedicChart() {
    const CACHE_KEY = 'astro_vedic_chart';
    const cached = cacheGet(CACHE_KEY);
    if (cached) return cached;

    const data = await post('/api/v1/vedic/chart', {
        year: BIRTH_DATA.year,
        month: BIRTH_DATA.month,
        day: BIRTH_DATA.day,
        hour: BIRTH_DATA.hour,
        minute: BIRTH_DATA.minute,
        city: BIRTH_DATA.city,
        lat: BIRTH_DATA.lat,
        lng: BIRTH_DATA.lng,
        tz_str: BIRTH_DATA.tz_str,
        time_known: true,
    });
    cacheSet(CACHE_KEY, data, 30 * 24 * 60 * 60 * 1000); // 30 days
    return data;
}

export async function fetchNumerology() {
    const CACHE_KEY = 'astro_numerology';
    const cached = cacheGet(CACHE_KEY);
    if (cached) return cached;

    const data = await post('/api/v1/numerology/profile', {
        subject: {
            birth_date: `${BIRTH_DATA.year}-${String(BIRTH_DATA.month).padStart(2, '0')}-${String(BIRTH_DATA.day).padStart(2, '0')}`,
            name: {
                birth: 'Mohd Ismail',
                current: 'Mohd Ismail'
            },
            tz_str: BIRTH_DATA.tz_str
        },
        method: {
            system: 'pythagorean'
        },
        include_interpretations: true
    });
    cacheSet(CACHE_KEY, data, 30 * 24 * 60 * 60 * 1000); // 30 days
    return data;
}
