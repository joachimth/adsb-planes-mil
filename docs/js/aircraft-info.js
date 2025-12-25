/**
 * Aircraft Information Module - MilAir Watch
 * Henter flytype-information fra ADSB.lol og ADSB.fi APIs
 */

console.log("✅ aircraft-info.js er indlæst.");

// Cache for aircraft info to minimize API calls
const aircraftCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 timer

// API konfiguration
const API_CONFIG = {
    proxyUrl: 'https://corsproxy.io/?url=',
    adsbLol: 'https://api.adsb.lol/v2',
    adsbFi: 'https://opendata.adsb.fi/api/v2'
};

/**
 * Get aircraft information by registration or hex code
 * @param {string} registration - Aircraft registration (e.g., "MM82010")
 * @param {string} hex - ICAO hex code (e.g., "32004e")
 * @returns {Promise<Object|null>} - Aircraft info or null
 */
export async function getAircraftInfo(registration, hex) {
    const cacheKey = registration || hex;
    if (!cacheKey) {
        console.warn('⚠️ getAircraftInfo: Ingen cacheKey (registration eller hex)');
        return null;
    }

    console.log(`🔍 getAircraftInfo: Søger efter aircraft med reg=${registration}, hex=${hex}`);

    // Check cache first
    const cached = aircraftCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log(`✅ Cache hit for ${cacheKey}`);
        return cached.data;
    }

    try {
        // Strategy: Try multiple sources for best coverage
        // 1. Try ADSB.lol with registration
        // 2. Try ADSB.lol with hex
        // 3. Fallback to ADSB.fi with hex

        let adsbData = null;

        // Try ADSB.lol first
        if (registration && registration !== 'N/A') {
            console.log(`🔄 Prøver ADSB.lol med registration: ${registration}`);
            adsbData = await fetchFromADSBLol('reg', registration);
        }

        if (!adsbData && hex) {
            console.log(`🔄 Prøver ADSB.lol med hex: ${hex}`);
            adsbData = await fetchFromADSBLol('hex', hex);
        }

        // Fallback to ADSB.fi if ADSB.lol didn't return data
        if (!adsbData && hex) {
            console.log(`🔄 Fallback til ADSB.fi med hex: ${hex}`);
            adsbData = await fetchFromADSBFi('hex', hex);
        }

        if (adsbData) {
            console.log(`✅ Aircraft data fundet via ${adsbData._source}:`, adsbData);
            const info = {
                hex: hex || adsbData.hex,
                registration: adsbData.r || registration,
                type: adsbData.t || null,
                description: adsbData.desc || null,
                category: adsbData.category || null,
                source: adsbData._source || 'unknown', // Track which API provided the data
                externalLinks: buildExternalLinks(hex || adsbData.hex, adsbData.r || registration)
            };

            // Cache the result
            aircraftCache.set(cacheKey, {
                data: info,
                timestamp: Date.now()
            });

            console.log(`💾 Cached aircraft info for ${cacheKey}:`, info);
            return info;
        }

        // Fallback: return basic info with external links
        console.warn(`⚠️ Ingen aircraft data fundet for ${cacheKey}, returnerer fallback`);
        const fallbackInfo = {
            hex: hex,
            registration: registration,
            type: null,
            description: null,
            externalLinks: buildExternalLinks(hex, registration)
        };

        // Cache even null results to avoid repeated failed lookups
        aircraftCache.set(cacheKey, {
            data: fallbackInfo,
            timestamp: Date.now()
        });

        return fallbackInfo;

    } catch (error) {
        console.warn(`⚠️ Kunne ikke hente info for ${cacheKey}:`, error.message);
        return {
            hex: hex,
            registration: registration,
            type: null,
            externalLinks: buildExternalLinks(hex, registration)
        };
    }
}

/**
 * Fetch aircraft data from ADSB.lol API
 * @param {string} endpoint - 'reg' or 'hex'
 * @param {string} value - Registration or hex code
 * @returns {Promise<Object|null>}
 */
async function fetchFromADSBLol(endpoint, value) {
    try {
        const apiUrl = `${API_CONFIG.adsbLol}/${endpoint}/${value}`;
        const url = API_CONFIG.proxyUrl + encodeURIComponent(apiUrl);

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (!response.ok) {
            console.warn(`⚠️ ADSB.lol API: HTTP ${response.status} for ${endpoint}/${value}`);
            return null;
        }

        const data = await response.json();

        // ADSB.lol returns { "ac": [...], ... }
        if (data.ac && data.ac.length > 0) {
            const aircraft = data.ac[0];
            aircraft._source = 'adsb.lol'; // Tag source
            return aircraft;
        }

        return null;

    } catch (error) {
        console.warn(`⚠️ ADSB.lol fetch fejl for ${endpoint}/${value}:`, error.message);
        return null;
    }
}

/**
 * Fetch aircraft data from ADSB.fi API (backup source)
 * @param {string} endpoint - 'hex' (ADSB.fi primarily uses hex lookups)
 * @param {string} value - Hex code
 * @returns {Promise<Object|null>}
 */
async function fetchFromADSBFi(endpoint, value) {
    try {
        const apiUrl = `${API_CONFIG.adsbFi}/${endpoint}/${value}`;
        const url = API_CONFIG.proxyUrl + encodeURIComponent(apiUrl);

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (!response.ok) {
            console.warn(`⚠️ ADSB.fi API: HTTP ${response.status} for ${endpoint}/${value}`);
            return null;
        }

        const data = await response.json();

        // ADSB.fi returns { "ac": [...], ... } - same format as ADSB.lol
        if (data.ac && data.ac.length > 0) {
            const aircraft = data.ac[0];
            aircraft._source = 'adsb.fi'; // Tag source
            return aircraft;
        }

        return null;

    } catch (error) {
        console.warn(`⚠️ ADSB.fi fetch fejl for ${endpoint}/${value}:`, error.message);
        return null;
    }
}

/**
 * Build external links for aircraft lookups
 * @param {string} hex - ICAO hex code
 * @param {string|null} registration - Aircraft registration if available
 * @returns {Object} - Links object
 */
function buildExternalLinks(hex, registration) {
    const links = {
        flightradar24: registration && registration !== 'N/A'
            ? `https://www.flightradar24.com/data/aircraft/${registration}`
            : hex ? `https://www.flightradar24.com/data/aircraft/${hex}` : null,
        adsbexchange: hex ? `https://globe.adsbexchange.com/?icao=${hex}` : null,
        planespotters: registration && registration !== 'N/A'
            ? `https://www.planespotters.net/search?q=${registration}`
            : hex ? `https://www.planespotters.net/hex/${hex}` : null,
        jetphotos: registration && registration !== 'N/A'
            ? `https://www.jetphotos.com/registration/${registration}`
            : null
    };

    return links;
}

/**
 * Get aircraft type icon based on aircraft type
 * @param {string|null} type - Aircraft type code
 * @returns {string} - Icon emoji or symbol
 */
export function getAircraftTypeIcon(type) {
    if (!type) return '✈️';

    const typeUpper = type.toUpperCase();

    // Helicopter
    if (typeUpper.includes('H60') || typeUpper.includes('UH-') ||
        typeUpper.includes('AH-') || typeUpper.includes('CH-') ||
        typeUpper.includes('HH-') || typeUpper.includes('MH-')) {
        return '🚁';
    }

    // Fighter jets
    if (typeUpper.includes('F-16') || typeUpper.includes('F-35') ||
        typeUpper.includes('F/A-18') || typeUpper.includes('F15') ||
        typeUpper.includes('EUROFIGHTER') || typeUpper.includes('TYPHOON') ||
        typeUpper.includes('GRIPEN') || typeUpper.includes('RAFALE')) {
        return '🛩️';
    }

    // Transport/Cargo
    if (typeUpper.includes('C-130') || typeUpper.includes('C-17') ||
        typeUpper.includes('C-5') || typeUpper.includes('A400M') ||
        typeUpper.includes('HERCULES') || typeUpper.includes('GALAXY')) {
        return '🛫';
    }

    // Tanker
    if (typeUpper.includes('KC-') || typeUpper.includes('TANKER')) {
        return '⛽';
    }

    // Surveillance/Reconnaissance
    if (typeUpper.includes('AWACS') || typeUpper.includes('E-') ||
        typeUpper.includes('RC-') || typeUpper.includes('P-8')) {
        return '📡';
    }

    // Default aircraft
    return '✈️';
}

/**
 * Get detailed aircraft category based on type
 * @param {string|null} type - Aircraft type code
 * @returns {string} - Category name in Danish
 */
export function getAircraftCategory(type) {
    if (!type) return 'Ukendt';

    const typeUpper = type.toUpperCase();

    if (typeUpper.includes('H60') || typeUpper.includes('H-') ||
        typeUpper.includes('HELI') || typeUpper.includes('UH-') ||
        typeUpper.includes('AH-') || typeUpper.includes('CH-')) {
        return 'Helikopter';
    }

    if (typeUpper.includes('F-') || typeUpper.includes('FIGHTER') ||
        typeUpper.includes('EUROFIGHTER') || typeUpper.includes('GRIPEN')) {
        return 'Kampfly';
    }

    if (typeUpper.includes('C-') || typeUpper.includes('TRANSPORT') ||
        typeUpper.includes('CARGO') || typeUpper.includes('A400M')) {
        return 'Transportfly';
    }

    if (typeUpper.includes('KC-') || typeUpper.includes('TANKER')) {
        return 'Tankfly';
    }

    if (typeUpper.includes('AWACS') || typeUpper.includes('E-') ||
        typeUpper.includes('SURVEILLANCE') || typeUpper.includes('P-')) {
        return 'Overvågningsfly';
    }

    if (typeUpper.includes('B-') || typeUpper.includes('BOMBER')) {
        return 'Bombefly';
    }

    return 'Militærfly';
}

/**
 * Clear cache (for testing/debugging)
 */
export function clearAircraftCache() {
    aircraftCache.clear();
    console.log("✅ Aircraft cache ryddet");
}
