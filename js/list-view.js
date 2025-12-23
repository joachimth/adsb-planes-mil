/**
 * List View Module - MilAir Watch
 * Håndterer listevisning af fly som alternativ til kortet
 */

console.log("✅ list-view.js er indlæst.");

import { determineAircraftCategory, openBottomSheet, getUserLocation } from './mobile-ui.js';

let currentSort = 'emergency'; // emergency, military, altitude, speed, distance

/**
 * Initialiserer list view
 */
export function initListView() {
    console.log("📋 Initialiserer list view...");

    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    sortSelect?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        // Trigger re-render via event
        document.dispatchEvent(new CustomEvent('sortChanged'));
    });

    console.log("✅ List view initialiseret.");
}

/**
 * Toggle list view visibility
 */
export function toggleListView(show) {
    const listView = document.getElementById('listView');
    const mapContainer = document.querySelector('.map-container');

    if (!listView || !mapContainer) return;

    if (show) {
        listView.classList.add('visible');
        // Optional: hide map when list is shown for performance
        // mapContainer.style.display = 'none';
    } else {
        listView.classList.remove('visible');
        // mapContainer.style.display = 'block';
    }
}

/**
 * Update list view with aircraft data
 */
export function updateListView(aircraftData) {
    const listCount = document.getElementById('listCount');
    const aircraftList = document.getElementById('aircraftList');

    if (!aircraftList) return;

    // Update count
    if (listCount) {
        listCount.textContent = `Viser ${aircraftData.length} fly`;
    }

    // Sort aircraft
    const sortedAircraft = sortAircraft(aircraftData, currentSort);

    // Clear list
    aircraftList.innerHTML = '';

    // Render aircraft cards
    if (sortedAircraft.length === 0) {
        aircraftList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <p>Ingen fly matcher de valgte filtre.</p>
            </div>
        `;
        return;
    }

    sortedAircraft.forEach(aircraft => {
        const card = createAircraftCard(aircraft);
        aircraftList.appendChild(card);
    });
}

/**
 * Create aircraft card element
 */
function createAircraftCard(aircraft) {
    const category = determineAircraftCategory(aircraft);
    const callsign = aircraft.flight?.trim() || aircraft.r || 'N/A';
    const altitude = aircraft.alt_baro === 'ground'
        ? 'Ground'
        : (aircraft.alt_baro ? `${aircraft.alt_baro} ft` : 'N/A');
    const speed = aircraft.gs ? `${Math.round(aircraft.gs)} kts` : 'N/A';
    const squawk = aircraft.squawk || '----';

    // Create card element
    const card = document.createElement('div');
    card.className = `aircraft-card ${category}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Vis detaljer for ${callsign}`);

    card.innerHTML = `
        <div class="card-header">
            <div class="card-callsign">${callsign}</div>
            <span class="card-type-badge ${category}">${getCategoryLabel(category)}</span>
        </div>
        <div class="card-details">
            <div class="card-detail">
                <span>Højde</span>
                <span class="card-detail-value">${altitude}</span>
            </div>
            <div class="card-detail">
                <span>Fart</span>
                <span class="card-detail-value">${speed}</span>
            </div>
            <div class="card-detail">
                <span>Squawk</span>
                <span class="card-detail-value">${squawk}</span>
            </div>
        </div>
    `;

    // Click handler
    card.addEventListener('click', () => {
        openBottomSheet(aircraft);
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    });

    // Keyboard handler
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openBottomSheet(aircraft);
        }
    });

    return card;
}

/**
 * Sort aircraft based on criteria
 */
function sortAircraft(aircraft, sortBy) {
    const sorted = [...aircraft];

    switch (sortBy) {
        case 'emergency':
            sorted.sort((a, b) => {
                const aEmergency = ['7500', '7600', '7700'].includes(a.squawk) ? 1 : 0;
                const bEmergency = ['7500', '7600', '7700'].includes(b.squawk) ? 1 : 0;
                return bEmergency - aEmergency;
            });
            break;

        case 'military':
            sorted.sort((a, b) => {
                const aMilitary = isMilitary(a) ? 1 : 0;
                const bMilitary = isMilitary(b) ? 1 : 0;
                return bMilitary - aMilitary;
            });
            break;

        case 'altitude':
            sorted.sort((a, b) => {
                const aAlt = a.alt_baro === 'ground' ? 0 : (a.alt_baro || 0);
                const bAlt = b.alt_baro === 'ground' ? 0 : (b.alt_baro || 0);
                return bAlt - aAlt;
            });
            break;

        case 'speed':
            sorted.sort((a, b) => {
                const aSpeed = a.gs || 0;
                const bSpeed = b.gs || 0;
                return bSpeed - aSpeed;
            });
            break;

        case 'distance':
            const userLocation = getUserLocation();
            if (userLocation) {
                sorted.sort((a, b) => {
                    const aDist = calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        a.lat,
                        a.lon
                    );
                    const bDist = calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        b.lat,
                        b.lon
                    );
                    return aDist - bDist;
                });
            }
            break;
    }

    return sorted;
}

/**
 * Check if aircraft is military
 */
function isMilitary(aircraft) {
    const squawk = aircraft.squawk;
    const militaryRanges = [
        [4400, 4477],
        [7401, 7477],
        [7610, 7676],
        [4000, 4000],
        [7777, 7777]
    ];

    const squawkNum = parseInt(squawk, 10);
    if (!isNaN(squawkNum)) {
        for (const [start, end] of militaryRanges) {
            if (squawkNum >= start && squawkNum <= end) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Calculate distance between two coordinates
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Get category label
 */
function getCategoryLabel(category) {
    const labels = {
        'emergency': 'NØD',
        'military': 'MIL',
        'special': 'SPEC'
    };
    return labels[category] || 'CIV';
}
