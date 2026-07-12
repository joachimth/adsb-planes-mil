/**
 * Map Module (Mobile) - MilAir Watch
 * Håndterer Leaflet-kortet med color-coded markers
 */

console.log("✅ map_section_mobile.js er indlæst.");

import { determineAircraftCategory, openBottomSheet } from './mobile-ui.js';
import { getSquawkDescription } from './squawk-lookup.js';
import { getTrack, recordPositions } from './track-store.js';
import { getAircraftIconShape } from './aircraft-info.js';
import { fetchHistoricalTrack, mergeTracks } from './history-proxy.js';

// Map state
let myMap;
let flightMarkersLayer;
let boundingBoxLayer = null;
let followedAircraft = null;
let trackLayer = null;       // Leaflet layerGroup holding the current route polyline

// Route colours per category (match marker colours)
const TRACK_COLORS = {
    military: '#22c55e',
    emergency: '#ef4444',
    special: '#eab308',
    civilian: '#3b82f6'
};

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

        // Flight-route events (dispatched from the bottom sheet / mobile-ui).
        // detail: { hex, category, intervalMs, fit }
        document.addEventListener('showTrack', async (e) => {
            const { hex, category, intervalMs, fit } = e.detail || {};

            // Step 1: Get local track-store points (always available)
            const localPoints = getTrack(hex, intervalMs);

            // Step 2: Try fetching historical track from the proxy (if configured).
            // The Worker stores its own multi-day history in D1; this fills gaps
            // the local buffer couldn't catch (flights before the app was open).
            // Convert the selected interval to hours. "All" (no interval) pulls
            // the full retained window (720h = 30 days).
            let historyPoints = [];
            if (hex) {
                const hours = intervalMs
                    ? Math.max(0.25, intervalMs / 3600000)
                    : 720; // "all" = full 30-day retention
                historyPoints = await fetchHistoricalTrack(hex, hours);
            }

            // Step 3: Merge local + history, dedup by timestamp
            const points = mergeTracks(localPoints, historyPoints);
            drawTrack(points, category, { fit: !!fit });
            document.dispatchEvent(new CustomEvent('trackDrawn', {
                detail: { hex, count: points.length, historyCount: historyPoints.length }
            }));
        });

        document.addEventListener('clearTrack', () => clearTrack());

        // "All visible tracks" overlay.
        // detail: { aircraft: [...], intervalMs, categoryOf: fn, withHistory: bool }
        document.addEventListener('showAllTracks', async (e) => {
            const { aircraft, intervalMs, categoryOf, withHistory } = e.detail || {};
            if (!Array.isArray(aircraft) || aircraft.length === 0) {
                clearAllTracks();
                return;
            }

            // Step 1: draw LOCAL tracks for everyone immediately (free, instant).
            const catFn = typeof categoryOf === 'function' ? categoryOf : () => 'military';
            const entries = [];
            for (const ac of aircraft) {
                if (!ac || !ac.hex) continue;
                const local = getTrack(ac.hex, intervalMs);
                entries.push({ hex: ac.hex, points: local, category: catFn(ac) });
            }
            drawAllTracks(entries);

            if (!withHistory) return;

            // Step 2: enrich with DB history, but ONLY for aircraft that already
            // have a local track (they're moving/relevant), capped, and with a
            // small concurrency limit so we don't hammer the Worker.
            const hours = intervalMs ? Math.max(0.25, intervalMs / 3600000) : 720;
            const candidates = entries
                .filter(en => en.points && en.points.length >= 1)
                .slice(0, 40); // hard cap on how many we enrich at once

            const byHex = new Map(entries.map(en => [en.hex, en]));
            const CONCURRENCY = 4;
            let i = 0;
            async function worker() {
                while (i < candidates.length) {
                    const en = candidates[i++];
                    try {
                        const hist = await fetchHistoricalTrack(en.hex, hours);
                        if (hist && hist.length) {
                            const merged = mergeTracks(en.points, hist);
                            const target = byHex.get(en.hex);
                            if (target) target.points = merged;
                        }
                    } catch (_) { /* soft-fail per aircraft */ }
                }
            }
            await Promise.all(Array.from({ length: CONCURRENCY }, worker));

            // Redraw with the enriched tracks (only if the overlay is still on).
            if (allTracksVisible()) drawAllTracks([...byHex.values()]);
        });

        document.addEventListener('clearAllTracks', () => clearAllTracks());

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
// SVG shape library. Every glyph is drawn in a 24×24 box pointing TRUE NORTH
// (straight up) at 0° rotation, so rotate(track) maps directly to compass
// heading. Helicopters are the exception: their heading is often noisy/absent,
// so we draw them upright with a spinning-rotor look and don't rotate them.
const ICON_SHAPES = {
    // Generic airliner
    plane: `<path d="M12 2 L14 12 L22 16 L22 18 L14 15.5 L14 20 L16.5 22 L16.5 23 L12 21.5 L7.5 23 L7.5 22 L10 20 L10 15.5 L2 18 L2 16 L10 12 Z"/>`,
    // Large / heavy: fuller wings + wider fuselage
    heavy: `<path d="M12 1.5 L13.5 11 L23 16 L23 18.2 L13.5 15.2 L13.5 20 L16.8 22.2 L16.8 23.3 L12 21.6 L7.2 23.3 L7.2 22.2 L10.5 20 L10.5 15.2 L1 18.2 L1 16 L10.5 11 Z"/>`,
    // Light / small: short stubby wings
    light: `<path d="M12 3 L13 11.5 L18 14 L18 15.5 L13 14.2 L13 19 L15 20.5 L15 21.5 L12 20.5 L9 21.5 L9 20.5 L11 19 L11 14.2 L6 15.5 L6 14 L11 11.5 Z"/>`,
    // Fighter jet: swept delta wings, sharp nose
    jet: `<path d="M12 1.5 L13 13 L21 20 L21 21.5 L13 18.5 L13 20.5 L14.5 22.5 L14.5 23 L12 22 L9.5 23 L9.5 22.5 L11 20.5 L11 18.5 L3 21.5 L3 20 L11 13 Z"/>`,
    // Helicopter: fuselage + rotor cross (drawn separately below)
    helicopter: `<g>
        <ellipse cx="12" cy="13" rx="3" ry="5.5"/>
        <rect x="11.3" y="17.5" width="1.4" height="4.5"/>
        <rect x="9.5" y="21" width="5" height="1.4"/>
    </g>`
};

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

    // Pick the SVG shape from the aircraft's type/emitter category.
    const shape = getAircraftIconShape(aircraft);
    const isHeli = shape === 'helicopter';
    const shapePath = ICON_SHAPES[shape] || ICON_SHAPES.plane;

    // Helicopters get a separate rotor overlay and are NOT track-rotated
    // (rotorcraft heading is noisy and the rotor reads better upright).
    const rotorOverlay = isHeli ? `
        <g stroke="${color}" stroke-width="1.4" stroke-linecap="round" opacity="0.9">
            <line x1="3" y1="7" x2="21" y2="7"/>
            <line x1="12" y1="7" x2="12" y2="12"/>
        </g>` : '';
    const rotation = isHeli ? 0 : heading;

    const html = `
        <div style="
            transform: rotate(${rotation}deg);
            transform-origin: center center;
            width: 28px;
            height: 28px;
            line-height: 0;
            filter:
                drop-shadow(0 0 4px ${color})
                drop-shadow(0 0 8px ${color})
                drop-shadow(0 2px 4px rgba(0,0,0,0.7));
        ">
            <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg"
                 fill="${color}" stroke="rgba(0,0,0,0.85)" stroke-width="0.8" stroke-linejoin="round">
                ${shapePath}
                ${rotorOverlay}
            </svg>
        </div>
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
 * Draw a flight route polyline from buffered track points.
 * @param {Array} points - array of [lat, lon, altBaro, tsMs]
 * @param {string} category - 'military' | 'emergency' | 'special' | 'civilian'
 * @param {Object} [opts] - { fit: boolean } whether to fit the map to the route
 */
export function drawTrack(points, category = 'military', opts = {}) {
    if (!myMap) return;
    clearTrack();

    if (!Array.isArray(points) || points.length < 2) {
        // Nothing meaningful to draw (0 or 1 point).
        return;
    }

    const color = TRACK_COLORS[category] || TRACK_COLORS.military;
    const latlngs = points.map(p => [p[0], p[1]]);

    trackLayer = L.layerGroup();

    // Casing underneath for contrast on the dark map, then the coloured line.
    L.polyline(latlngs, { color: '#000', weight: 6, opacity: 0.35, lineJoin: 'round' }).addTo(trackLayer);
    L.polyline(latlngs, { color, weight: 3, opacity: 0.9, lineJoin: 'round' }).addTo(trackLayer);

    // Small dot at each recorded sample; start marker hollow, end marker solid.
    points.forEach((p, i) => {
        const isEnd = i === points.length - 1;
        const isStart = i === 0;
        L.circleMarker([p[0], p[1]], {
            radius: isEnd ? 5 : (isStart ? 4 : 2.5),
            color: isEnd ? color : '#fff',
            weight: isEnd ? 2 : 1,
            fillColor: color,
            fillOpacity: isStart ? 0.2 : 0.9
        }).addTo(trackLayer);
    });

    trackLayer.addTo(myMap);

    if (opts.fit) {
        try {
            const bounds = L.latLngBounds(latlngs);
            // Short tracks (a plane that has barely moved) collapse to a few
            // pixels and vanish under the marker at low zoom. Allow zooming in
            // much closer so even a tight cluster is visibly a line.
            myMap.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
        } catch (_) { /* ignore */ }
    }
}

/** Remove the current route polyline from the map. */
export function clearTrack() {
    if (trackLayer && myMap) {
        myMap.removeLayer(trackLayer);
    }
    trackLayer = null;
}

// ---------------------------------------------------------------------------
// "All visible tracks" overlay — a separate layer so it does NOT interfere
// with the single selected-aircraft route (trackLayer).
// ---------------------------------------------------------------------------
let allTracksLayer = null;

/**
 * Draw thin route lines for many aircraft at once.
 * @param {Array} entries - [{ hex, points:[[lat,lon,alt,tsMs]...], category }]
 *   Only entries with >= 2 points are drawn.
 */
export function drawAllTracks(entries) {
    if (!myMap) return;
    clearAllTracks();
    if (!Array.isArray(entries) || entries.length === 0) return;

    allTracksLayer = L.layerGroup();
    let drawn = 0;

    for (const entry of entries) {
        const pts = entry && entry.points;
        if (!Array.isArray(pts) || pts.length < 2) continue;
        const color = TRACK_COLORS[entry.category] || TRACK_COLORS.military;
        const latlngs = pts.map(p => [p[0], p[1]]);

        // Thin, semi-transparent so a crowded map stays readable. No per-point
        // dots here (would be visual noise across dozens of aircraft) — just a
        // solid end marker so you can see where each track currently ends.
        L.polyline(latlngs, { color, weight: 2, opacity: 0.6, lineJoin: 'round' }).addTo(allTracksLayer);
        const end = pts[pts.length - 1];
        L.circleMarker([end[0], end[1]], {
            radius: 3, color, weight: 1, fillColor: color, fillOpacity: 0.9
        }).addTo(allTracksLayer);
        drawn++;
    }

    allTracksLayer.addTo(myMap);
    document.dispatchEvent(new CustomEvent('allTracksDrawn', { detail: { count: drawn } }));
}

/** Remove the all-tracks overlay. */
export function clearAllTracks() {
    if (allTracksLayer && myMap) myMap.removeLayer(allTracksLayer);
    allTracksLayer = null;
}

/** Whether the all-tracks overlay is currently shown. */
export function allTracksVisible() {
    return !!allTracksLayer;
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
