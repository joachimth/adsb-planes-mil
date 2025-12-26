/**
 * Region Definitions Module - MilAir Watch
 * Geografiske regioner med bounding boxes og center points
 */

console.log("✅ regions.js er indlæst.");

/**
 * Geografiske regioner
 * bbox format: [west, south, east, north]
 */
export const REGIONS = {
    denmark: {
        id: 'denmark',
        name: '🇩🇰 Danmark',
        center: [56.2, 11.5],  // Justeret for bedre center
        zoom: 6,               // Zoomet ud et hak (var 7)
        bbox: [8.0, 54.5, 15.2, 58.0],
        buffer: 100 // km buffer zone
    },
    nordic: {
        id: 'nordic',
        name: '🌍 Nordeuropa',
        center: [60.0, 15.0],
        zoom: 4,
        bbox: [-10.0, 50.0, 40.0, 70.0],
        buffer: 200
    },
    europe: {
        id: 'europe',
        name: '🌍 Europa',
        center: [50.0, 10.0],
        zoom: 4,
        bbox: [-15.0, 35.0, 40.0, 70.0],
        buffer: 250
    },
    northatlantic: {
        id: 'northatlantic',
        name: '🌊 Nordatlanten',
        center: [55.0, -30.0],
        zoom: 3,
        bbox: [-60.0, 40.0, 0.0, 70.0],
        buffer: 300
    },
    global: {
        id: 'global',
        name: '🌐 Global',
        center: [40.0, 0.0],
        zoom: 2,
        bbox: null, // No bbox for global view
        buffer: 0
    }
};

/**
 * Default region
 */
export const DEFAULT_REGION = 'nordic';

/**
 * Check if coordinates are within bounding box
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Array} bbox - Bounding box [west, south, east, north]
 * @returns {boolean}
 */
function isInBoundingBox(lat, lon, bbox) {
    if (!bbox) return true; // No bbox = global
    const [west, south, east, north] = bbox;
    return lon >= west && lon <= east && lat >= south && lat <= north;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
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
 * Calculate minimum distance from point to bounding box edges
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Array} bbox - Bounding box [west, south, east, north]
 * @returns {number} Minimum distance in km
 */
function distanceToBbox(lat, lon, bbox) {
    if (!bbox) return 0;
    const [west, south, east, north] = bbox;

    // If inside bbox, distance is 0
    if (isInBoundingBox(lat, lon, bbox)) {
        return 0;
    }

    // Calculate distance to closest edge/corner
    let minDistance = Infinity;

    // Check distance to edges
    const corners = [
        [south, west], [south, east],  // Bottom corners
        [north, west], [north, east]   // Top corners
    ];

    // Distance to corners
    corners.forEach(([cornerLat, cornerLon]) => {
        const dist = haversineDistance(lat, lon, cornerLat, cornerLon);
        minDistance = Math.min(minDistance, dist);
    });

    // Distance to edges (approximate)
    // West edge
    if (lon < west) {
        const closestLat = Math.max(south, Math.min(north, lat));
        const dist = haversineDistance(lat, lon, closestLat, west);
        minDistance = Math.min(minDistance, dist);
    }
    // East edge
    if (lon > east) {
        const closestLat = Math.max(south, Math.min(north, lat));
        const dist = haversineDistance(lat, lon, closestLat, east);
        minDistance = Math.min(minDistance, dist);
    }
    // South edge
    if (lat < south) {
        const closestLon = Math.max(west, Math.min(east, lon));
        const dist = haversineDistance(lat, lon, south, closestLon);
        minDistance = Math.min(minDistance, dist);
    }
    // North edge
    if (lat > north) {
        const closestLon = Math.max(west, Math.min(east, lon));
        const dist = haversineDistance(lat, lon, north, closestLon);
        minDistance = Math.min(minDistance, dist);
    }

    return minDistance;
}

/**
 * Check if aircraft is in region (including buffer zone)
 * @param {Object} aircraft - Aircraft object with lat/lon
 * @param {string} regionKey - Region key (e.g., 'denmark')
 * @returns {boolean}
 */
export function isAircraftInRegion(aircraft, regionKey) {
    if (!aircraft.lat || !aircraft.lon) {
        return false; // No position data
    }

    const region = REGIONS[regionKey];
    if (!region) {
        console.warn(`⚠️ Unknown region: ${regionKey}`);
        return true; // Default to showing aircraft
    }

    // Global region shows everything
    if (!region.bbox) {
        return true;
    }

    // Check if in bounding box
    if (isInBoundingBox(aircraft.lat, aircraft.lon, region.bbox)) {
        return true;
    }

    // Check if within buffer zone
    const distance = distanceToBbox(aircraft.lat, aircraft.lon, region.bbox);
    return distance <= region.buffer;
}

/**
 * Filter aircraft list by region
 * @param {Array} aircraftList - Array of aircraft objects
 * @param {string} regionKey - Region key
 * @returns {Array} Filtered aircraft list
 */
export function filterAircraftByRegion(aircraftList, regionKey) {
    if (regionKey === 'global') {
        return aircraftList; // No filtering for global
    }

    return aircraftList.filter(aircraft => isAircraftInRegion(aircraft, regionKey));
}

/**
 * Get region object by key
 * @param {string} regionKey - Region key
 * @returns {Object|null}
 */
export function getRegion(regionKey) {
    return REGIONS[regionKey] || null;
}

/**
 * Get all region keys
 * @returns {Array}
 */
export function getAllRegionKeys() {
    return Object.keys(REGIONS);
}

/**
 * Save selected region to localStorage
 * @param {string} regionKey - Region key
 */
export function saveRegionPreference(regionKey) {
    try {
        localStorage.setItem('milair_selected_region', regionKey);
        console.log(`💾 Region preference saved: ${regionKey}`);
    } catch (error) {
        console.warn('⚠️ Could not save region preference:', error);
    }
}

/**
 * Load selected region from localStorage
 * @returns {string} Region key or default
 */
export function loadRegionPreference() {
    try {
        const saved = localStorage.getItem('milair_selected_region');
        if (saved && REGIONS[saved]) {
            console.log(`📂 Loaded region preference: ${saved}`);
            return saved;
        }
    } catch (error) {
        console.warn('⚠️ Could not load region preference:', error);
    }
    return DEFAULT_REGION;
}
