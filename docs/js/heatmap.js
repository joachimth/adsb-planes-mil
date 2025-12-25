/**
 * Heatmap Module - MilAir Watch
 * Håndterer heatmap visualization med forskellige modes
 */

console.log("✅ heatmap.js er indlæst.");

let heatmapLayer = null;
let isHeatmapActive = false;
let currentMode = 'density'; // density, altitude, type
let currentAircraftData = [];

/**
 * Initialiserer heatmap funktionalitet
 */
export function initHeatmap(map) {
    console.log("🗺️ Initialiserer heatmap...");

    // Toggle switch
    const toggleHeatmap = document.getElementById('toggleHeatmap');
    const modeSelector = document.getElementById('heatmapModeSelector');
    const legend = document.getElementById('heatmapLegend');

    if (!toggleHeatmap) {
        console.warn("⚠️ Heatmap toggle ikke fundet");
        return;
    }

    // Toggle heatmap on/off
    toggleHeatmap.addEventListener('click', () => {
        isHeatmapActive = !isHeatmapActive;

        if (isHeatmapActive) {
            toggleHeatmap.classList.add('active');
            toggleHeatmap.setAttribute('aria-checked', 'true');
            modeSelector.style.display = 'flex';
            legend.style.display = 'block';
            console.log("🔥 Heatmap aktiveret");
            updateHeatmap(map, currentAircraftData);
        } else {
            toggleHeatmap.classList.remove('active');
            toggleHeatmap.setAttribute('aria-checked', 'false');
            modeSelector.style.display = 'none';
            legend.style.display = 'none';
            console.log("🗺️ Heatmap deaktiveret");
            clearHeatmap(map);
        }
    });

    // Mode buttons
    const modeButtons = document.querySelectorAll('.heatmap-mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;

            // Update active button
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update mode and regenerate heatmap
            currentMode = mode;
            console.log(`🔄 Heatmap mode ændret til: ${mode}`);

            if (isHeatmapActive) {
                updateHeatmap(map, currentAircraftData);
            }
        });
    });

    console.log("✅ Heatmap initialiseret");
}

/**
 * Opdaterer heatmap med ny aircraft data
 */
export function updateHeatmapData(map, aircraftData) {
    currentAircraftData = aircraftData;

    if (isHeatmapActive) {
        updateHeatmap(map, aircraftData);
    }
}

/**
 * Generer og vis heatmap baseret på mode
 */
function updateHeatmap(map, aircraftData) {
    // Clear existing heatmap
    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
        heatmapLayer = null;
    }

    if (!aircraftData || aircraftData.length === 0) {
        console.warn("⚠️ Ingen aircraft data til heatmap");
        return;
    }

    let heatmapData = [];
    let legendTitle = '';

    switch (currentMode) {
        case 'density':
            heatmapData = generateDensityHeatmap(aircraftData);
            legendTitle = 'Densitet';
            break;
        case 'altitude':
            heatmapData = generateAltitudeHeatmap(aircraftData);
            legendTitle = 'Højde';
            break;
        case 'type':
            heatmapData = generateTypeHeatmap(aircraftData);
            legendTitle = 'Flytype';
            break;
    }

    // Update legend
    updateLegend(legendTitle, heatmapData);

    // Create heatmap layer
    if (heatmapData.length > 0) {
        heatmapLayer = L.heatLayer(heatmapData, {
            radius: 25,
            blur: 35,
            maxZoom: 10,
            max: 1.0,
            gradient: {
                0.0: 'blue',
                0.25: 'cyan',
                0.5: 'lime',
                0.75: 'yellow',
                1.0: 'red'
            }
        }).addTo(map);

        console.log(`✅ Heatmap genereret med ${heatmapData.length} datapunkter (${currentMode})`);
    }
}

/**
 * Generer density heatmap (antal fly per område)
 */
function generateDensityHeatmap(aircraftData) {
    const heatmapData = [];

    aircraftData.forEach(aircraft => {
        if (aircraft.lat && aircraft.lon) {
            // Simple density: each aircraft is one point with intensity 1
            heatmapData.push([aircraft.lat, aircraft.lon, 1.0]);
        }
    });

    return heatmapData;
}

/**
 * Generer altitude heatmap (højde-fordeling)
 */
function generateAltitudeHeatmap(aircraftData) {
    const heatmapData = [];

    // Find max altitude for normalization
    let maxAltitude = 0;
    aircraftData.forEach(aircraft => {
        if (aircraft.alt_baro && aircraft.alt_baro !== 'ground') {
            maxAltitude = Math.max(maxAltitude, aircraft.alt_baro);
        }
    });

    aircraftData.forEach(aircraft => {
        if (aircraft.lat && aircraft.lon) {
            let intensity = 0;

            if (aircraft.alt_baro === 'ground') {
                intensity = 0.1;
            } else if (aircraft.alt_baro) {
                // Normalize altitude to 0-1 range
                intensity = aircraft.alt_baro / maxAltitude;
            } else {
                intensity = 0.5; // Unknown altitude
            }

            heatmapData.push([aircraft.lat, aircraft.lon, intensity]);
        }
    });

    return heatmapData;
}

/**
 * Generer aircraft type heatmap
 */
function generateTypeHeatmap(aircraftData) {
    const heatmapData = [];

    // Type mapping to intensity (0-1)
    const typeIntensity = {
        'military': 1.0,    // Red (highest)
        'emergency': 0.9,   // Yellow-red
        'special': 0.6,     // Yellow
        'civilian': 0.3     // Green-cyan (lowest)
    };

    aircraftData.forEach(aircraft => {
        if (aircraft.lat && aircraft.lon) {
            // Get category (need to import determineAircraftCategory)
            // For now, use a simple check
            const category = getAircraftCategory(aircraft);
            const intensity = typeIntensity[category] || 0.5;

            heatmapData.push([aircraft.lat, aircraft.lon, intensity]);
        }
    });

    return heatmapData;
}

/**
 * Enkel kategori bestemmelse (duplicate af mobile-ui.js)
 */
function getAircraftCategory(aircraft) {
    const squawk = aircraft.squawk;

    // Emergency
    if (['7500', '7600', '7700'].includes(squawk)) {
        return 'emergency';
    }

    // Military ranges (simplified)
    const squawkNum = parseInt(squawk, 10);
    if (!isNaN(squawkNum)) {
        if ((squawkNum >= 4400 && squawkNum <= 4477) ||
            (squawkNum >= 7401 && squawkNum <= 7477) ||
            squawkNum === 4000 || squawkNum === 7777) {
            return 'military';
        }
    }

    // Special
    const specialSquawks = ['7000', '1200', '0020', '0021', '0030', '0033'];
    if (specialSquawks.includes(squawk)) {
        return 'special';
    }

    return 'civilian';
}

/**
 * Opdater legend baseret på mode
 */
function updateLegend(title, heatmapData) {
    document.getElementById('heatmapLegendTitle').textContent = title;

    // Calculate max value
    let maxValue = 0;
    heatmapData.forEach(point => {
        maxValue = Math.max(maxValue, point[2] || 0);
    });

    const maxLabel = document.getElementById('heatmapLegendMax');

    switch (currentMode) {
        case 'density':
            maxLabel.textContent = `${heatmapData.length} fly`;
            break;
        case 'altitude':
            maxLabel.textContent = `${Math.round(maxValue * 45000)} ft`;
            break;
        case 'type':
            maxLabel.textContent = 'Militær';
            break;
    }
}

/**
 * Ryd heatmap
 */
function clearHeatmap(map) {
    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
        heatmapLayer = null;
    }
}

/**
 * Get current heatmap state
 */
export function isHeatmapEnabled() {
    return isHeatmapActive;
}
