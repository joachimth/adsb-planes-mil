/**
 * History Proxy - MilAir Watch
 * Fetches historical flight tracks from the milair-history-proxy Cloudflare Worker.
 *
 * The Worker builds its OWN history database by polling adsb.lol on a cron and
 * storing positions in Cloudflare D1. It adds CORS so this pure frontend can
 * read multi-day tracks directly. No third-party credentials involved.
 *
 * If the proxy URL is unset or unreachable, every call soft-fails to an empty
 * array and the app relies solely on the local track buffer (track-store.js).
 *
 * Worker endpoint used:
 *   GET /history?icao24=<hex>&hours=<n>
 *     -> { icao24, hours, count, path: [{ t, lat, lon, alt, track, gs, flight }] }
 *        `t` is Unix SECONDS (UTC). Empty path when no history stored yet.
 */

console.log("✅ history-proxy.js er indlæst.");

// ============================================================
// CONFIGURATION — deployed Worker URL. Set to null to disable.
// ============================================================
export const HISTORY_PROXY_BASE = 'https://milair-history-proxy.joachim-763.workers.dev';
// ============================================================

// In-memory cache to avoid hammering the proxy for the same hex+window.
// Shape: Map<"hex:hours:bucket", { positions: [], fetchedAt: number }>
const trackCache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000;   // 3 min per hex+window
const MAX_CACHED_HEXES = 50;

/**
 * Fetch historical track for one aircraft from the milair-history-proxy.
 * @param {string} icao24 - 24-bit ICAO hex (lowercase, no leading zeros)
 * @param {number} hours  - lookback window in hours (default 24, max 720)
 * @returns {Promise<Array<{lat:number, lon:number, alt:number|null, tsMs:number}>>}
 *          Empty array when proxy is unavailable, unconfigured, or has no data.
 */
export async function fetchHistoricalTrack(icao24, hours = 24) {
    if (!HISTORY_PROXY_BASE) return [];
    if (!icao24) return [];

    const hex = icao24.toLowerCase();
    let h = Number(hours);
    if (!Number.isFinite(h) || h <= 0) h = 24;
    if (h > 720) h = 720;

    const cacheKey = `${hex}:${h}:${Math.floor(Date.now() / CACHE_TTL_MS)}`;
    const cached = trackCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.positions;
    }

    try {
        const url = `${HISTORY_PROXY_BASE}/history?icao24=${encodeURIComponent(hex)}&hours=${h}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

        if (!response.ok) {
            console.warn(`⚠️ history-proxy: HTTP ${response.status} for ${hex}`);
            return [];
        }

        const data = await response.json();
        const path = (data && Array.isArray(data.path)) ? data.path : [];

        // Normalise to [lat, lon, alt, tsMs] with ts in ms (Worker sends seconds).
        const normalised = path
            .filter(p => typeof p.lat === 'number' && typeof p.lon === 'number')
            .map(p => ({
                lat: p.lat,
                lon: p.lon,
                alt: (typeof p.alt === 'number') ? p.alt : null,
                tsMs: (typeof p.t === 'number') ? (p.t < 1e12 ? p.t * 1000 : p.t) : 0,
            }));

        if (trackCache.size >= MAX_CACHED_HEXES) {
            const oldestKey = trackCache.keys().next().value;
            if (oldestKey) trackCache.delete(oldestKey);
        }
        trackCache.set(cacheKey, { positions: normalised, fetchedAt: Date.now() });

        console.log(`✅ history-proxy: ${normalised.length} historik-punkter for ${hex} (${h}t)`);
        return normalised;

    } catch (err) {
        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
            console.warn(`⚠️ history-proxy: timeout for ${hex}`);
        } else {
            console.warn(`⚠️ history-proxy: fetch fejlede for ${hex}:`, err.message);
        }
        return [];
    }
}

/**
 * Merge historical positions with local track-store positions.
 * Dedups by timestamp (ms); local points win on collision. Sorted ascending.
 * @param {Array} localPoints   - from track-store.getTrack(): [lat, lon, alt, tsMs]
 * @param {Array} historyPoints - from fetchHistoricalTrack(): { lat, lon, alt, tsMs }
 * @returns {Array<[lat, lon, alt, tsMs]>}
 */
export function mergeTracks(localPoints, historyPoints) {
    const seen = new Set();
    const merged = [];

    for (const p of (localPoints || [])) {
        const ts = p[3];
        if (!seen.has(ts)) { seen.add(ts); merged.push(p); }
    }
    for (const p of (historyPoints || [])) {
        const ts = p.tsMs;
        if (ts && !seen.has(ts)) { seen.add(ts); merged.push([p.lat, p.lon, p.alt ?? null, ts]); }
    }

    merged.sort((a, b) => a[3] - b[3]);
    return merged;
}

/**
 * Check whether the proxy is reachable and its database is bound.
 * @returns {Promise<boolean>}
 */
export async function checkProxyHealth() {
    if (!HISTORY_PROXY_BASE) return false;
    try {
        const res = await fetch(`${HISTORY_PROXY_BASE}/health`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        return !!(data && data.ok && data.dbConfigured);
    } catch {
        return false;
    }
}
