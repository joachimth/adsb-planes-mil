/**
 * Map Module (Mobile) - MilAir Watch
 * Håndterer Leaflet-kortet med color-coded markers
 */

console.log("✅ map_section_mobile.js er indlæst.");

import { determineAircraftCategory, openBottomSheet } from './mobile-ui.js';
import { getSquawkDescription } from './squawk-lookup.js';

// Map state
let myMap;
let flightMarkersLayer;
let boundingBoxLayer = null;
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

        // Listen for unfollow event
        document.addEventListener('unfollowAircraft', () => {
            followedAircraft = null;
        });

        console.log("✅ Kort initialiseret.");

    } catch (error) {
        console.error("❌ Fejl under kort-initialisering:", error);
        throw error;
    }
}

/**
 * Create rotated aircraft icon based on heading/track
 * @param {Object} aircraft - Aircraft data
 * @param {string} category - Aircraft category (military, emergency, special, civilian)
 * @returns {L.DivIcon} - Leaflet div icon
 */
function createAircraftIcon(aircraft, category) {
    // Get aircraft heading (track or heading field)
    const heading = aircraft.track || aircraft.heading || 0;

    // Color based on category (brighter, more saturated)
    const colors = {
        'military': '#00ff66',    // Bright green
        'emergency': '#ff0044',   // Bright red
        'special': '#ffcc00',     // Bright yellow
        'civilian': '#00ddff'     // Bright cyan
    };
    const color = colors[category] || colors.civilian;

    // Create HTML for rotated aircraft icon with enhanced glow
    const html = `
        <div style="
            transform: rotate(${heading}deg);
            transform-origin: center center;
            font-size: 24px;
            line-height: 1;
            text-shadow:
                0 0 2px rgba(0,0,0,0.9),
                0 0 8px ${color},
                0 0 12px ${color},
                0 0 16px ${color};
            filter:
                drop-shadow(0 0 4px ${color})
                drop-shadow(0 2px 6px rgba(0,0,0,0.6))
                brightness(1.1);
        ">✈️</div>
    `;

    return L.divIcon({
        html: html,
        className: 'aircraft-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
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

    console.log(`📍 updateMap: Modtaget ${aircraftData.length} fly`);
    let skippedCount = 0;

    // Create markers
    aircraftData.forEach(aircraft => {
        // Skip aircraft without position
        if (!aircraft.lat || !aircraft.lon) {
            skippedCount++;
            console.warn(`⚠️ Springer over ${aircraft.flight || aircraft.r}: Ingen position (lat=${aircraft.lat}, lon=${aircraft.lon})`);
            return;
        }

        const category = determineAircraftCategory(aircraft);

        // Track emergency flights
        if (category === 'emergency') {
            emergencyFlights.push([aircraft.lat, aircraft.lon]);
            hasEmergency = true;
        }

        // Create rotated aircraft icon
        const icon = createAircraftIcon(aircraft, category);

        // Create marker
        const marker = L.marker([aircraft.lat, aircraft.lon], { icon });

        // Popup content (simple version - detailed info in bottom sheet)
        const callsign = aircraft.flight?.trim() || aircraft.r || 'N/A';
        const altitude = aircraft.alt_baro === 'ground'
            ? 'Ground'
            : (aircraft.alt_baro ? `${aircraft.alt_baro} ft` : 'N/A');
        const squawk = aircraft.squawk || '----';
        let squawkDesc = null;

        try {
            squawkDesc = getSquawkDescription(squawk);
        } catch (err) {
            // Squawk lookup not available - continue without description
        }

        let popupContent = `
            <div class="flight-popup">
                <strong>${callsign}</strong><br>
                ${altitude}<br>
                <span style="font-family: monospace; font-weight: 600;">${squawk}</span>`;

        if (squawkDesc) {
            popupContent += `<br><span style="font-size: 11px; opacity: 0.8;">${squawkDesc}</span>`;
        }

        popupContent += `<br><small style="margin-top: 4px; display: block;">Tryk for detaljer</small>
            </div>
        `;

        marker.bindPopup(popupContent);

        // Click to open bottom sheet
        marker.on('click', () => {
            openBottomSheet(aircraft);
        });

        marker.addTo(flightMarkersLayer);
    });

    const markersCreated = aircraftData.length - skippedCount;
    console.log(`✅ Oprettede ${markersCreated} markers (${skippedCount} sprunget over pga. manglende position)`);

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

/**
 * Check if currently following an aircraft
 */
export function isFollowingAircraft() {
    return followedAircraft !== null;
}

/**
 * Get currently followed aircraft
 */
export function getFollowedAircraft() {
    return followedAircraft;
}

/**
 * Set map region (zoom and bounding box)
 * @param {Object} region - Region object from regions.js
 */
export function setMapRegion(region) {
    if (!myMap) {
        console.warn("⚠️ Kort ikke initialiseret endnu");
        return;
    }

    console.log(`📍 Sætter kort region: ${region.name}`);

    // Remove existing bounding box if any
    if (boundingBoxLayer) {
        myMap.removeLayer(boundingBoxLayer);
        boundingBoxLayer = null;
    }

    // Set map view to region center and zoom
    myMap.setView(region.center, region.zoom, {
        animate: true,
        duration: 0.8
    });

    // Draw bounding box if region has one (not global)
    if (region.bbox) {
        const [west, south, east, north] = region.bbox;

        // Create rectangle bounds
        const bounds = [[south, west], [north, east]];

        // Create semi-transparent rectangle
        boundingBoxLayer = L.rectangle(bounds, {
            color: '#00d4ff',         // Cyan border
            weight: 2,
            opacity: 0.6,
            fillColor: '#00d4ff',     // Cyan fill
            fillOpacity: 0.08,
            dashArray: '5, 10',        // Dashed line
            interactive: false         // Don't interfere with clicks
        }).addTo(myMap);

        // Add tooltip with region name
        boundingBoxLayer.bindTooltip(region.name, {
            permanent: false,
            direction: 'center',
            className: 'region-bbox-tooltip'
        });

        console.log(`📦 Bounding box tegnet for ${region.name}`);
    } else {
        console.log(`🌐 Global region - ingen bounding box`);
    }
}
