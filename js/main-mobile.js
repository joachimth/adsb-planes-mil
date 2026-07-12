/**
 * Main Application Controller (Mobile) - MilAir Watch
 * Orkestrerer alle moduler og håndterer dataflow
 */

import { initMap, updateMap, setMapRegion, getMap } from './map_section_mobile.js';
import { initMobileUI, showEmergencyAlert, hideEmergencyAlert, showStatusIndicator, hideStatusIndicator, determineAircraftCategory } from './mobile-ui.js';
import { initFilterBar, updateFilterCounts, shouldShowAircraft, getFilterState } from './filter-bar.js';
import { initListView, toggleListView, updateListView } from './list-view.js';
import { loadSquawkCodes } from './squawk-lookup.js';
import { filterAircraftByRegion, getRegion, loadRegionPreference, saveRegionPreference } from './regions.js';
import { initHeatmap, updateHeatmapData, isHeatmapEnabled } from './heatmap.js';
import { recordPositions } from './track-store.js';
import { HISTORY_PROXY_BASE } from './history-proxy.js';

// Global error handler - fanger alle uncaught errors
window.addEventListener('error', (event) => {
    console.error('🔴 Global error fanget:', event.message);
    console.error('📍 File:', event.filename, 'Line:', event.lineno, 'Col:', event.colno);
    console.error('📋 Stack:', event.error?.stack);
    event.preventDefault(); // Forhindrer Eruda fejl
    return true;
});

// Fang unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('🔴 Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Forhindrer Eruda fejl
    return true;
});

console.log("✈️ MilAir Watch Mobile startet...");

// Application state
const state = {
    allAircraft: [],
    filteredAircraft: [],
    selectedRegion: 'europe', // Will be loaded from localStorage
    showingAllAircraft: false, // Track if we're currently showing all aircraft
    lastUpdated: null,
    isLoading: false,
    abortController: null,
    pollTimer: null
};

// API Configuration
const API_CONFIG = {
    militaryUrl: 'https://api.adsb.lol/v2/mil',
    allAircraftBaseUrl: 'https://api.adsb.lol/v2',  // Will use /lat/{lat}/lon/{lon}/dist/{distance}
    updateInterval: 30000, // 30 seconds
    maxAircraft: 500,  // Performance limit
    maxRadius: 250,  // Max radius in NM for ADSB.lol API
    fastTrackInterval: 8000  // Fast poll (ms) for the currently selected aircraft
};

// CORS proxy fallback chain - tries each in order until one succeeds
const PROXY_LIST = [
    { name: 'corsproxy.io', build: url => 'https://corsproxy.io/?key=0f67e3f0&url=' + encodeURIComponent(url) },
    { name: 'proxy.cors.sh', build: url => 'https://proxy.cors.sh/' + url }
];

/**
 * Fetch with CORS proxy fallback - tries each proxy until one works
 * @param {string} targetUrl - The actual API URL to fetch
 * @param {Object} options - fetch() options
 * @returns {Promise<Response>}
 */
async function fetchWithProxyFallback(targetUrl, options = {}) {
    let lastError;
    for (const proxy of PROXY_LIST) {
        try {
            const proxyUrl = proxy.build(targetUrl);
            const response = await fetch(proxyUrl, options);
            if (response.ok) return response;
            console.warn(`⚠️ ${proxy.name} returned ${response.status}`);
            lastError = new Error(`API fejl: ${response.status}`);
        } catch (e) {
            console.warn(`⚠️ ${proxy.name} fejlede:`, e.message);
            lastError = e;
        }
    }
    throw lastError || new Error('Alle CORS-proxies fejlede');
}

/* ========================================
   FAST TRACK POLLING — the selected aircraft
   While an aircraft is selected we poll just its ICAO hex at a faster
   cadence than the main 30s loop, so its route line builds quickly.
   Uses /v2/hex/{hex} which returns the same {ac:[...], now} envelope shape.
   ======================================== */

let fastTrackTimer = null;
let fastTrackHex = null;
let fastTrackInFlight = false;

async function fastTrackTick() {
    if (!fastTrackHex || fastTrackInFlight) return;
    fastTrackInFlight = true;
    try {
        const targetUrl = `${API_CONFIG.allAircraftBaseUrl}/hex/${fastTrackHex}`;
        const response = await fetchWithProxyFallback(targetUrl, {
            headers: { 'Accept': 'application/json' }
        });
        const data = await response.json();
        const list = data.ac || [];
        if (list.length > 0) {
            // Buffer this aircraft's fresh position into the track store.
            recordPositions(list, data.now);
            // Nudge the UI to extend the drawn route.
            document.dispatchEvent(new CustomEvent('aircraftDataUpdated'));
        }
    } catch (e) {
        // Non-fatal: the 30s main loop still records positions. Back off a beat
        // on rate-limiting so we don't hammer the proxy chain.
        console.warn('⚠️ Hurtig sporing fejlede:', e.message);
        if (/\b429\b/.test(e.message || '')) {
            stopFastTrack();
            // Resume after a cool-down if an aircraft is still selected.
            setTimeout(() => { if (fastTrackHex) startFastTrackTimer(); }, 30000);
        }
    } finally {
        fastTrackInFlight = false;
    }
}

function startFastTrackTimer() {
    if (fastTrackTimer) clearInterval(fastTrackTimer);
    fastTrackTimer = setInterval(fastTrackTick, API_CONFIG.fastTrackInterval);
}

function startFastTrack(hex) {
    if (!hex) return;
    fastTrackHex = hex.toLowerCase();
    // Fire once immediately so the line starts densifying without a delay.
    fastTrackTick();
    startFastTrackTimer();
}

function stopFastTrack() {
    if (fastTrackTimer) {
        clearInterval(fastTrackTimer);
        fastTrackTimer = null;
    }
}

// Wire selection events dispatched by the bottom sheet (decoupled via DOM
// events to avoid a circular import between main-mobile and mobile-ui).
document.addEventListener('aircraftSelected', (e) => {
    startFastTrack(e.detail?.hex);
});
document.addEventListener('aircraftDeselected', () => {
    fastTrackHex = null;
    stopFastTrack();
});

/**
 * Calculate radius in nautical miles from bounding box
 * @param {Array} bbox - [west, south, east, north]
 * @returns {number} - Radius in nautical miles
 */
function calculateRadiusFromBbox(bbox) {
    if (!bbox) return 500; // Default for global

    const [west, south, east, north] = bbox;

    // Calculate diagonal distance as approximate radius
    const latDiff = north - south;
    const lonDiff = east - west;

    // Convert to nautical miles (1 degree ~ 60 NM)
    const latNM = latDiff * 60;
    const lonNM = lonDiff * 60 * Math.cos((south + north) / 2 * Math.PI / 180);

    // Diagonal / 2 = radius
    const radius = Math.sqrt(latNM * latNM + lonNM * lonNM) / 2;

    return Math.ceil(radius);
}

/**
 * Generate grid points to cover bounding box with max 250 NM radius circles
 * @param {Array} bbox - [west, south, east, north]
 * @returns {Array} - Array of {lat, lon} points
 */
function generateGridPoints(bbox) {
    const [west, south, east, north] = bbox;
    const gridPoints = [];

    // adsb.lol rate-limits hard, so grid calls run SEQUENTIALLY (~1/sec) rather
    // than in parallel. 400 NM spacing with 250 NM radius circles covers Europe
    // (-10..40 lon, 50..70 lat) in ~17 points = ~17 sec per full refresh — fits
    // inside the 30s poll gap with margin for 429 backoffs. Slow but complete:
    // the tradeoff Joachim chose ("throttled_grid").
    const gridSpacingNM = 400;
    const latSpacing = gridSpacingNM / 60; // degrees

    let lat = south;
    while (lat <= north) {
        // Longitude spacing adjusted for latitude
        const lonSpacing = gridSpacingNM / (60 * Math.cos(lat * Math.PI / 180));

        let lon = west;
        while (lon <= east) {
            gridPoints.push({ lat: lat, lon: lon });
            lon += lonSpacing;
        }
        lat += latSpacing;
    }

    console.log(`📐 Genereret ${gridPoints.length} grid points for at dække område`);
    return gridPoints;
}

/**
 * Main application entry point
 */
async function main() {
    console.log("🚀 Initialiserer applikation...");

    try {
        // Initialize all modules
        initMap();
        initMobileUI();
        initFilterBar(onFilterChange, onListViewToggle);
        initListView();

        // Initialize heatmap
        const map = getMap();
        if (map) {
            initHeatmap(map);
        }

        // Initialize region selector
        initRegionSelector();

        // Load squawk codes database (non-blocking)
        loadSquawkCodes().catch(err => {
            console.warn("⚠️ Kunne ikke indlæse squawk koder:", err);
            // App fortsætter uden squawk beskrivelser
        });

        // Listen for sort changes
        document.addEventListener('sortChanged', () => {
            updateListView(state.filteredAircraft);
        });

        // Initial data fetch
        await fetchAircraftData();

        // Self-chaining poll instead of a fixed setInterval. A throttled
        // all-Europe grid sweep can take 15-30s; a blind interval would fire
        // the next poll (which aborts the previous one) before the sweep
        // finishes, so the map would never fully populate. Chaining waits for
        // each sweep to complete, THEN schedules the next after updateInterval.
        const scheduleNextPoll = () => {
            state.pollTimer = setTimeout(async () => {
                try {
                    await fetchAircraftData();
                } catch (e) {
                    console.warn('Poll fejlede:', e);
                } finally {
                    scheduleNextPoll();
                }
            }, API_CONFIG.updateInterval);
        };
        scheduleNextPoll();

        console.log("✅ Applikation klar!");

    } catch (error) {
        console.error("❌ Kritisk fejl:", error);
        showError("Kunne ikke starte applikationen. Genindlæs venligst siden.");
    }
}

/**
 * Fetch aircraft data from API
 */
async function fetchAircraftData() {
    // Cancel previous request if still running
    if (state.abortController) {
        state.abortController.abort();
    }

    state.abortController = new AbortController();

    // Select API endpoint based on filter state
    const filterState = getFilterState();
    console.log("🔍 fetchAircraftData - filterState:", filterState);
    console.log("🔍 filterState.showAllAircraft:", filterState.showAllAircraft);
    console.log("🔍 state.selectedRegion:", state.selectedRegion);

    console.log("🔄 Henter flydata...");
    showStatusIndicator("Henter data...");
    state.isLoading = true;

    try {
        let aircraftList = [];
        let lastNow = null; // adsb.lol envelope `now` (Unix seconds) when available

        if (filterState.showAllAircraft && state.selectedRegion !== 'global') {
            // Region-based endpoint for all aircraft
            const region = getRegion(state.selectedRegion);
            const radiusNM = calculateRadiusFromBbox(region.bbox);

            if (radiusNM > API_CONFIG.maxRadius) {
                // Use grid approach for large areas
                console.log(`📐 Område for stort (${radiusNM} NM) - bruger grid med ${API_CONFIG.maxRadius} NM celler`);
                const gridPoints = generateGridPoints(region.bbox);

                console.log(`🔄 Henter data fra ${gridPoints.length} grid punkter (sekventielt, ~1/sek)...`);
                showStatusIndicator(`Henter Europa: 0/${gridPoints.length} områder...`);

                // adsb.lol rate-limits aggressively (and hits our Worker's shared
                // Cloudflare IP extra hard), so calls run STRICTLY SEQUENTIALLY
                // with ~1s spacing. On a 429 we back off and retry once, then skip
                // that point rather than stalling the whole refresh. Slow but it
                // actually completes — the "throttled_grid" tradeoff.
                const reqSpacingMs = 1000;   // ~1 request/second
                const maxRetries = 1;        // one backoff retry per point on 429
                const backoffMs = 2500;      // wait before the retry
                const allAircraft = new Map(); // dedupe by hex
                let rateLimited = 0, failed = 0;

                for (let i = 0; i < gridPoints.length; i++) {
                    if (state.abortController.signal.aborted) break;
                    const point = gridPoints[i];

                    let attempt = 0;
                    let done = false;
                    while (attempt <= maxRetries && !done) {
                        const res = await fetchFromPoint(
                            point.lat, point.lon, API_CONFIG.maxRadius,
                            state.abortController.signal
                        );

                        if (res.rateLimited) {
                            if (attempt < maxRetries) {
                                console.warn(`⏳ Grid ${i + 1}/${gridPoints.length} rate-limited (429), venter ${backoffMs}ms og prøver igen`);
                                await new Promise(r => setTimeout(r, backoffMs));
                                attempt++;
                                continue;
                            }
                            rateLimited++;
                            console.warn(`⚠️ Grid ${i + 1}/${gridPoints.length} sprunget over (429 efter retry)`);
                            done = true;
                        } else if (res.error) {
                            failed++;
                            console.warn(`⚠️ Grid ${i + 1}/${gridPoints.length} fejlede:`, res.error);
                            done = true;
                        } else {
                            res.aircraft.forEach(aircraft => {
                                if (aircraft.hex) allAircraft.set(aircraft.hex, aircraft);
                            });
                            done = true;
                        }
                    }

                    showStatusIndicator(`Henter Europa: ${i + 1}/${gridPoints.length} • ${allAircraft.size} fly`);

                    // Pace the next request (skip the wait after the final point).
                    if (i < gridPoints.length - 1 && !state.abortController.signal.aborted) {
                        await new Promise(r => setTimeout(r, reqSpacingMs));
                    }
                }

                aircraftList = Array.from(allAircraft.values());
                console.log(`✅ ${aircraftList.length} unikke fly fra ${gridPoints.length} punkter (${rateLimited} rate-limited, ${failed} fejl)`);

            } else {
                // Single API call for small areas
                const [lat, lon] = region.center;
                console.log(`✅ BRUGER ENKELT API CALL (${radiusNM} NM radius)`);
                console.log(`📍 Center: [${lat}, ${lon}], Region: ${state.selectedRegion}`);

                const single = await fetchFromPoint(lat, lon, radiusNM, state.abortController.signal);
                aircraftList = single.aircraft;
                if (single.rateLimited) {
                    console.warn('⚠️ Enkelt-kald rate-limited (429) — viser hvad vi har');
                }
            }

        } else {
            // Military-only endpoint
            console.log("🪖 BRUGER MILITÆR-ONLY API");
            if (filterState.showAllAircraft) {
                console.warn("⚠️ Alle fly aktiveret men region er global - bruger militær API");
            }

            const response = await fetchWithProxyFallback(API_CONFIG.militaryUrl, {
                signal: state.abortController.signal,
                headers: { 'Accept': 'application/json' }
            });

            const data = await response.json();
            aircraftList = data.ac || [];
            lastNow = data.now; // envelope timestamp for accurate position times

            // Debug: Check coordinates in raw API response
            const withCoords = aircraftList.filter(a => a.lat && a.lon);
            const withoutCoords = aircraftList.filter(a => !a.lat || !a.lon);
            console.log(`📍 Militær API response: ${withCoords.length} fly MED koordinater, ${withoutCoords.length} UDEN koordinater`);
            if (withCoords.length > 0) {
                console.log(`📍 Eksempel fly med koordinater:`, withCoords.slice(0, 3).map(a => ({
                    hex: a.hex,
                    flight: a.flight,
                    lat: a.lat,
                    lon: a.lon
                })));
            }
        }

        // Buffer positions for flight-route tracking (ALL aircraft, background),
        // before the display cap so tracks are complete. Falls back to Date.now()
        // when the grid/point branches didn't carry an envelope `now`.
        recordPositions(aircraftList, lastNow);

        // Performance safeguard: Limit to maxAircraft
        if (aircraftList.length > API_CONFIG.maxAircraft) {
            console.warn(`⚠️ ${aircraftList.length} fly fundet - begrænser til ${API_CONFIG.maxAircraft}`);
            aircraftList = aircraftList.slice(0, API_CONFIG.maxAircraft);
        }

        state.allAircraft = aircraftList;
        state.lastUpdated = new Date();

        // Let the open bottom sheet extend the selected aircraft's route.
        document.dispatchEvent(new CustomEvent('aircraftDataUpdated'));

        console.log(`✅ ${state.allAircraft.length} fly i final dataset`);

        // Process and update UI
        processAircraftData();

        hideStatusIndicator();
        state.isLoading = false;

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log("🔄 Request annulleret");
            return;
        }

        console.error("❌ Fetch fejl:", error);
        showError("Kunne ikke hente flydata");
        hideStatusIndicator();
        state.isLoading = false;
    }
}

/**
 * Fetch aircraft from a single point
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radiusNM - Radius in nautical miles
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<Array>} - Array of aircraft
 */
async function fetchFromPoint(lat, lon, radiusNM, signal) {
    // Returns { aircraft: [...], rateLimited: bool, error: string|null } so the
    // sequential grid loop can distinguish "throttled → back off" from a genuine
    // failure or an empty-but-successful response.

    // Prefer our own Worker's /live proxy — one reliable CORS-enabled hop.
    // The Worker surfaces adsb.lol's 429 as HTTP 429 or {status:429}, so detect
    // both and signal rateLimited instead of silently falling through.
    if (HISTORY_PROXY_BASE) {
        try {
            const liveUrl = `${HISTORY_PROXY_BASE}/live?lat=${lat}&lon=${lon}&dist=${radiusNM}`;
            const r = await fetch(liveUrl, { signal, headers: { 'Accept': 'application/json' } });
            if (r.status === 429) {
                return { aircraft: [], rateLimited: true, error: null };
            }
            if (r.ok) {
                const d = await r.json();
                if (d && d.status === 429) {
                    return { aircraft: [], rateLimited: true, error: null };
                }
                return { aircraft: d.ac || [], rateLimited: false, error: null };
            }
            // Non-OK, non-429 → try the public proxy chain below.
        } catch (e) {
            if (signal && signal.aborted) {
                return { aircraft: [], rateLimited: false, error: 'aborted' };
            }
            /* fall through to proxy chain */
        }
    }

    try {
        const targetUrl = `${API_CONFIG.allAircraftBaseUrl}/lat/${lat}/lon/${lon}/dist/${radiusNM}`;
        const response = await fetchWithProxyFallback(targetUrl, {
            signal: signal,
            headers: { 'Accept': 'application/json' }
        });
        if (response.status === 429) {
            return { aircraft: [], rateLimited: true, error: null };
        }
        const data = await response.json();
        return { aircraft: data.ac || [], rateLimited: false, error: null };
    } catch (e) {
        const msg = String(e && e.message || e);
        // The proxy chain throws a plain Error on 429 rather than returning a
        // Response; detect it so the caller's backoff path engages here too.
        if (msg.includes('429')) {
            return { aircraft: [], rateLimited: true, error: null };
        }
        return { aircraft: [], rateLimited: false, error: msg };
    }
}

/**
 * Process aircraft data and update UI
 */
function processAircraftData() {
    // Check for emergencies in ALL aircraft (UNFILTERED)
    const emergencyAircraft = state.allAircraft.filter(a => {
        const category = determineAircraftCategory(a);
        return category === 'emergency';
    });

    const emergencyWithPosition = emergencyAircraft.find(a => a.lat && a.lon);
    if (emergencyWithPosition) {
        showEmergencyAlert(emergencyWithPosition);
    } else {
        hideEmergencyAlert();
    }

    // Apply filters (this will also update filter counts)
    applyFilters();
}

/**
 * Apply active filters and update views
 */
function applyFilters() {
    const filterState = getFilterState();

    // Step 1: Filter by region first
    let regionFiltered = filterAircraftByRegion(state.allAircraft, state.selectedRegion);
    console.log(`🌍 ${regionFiltered.length} fly i region '${state.selectedRegion}' (af ${state.allAircraft.length} total)`);

    // Step 1.5: Categorize region-filtered aircraft and update counts
    const categorized = {
        military: [],
        emergency: [],
        special: [],
        civilian: []
    };

    regionFiltered.forEach(aircraft => {
        const category = determineAircraftCategory(aircraft);
        categorized[category].push(aircraft);
    });

    // Update filter counts based on region-filtered aircraft
    updateFilterCounts({
        military: categorized.military.length,
        emergency: categorized.emergency.length,
        special: categorized.special.length
    });

    console.log(`📊 Region counts: ${categorized.military.length} militær, ${categorized.emergency.length} nød, ${categorized.special.length} special, ${categorized.civilian.length} civil`);

    // Step 2: Filter by category (military/emergency/special)
    state.filteredAircraft = regionFiltered.filter(aircraft => {
        const category = determineAircraftCategory(aircraft);
        return shouldShowAircraft(aircraft, category);
    });

    console.log(`📊 ${state.filteredAircraft.length} fly efter kategori-filtre`);

    // Debug: Check how many have valid coordinates
    const withCoords = state.filteredAircraft.filter(a => a.lat && a.lon);
    const withoutCoords = state.filteredAircraft.filter(a => !a.lat || !a.lon);
    console.log(`📍 ${withCoords.length} fly MED koordinater, ${withoutCoords.length} UDEN koordinater`);
    if (withoutCoords.length > 0) {
        console.warn(`⚠️ Fly uden koordinater:`, withoutCoords.map(a => ({
            hex: a.hex,
            flight: a.flight,
            lat: a.lat,
            lon: a.lon
        })));
    }

    // Update map
    updateMap(state.filteredAircraft);

    // Update heatmap with filtered data
    const map = getMap();
    if (map) {
        updateHeatmapData(map, state.filteredAircraft);
    }

    // Update list view if active
    if (filterState.listViewActive) {
        updateListView(state.filteredAircraft);
    }
}

/**
 * Filter change callback
 */
function onFilterChange(newFilterState) {
    console.log("🎛️ onFilterChange kaldt med:", newFilterState);
    console.log("🎛️ state.showingAllAircraft før:", state.showingAllAircraft);
    console.log("🎛️ newFilterState.showAllAircraft:", newFilterState.showAllAircraft);

    // Check if "Alle Fly" toggle changed (requires different API endpoint)
    if (newFilterState.showAllAircraft !== state.showingAllAircraft) {
        console.log(`🔄 API endpoint switch detekteret: ${state.showingAllAircraft ? 'Alle→Militær' : 'Militær→Alle'}`);
        state.showingAllAircraft = newFilterState.showAllAircraft;
        console.log("🔄 Kalder fetchAircraftData() med ny endpoint...");
        fetchAircraftData(); // Re-fetch with new endpoint
    } else {
        console.log("🔄 Kun kategori-filtre ændret, genbruger data");
        // Just category filters changed - reapply to existing data
        applyFilters();
    }
}

/**
 * List view toggle callback
 */
function onListViewToggle(isActive) {
    console.log(`📋 Listevisning: ${isActive ? 'TIL' : 'FRA'}`);

    toggleListView(isActive);

    if (isActive) {
        updateListView(state.filteredAircraft);
    }
}

/**
 * Initialize region selector
 */
function initRegionSelector() {
    // Load saved region preference
    state.selectedRegion = loadRegionPreference();
    console.log(`🌍 Valgt region: ${state.selectedRegion}`);

    // Get all region buttons
    const regionButtons = document.querySelectorAll('.region-btn');
    console.log(`🔍 Fundet ${regionButtons.length} region buttons`);

    // Set initial active state
    let activeSet = false;
    regionButtons.forEach(btn => {
        // First remove active from all buttons and clear inline styles
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
        btn.style.cssText = '';

        // Then add active to the selected region
        if (btn.dataset.region === state.selectedRegion) {
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');

            // Pænere inline styles - stadig tydeligt synlig
            btn.style.background = 'rgba(0, 212, 255, 0.2)';
            btn.style.border = '2px solid #00d4ff';
            btn.style.borderColor = '#00d4ff';
            btn.style.color = '#00d4ff';
            btn.style.boxShadow = '0 0 8px rgba(0, 212, 255, 0.5)';
            btn.style.fontWeight = '600';

            activeSet = true;
            console.log(`✅ Active class OG inline styles sat på region: ${state.selectedRegion}`);
        }
    });

    if (!activeSet) {
        console.warn(`⚠️ Ingen region button matchede '${state.selectedRegion}'`);
    }

    // Add event listeners to region buttons
    regionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedRegion = btn.dataset.region;

            // Update button states
            regionButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
                b.style.cssText = ''; // Clear inline styles
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');

            // Pænere inline styles
            btn.style.background = 'rgba(0, 212, 255, 0.2)';
            btn.style.border = '2px solid #00d4ff';
            btn.style.borderColor = '#00d4ff';
            btn.style.color = '#00d4ff';
            btn.style.boxShadow = '0 0 8px rgba(0, 212, 255, 0.5)';
            btn.style.fontWeight = '600';

            // Trigger region change
            onRegionChange(selectedRegion);
        });
    });

    // Set initial map region
    const region = getRegion(state.selectedRegion);
    if (region) {
        setMapRegion(region);
    }
}

/**
 * Handle region change
 */
function onRegionChange(newRegion) {
    console.log(`🌍 Region ændret: ${state.selectedRegion} → ${newRegion}`);

    state.selectedRegion = newRegion;

    // Save to localStorage
    saveRegionPreference(newRegion);

    // Update map view
    const region = getRegion(newRegion);
    if (region) {
        setMapRegion(region);
    }

    // Fetch new data for the region
    fetchAircraftData();
}

/**
 * Show error message
 */
function showError(message) {
    // Could implement a toast notification system
    console.error("❌", message);

    // For now, use status indicator
    showStatusIndicator(message);

    setTimeout(() => {
        hideStatusIndicator();
    }, 5000);
}

/**
 * Get application state (for debugging)
 */
window.getAppState = () => state;

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

console.log("✅ main-mobile.js indlæst");
