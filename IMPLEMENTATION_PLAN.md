# 🎯 MilAir Watch - Implementeringsplan

## Oversigt

Denne plan dækker implementering af features til MilAir Watch:

**✅ IMPLEMENTERET (v2.0):**
1. ✅ **Fix af aircraft info** - Dual API strategi (ADSB.lol + ADSB.fi)
2. ✅ **Region filtrering** - 5 geografiske regioner med bounding boxes
3. ✅ **Vis alle fly** - Inkl. civile fly via region-based API
4. ✅ **Heatmap visualisering** - 3 modes (density, altitude, type)

**⏳ NÆSTE:**
5. **Historiske data integration** (adsblol/globe_history_2025)

**Design Filosofi:**
- Mobile-first approach bevares
- Dark radar theme fortsætter
- Bottom sheet UI pattern genbruges
- Touch-optimized controls
- Progressiv enhancement (features tilføjes gradvist)

---

## 📋 FASE 0: Debug & Fix Aircraft Info ✅ FÆRDIG

### Status
✅ **IMPLEMENTERET OG VERIFICERET**

### Implementation
- ✅ `aircraft-info.js` modul (299 linjer)
- ✅ Dual API strategi: ADSB.lol primary, ADSB.fi fallback
- ✅ 24-timers cache for at minimere API calls
- ✅ Extensive logging til debugging
- ✅ Fallback til basic info hvis API fejler
- ✅ Integration i `mobile-ui.js` bottom sheet
- ✅ Viser type, beskrivelse, eksterne links

### Løsning
- API struktur verificeret: `aircraft.hex` felt eksisterer
- Lookup strategi: registration → hex (ADSB.lol) → hex (ADSB.fi)
- Caching reducerer gentagne opslag
- Graceful degradation hvis data ikke findes

---

## 📋 FASE 1: Region Filtrering ✅ FÆRDIG

### Status
✅ **IMPLEMENTERET OG DEPLOYED**

### Implementation
- ✅ `js/regions.js` modul (190 linjer)
- ✅ 5 geografiske regioner defineret:
  - 🇩🇰 Danmark (zoom 6, bbox med 100km buffer)
  - 🌍 Nordeuropa (default, zoom 4, 200km buffer)
  - 🌍 Europa (zoom 4, 250km buffer)
  - 🌊 Nordatlanten (zoom 3, 300km buffer)
  - 🌐 Global (ingen geografisk filtrering)
- ✅ Region selector i hamburger menu
- ✅ Bounding box filtering med buffer zones
- ✅ localStorage persistence
- ✅ Auto-zoom til region ved ændring
- ✅ Haversine distance calculation for præcis filtrering

### Features

#### 1.1 Geografiske Regioner
Predefinerede regioner:
- 🇩🇰 **Danmark** (center: 56.0, 10.0, zoom: 7, bbox: [8.0, 54.5, 15.2, 58.0])
- 🌍 **Nordeuropa** (center: 60.0, 15.0, zoom: 4, bbox: [-10.0, 50.0, 40.0, 70.0])
- 🌍 **Europa** (center: 50.0, 10.0, zoom: 4, bbox: [-15.0, 35.0, 40.0, 70.0])
- 🌍 **Nordatlanten** (center: 55.0, -30.0, zoom: 3, bbox: [-60.0, 40.0, 0.0, 70.0])
- 🌐 **Global** (center: 40.0, 0.0, zoom: 2, bbox: null)

#### 1.2 UI Design (Mobile-First)

**Hamburger Menu Udvidelse:**
```
☰ Menu
  ├── 🌍 Regioner
  │   ├── ○ 🇩🇰 Danmark
  │   ├── ● 🌍 Nordeuropa (selected)
  │   ├── ○ 🌍 Europa
  │   ├── ○ 🌍 Nordatlanten
  │   └── ○ 🌐 Global (Alle)
  ├── ⚙️ Indstillinger
  └── 📖 Om
```

**Bounding Box Visning:**
- Vis semi-transparent rektangel på kortet der viser aktiv region
- Fade out markers udenfor region (opacity: 0.3)
- Option: Skjul fly udenfor region helt (toggle i menu)

#### 1.3 Implementering

**Ny Fil: `js/regions.js`** (~150 linjer)
```javascript
export const REGIONS = {
    denmark: {
        name: '🇩🇰 Danmark',
        center: [56.0, 10.0],
        zoom: 7,
        bbox: [8.0, 54.5, 15.2, 58.0], // [west, south, east, north]
        buffer: 100 // km buffer zone
    },
    nordic: {
        name: '🌍 Nordeuropa',
        center: [60.0, 15.0],
        zoom: 4,
        bbox: [-10.0, 50.0, 40.0, 70.0],
        buffer: 200
    },
    // ... other regions
};

export function isAircraftInRegion(aircraft, regionKey) {
    // Check if aircraft lat/lon is within bbox + buffer
}

export function applyRegionFilter(aircraftList, regionKey) {
    // Filter aircraft by region
}
```

**Opdater `mobile-ui.js`:**
- Tilføj region selector i hamburger menu
- Implementer region change handler
- Vis aktiv region badge i header

**Opdater `main-mobile.js`:**
- Tilføj region filter til applyFilters()
- Gem valgt region i localStorage
- Auto-zoom til region ved ændring

**Opdater `map_section_mobile.js`:**
- Tilføj bounding box visualisering (Leaflet Rectangle)
- Implementer marker opacity baseret på region
- Auto-fit bounds når region ændres

#### 1.4 Tekniske Detaljer

**Bounding Box Check:**
```javascript
function isInBoundingBox(lat, lon, bbox) {
    const [west, south, east, north] = bbox;
    return lon >= west && lon <= east && lat >= south && lat <= north;
}

// Med buffer zone (Haversine distance)
function isInRegionWithBuffer(lat, lon, region) {
    if (isInBoundingBox(lat, lon, region.bbox)) return true;
    // Check if within buffer km of bbox edges
    return calculateDistanceToBbox(lat, lon, region.bbox) <= region.buffer;
}
```

**localStorage Persistence:**
```javascript
// Save preference
localStorage.setItem('milair_region', 'denmark');

// Load on startup
const savedRegion = localStorage.getItem('milair_region') || 'nordic';
```

#### 1.5 Testing Checklist
- [ ] Kan vælge region fra menu
- [ ] Kort zoomer til valgt region
- [ ] Fly udenfor region dimmes/skjules
- [ ] Bounding box vises korrekt
- [ ] Region huskes efter reload
- [ ] Fungerer på mobile og desktop

### Prompt til Fase 1
```
Implementer geografisk region filtrering til MilAir Watch med følgende krav:

1. Opret js/regions.js med regioner: Danmark, Nordeuropa, Europa, Nordatlanten, Global
2. Tilføj region selector i hamburger menu med radio buttons
3. Implementer bounding box visning på kort (semi-transparent rectangle)
4. Filtrer fly baseret på valgt region (med 100-200km buffer zone)
5. Gem region valg i localStorage
6. Auto-zoom til region ved ændring

Design skal følge eksisterende mobile-first dark radar theme. Se IMPLEMENTATION_PLAN.md FASE 1 for detaljer.
```

---

## 📋 FASE 2: Vis Alle Fly (Civilian Aircraft) ✅ FÆRDIG

### Status
✅ **IMPLEMENTERET OG DEPLOYED**

### Implementation
- ✅ "Alle Fly" toggle button i filter bar (`#filterAllAircraft`)
- ✅ Dual API strategi implementeret i `main-mobile.js`:
  - Militær-only: `https://api.adsb.lol/v2/mil`
  - Alle fly: `https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{distance}`
- ✅ Grid-based fetching for store områder (>250 NM radius)
  - Opdeler store regioner i 250 NM celler
  - Henter data i parallel batches (max 5 concurrent)
  - Deduplicering baseret på hex identifier
- ✅ Performance safeguards:
  - Max 500 fly display limit
  - Deaktiveret på Global region (for mange fly)
- ✅ Aircraft categorization opdateret:
  - Emergency (rød)
  - Military (grøn)
  - Special (gul)
  - Civilian (blå)
- ✅ Filter logik: Civile fly kun vist når "Alle" er aktivt

### Tekniske Detaljer
- `calculateRadiusFromBbox()`: Beregner radius fra bounding box
- `generateGridPoints()`: Opdeler store områder i grid
- `fetchFromPoint()`: Henter data fra enkelt punkt
- Batch processing med Promise.allSettled for resiliens

#### 2.2 UI Design

**Bottom Filter Bar Udvidelse:**
```
Før:
[🎖️ Militær] [🚨 Nød] [⭐ Special] [📋 Liste]

Efter:
[🎖️ Militær] [🚨 Nød] [⭐ Special] [✈️ Alle] [📋 Liste]
```

**"Alle Fly" Button:**
- Toggle on/off
- Badge count: Total antal fly i region
- Når aktiveret: Skift API endpoint til region-baseret
- Grå/inaktiv når Global region er valgt (for mange fly)

#### 2.3 Kategorisering

**Opdater `determineAircraftCategory()`:**
```javascript
function determineAircraftCategory(aircraft) {
    // Priority order:
    1. Emergency (7500, 7600, 7700) → 'emergency'
    2. Special squawks (7000, 1200, etc.) → 'special'
    3. Military squawk ranges (4400-4477, etc.) → 'military'
    4. Commercial (fra civilian endpoint) → 'civilian'
    5. General Aviation → 'civilian'
}
```

**Marker Colors:**
- 🟢 Grøn = Militær (uændret)
- 🔴 Rød = Emergency (uændret)
- 🟡 Gul = Special (uændret)
- 🔵 Blå = Civil (nuværende, men nu med data)
- ⚪ Hvid = General Aviation (ny)

#### 2.4 Implementering

**Opdater `main-mobile.js`:**
```javascript
const API_CONFIG = {
    proxyUrl: 'https://corsproxy.io/?url=',
    militaryUrl: 'https://api.adsb.lol/v2/mil',
    allAircraftUrl: 'https://api.adsb.lol/v2/all',
    regionUrl: 'https://api.adsb.lol/v2/point', // + /{lat}/{lon}/{radius}
    updateInterval: 30000
};

async function fetchAircraftData() {
    let apiUrl;

    if (filterState.showAllAircraft && currentRegion !== 'global') {
        // Region-based endpoint for all aircraft
        const { lat, lon } = REGIONS[currentRegion].center;
        const radiusNM = calculateRadiusFromBbox(REGIONS[currentRegion].bbox);
        apiUrl = `${API_CONFIG.regionUrl}/${lat}/${lon}/${radiusNM}`;
    } else {
        // Military only
        apiUrl = API_CONFIG.militaryUrl;
    }

    // ... fetch logic
}
```

**Opdater `filter-bar.js`:**
```javascript
const filterState = {
    military: true,
    emergency: true,
    special: true,
    showAllAircraft: false, // NY
    listViewActive: false
};

// Tilføj "Alle Fly" button handler
```

**Opdater `map_section_mobile.js`:**
```javascript
const civilianIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    // ... existing config
});

const gaIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-white.png',
    // ... new icon for General Aviation
});
```

#### 2.5 Performance Overvejelser

**Problem:** 10,000+ fly kan crashe browseren.

**Løsninger:**
1. **Region Lock:** Deaktiver "Alle Fly" når Global region er valgt
2. **Marker Clustering:** Brug Leaflet.markercluster plugin
3. **Virtualisering:** I listevisning, kun render synlige cards
4. **Pagination:** Vis max 500 fly ad gangen, med "Vis flere" knap

**Anbefalet Tilgang:**
```javascript
const MAX_AIRCRAFT = 500;

if (state.allAircraft.length > MAX_AIRCRAFT) {
    console.warn(`⚠️ ${state.allAircraft.length} fly fundet. Viser kun ${MAX_AIRCRAFT}`);
    state.allAircraft = state.allAircraft.slice(0, MAX_AIRCRAFT);
    showWarningBanner(`Viser ${MAX_AIRCRAFT} af ${originalCount} fly. Zoom ind for flere detaljer.`);
}
```

#### 2.6 Testing Checklist
- [ ] "Alle Fly" button vises i filter bar
- [ ] Toggle skifter mellem /v2/mil og region endpoint
- [ ] Civile fly vises med korrekt farve
- [ ] Performance OK med 500+ fly
- [ ] Fungerer sammen med region filter
- [ ] Warning vises hvis for mange fly

### Prompt til Fase 2
```
Tilføj "Vis Alle Fly" funktionalitet til MilAir Watch:

1. Udvid filter bar med "Alle Fly" toggle button
2. Implementer dual API strategy: /v2/mil (military) vs. region-based endpoint (all aircraft)
3. Tilføj support for civilian aircraft kategori med blå/hvid markers
4. Implementer performance safeguards (max 500 fly)
5. Deaktiver "Alle Fly" når Global region er valgt
6. Opdater categorization logic til at håndtere civile fly

Brug region-based endpoint: api.adsb.lol/v2/point/{lat}/{lon}/{radius_nm}
Se IMPLEMENTATION_PLAN.md FASE 2 for API detaljer.
```

---

## 📋 FASE 3: Heatmap Visualisering ✅ FÆRDIG

### Status
✅ **IMPLEMENTERET OG DEPLOYED**

### Implementation
- ✅ `js/heatmap.js` modul (280 linjer)
- ✅ Leaflet.heat plugin integration
- ✅ 3 visualiserings modes:
  - **Density**: Flykoncentration (gul → orange → rød gradient)
  - **Altitude**: Flyvehøjde (blå → cyan → gul → rød gradient)
  - **Type**: Kategori-baseret (grøn/rød/gul/blå per type)
- ✅ Toggle switch i UI (`#toggleHeatmap`)
- ✅ Mode selector buttons (density/altitude/type)
- ✅ Dynamic legend display (`#heatmapLegend`)
- ✅ Auto-scaling baseret på antal fly
- ✅ Custom intensity og radius per mode
- ✅ Pæn UI styling med active state highlighting

### Tekniske Detaljer
- `initHeatmap()`: Initialiserer heatmap lag og controls
- `updateHeatmap()`: Opdaterer heatmap baseret på mode
- `generateDensityHeatmap()`: Tæthedsvisualisering
- `generateAltitudeHeatmap()`: Højdevisualisering (normaliseret 0-50000 ft)
- `generateTypeHeatmap()`: Type-baseret visualisering
- `clearHeatmap()`: Fjerner heatmap lag fra kort

#### 3.2 UI Design

**Hamburger Menu > Heatmap Indstillinger:**
```
☰ Menu
  ├── 🔥 Heatmap
  │   ├── ○ Fra (default)
  │   ├── ○ Tæthed
  │   ├── ○ Flytype
  │   └── ○ Højde
  ├── 🌍 Regioner
  └── ...
```

**Map Layer Toggle:**
- Ny knap i bottom-right corner: `[🔥]`
- Cycle gennem: Fra → Tæthed → Flytype → Højde → Fra
- Badge viser aktiv heatmap type

**Legend:**
- Small legend box i top-right når heatmap aktiv
- Vis farve gradient med labels

#### 3.3 Implementering

**Leaflet Heatmap Plugin:**
```bash
# Tilføj til index-mobile.html:
<script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
```

**Ny Fil: `js/heatmap.js`** (~250 linjer)
```javascript
import L from 'leaflet';

let heatmapLayer = null;

export function initHeatmap(map) {
    // Initialize heatmap layer
}

export function updateDensityHeatmap(aircraft, map) {
    const heatData = aircraft
        .filter(a => a.lat && a.lon)
        .map(a => [a.lat, a.lon, 1]); // [lat, lon, intensity]

    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
    }

    heatmapLayer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        gradient: {
            0.0: 'blue',
            0.5: 'lime',
            0.7: 'yellow',
            1.0: 'red'
        }
    }).addTo(map);
}

export function updateTypeHeatmap(aircraft, map) {
    // Group by aircraft type
    const typeGroups = groupByType(aircraft);

    // Create colored markers based on dominant type in area
    // Could use Leaflet.markercluster with custom icons
}

export function updateAltitudeHeatmap(aircraft, map) {
    const heatData = aircraft
        .filter(a => a.lat && a.lon && a.alt_baro !== 'ground')
        .map(a => {
            const intensity = normalizeAltitude(a.alt_baro); // 0-1 scale
            return [a.lat, a.lon, intensity];
        });

    heatmapLayer = L.heatLayer(heatData, {
        radius: 30,
        blur: 20,
        gradient: {
            0.0: 'purple',
            0.2: 'blue',
            0.4: 'cyan',
            0.6: 'lime',
            0.8: 'yellow',
            1.0: 'red'
        }
    }).addTo(map);
}

export function clearHeatmap(map) {
    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
        heatmapLayer = null;
    }
}

function normalizeAltitude(altitude) {
    // Normalize 0-50,000 ft to 0-1 scale
    const maxAlt = 50000;
    return Math.min(altitude / maxAlt, 1.0);
}
```

**Opdater `main-mobile.js`:**
```javascript
import { updateDensityHeatmap, updateTypeHeatmap, updateAltitudeHeatmap, clearHeatmap } from './heatmap.js';

// State
const state = {
    // ... existing
    heatmapMode: 'off', // 'off' | 'density' | 'type' | 'altitude'
};

function applyFiltersAndUpdateUI() {
    // ... existing filtering

    // Update heatmap if active
    if (state.heatmapMode !== 'off') {
        updateHeatmap(state.filteredAircraft);
    }
}

function updateHeatmap(aircraft) {
    switch (state.heatmapMode) {
        case 'density':
            updateDensityHeatmap(aircraft, map);
            break;
        case 'type':
            updateTypeHeatmap(aircraft, map);
            break;
        case 'altitude':
            updateAltitudeHeatmap(aircraft, map);
            break;
        default:
            clearHeatmap(map);
    }
}
```

**Opdater `mobile-ui.js` (Hamburger Menu):**
```javascript
// Add heatmap controls to menu
function buildHamburgerMenu() {
    // ... existing menu items

    const heatmapSection = `
        <div class="menu-section">
            <h3>🔥 Heatmap</h3>
            <label>
                <input type="radio" name="heatmap" value="off" checked>
                Fra
            </label>
            <label>
                <input type="radio" name="heatmap" value="density">
                Tæthed
            </label>
            <label>
                <input type="radio" name="heatmap" value="type">
                Flytype
            </label>
            <label>
                <input type="radio" name="heatmap" value="altitude">
                Højde
            </label>
        </div>
    `;
}

// Event handler
document.querySelectorAll('input[name="heatmap"]').forEach(input => {
    input.addEventListener('change', (e) => {
        state.heatmapMode = e.target.value;
        updateHeatmap(state.filteredAircraft);
    });
});
```

**Legend Component:**
```javascript
function showHeatmapLegend(mode) {
    const legendEl = document.getElementById('heatmapLegend');

    const legends = {
        density: `
            <div class="heatmap-legend">
                <h4>Tæthed</h4>
                <div class="gradient-bar density"></div>
                <div class="labels">
                    <span>Få</span>
                    <span>Mange</span>
                </div>
            </div>
        `,
        altitude: `
            <div class="heatmap-legend">
                <h4>Højde</h4>
                <div class="gradient-bar altitude"></div>
                <div class="labels">
                    <span>Lav</span>
                    <span>Høj (50k ft)</span>
                </div>
            </div>
        `,
        // ... etc
    };

    legendEl.innerHTML = legends[mode] || '';
    legendEl.style.display = mode === 'off' ? 'none' : 'block';
}
```

#### 3.4 CSS Styling

**style-mobile.css:**
```css
/* Heatmap Legend */
.heatmap-legend {
    position: absolute;
    top: 80px;
    right: 20px;
    background: rgba(10, 14, 26, 0.95);
    border: 2px solid var(--accent-primary);
    border-radius: 12px;
    padding: 15px;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0, 212, 255, 0.3);
}

.gradient-bar {
    width: 200px;
    height: 20px;
    border-radius: 4px;
    margin: 10px 0;
}

.gradient-bar.density {
    background: linear-gradient(to right,
        blue 0%,
        lime 50%,
        yellow 70%,
        red 100%
    );
}

.gradient-bar.altitude {
    background: linear-gradient(to right,
        purple 0%,
        blue 20%,
        cyan 40%,
        lime 60%,
        yellow 80%,
        red 100%
    );
}

.heatmap-legend .labels {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-secondary);
}

/* Heatmap Toggle Button */
.heatmap-toggle {
    position: absolute;
    bottom: 120px;
    right: 20px;
    width: 44px;
    height: 44px;
    background: var(--bg-secondary);
    border: 2px solid var(--accent-primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 1000;
    font-size: 20px;
}

.heatmap-toggle.active {
    background: var(--accent-primary);
    color: var(--bg-primary);
}
```

#### 3.5 Advanced: Flytype Clustering

For flytype heatmap, brug **Leaflet.markercluster**:

```html
<!-- Add to index-mobile.html -->
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css">
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css">
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
```

```javascript
export function updateTypeHeatmap(aircraft, map) {
    // Group by type
    const military = aircraft.filter(a => determineAircraftCategory(a) === 'military');
    const civilian = aircraft.filter(a => determineAircraftCategory(a) === 'civilian');

    // Create cluster groups with custom icons
    const militaryCluster = L.markerClusterGroup({
        iconCreateFunction: (cluster) => {
            return L.divIcon({
                html: `<div class="cluster-icon military">${cluster.getChildCount()}</div>`,
                className: 'custom-cluster-icon',
                iconSize: L.point(40, 40)
            });
        }
    });

    const civilianCluster = L.markerClusterGroup({
        iconCreateFunction: (cluster) => {
            return L.divIcon({
                html: `<div class="cluster-icon civilian">${cluster.getChildCount()}</div>`,
                className: 'custom-cluster-icon',
                iconSize: L.point(40, 40)
            });
        }
    });

    // Add markers to clusters
    military.forEach(a => {
        if (a.lat && a.lon) {
            militaryCluster.addLayer(L.marker([a.lat, a.lon]));
        }
    });

    civilian.forEach(a => {
        if (a.lat && a.lon) {
            civilianCluster.addLayer(L.marker([a.lat, a.lon]));
        }
    });

    map.addLayer(militaryCluster);
    map.addLayer(civilianCluster);
}
```

#### 3.6 Testing Checklist
- [ ] Density heatmap vises korrekt
- [ ] Altitude heatmap bruger farver rigtigt
- [ ] Type heatmap viser clusters
- [ ] Legend vises og opdateres
- [ ] Toggle button fungerer
- [ ] Heatmap opdateres ved filter ændring
- [ ] Performance OK med 500+ fly

### Prompt til Fase 3
```
Implementer heatmap visualisering til MilAir Watch:

1. Tilføj Leaflet.heat plugin til index-mobile.html
2. Opret js/heatmap.js med tre heatmap modes: density, type, altitude
3. Tilføj heatmap controls til hamburger menu (radio buttons)
4. Implementer toggle button i bottom-right (🔥 icon)
5. Vis legend i top-right når heatmap er aktiv
6. Opdater heatmap ved filter/region ændringer

Density: Blå→Grøn→Gul→Rød gradient
Altitude: Lilla→Blå→Cyan→Lime→Gul→Rød gradient

Se IMPLEMENTATION_PLAN.md FASE 3 for detaljeret implementering.
```

---

## 📋 FASE 4: Historiske Data Integration

### Mål
Integrere historiske flydata fra `adsblol/globe_history_2025` til:
1. Vise historiske flight paths (ruter)
2. Lave heatmaps over tid
3. Sammenligne mønstre dag-til-dag

### Datasæt

**Repository:** https://github.com/adsblol/globe_history_2025

**Struktur:**
```
globe_history_2025/
├── 2025/
│   ├── 01/
│   │   ├── 01/
│   │   │   ├── traces/
│   │   │   │   ├── hex1.json
│   │   │   │   ├── hex2.json
│   │   │   │   └── ...
│   │   │   └── history_0.json, history_1.json, ...
│   │   ├── 02/
│   │   └── ...
│   └── ...
```

**Trace Format:**
```json
{
  "icao": "abc123",
  "r": "N12345",
  "t": "B738",
  "trace": [
    [timestamp, lat, lon, altitude, speed, heading],
    [timestamp, lat, lon, altitude, speed, heading],
    ...
  ]
}
```

### Udfordringer

1. **Data Størrelse:** Traces kan være store (MB per fly)
2. **CORS:** GitHub raw content kan have CORS restrictions
3. **Performance:** Tegne tusindvis af punkter på kort
4. **Storage:** Browser kan ikke cache GB data

### Løsninger

#### 4.1 Architecture

**Backend Proxy (Anbefalet):**
- Opsæt simpel Node.js/Python server til at proxy historiske data
- Cache populære traces
- Compress JSON før sending (gzip)
- Alternativ: Brug GitHub Actions til at bygge optimeret API

**Pure Client-Side (Simpel Start):**
- Hent traces direkte fra GitHub raw URLs
- Cache i IndexedDB (5MB-50MB limit)
- Lazy loading: kun hent når bruger søger

#### 4.2 UI Design

**Ny Tab: "Historik"**

**Bottom Navigation Udvidelse:**
```
Før:
[🎖️ Militær] [🚨 Nød] [⭐ Special] [✈️ Alle] [📋 Liste]

Efter:
[🎖️ Militær] [🚨 Nød] [⭐ Special] [📋 Liste] [⏱️ Historik]
```

**Historik View:**
```
┌─────────────────────────────────────┐
│ 📅 Vælg Dato                        │
│ [  2025-01-15  ]  ◄─────►          │
│                                     │
│ 🔍 Søg Aircraft                     │
│ [  N12345 eller hex  ]             │
│                                     │
│ [🔎 Find Rute]                     │
│                                     │
│ ─── eller ───                       │
│                                     │
│ 📊 Heatmap over tid                 │
│ Start: [2025-01-01]                 │
│ Slut:  [2025-01-07]                 │
│                                     │
│ Type: ○ Tæthed  ○ Højde            │
│                                     │
│ [📈 Generer Heatmap]               │
└─────────────────────────────────────┘
```

**Playback Controls (når rute vises):**
```
┌─────────────────────────────────────┐
│ ✈️ N12345 - 2025-01-15             │
│                                     │
│ ▶️ │◀ ●─────────────○────── ▶│    │
│    0:00          12:45      24:00  │
│                                     │
│ Speed: [1x] [2x] [5x] [10x]        │
└─────────────────────────────────────┘
```

#### 4.3 Implementering

**Ny Fil: `js/history.js`** (~400 linjer)

```javascript
const HISTORY_BASE_URL = 'https://raw.githubusercontent.com/adsblol/globe_history_2025/main';

/**
 * Fetch trace for specific aircraft on specific date
 */
export async function fetchAircraftTrace(hex, date) {
    // date format: "2025-01-15"
    const [year, month, day] = date.split('-');
    const url = `${HISTORY_BASE_URL}/${year}/${month}/${day}/traces/${hex}.json`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Cache in IndexedDB
        await cacheTrace(hex, date, data);

        return parseTrace(data);
    } catch (error) {
        console.warn(`⚠️ Kunne ikke hente trace for ${hex}:`, error);

        // Try cache
        return await getCachedTrace(hex, date);
    }
}

/**
 * Parse trace data into Leaflet-friendly format
 */
function parseTrace(data) {
    return {
        icao: data.icao,
        registration: data.r,
        type: data.t,
        points: data.trace.map(point => ({
            timestamp: point[0],
            lat: point[1],
            lon: point[2],
            altitude: point[3],
            speed: point[4],
            heading: point[5]
        }))
    };
}

/**
 * Draw trace on map as polyline
 */
export function drawTraceOnMap(trace, map) {
    // Color code by altitude
    const points = trace.points.map(p => [p.lat, p.lon]);

    const polyline = L.polyline(points, {
        color: '#00d4ff',
        weight: 3,
        opacity: 0.7,
        smoothFactor: 1
    }).addTo(map);

    // Add markers at waypoints (every 10 points)
    trace.points.forEach((point, index) => {
        if (index % 10 === 0) {
            const marker = L.circleMarker([point.lat, point.lon], {
                radius: 3,
                color: '#00d4ff',
                fillColor: '#00d4ff',
                fillOpacity: 0.8
            }).addTo(map);

            marker.bindPopup(`
                <b>Tid:</b> ${formatTimestamp(point.timestamp)}<br>
                <b>Højde:</b> ${point.altitude.toLocaleString()} ft<br>
                <b>Hastighed:</b> ${point.speed} knots
            `);
        }
    });

    // Fit map to trace
    map.fitBounds(polyline.getBounds());

    return polyline;
}

/**
 * Animate trace playback
 */
export class TracePlayer {
    constructor(trace, map) {
        this.trace = trace;
        this.map = map;
        this.currentIndex = 0;
        this.isPlaying = false;
        this.speed = 1; // 1x, 2x, 5x, 10x
        this.marker = null;
        this.pathPolyline = null;
    }

    play() {
        this.isPlaying = true;
        this.animate();
    }

    pause() {
        this.isPlaying = false;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    animate() {
        if (!this.isPlaying || this.currentIndex >= this.trace.points.length) {
            this.isPlaying = false;
            return;
        }

        const point = this.trace.points[this.currentIndex];

        // Update marker position
        if (this.marker) {
            this.marker.setLatLng([point.lat, point.lon]);
        } else {
            this.marker = L.marker([point.lat, point.lon], {
                icon: planeIcon(point.heading)
            }).addTo(this.map);
        }

        // Draw path behind
        const pastPoints = this.trace.points
            .slice(0, this.currentIndex + 1)
            .map(p => [p.lat, p.lon]);

        if (this.pathPolyline) {
            this.map.removeLayer(this.pathPolyline);
        }

        this.pathPolyline = L.polyline(pastPoints, {
            color: '#00d4ff',
            weight: 2,
            opacity: 0.6
        }).addTo(this.map);

        // Update progress
        this.onProgress?.(this.currentIndex, this.trace.points.length);

        this.currentIndex++;

        // Calculate delay based on real time deltas and speed multiplier
        const nextDelay = this.calculateDelay();
        setTimeout(() => this.animate(), nextDelay);
    }

    calculateDelay() {
        if (this.currentIndex >= this.trace.points.length - 1) return 0;

        const currentTime = this.trace.points[this.currentIndex][0];
        const nextTime = this.trace.points[this.currentIndex + 1][0];
        const realDelta = (nextTime - currentTime) * 1000; // ms

        return Math.max(realDelta / this.speed, 16); // min 16ms (60fps)
    }

    onProgress = null; // Callback for progress updates
}

/**
 * Generate historical heatmap over time range
 */
export async function generateHistoricalHeatmap(startDate, endDate, region) {
    // This would fetch daily history files and aggregate data
    // Very expensive operation - recommend doing on backend

    console.log(`📊 Genererer heatmap fra ${startDate} til ${endDate}...`);

    // Pseudo-code:
    // 1. For each day in range:
    //    - Fetch history_{0..23}.json files
    //    - Extract aircraft in region bbox
    // 2. Aggregate positions into grid
    // 3. Generate heatmap from grid density

    throw new Error('Not implemented - requires backend processing');
}
```

**Rotating Plane Icon:**
```javascript
function planeIcon(heading) {
    const iconHtml = `
        <div style="transform: rotate(${heading}deg)">
            ✈️
        </div>
    `;

    return L.divIcon({
        html: iconHtml,
        className: 'plane-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}
```

**IndexedDB Cache:**
```javascript
// Open IndexedDB
const dbPromise = indexedDB.open('MilAirHistory', 1);

dbPromise.onupgradeneeded = (event) => {
    const db = event.target.result;
    db.createObjectStore('traces', { keyPath: 'id' });
};

async function cacheTrace(hex, date, data) {
    const db = await getDB();
    const id = `${hex}_${date}`;

    await db.put('traces', {
        id,
        hex,
        date,
        data,
        cachedAt: Date.now()
    });
}

async function getCachedTrace(hex, date) {
    const db = await getDB();
    const id = `${hex}_${date}`;
    const cached = await db.get('traces', id);

    if (!cached) return null;

    // Check if cache is expired (24 hours)
    if (Date.now() - cached.cachedAt > 24 * 60 * 60 * 1000) {
        await db.delete('traces', id);
        return null;
    }

    return parseTrace(cached.data);
}
```

**Opdater `index-mobile.html`:**
```html
<!-- Add history tab to bottom nav -->
<div class="filter-bar">
    <button data-filter="military">...</button>
    <!-- ... existing buttons -->
    <button data-filter="history" class="filter-btn">
        <span class="filter-icon">⏱️</span>
        <span class="filter-label">Historik</span>
    </button>
</div>

<!-- History panel (hidden by default) -->
<div id="historyPanel" class="history-panel">
    <div class="panel-header">
        <h2>📜 Historiske Data</h2>
        <button id="closeHistory">&times;</button>
    </div>

    <div class="panel-content">
        <section>
            <h3>📅 Vælg Dato</h3>
            <input type="date" id="historyDate" value="2025-01-15">
        </section>

        <section>
            <h3>🔍 Søg Aircraft</h3>
            <input type="text" id="historySearch" placeholder="ICAO hex eller registration">
            <button id="findTrace">🔎 Find Rute</button>
        </section>

        <section>
            <h3>📊 Heatmap over Tid</h3>
            <label>
                Start: <input type="date" id="heatmapStart">
            </label>
            <label>
                Slut: <input type="date" id="heatmapEnd">
            </label>
            <button id="generateHeatmap">📈 Generer</button>
            <p class="warning">⚠️ Kan tage lang tid</p>
        </section>
    </div>
</div>
```

**Event Handlers:**
```javascript
document.getElementById('findTrace').addEventListener('click', async () => {
    const hex = document.getElementById('historySearch').value.trim();
    const date = document.getElementById('historyDate').value;

    if (!hex || !date) {
        alert('Indtast ICAO hex og vælg dato');
        return;
    }

    showStatusIndicator('Henter historisk rute...');

    try {
        const trace = await fetchAircraftTrace(hex, date);

        if (!trace || trace.points.length === 0) {
            alert(`Ingen data fundet for ${hex} d. ${date}`);
            return;
        }

        // Clear current markers and switch to history view
        clearMap();

        // Draw trace
        const polyline = drawTraceOnMap(trace, map);

        // Show playback controls
        showPlaybackControls(trace);

        hideStatusIndicator();
    } catch (error) {
        alert('Kunne ikke hente data. Prøv igen senere.');
        hideStatusIndicator();
    }
});

function showPlaybackControls(trace) {
    const player = new TracePlayer(trace, map);

    // Build UI
    const controls = document.getElementById('playbackControls');
    controls.innerHTML = `
        <div class="playback-header">
            <span>✈️ ${trace.registration} - ${trace.points[0].timestamp}</span>
        </div>
        <div class="playback-timeline">
            <button id="playPause">▶️</button>
            <input type="range" id="progressSlider" min="0" max="${trace.points.length}" value="0">
            <span id="timeDisplay">0:00 / ${formatDuration(trace.points.length)}</span>
        </div>
        <div class="playback-speed">
            <button data-speed="1">1x</button>
            <button data-speed="2">2x</button>
            <button data-speed="5">5x</button>
            <button data-speed="10">10x</button>
        </div>
    `;

    controls.style.display = 'block';

    // Event handlers
    document.getElementById('playPause').addEventListener('click', () => {
        if (player.isPlaying) {
            player.pause();
        } else {
            player.play();
        }
    });

    document.querySelectorAll('[data-speed]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            player.setSpeed(Number(e.target.dataset.speed));
        });
    });

    // Progress callback
    player.onProgress = (current, total) => {
        document.getElementById('progressSlider').value = current;
        document.getElementById('timeDisplay').textContent =
            `${formatTime(current)} / ${formatTime(total)}`;
    };
}
```

#### 4.4 Backend API (Optional men Anbefalet)

**Simple Express Server:**
```javascript
// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const HISTORY_BASE = 'https://raw.githubusercontent.com/adsblol/globe_history_2025/main';

app.get('/api/trace/:hex/:date', async (req, res) => {
    const { hex, date } = req.params;
    const [year, month, day] = date.split('-');

    const url = `${HISTORY_BASE}/${year}/${month}/${day}/traces/${hex}.json`;

    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(404).json({ error: 'Trace not found' });
    }
});

app.listen(3000, () => {
    console.log('History API server running on port 3000');
});
```

Deploy til:
- Heroku (gratis tier)
- Vercel (serverless functions)
- Railway.app
- Eller kør lokalt

**Frontend Update:**
```javascript
const HISTORY_API = 'https://your-api.herokuapp.com';

async function fetchAircraftTrace(hex, date) {
    const url = `${HISTORY_API}/api/trace/${hex}/${date}`;
    const response = await fetch(url);
    // ... rest same
}
```

#### 4.5 Avanceret: Timeline Heatmap

Vis aktivitet over døgnet for en given dag:

```javascript
/**
 * Generate 24-hour activity timeline
 */
export async function generateTimelineHeatmap(date, region) {
    const data = [];

    for (let hour = 0; hour < 24; hour++) {
        const hourData = await fetchHistoryFile(date, hour);
        const count = countAircraftInRegion(hourData, region);
        data.push({ hour, count });
    }

    return data;
}

// Visualize as bar chart
function drawTimeline(data) {
    const canvas = document.getElementById('timelineCanvas');
    const ctx = canvas.getContext('2d');

    // Draw bars
    const maxCount = Math.max(...data.map(d => d.count));
    const barWidth = canvas.width / 24;

    data.forEach((d, i) => {
        const barHeight = (d.count / maxCount) * canvas.height;
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(
            i * barWidth,
            canvas.height - barHeight,
            barWidth - 2,
            barHeight
        );
    });
}
```

#### 4.6 Testing Checklist
- [ ] Kan søge efter aircraft trace by hex
- [ ] Trace vises korrekt på kort
- [ ] Playback animation fungerer
- [ ] Speed controls virker (1x, 2x, 5x, 10x)
- [ ] Traces caches i IndexedDB
- [ ] Fungerer med CORS / via backend proxy
- [ ] UI er responsiv på mobile

### Prompt til Fase 4 (Simplified Start)
```
Implementer historisk data visning til MilAir Watch:

1. Tilføj "Historik" knap til bottom navigation
2. Opret history panel med dato picker og aircraft search
3. Implementer js/history.js med fetchAircraftTrace() funktion
4. Hent traces fra: https://raw.githubusercontent.com/adsblol/globe_history_2025/main/{year}/{month}/{day}/traces/{hex}.json
5. Tegn trace som polyline på kort med waypoint markers
6. Implementer IndexedDB caching af traces (24 timer TTL)
7. Tilføj basic playback controls (play/pause, speed)

Fokuser på core funktionalitet først. Avancerede features som heatmap over tid kan vente til senere iteration.
Se IMPLEMENTATION_PLAN.md FASE 4 for data format og API detaljer.
```

### Prompt til Fase 4 (Full Implementation)
```
Udvid historisk data funktionalitet med fuld playback og heatmap:

1. Implementer TracePlayer class med smooth animation
2. Tilføj rotating plane icon baseret på heading
3. Vis playback progress slider med scrubbing support
4. Implementer timeline heatmap (24-hour activity chart)
5. Tilføj date range heatmap generator (backend anbefales)
6. Optimer performance med lazy loading og streaming
7. Tilføj export funktionalitet (download trace as GPX/KML)

Kræver backend API for heatmap over tid. Se IMPLEMENTATION_PLAN.md FASE 4 for server setup.
```

---

## 📋 FASE 5: Performance & Polishing

### Optimering

**Marker Clustering:**
```bash
# Add to index-mobile.html
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css">
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
```

**Virtual Scrolling:**
- Implementer i list-view.js for 1000+ fly
- Brug Intersection Observer API

**Web Workers:**
- Flyt filtering logic til worker thread
- Beregn heatmap data i background

**Service Worker:**
- Cache static assets (JS, CSS, images)
- Offline fallback
- PWA manifest for "Add to Home Screen"

### Testing

**Cross-browser:**
- ✅ Chrome/Edge (Chromium)
- ✅ Safari (iOS + macOS)
- ✅ Firefox
- ✅ Samsung Internet

**Performance Metrics:**
- Time to Interactive < 3s
- First Contentful Paint < 1.5s
- No jank (60fps scrolling)
- Memory usage < 150MB

### Accessibility

- ARIA labels på alle buttons
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader support
- Color contrast ratios (WCAG AA)

---

## 📋 Implementation Phases - Summary

### Kort Version til Prompts

**FASE 0 - Debug Aircraft Info:**
```
Debug og fix aircraft type information. Tilføj logging, identificer problem med API response, fix field mapping.
```

**FASE 1 - Region Filtrering:**
```
Tilføj geografisk region filtrering (Danmark, Nordeuropa, Europa, etc.) med bounding box visning og localStorage persistence.
```

**FASE 2 - Vis Alle Fly:**
```
Implementer "Alle Fly" toggle med dual API strategy for at vise civile fly. Brug region-based endpoint, tilføj performance safeguards.
```

**FASE 3 - Heatmap:**
```
Tilføj heatmap visualisering med tre modes: density, aircraft type, altitude. Brug Leaflet.heat plugin, vis legend.
```

**FASE 4 - Historiske Data (Simpel):**
```
Implementer historisk trace visning fra globe_history_2025. Basic search, trace polyline, IndexedDB caching.
```

**FASE 4 - Historiske Data (Fuld):**
```
Fuld playback animation, rotating plane icon, timeline heatmap, export funktioner. Backend API anbefalet.
```

---

## 🎯 Anbefalet Rækkefølge

1. **FASE 0** (KRITISK - gør nu) - 1-2 timer
2. **FASE 1** (Foundation) - 4-6 timer
3. **FASE 2** (Builds på Fase 1) - 3-4 timer
4. **FASE 3** (Standalone, kan gøres parallel med Fase 2) - 4-5 timer
5. **FASE 4 Simpel** (Foundation for historik) - 5-6 timer
6. **FASE 4 Fuld** (Advanced features) - 8-10 timer
7. **FASE 5** (Polish) - Ongoing

**Total estimat:** 25-35 timer udvikling

---

## 🚀 Næste Skridt

1. **Test debug version i browser** - Se console logs og identificer aircraft info problem
2. **Vent på bekræftelse** fra dig med findings
3. **Fix aircraft info** baseret på debug output
4. **Start FASE 1** når du er klar

**Til dig:**
- Besøg https://joachimth.github.io/adsb-planes-mil/
- Åbn browser console (F12)
- Klik på et fly
- Kopier console output og send til mig
- Så kan jeg lave en præcis fix

Alternativt, hvis du vil starte direkte:
- **For FASE 1:** Brug "Prompt til Fase 1" direkte i ny Claude Code session
- **For FASE 2:** Brug "Prompt til Fase 2" efter Fase 1 er færdig
- osv.

---

**Dokument Version:** 1.0
**Oprettet:** 2025-12-25
**Forfatter:** Claude (Sonnet 4.5)
**Projekt:** MilAir Watch - joachimth/adsb-planes-mil
