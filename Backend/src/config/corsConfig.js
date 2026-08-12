/**
 * CORS allowlist for browser clients (SPA on minutesheet.com calling api.minutesheet.com).
 * Set CORS_ORIGINS on the VPS to extra comma-separated origins, e.g.:
 *   CORS_ORIGINS=https://staging.minutesheet.com,http://127.0.0.1:5173
 */

const DEFAULT_ORIGINS = [
    'https://minutesheet.com',
    'https://www.minutesheet.com',
    'https://webdevelopersinc.com/',
    'http://localhost:5173',
];

function originsFromEnv() {
    const raw = process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || '';
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export function getCorsAllowlist() {
    return [...new Set([...DEFAULT_ORIGINS, ...originsFromEnv()])];
}

/**
 * @param {string | undefined} origin - Request Origin header
 * @returns {boolean}
 */
export function isCorsOriginAllowed(origin) {
    if (!origin) return true;

    const list = getCorsAllowlist();
    if (list.includes(origin)) return true;

    if (process.env.NODE_ENV === 'development') return true;

    try {
        const u = new URL(origin);
        const host = u.hostname.toLowerCase();
        const isSite =
            host === 'minutesheet.com' || host === 'www.minutesheet.com' || host.endsWith('.minutesheet.com');
        if (isSite && (u.protocol === 'https:' || u.protocol === 'http:')) {
            return true;
        }
    } catch {
        return false;
    }

    return false;
}

/**
 * Express `cors` package origin callback.
 * On deny, pass an Error so the stack is visible server-side; add CORS on error responses via middleware if needed.
 */
export function corsOriginCallback(origin, callback) {
    if (!origin) return callback(null, true);

    if (isCorsOriginAllowed(origin)) {
        return callback(null, true);
    }

    console.warn(`CORS blocked for origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
}
