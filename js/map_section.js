/**
 * Kort-modul for Militær Fly Tracker
 * Håndterer Leaflet-kortet og fly-markører
 */

console.log("✅ map_section.js er indlæst.");

/**
 * Escaper HTML-tegn for at undgå XSS
 * @param {string} str - Tekst at escape
 * @returns {string} - Escapet tekst
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Kort-tilstand
let myMap;
let flightMarkersLayer;

// Ikon-konfiguration
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
});

const emergencyIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
});

// Nød-koder for reference
const EMERGENCY_SQUAWKS = ['7500', '7600', '7700'];

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

        // Opret kort med standardposition (Nordeuropa/Østersøen)
        myMap = L.map('map', {
            zoomControl: true,
            attributionControl: true
        }).setView([55.0, 15.0], 4);

        // Tilføj OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(myMap);

        // Opret lag til fly-markører
        flightMarkersLayer = L.layerGroup().addTo(myMap);

        console.log("✅ Kort initialiseret succesfuldt.");

    } catch (error) {
        console.error("❌ Fejl under kort-initialisering:", error);
        // Skjul kort-container ved fejl
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.style.display = 'none';
        }
        throw error;
    }
}

/**
 * Opdaterer kortet med fly-positioner
 * @param {Array} flightData - Liste af fly-objekter fra API
 */
export function updateMap(flightData) {
    if (!myMap || !flightMarkersLayer) {
        console.warn("⚠️ updateMap kaldt før kortet var klar.");
        return;
    }

    // Ryd gamle markører
    flightMarkersLayer.clearLayers();

    const emergencyFlights = [];

    // Opret markører for hvert fly
    flightData.forEach(flight => {
        // Spring over fly uden position
        if (!flight.lat || !flight.lon) {
            return;
        }

        const isEmergency = EMERGENCY_SQUAWKS.includes(flight.squawk);
        const icon = isEmergency ? emergencyIcon : defaultIcon;

        if (isEmergency) {
            emergencyFlights.push([flight.lat, flight.lon]);
        }

        // Formater popup-indhold
        const altitude = flight.alt_baro === 'ground'
            ? 'På jorden'
            : (flight.alt_baro ? `${flight.alt_baro} fod` : 'N/A');

        const speed = flight.gs
            ? `${flight.gs.toFixed(0)} knob`
            : 'N/A';

        const popupContent = `
            <div class="flight-popup">
                <strong>Kaldesignal:</strong> ${escapeHtml(flight.flight?.trim() || 'N/A')}<br>
                <strong>Højde:</strong> ${altitude}<br>
                <strong>Fart:</strong> ${speed}<br>
                <strong>Squawk:</strong> ${escapeHtml(flight.squawk || '----')}<br>
                ${flight.cou ? `<strong>Land:</strong> ${escapeHtml(flight.cou)}` : ''}
            </div>
        `;

        // Opret og tilføj markør
        L.marker([flight.lat, flight.lon], { icon })
            .bindPopup(popupContent)
            .addTo(flightMarkersLayer);
    });

    // Auto-zoom til nød-fly hvis der er nogen
    if (emergencyFlights.length > 0) {
        const bounds = L.latLngBounds(emergencyFlights);
        myMap.fitBounds(bounds, { padding: [50, 50] });
    }
}
