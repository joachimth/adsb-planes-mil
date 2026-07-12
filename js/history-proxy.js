/**
 * History Proxy - MilAir Watch
 * Fetches historical flight tracks from the milair-history-proxy Cloudflare Worker.
 *
 * The Worker wraps the OpenSky Network API (OAuth2 + CORS) so our pure frontend
 * can retrieve past flights and tracks without server-side credentials.
 *
 * If the proxy URL is not configured or unreachable, falls back gracefully
 * to the local track buffer (track-store.js).
 *
 * Configuration:
 *   - Set HISTORY_PROXY_BASE to your deployed Worker URL (e.g. "https://milair-history-proxy.example.workers.dev")
 *   - When unset, all calls return null (proxy not available yet).
 *
 * Endpoints (proxied):
 *   GET /tracks?icao24=<hex>&time=<unix_s>
 *     -> Historical positions for one aircraft, up to ~30 days back.
 *        Returns { track: [{ lat, lon, alt, ts }] } or an empty track on no data.
 *   GET /health
 *     -> { ok: true, credentialsConfigured: true }
 */

console.log("✅ history-proxy.js er indlæst.");

// ============================================================
// CONFIGURATION — set this to your deployed Worker URL
// ============================================================
// Example: export const HISTORY_PROXY_BASE = 'https://milair-history-proxy.joachim-763.workers.dev';
// When null/empty, all proxy calls are skipped — the app relies solely on local tracks.
export const HISTORY_PROXY_BASE = null;
// ============================================================

// In-memory cache to avoid hammering the proxy for the same hex+time window.
// Shape: Map<"hex:timeBucket", { positions: [], fetchedAt: number }>
const trackCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;   // 5 min per hex+window
const MAX_CACHED_HEXES = 50;

/**
 * Fetch historical track for one aircraft via the milair-history-proxy.
 * @param {string} icao24 - 24-bit ICAO hex identifier (lowercase, no leading zeros)
 * @param {number}  time   - Unix timestamp (seconds) — proxy returns positions newer than this
 * @returns {Promise<Array<{lat: number, lon: number, alt: number|null, ts: number}>>}
 *          Empty array when proxy is unavailable, unconfigured, or returns nothing.
 */
export async function fetchHistoricalTrack(icao24, time) {
    if (!HISTORY_PROXY_BASE) {
        // Proxy not deployed yet — soft skip.
        return [];
    }
    if (!icao24 || !time) return [];

    const hex = icao24.toLowerCase();
    const cacheKey = `${hex}:${Math.floor(time / CACHE_TTL_MS)}`;
    const cached = trackCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.positions;
    }

    try {
        const url = `${HISTORY_PROXY_BASE}/tracks?icao24=${encodeURIComponent(hex)}&time=${encodeURIComponent(time)}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

        if (!response.ok) {
            console.warn(`⚠️ history-proxy: HTTP ${response.status} for ${hex}`);
            return [];
        }

        const data = await response.json();
        const positions = (data && Array.isArray(data.track)) ? data.track : [];

        // Normalise: ensure ts is milliseconds (proxy returns seconds)
        const normalised = positions.map(p => ({
            lat:  p.lat,
            lon:  p.lon,
            alt:  p.alt ?? p.altBaro ?? null,
            tsMs: (p.ts && p.ts < 1e12) ? p.ts * 1000 : (p.ts ?? p.tsMs ?? 0)
        }));

        // Cache it
        if (trackCache.size >= MAX_CACHED_HEXES) {
            // Evict oldest entry
            const oldestKey = trackCache.keys().next().value;
            if (oldestKey) trackCache.delete(oldestKey);
        }
        trackCache.set(cacheKey, { positions: normalised, fetchedAt: Date.now() });

        console.log(`✅ history-proxy: ${normalised.length} punkter for ${hex}`);
        return normalised;

    } catch (err) {
        if (err.name === 'AbortError') {
            console.warn(`⚠️ history-proxy: timeout for ${hex}`);
        } else {
            console.warn(`⚠️ history-proxy: fetch fejlede for ${hex}:`, err.message);
        }
        return [];
    }
}

/**
 * Merge historical positions with local track-store positions.
 * Deduplicates by timestamp (ms) — keeps the first occurrence of each tsMs.
 * Returns points sorted by time ascending.
 * @param {Array} localPoints  - from track-store.getTrack(): [lat, lon, alt, tsMs]
 * @param {Array} historyPoints - from fetchHistoricalTrack(): { lat, lon, alt, tsMs }
 * @returns {Array<[lat, lon, alt, tsMs]>}
 */
export function mergeTracks(localPoints, historyPoints) {
    const seen = new Set();
    const merged = [];

    // Local points first (take priority for duplicates)
    for (const p of localPoints) {
        const ts = p[3];
        if (!seen.has(ts)) {
            seen.add(ts);
            merged.push(p);
        }
    }

    // Historical points
    for (const p of historyPoints) {
        const ts = p.tsMs;
        if (!seen.has(ts)) {
            seen.add(ts);
            merged.push([p.lat, p.lon, p.alt ?? null, ts]);
        }
    }

    // Sort ascending by timestamp
    merged.sort((a, b) => a[3] - b[3]);
    return merged;
}

/**
 * Pre-warm the cache for a list of hexes by fetching their tracks.
 * Useful when the app first loads: fetch history for currently visible aircraft
 * so the route is ready when the user taps one.
 * @param {string[]} hexes - ICAO24 hex identifiers
 * @param {number}   time  - lookback window (seconds)
 */
export function prewarmCache(hexes, time) {
    if (!HISTORY_PROXY_BASE || !Array.isArray(hexes) || hexes.length === 0) return;
    const now = Math.floor(Date.now() / 1000);
    const lookback = time || (now - 24 * 3600); // default: last 24h
    for (const hex of hexes.slice(0, 20)) { // cap at 20
        fetchHistoricalTrack(hex, lookback).catch(() => {}); // fire-and-forget
    }
}

/**
 * Check if the proxy is reachable and configured.
 * @returns {Promise<boolean>}
 */
export async function checkProxyHealth() {
    if (!HISTORY_PROXY_BASE) return false;
    try {
        const res = await fetch(`${HISTORY_PROXY_BASE}/health`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        return !!(data && data.ok && data.credentialsConfigured);
    } catch {
        return false;
    }
}
