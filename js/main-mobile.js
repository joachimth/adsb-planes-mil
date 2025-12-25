/**
 * Main Application Controller (Mobile) - MilAir Watch
 * Orkestrerer alle moduler og håndterer dataflow
 */

import { initMap, updateMap } from './map_section_mobile.js';
import { initMobileUI, showEmergencyAlert, hideEmergencyAlert, showStatusIndicator, hideStatusIndicator, determineAircraftCategory } from './mobile-ui.js';
import { initFilterBar, updateFilterCounts, shouldShowAircraft, getFilterState } from './filter-bar.js';
import { initListView, toggleListView, updateListView } from './list-view.js';
import { loadSquawkCodes } from './squawk-lookup.js';

console.log("✈️ MilAir Watch Mobile startet...");

// Application state
const state = {
    allAircraft: [],
    filteredAircraft: [],
    lastUpdated: null,
    isLoading: false,
    abortController: null
};

// API Configuration
const API_CONFIG = {
    proxyUrl: 'https://corsproxy.io/?url=',
    baseUrl: 'https://api.adsb.lol/v2/mil',
    updateInterval: 30000 // 30 seconds
};

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
    const apiUrl = API_CONFIG.proxyUrl + encodeURIComponent(API_CONFIG.baseUrl);

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
        state.allAircraft = data.ac || [];
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

    // Filter aircraft based on active filters
    state.filteredAircraft = state.allAircraft.filter(aircraft => {
        const category = determineAircraftCategory(aircraft);
        return shouldShowAircraft(aircraft, category);
    });

    console.log(`📊 ${state.filteredAircraft.length} fly efter filtrering`);

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
    console.log("🎛️ Filtre ændret:", newFilterState);
    applyFilters();
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
