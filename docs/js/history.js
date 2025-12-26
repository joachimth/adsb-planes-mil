/**
 * History Module - MilAir Watch
 * Henter og viser historiske flydata fra globe_history_2025 repository
 */

console.log("✅ history.js er indlæst.");

// GitHub repository configuration
const HISTORY_CONFIG = {
    baseUrl: 'https://raw.githubusercontent.com/adsblol/globe_history_2025/main',
    cacheDbName: 'MilAirHistory',
    cacheDbVersion: 1,
    cacheTTL: 24 * 60 * 60 * 1000 // 24 timer
};

// Global state
let historyDb = null;
let currentTraceLayer = null;
let currentMarkers = [];

/**
 * Initialize IndexedDB for caching
 */
async function initHistoryDB() {
    if (historyDb) return historyDb;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(HISTORY_CONFIG.cacheDbName, HISTORY_CONFIG.cacheDbVersion);

        request.onerror = () => {
            console.error('❌ Kunne ikke åbne IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            historyDb = request.result;
            console.log('✅ IndexedDB initialiseret');
            resolve(historyDb);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create traces object store if it doesn't exist
            if (!db.objectStoreNames.contains('traces')) {
                const objectStore = db.createObjectStore('traces', { keyPath: 'id' });
                objectStore.createIndex('hex', 'hex', { unique: false });
                objectStore.createIndex('date', 'date', { unique: false });
                objectStore.createIndex('cachedAt', 'cachedAt', { unique: false });
                console.log('✅ Object store "traces" oprettet');
            }
        };
    });
}

/**
 * Get cached trace from IndexedDB
 * @param {string} hex - ICAO hex code
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} - Cached trace or null
 */
async function getCachedTrace(hex, date) {
    try {
        const db = await initHistoryDB();
        const transaction = db.transaction(['traces'], 'readonly');
        const objectStore = transaction.objectStore('traces');
        const id = `${hex}_${date}`;

        return new Promise((resolve, reject) => {
            const request = objectStore.get(id);

            request.onsuccess = () => {
                const cached = request.result;

                if (!cached) {
                    console.log(`📦 Ingen cache for ${id}`);
                    resolve(null);
                    return;
                }

                // Check if cache is expired
                if (Date.now() - cached.cachedAt > HISTORY_CONFIG.cacheTTL) {
                    console.log(`⏰ Cache udløbet for ${id}`);
                    // Delete expired cache
                    const deleteTransaction = db.transaction(['traces'], 'readwrite');
                    const deleteStore = deleteTransaction.objectStore('traces');
                    deleteStore.delete(id);
                    resolve(null);
                    return;
                }

                console.log(`✅ Cache hit for ${id}`);
                resolve(cached.data);
            };

            request.onerror = () => {
                console.warn('⚠️ Fejl ved cache lookup:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.warn('⚠️ Cache lookup fejlede:', error);
        return null;
    }
}

/**
 * Save trace to IndexedDB cache
 * @param {string} hex - ICAO hex code
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} data - Trace data
 */
async function cacheTrace(hex, date, data) {
    try {
        const db = await initHistoryDB();
        const transaction = db.transaction(['traces'], 'readwrite');
        const objectStore = transaction.objectStore('traces');
        const id = `${hex}_${date}`;

        const cacheEntry = {
            id,
            hex,
            date,
            data,
            cachedAt: Date.now()
        };

        return new Promise((resolve, reject) => {
            const request = objectStore.put(cacheEntry);

            request.onsuccess = () => {
                console.log(`💾 Trace cached: ${id}`);
                resolve();
            };

            request.onerror = () => {
                console.warn('⚠️ Kunne ikke cache trace:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.warn('⚠️ Caching fejlede:', error);
    }
}

/**
 * Fetch aircraft trace from GitHub repository
 * @param {string} hex - ICAO hex code (e.g., "abc123")
 * @param {string} date - Date in YYYY-MM-DD format (e.g., "2025-01-15")
 * @returns {Promise<Object|null>} - Parsed trace or null
 */
export async function fetchAircraftTrace(hex, date) {
    console.log(`🔄 Henter trace for ${hex} d. ${date}...`);

    // Check cache first
    const cached = await getCachedTrace(hex, date);
    if (cached) {
        return cached;
    }

    // Build GitHub URL
    const [year, month, day] = date.split('-');
    const url = `${HISTORY_CONFIG.baseUrl}/${year}/${month}/${day}/traces/${hex}.json`;

    console.log(`📡 Fetching: ${url}`);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`⚠️ Ingen trace fundet for ${hex} d. ${date}`);
                return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Trace hentet:`, data);

        // Parse trace
        const parsedTrace = parseTrace(data);

        // Cache for future use
        await cacheTrace(hex, date, parsedTrace);

        return parsedTrace;

    } catch (error) {
        console.error(`❌ Fejl ved hentning af trace:`, error);
        throw error;
    }
}

/**
 * Parse trace data into usable format
 * @param {Object} data - Raw trace data from API
 * @returns {Object} - Parsed trace
 */
function parseTrace(data) {
    if (!data || !data.trace || data.trace.length === 0) {
        console.warn('⚠️ Tom trace data');
        return null;
    }

    const points = data.trace.map((point, index) => {
        // Point format: [timestamp, lat, lon, altitude, speed, heading]
        return {
            index,
            timestamp: point[0],
            lat: point[1],
            lon: point[2],
            altitude: point[3] || 0,
            speed: point[4] || 0,
            heading: point[5] || 0
        };
    });

    return {
        icao: data.icao || data.hex,
        registration: data.r || 'N/A',
        type: data.t || 'Unknown',
        points,
        startTime: points[0]?.timestamp,
        endTime: points[points.length - 1]?.timestamp,
        totalPoints: points.length
    };
}

/**
 * Draw trace on map as polyline with waypoint markers
 * @param {Object} trace - Parsed trace object
 * @param {Object} map - Leaflet map instance
 * @returns {Object} - Object containing polyline and markers
 */
export function drawTraceOnMap(trace, map) {
    console.log(`✏️ Tegner trace på kort: ${trace.registration}`);

    // Clear previous trace if exists
    clearTrace(map);

    if (!trace || !trace.points || trace.points.length === 0) {
        console.warn('⚠️ Ingen punkter at tegne');
        return null;
    }

    // Convert points to Leaflet format
    const latLngs = trace.points.map(p => [p.lat, p.lon]);

    // Create polyline
    const polyline = L.polyline(latLngs, {
        color: '#00d4ff',
        weight: 3,
        opacity: 0.7,
        smoothFactor: 1
    }).addTo(map);

    currentTraceLayer = polyline;

    // Add waypoint markers (every 10th point to avoid clutter)
    const waypointInterval = Math.max(1, Math.floor(trace.points.length / 50)); // Max 50 markers

    trace.points.forEach((point, index) => {
        if (index % waypointInterval === 0 || index === 0 || index === trace.points.length - 1) {
            const isStart = index === 0;
            const isEnd = index === trace.points.length - 1;

            const marker = L.circleMarker([point.lat, point.lon], {
                radius: isStart || isEnd ? 6 : 3,
                color: isStart ? '#00ff88' : (isEnd ? '#ff3366' : '#00d4ff'),
                fillColor: isStart ? '#00ff88' : (isEnd ? '#ff3366' : '#00d4ff'),
                fillOpacity: 0.8,
                weight: 2
            }).addTo(map);

            // Add popup with info
            const timestamp = new Date(point.timestamp * 1000);
            const timeString = timestamp.toLocaleTimeString('da-DK', {
                hour: '2-digit',
                minute: '2-digit'
            });

            marker.bindPopup(`
                <div style="font-family: monospace; font-size: 12px;">
                    <b>${isStart ? '🛫 Start' : (isEnd ? '🛬 Slut' : '📍 Waypoint')}</b><br>
                    <b>Tid:</b> ${timeString}<br>
                    <b>Højde:</b> ${point.altitude.toLocaleString()} ft<br>
                    <b>Hastighed:</b> ${Math.round(point.speed)} knots<br>
                    <b>Kurs:</b> ${Math.round(point.heading)}°
                </div>
            `);

            currentMarkers.push(marker);
        }
    });

    // Fit map to trace bounds
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    console.log(`✅ Trace tegnet: ${trace.totalPoints} punkter, ${currentMarkers.length} waypoints`);

    return {
        polyline,
        markers: currentMarkers
    };
}

/**
 * Clear current trace from map
 * @param {Object} map - Leaflet map instance
 */
export function clearTrace(map) {
    if (currentTraceLayer) {
        map.removeLayer(currentTraceLayer);
        currentTraceLayer = null;
        console.log('🗑️ Trace polyline fjernet');
    }

    currentMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    currentMarkers = [];

    if (currentMarkers.length > 0) {
        console.log(`🗑️ ${currentMarkers.length} waypoint markers fjernet`);
    }
}

/**
 * Format timestamp for display
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted time string
 */
export function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('da-DK', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Get trace statistics
 * @param {Object} trace - Parsed trace object
 * @returns {Object} - Statistics
 */
export function getTraceStats(trace) {
    if (!trace || !trace.points || trace.points.length === 0) {
        return null;
    }

    const altitudes = trace.points.map(p => p.altitude).filter(a => a > 0);
    const speeds = trace.points.map(p => p.speed).filter(s => s > 0);

    return {
        duration: trace.endTime - trace.startTime,
        totalPoints: trace.totalPoints,
        maxAltitude: Math.max(...altitudes),
        minAltitude: Math.min(...altitudes),
        avgAltitude: Math.round(altitudes.reduce((a, b) => a + b, 0) / altitudes.length),
        maxSpeed: Math.max(...speeds),
        avgSpeed: Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length)
    };
}

/**
 * Initialize history module
 */
export async function initHistory() {
    console.log('🔄 Initialiserer history modul...');

    try {
        await initHistoryDB();
        console.log('✅ History modul klar');
    } catch (error) {
        console.error('❌ Kunne ikke initialisere history:', error);
    }
}
