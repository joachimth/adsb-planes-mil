/**
 * Hoved-applikationsfil for Militær Fly Tracker
 * Bruger ES6 moduler og moderne JavaScript-funktioner (2025)
 */

import { initMap, updateMap } from './map_section.js';
import { updateFlightTable } from './flight_table.js';
import { initializeCallsignFilter } from './callsign_filter.js';
import { initializeSquawkFilter } from './squawk_filter.js';
import { initializeEmergencyAlert, checkAndDisplayEmergencyAlert } from './emergency_alert.js';
import { getAircraftInfo } from './aircraft-info.js';

// Applikations-tilstand
const state = {
    flightData: [],
    activeCallsignFilter: '',
    userSelectedSquawks: new Set(),
    lastUpdated: null,
    isLoading: false,
    abortController: null
};

// API-konfiguration
const API_CONFIG = {
    proxyUrl: 'https://corsproxy.io/?key=0f67e3f0&url=',
    baseUrl: 'https://api.adsb.lol/v2/mil',
    updateInterval: 30000 // 30 sekunder
};

/**
 * Applikationens hovedfunktion - starter når DOM er klar
 */
async function main() {
    console.log("✈️ DOM klar. Starter applikationen...");

    try {
        // 1. Indlæs alle HTML-sektioner parallelt
        await loadAllHtmlSections();
        console.log("✅ Alle HTML-sektioner indlæst.");

        // 2. Initialiser alle JavaScript-moduler
        await initAllJsModules();
        console.log("✅ Alle JS-moduler initialiseret.");

        // 3. Hent fly-data for første gang
        await fetchFlightData();

        // 4. Start periodisk opdatering
        setInterval(fetchFlightData, API_CONFIG.updateInterval);

        console.log("✅ Applikation startet succesfuldt.");
    } catch (error) {
        console.error("❌ Kritisk fejl under opstart:", error);
        showError("Der opstod en fejl under opstart af applikationen. Prøv at genindlæse siden.");
    }
}

/**
 * Indlæser alle HTML-sektioner parallelt
 */
async function loadAllHtmlSections() {
    const sections = [
        { id: 'header-container', url: 'header.html' },
        { id: 'emergency-alert-container', url: 'emergency_alert.html' },
        { id: 'filter-container', url: 'filter_section.html' },
        { id: 'squawk-filter-container', url: 'squawk_filter.html' },
        { id: 'flight-table-container', url: 'flight_table.html' },
        { id: 'footer-container', url: 'footer.html' }
    ];

    const loadPromises = sections.map(async section => {
        try {
            const response = await fetch(section.url, {
                signal: AbortSignal.timeout(5000) // 5 second timeout for HTML sections
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${section.url}`);
            }
            const html = await response.text();
            const container = document.getElementById(section.id);
            if (container) {
                container.innerHTML = html;
            } else {
                console.warn(`⚠️ Container #${section.id} blev ikke fundet.`);
            }
        } catch (error) {
            console.error(`❌ Fejl ved indlæsning af ${section.url}:`, error);
            throw error;
        }
    });

    await Promise.all(loadPromises);
}

/**
 * Initialiserer alle JavaScript-moduler
 */
async function initAllJsModules() {
    initMap();
    initializeCallsignFilter(onCallsignFilterChange);
    initializeEmergencyAlert();
    await initializeSquawkFilter(onSquawkFilterChange, state.userSelectedSquawks);
}

/**
 * Henter flydata fra API'et
 */
async function fetchFlightData() {
    // Annuller tidligere request hvis den stadig kører
    if (state.abortController) {
        state.abortController.abort();
    }

    state.abortController = new AbortController();
    const apiUrl = API_CONFIG.proxyUrl + encodeURIComponent(API_CONFIG.baseUrl);

    console.log("🔄 Henter flydata...");
    setLoadingState(true);

    try {
        const response = await fetch(apiUrl, {
            signal: AbortSignal.timeout(10000), // 10 second timeout
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`API-fejl: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        state.flightData = data.ac || [];
        state.lastUpdated = new Date();

        console.log(`✅ ${state.flightData.length} fly hentet.`);

        // Opdater UI først med basis data
        applyFiltersAndUpdate();
        updateLastUpdatedDisplay();
        setLoadingState(false);

        // Hent aircraft type info i baggrunden
        enrichFlightDataWithAircraftType();

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log("🔄 Request blev annulleret.");
            return;
        }

        console.error("❌ Fejl ved hentning af flydata:", error);
        setLoadingState(false);
        showError("Kunne ikke hente flydata. Tjekker igen om 30 sekunder.");
    }
}

/**
 * Beriger flight data med aircraft type information fra ADSB.lol API
 * Henter type info for alle fly i baggrunden og opdaterer UI progressivt
 */
async function enrichFlightDataWithAircraftType() {
    if (!state.flightData || state.flightData.length === 0) {
        return;
    }

    console.log(`🔄 Henter flytype-info for ${state.flightData.length} fly...`);

    // Håndter fly i batches for at undgå at overbelaste API'et
    const BATCH_SIZE = 10;
    const BATCH_DELAY = 500; // ms mellem batches

    let updatedCount = 0;

    for (let i = 0; i < state.flightData.length; i += BATCH_SIZE) {
        const batch = state.flightData.slice(i, i + BATCH_SIZE);

        // Hent aircraft info for alle fly i batchen parallelt
        const promises = batch.map(async (flight) => {
            try {
                // API'et returnerer 'r' som registration/identifier
                // og evt. 'hex' som ICAO hex code
                const registration = flight.r;
                const hex = flight.hex || null;

                const aircraftInfo = await getAircraftInfo(registration, hex);

                if (aircraftInfo && aircraftInfo.type) {
                    flight.aircraftType = aircraftInfo.type;
                    updatedCount++;
                    return true;
                }
            } catch (error) {
                console.warn(`⚠️ Kunne ikke hente type for ${flight.r}:`, error);
            }
            return false;
        });

        // Vent på at batchen er færdig
        await Promise.all(promises);

        // Opdater UI efter hver batch
        applyFiltersAndUpdate();

        // Vent lidt før næste batch (undtagen for den sidste batch)
        if (i + BATCH_SIZE < state.flightData.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
    }

    console.log(`✅ Flytype-info hentet for ${updatedCount} af ${state.flightData.length} fly.`);
}

/**
 * Tjekker om en squawk matcher de valgte filtre (inkl. ranges)
 * Validerer at squawk er en valid 4-cifret kode
 */
function checkSquawkMatch(flightSquawk, selectedSquawks) {
      // Valider at squawk er 4 cifre
      if (!flightSquawk || !/^\d{4}$/.test(String(flightSquawk))) {
          return false;
      }

    // Direkte match (mest almindeligt)
    if (selectedSquawks.has(flightSquawk)) {
        return true;
    }

    // Tjek ranges (f.eks. "4400-4477")
    const flightSquawkNum = parseInt(flightSquawk, 10);
    if (isNaN(flightSquawkNum)) {
        return false;
    }

    for (const selected of selectedSquawks) {
        if (selected.includes('-')) {
            const [start, end] = selected.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end) &&
                flightSquawkNum >= start && flightSquawkNum <= end) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Central filtreringsfunktion - opdaterer kort og tabel
 */
function applyFiltersAndUpdate() {
    if (!state.flightData) return;

    // 1. Tjek for nød-alarmer på UFILTREREDE data
    checkAndDisplayEmergencyAlert(state.flightData);

    // 2. Anvend filtre
    const filteredData = state.flightData.filter(flight => {
        const callsign = (flight.flight || '').toLowerCase();
        const squawk = flight.squawk;

        const callsignMatch = state.activeCallsignFilter === '' ||
                            callsign.includes(state.activeCallsignFilter);
        const squawkMatch = checkSquawkMatch(squawk, state.userSelectedSquawks);

        return callsignMatch && squawkMatch;
    });

    // 3. Opdater UI
    updateMap(filteredData);
    updateFlightTable(filteredData);
    updateAircraftCount(filteredData.length, state.flightData.length);
}

/**
 * Callback når kaldesignal-filteret ændres
 */
function onCallsignFilterChange(filterValue) {
    state.activeCallsignFilter = filterValue;
    applyFiltersAndUpdate();
}

/**
 * Callback når squawk-filteret ændres
 */
function onSquawkFilterChange() {
    applyFiltersAndUpdate();
}

/**
 * Viser/skjuler loading-indikator
 */
function setLoadingState(isLoading) {
    state.isLoading = isLoading;
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.classList.toggle('visible', isLoading);
    }
}

/**
 * Opdaterer "sidst opdateret" tidsstempel
 */
function updateLastUpdatedDisplay() {
    const element = document.getElementById('last-updated');
    if (!element || !state.lastUpdated) return;

    const now = new Date();
    const diffSeconds = Math.floor((now - state.lastUpdated) / 1000);

    let timeText;
    if (diffSeconds < 60) {
        timeText = 'Lige nu';
    } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        timeText = `${minutes} min siden`;
    } else {
        timeText = state.lastUpdated.toLocaleTimeString('da-DK', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    element.textContent = `Sidst opdateret: ${timeText}`;
}

/**
 * Opdaterer antal fly display
 */
function updateAircraftCount(filtered, total) {
    const element = document.getElementById('aircraft-count');
    if (element) {
        element.textContent = `Viser ${filtered} af ${total} fly`;
    }
}

/**
 * Viser fejlbesked til brugeren
 */
function showError(message) {
    const errorContainer = document.getElementById('error-message');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.classList.add('visible');

        // Skjul efter 5 sekunder
        setTimeout(() => {
            errorContainer.classList.remove('visible');
        }, 5000);
    }
}

// Start applikationen når DOM er klar
document.addEventListener('DOMContentLoaded', main);

// Opdater "sidst opdateret" hver 10. sekund
setInterval(updateLastUpdatedDisplay, 10000);
