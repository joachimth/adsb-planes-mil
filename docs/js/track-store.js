/**
 * Track Store - MilAir Watch
 * Buffers successive aircraft positions client-side so we can draw a flight
 * route (polyline) for any aircraft over a chosen time interval.
 *
 * adsb.lol has NO history/trace endpoint (see research July 11, 2026), so the
 * track is accumulated from the periodic /v2/mil snapshots the app already
 * polls. Each position is derived as ts = data.now - seen_pos.
 *
 * Storage: localStorage, keyed per ICAO hex. Points older than MAX_AGE_MS are
 * pruned on write. All aircraft are tracked automatically in the background.
 */

console.log("✅ track-store.js er indlæst.");

const STORAGE_PREFIX = 'track:';
const INDEX_KEY = 'track:__index';       // list of hex keys we hold, for pruning
const MAX_AGE_MS = 24 * 60 * 60 * 1000;  // keep up to 24h per aircraft
const MAX_POINTS = 1200;                 // hard cap per aircraft (~44 KB worst case)
const MIN_MOVE_M = 25;                   // ignore jitter smaller than this
const MAX_AIRCRAFT = 150;                // cap distinct tracked aircraft (budget guard)

// Point shape: [lat, lon, altBaro, tsMs]

function safeGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch { return null; }
}

function safeSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) {
        // Quota exceeded — drop the oldest aircraft and retry once.
        console.warn('⚠️ track-store: localStorage fuld, rydder ældste spor', e);
        pruneOldestAircraft(20);
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch { return false; }
    }
}

function getIndex() {
    return safeGet(INDEX_KEY) || {};
}

function setIndex(idx) {
    safeSet(INDEX_KEY, idx);
}

/** Haversine distance in metres between two [lat,lon] points. */
function distanceM(a, b) {
    const R = 6371000;
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLon = (b[1] - a[1]) * Math.PI / 180;
    const lat1 = a[0] * Math.PI / 180;
    const lat2 = b[0] * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Record positions for a batch of aircraft from one poll cycle.
 * @param {Array} aircraftList - raw aircraft objects (need hex, lat, lon, alt_baro, seen_pos)
 * @param {number} nowSec - the response envelope's `now` (Unix seconds); falls back to Date.now()
 */
export function recordPositions(aircraftList, nowSec) {
    if (!Array.isArray(aircraftList) || aircraftList.length === 0) return;
    const nowMs = (typeof nowSec === 'number' && nowSec > 0) ? nowSec * 1000 : Date.now();
    const idx = getIndex();
    const cutoff = Date.now() - MAX_AGE_MS;

    for (const ac of aircraftList) {
        if (!ac || !ac.hex) continue;
        const lat = ac.lat, lon = ac.lon;
        if (lat == null || lon == null) continue;

        const tsMs = Math.round(nowMs - (ac.seen_pos ? ac.seen_pos * 1000 : 0));
        const key = STORAGE_PREFIX + ac.hex;
        let buf = safeGet(key) || [];

        const last = buf[buf.length - 1];
        if (last) {
            // Skip duplicate timestamps and sub-jitter movement. Skipping here
            // means NO write for this aircraft this cycle — avoids hundreds of
            // pointless setItem calls per poll when planes are stationary.
            if (last[3] === tsMs) continue;
            if (distanceM(last, [lat, lon]) < MIN_MOVE_M && (tsMs - last[3]) < 60000) continue;
        }

        const altBaro = (typeof ac.alt_baro === 'number') ? ac.alt_baro : null;
        buf.push([lat, lon, altBaro, tsMs]);

        // Prune by age (only when the head is actually stale) + hard point cap.
        if (buf.length && buf[0][3] < cutoff) buf = buf.filter(p => p[3] >= cutoff);
        if (buf.length > MAX_POINTS) buf = buf.slice(-MAX_POINTS);

        safeSet(key, buf);
        idx[ac.hex] = tsMs; // last-seen for aircraft-level pruning
    }

    // Cap the number of distinct aircraft we retain.
    const hexes = Object.keys(idx);
    if (hexes.length > MAX_AIRCRAFT) {
        pruneOldestAircraft(hexes.length - MAX_AIRCRAFT);
        return; // pruneOldestAircraft persists the index
    }
    setIndex(idx);
}

/**
 * Get the buffered track for one aircraft, optionally limited to the last
 * `intervalMs`. Returns an array of [lat, lon, altBaro, tsMs] points.
 * @param {string} hex
 * @param {number|null} intervalMs - lookback window; null/0 = full track
 */
export function getTrack(hex, intervalMs = null) {
    if (!hex) return [];
    const buf = safeGet(STORAGE_PREFIX + hex) || [];
    if (!intervalMs) return buf;
    const cutoff = Date.now() - intervalMs;
    return buf.filter(p => p[3] >= cutoff);
}

/** Drop the N aircraft whose last position is oldest. */
function pruneOldestAircraft(n) {
    const idx = getIndex();
    const sorted = Object.entries(idx).sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < n && i < sorted.length; i++) {
        const hex = sorted[i][0];
        localStorage.removeItem(STORAGE_PREFIX + hex);
        delete idx[hex];
    }
    setIndex(idx);
}

/** Clear every stored track (debug / reset). */
export function clearAllTracks() {
    const idx = getIndex();
    for (const hex of Object.keys(idx)) localStorage.removeItem(STORAGE_PREFIX + hex);
    localStorage.removeItem(INDEX_KEY);
    console.log('✅ Alle spor ryddet');
}

export const TRACK_INTERVALS = [
    { id: '15m', label: '15 min', ms: 15 * 60 * 1000 },
    { id: '1h',  label: '1 time', ms: 60 * 60 * 1000 },
    { id: '3h',  label: '3 timer', ms: 3 * 60 * 60 * 1000 },
    { id: 'all', label: 'Alt', ms: null }
];
