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

    // Set initial active mode button (density is default)
    const modeButtons = document.querySelectorAll('.heatmap-mode-btn');
    modeButtons.forEach(btn => {
        btn.style.cssText = ''; // Clear inline styles first
        if (btn.dataset.mode === currentMode) {
            btn.classList.add('active');

            // Apply inline styles for visibility
            btn.style.background = 'rgba(255, 100, 50, 0.4)';
            btn.style.border = '3px solid #ff6432';
            btn.style.borderColor = '#ff6432';
            btn.style.color = '#ff6432';
            btn.style.boxShadow = '0 0 12px #ff6432, 0 0 0 3px #ff6432';
            btn.style.fontWeight = '700';
        }
    });

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
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;

            // Update active button
            modeButtons.forEach(b => {
                b.classList.remove('active');
                b.style.cssText = ''; // Clear inline styles
            });
            btn.classList.add('active');

            // Apply inline styles
            btn.style.background = 'rgba(255, 100, 50, 0.4)';
            btn.style.border = '3px solid #ff6432';
            btn.style.borderColor = '#ff6432';
            btn.style.color = '#ff6432';
            btn.style.boxShadow = '0 0 12px #ff6432, 0 0 0 3px #ff6432';
            btn.style.fontWeight = '700';

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
    try {
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
            // Check if L.heatLayer exists
            if (typeof L.heatLayer !== 'function') {
                console.error("❌ Leaflet.heat plugin ikke indlæst!");
                return;
            }

            heatmapLayer = L.heatLayer(heatmapData, {
                radius: 50,           // Meget større radius for MAX synlighed
                blur: 40,             // Større blur for bedre blend
                maxZoom: 18,          // Vis heatmap ved alle zoom levels
                max: 1.0,
                minOpacity: 0.7,      // Høj minimum opacity
                gradient: {
                    0.0: 'rgba(0, 0, 255, 1.0)',      // Fuldt blå
                    0.25: 'rgba(0, 255, 255, 1.0)',   // Fuldt cyan
                    0.5: 'rgba(0, 255, 0, 1.0)',      // Fuldt grøn
                    0.75: 'rgba(255, 255, 0, 1.0)',   // Fuldt gul
                    1.0: 'rgba(255, 0, 0, 1.0)'       // Fuldt rød
                }
            }).addTo(map);

            // Sæt z-index så heatmap er under markers men over tiles
            if (heatmapLayer._container) {
                heatmapLayer._container.style.zIndex = 400;
            }

            console.log(`✅ Heatmap genereret med ${heatmapData.length} datapunkter (${currentMode})`);
            console.log(`🎨 Heatmap tilføjet til kort med opacity ${heatmapLayer.options.minOpacity}`);
        }
    } catch (error) {
        console.error("❌ Fejl ved opdatering af heatmap:", error);
        console.error("Error details:", error.message, error.stack);
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

    try {
        aircraftData.forEach(aircraft => {
            if (aircraft && aircraft.lat && aircraft.lon) {
                // Get category
                const category = getAircraftCategory(aircraft);
                const intensity = typeIntensity[category] || 0.5;

                heatmapData.push([aircraft.lat, aircraft.lon, intensity]);
            }
        });
    } catch (error) {
        console.error("❌ Fejl i generateTypeHeatmap:", error);
    }

    return heatmapData;
}

/**
 * Enkel kategori bestemmelse (duplicate af mobile-ui.js)
 */
function getAircraftCategory(aircraft) {
    try {
        if (!aircraft || !aircraft.squawk) {
            return 'civilian';
        }

        const squawk = aircraft.squawk;

        // Emergency (highest priority)
        if (['7500', '7600', '7700'].includes(squawk)) {
            return 'emergency';
        }

        // Special squawk codes
        const specialSquawks = ['7000', '1200', '0020', '0021', '0022', '0023', '0024', '0025',
                               '0030', '0031', '0032', '0033', '0100', '1255', '1277', '7400'];
        if (specialSquawks.includes(squawk)) {
            return 'special';
        }

        // Special squawk ranges (civilian special missions)
        const squawkNum = parseInt(squawk, 10);
        if (!isNaN(squawkNum)) {
            // Special ranges first
            if ((squawkNum >= 3000 && squawkNum <= 3777) ||
                (squawkNum >= 5000 && squawkNum <= 5377)) {
                return 'special';
            }

            // Military ranges
            if ((squawkNum >= 4400 && squawkNum <= 4477) ||
                (squawkNum >= 7401 && squawkNum <= 7477) ||
                (squawkNum >= 7610 && squawkNum <= 7676) ||
                squawkNum === 4000 || squawkNum === 7777 || squawkNum === 4575) {
                return 'military';
            }
        }

        return 'civilian';
    } catch (error) {
        console.error("❌ Fejl i getAircraftCategory:", error);
        return 'civilian';
    }
}

/**
 * Opdater legend baseret på mode
 */
function updateLegend(title, heatmapData) {
    try {
        const titleElement = document.getElementById('heatmapLegendTitle');
        const maxLabel = document.getElementById('heatmapLegendMax');

        if (!titleElement || !maxLabel) {
            console.warn("⚠️ Heatmap legend elementer ikke fundet");
            return;
        }

        titleElement.textContent = title;

        // Calculate max value
        let maxValue = 0;
        heatmapData.forEach(point => {
            maxValue = Math.max(maxValue, point[2] || 0);
        });

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
    } catch (error) {
        console.error("❌ Fejl ved opdatering af legend:", error);
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
