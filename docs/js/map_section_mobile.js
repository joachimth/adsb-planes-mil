/**
 * Map Module (Mobile) - MilAir Watch
 * Håndterer Leaflet-kortet med color-coded markers
 */

console.log("✅ map_section_mobile.js er indlæst.");

import { determineAircraftCategory, openBottomSheet } from './mobile-ui.js';

// Map state
let myMap;
let flightMarkersLayer;
let followedAircraft = null;

// Color-coded icons
const icons = {
    military: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
    }),
    emergency: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
    }),
    special: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
    }),
    civilian: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
    })
};

/**
 * Initialiserer Leaflet-kortet
 */
export function initMap() {
    if (myMap) {
        console.warn("⚠️ Kortet er allerede initialiseret.");
        return;
    }

    try {
        console.log("📌 Initialiserer kort...");

        // Create map
        myMap = L.map('map', {
            zoomControl: true,
            attributionControl: true,
            minZoom: 2,  // Allow zooming out to see whole continents
            maxZoom: 18,
            worldCopyJump: true,  // Handle wrapping across date line
            maxBounds: null  // No bounds restriction
        }).setView([55.0, 15.0], 4);  // Start at zoom 4 instead of 5

        // Add dark tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(myMap);

        // Create marker layer
        flightMarkersLayer = L.layerGroup().addTo(myMap);

        // Listen for follow aircraft event
        document.addEventListener('followAircraft', (e) => {
            followedAircraft = e.detail;
            centerOnAircraft(followedAircraft);
        });

        console.log("✅ Kort initialiseret.");

    } catch (error) {
        console.error("❌ Fejl under kort-initialisering:", error);
        throw error;
    }
}

/**
 * Opdaterer kortet med fly-positioner
 */
export function updateMap(aircraftData) {
    if (!myMap || !flightMarkersLayer) {
        console.warn("⚠️ updateMap kaldt før kortet var klar.");
        return;
    }

    // Clear old markers
    flightMarkersLayer.clearLayers();

    const emergencyFlights = [];
    let hasEmergency = false;

    // Create markers
    aircraftData.forEach(aircraft => {
        // Skip aircraft without position
        if (!aircraft.lat || !aircraft.lon) return;

        const category = determineAircraftCategory(aircraft);
        const icon = icons[category] || icons.civilian;

        // Track emergency flights
        if (category === 'emergency') {
            emergencyFlights.push([aircraft.lat, aircraft.lon]);
            hasEmergency = true;
        }

        // Create marker
        const marker = L.marker([aircraft.lat, aircraft.lon], { icon });

        // Popup content (simple version - detailed info in bottom sheet)
        const callsign = aircraft.flight?.trim() || aircraft.r || 'N/A';
        const altitude = aircraft.alt_baro === 'ground'
            ? 'Ground'
            : (aircraft.alt_baro ? `${aircraft.alt_baro} ft` : 'N/A');

        marker.bindPopup(`
            <div class="flight-popup">
                <strong>${callsign}</strong><br>
                ${altitude}<br>
                <small>Tap for details</small>
            </div>
        `);

        // Click to open bottom sheet
        marker.on('click', () => {
            openBottomSheet(aircraft);
        });

        marker.addTo(flightMarkersLayer);
    });

    // Auto-zoom to emergency flights if any
    if (hasEmergency && emergencyFlights.length > 0) {
        const bounds = L.latLngBounds(emergencyFlights);
        myMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }

    // If following an aircraft, keep it centered
    if (followedAircraft) {
        const updatedAircraft = aircraftData.find(a => a.r === followedAircraft.r);
        if (updatedAircraft && updatedAircraft.lat && updatedAircraft.lon) {
            centerOnAircraft(updatedAircraft);
        }
    }
}

/**
 * Center map on specific aircraft
 */
function centerOnAircraft(aircraft) {
    if (!aircraft.lat || !aircraft.lon) return;

    myMap.setView([aircraft.lat, aircraft.lon], 10, {
        animate: true,
        duration: 0.5
    });
}

/**
 * Get map instance (for external use)
 */
export function getMap() {
    return myMap;
}
