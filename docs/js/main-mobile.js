/**
 * Main Application Controller (Mobile) - MilAir Watch
 * Orkestrerer alle moduler og håndterer dataflow
 */

import { initMap, updateMap, setMapRegion } from './map_section_mobile.js';
import { initMobileUI, showEmergencyAlert, hideEmergencyAlert, showStatusIndicator, hideStatusIndicator, determineAircraftCategory } from './mobile-ui.js';
import { initFilterBar, updateFilterCounts, shouldShowAircraft, getFilterState } from './filter-bar.js';
import { initListView, toggleListView, updateListView } from './list-view.js';
import { loadSquawkCodes } from './squawk-lookup.js';
import { filterAircraftByRegion, getRegion, loadRegionPreference, saveRegionPreference } from './regions.js';

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
    allAircraftUrl: 'https://api.adsb.lol/v2/point',  // + /{lat}/{lon}/{radius_nm}
    updateInterval: 30000, // 30 seconds
    maxAircraft: 500  // Performance limit
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

    let apiUrl;

    if (filterState.showAllAircraft && state.selectedRegion !== 'global') {
        // Region-based endpoint for all aircraft
        const region = getRegion(state.selectedRegion);
        const [lat, lon] = region.center;
        const radiusNM = calculateRadiusFromBbox(region.bbox);

        const baseUrl = `${API_CONFIG.allAircraftUrl}/${lat}/${lon}/${radiusNM}`;
        apiUrl = API_CONFIG.proxyUrl + encodeURIComponent(baseUrl);
        console.log(`✅ BRUGER REGION-BASED API (${radiusNM} NM radius) for ALLE fly`);
        console.log(`📍 Center: [${lat}, ${lon}], Region: ${state.selectedRegion}`);
    } else {
        // Military-only endpoint
        apiUrl = API_CONFIG.proxyUrl + encodeURIComponent(API_CONFIG.militaryUrl);
        console.log("🪖 BRUGER MILITÆR-ONLY API");
        if (filterState.showAllAircraft) {
            console.warn("⚠️ Alle fly aktiveret men region er global - bruger militær API");
        }
    }

    console.log("🔄 Henter flydata...");
    showStatusIndicator("Henter data...");
    state.isLoading = true;

    try {
        const response = await fetch(apiUrl, {
            signal: state.abortController.signal,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API fejl: ${response.status}`);
        }

        const data = await response.json();
        let aircraftList = data.ac || [];

        // Performance safeguard: Limit to maxAircraft
        if (aircraftList.length > API_CONFIG.maxAircraft) {
            console.warn(`⚠️ ${aircraftList.length} fly fundet - begrænser til ${API_CONFIG.maxAircraft}`);
            aircraftList = aircraftList.slice(0, API_CONFIG.maxAircraft);
        }

        state.allAircraft = aircraftList;
        state.lastUpdated = new Date();

        console.log(`✅ ${state.allAircraft.length} fly hentet`);

        // Debug: Log første aircraft for at se struktur
        if (state.allAircraft.length > 0) {
            console.log('🔍 Første aircraft objekt:', state.allAircraft[0]);
            console.log('🔍 Felter i aircraft:', Object.keys(state.allAircraft[0]));
        }

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

    // Set initial checked state for radio buttons
    const regionRadios = document.querySelectorAll('.region-radio');
    regionRadios.forEach(radio => {
        if (radio.value === state.selectedRegion) {
            radio.checked = true;
        }
    });

    // Add event listeners to region radio buttons
    regionRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                onRegionChange(e.target.value);
            }
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

    // Re-apply filters with new region
    applyFilters();
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
