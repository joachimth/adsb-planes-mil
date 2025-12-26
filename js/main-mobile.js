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
    selectedRegion: 'nordic', // Will be loaded from localStorage
    showingAllAircraft: false, // Track if we're currently showing all aircraft
    lastUpdated: null,
    isLoading: false,
    abortController: null
};

// API Configuration
const API_CONFIG = {
    proxyUrl: 'https://corsproxy.io/?url=',
    militaryUrl: 'https://api.adsb.lol/v2/mil',
    allAircraftBaseUrl: 'https://api.adsb.lol/v2',  // Will use /lat/{lat}/lon/{lon}/dist/{distance}
    updateInterval: 30000, // 30 seconds
    maxAircraft: 500,  // Performance limit
    maxRadius: 250  // Max radius in NM for ADSB.lol API
};

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

    // Grid spacing: 250 NM * 1.4 = ~350 NM for good overlap
    const gridSpacingNM = 350;
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

        // Start periodic updates
        setInterval(fetchAircraftData, API_CONFIG.updateInterval);

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

        if (filterState.showAllAircraft && state.selectedRegion !== 'global') {
            // Region-based endpoint for all aircraft
            const region = getRegion(state.selectedRegion);
            const radiusNM = calculateRadiusFromBbox(region.bbox);

            if (radiusNM > API_CONFIG.maxRadius) {
                // Use grid approach for large areas
                console.log(`📐 Område for stort (${radiusNM} NM) - bruger grid med ${API_CONFIG.maxRadius} NM celler`);
                const gridPoints = generateGridPoints(region.bbox);

                console.log(`🔄 Henter data fra ${gridPoints.length} grid punkter...`);
                showStatusIndicator(`Henter data fra ${gridPoints.length} områder...`);

                // Fetch from all grid points in parallel (with limit)
                const batchSize = 5; // Max concurrent requests
                const allAircraft = new Map(); // Use Map to deduplicate by hex

                for (let i = 0; i < gridPoints.length; i += batchSize) {
                    const batch = gridPoints.slice(i, i + batchSize);
                    const promises = batch.map(point =>
                        fetchFromPoint(point.lat, point.lon, API_CONFIG.maxRadius, state.abortController.signal)
                    );

                    const results = await Promise.allSettled(promises);

                    results.forEach((result, idx) => {
                        if (result.status === 'fulfilled') {
                            result.value.forEach(aircraft => {
                                // Deduplicate by hex (ICAO identifier)
                                if (aircraft.hex) {
                                    allAircraft.set(aircraft.hex, aircraft);
                                }
                            });
                        } else {
                            console.warn(`⚠️ Grid punkt ${i + idx} fejlede:`, result.reason);
                        }
                    });

                    console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(gridPoints.length/batchSize)} færdig. Total: ${allAircraft.size} unikke fly`);
                }

                aircraftList = Array.from(allAircraft.values());
                console.log(`✅ ${aircraftList.length} unikke fly hentet fra ${gridPoints.length} grid punkter`);

            } else {
                // Single API call for small areas
                const [lat, lon] = region.center;
                console.log(`✅ BRUGER ENKELT API CALL (${radiusNM} NM radius)`);
                console.log(`📍 Center: [${lat}, ${lon}], Region: ${state.selectedRegion}`);

                aircraftList = await fetchFromPoint(lat, lon, radiusNM, state.abortController.signal);
            }

        } else {
            // Military-only endpoint
            const apiUrl = API_CONFIG.proxyUrl + encodeURIComponent(API_CONFIG.militaryUrl);
            console.log("🪖 BRUGER MILITÆR-ONLY API");
            if (filterState.showAllAircraft) {
                console.warn("⚠️ Alle fly aktiveret men region er global - bruger militær API");
            }

            const response = await fetch(apiUrl, {
                signal: state.abortController.signal,
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`API fejl: ${response.status}`);
            }

            const data = await response.json();
            aircraftList = data.ac || [];
        }

        // Performance safeguard: Limit to maxAircraft
        if (aircraftList.length > API_CONFIG.maxAircraft) {
            console.warn(`⚠️ ${aircraftList.length} fly fundet - begrænser til ${API_CONFIG.maxAircraft}`);
            aircraftList = aircraftList.slice(0, API_CONFIG.maxAircraft);
        }

        state.allAircraft = aircraftList;
        state.lastUpdated = new Date();

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
    const baseUrl = `${API_CONFIG.allAircraftBaseUrl}/lat/${lat}/lon/${lon}/dist/${radiusNM}`;
    const apiUrl = API_CONFIG.proxyUrl + encodeURIComponent(baseUrl);

    const response = await fetch(apiUrl, {
        signal: signal,
        headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
        throw new Error(`API fejl: ${response.status}`);
    }

    const data = await response.json();
    return data.ac || [];
}

/**
 * Process aircraft data and update UI
 */
function processAircraftData() {
    // Categorize all aircraft
    const categorized = {
        military: [],
        emergency: [],
        special: [],
        civilian: []
    };

    state.allAircraft.forEach(aircraft => {
        const category = determineAircraftCategory(aircraft);
        categorized[category].push(aircraft);
    });

    // Check for emergencies (UNFILTERED) - only show if aircraft has valid position
    const emergencyWithPosition = categorized.emergency.find(a => a.lat && a.lon);
    if (emergencyWithPosition) {
        showEmergencyAlert(emergencyWithPosition);
    } else {
        hideEmergencyAlert();
    }

    // Update filter counts
    updateFilterCounts({
        military: categorized.military.length,
        emergency: categorized.emergency.length,
        special: categorized.special.length
    });

    // Apply filters
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

    // Step 2: Filter by category (military/emergency/special)
    state.filteredAircraft = regionFiltered.filter(aircraft => {
        const category = determineAircraftCategory(aircraft);
        return shouldShowAircraft(aircraft, category);
    });

    console.log(`📊 ${state.filteredAircraft.length} fly efter alle filtre`);

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
