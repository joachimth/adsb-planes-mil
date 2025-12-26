# CLAUDE.md - AI Assistant Guide

## Project Overview

**Military Aircraft Tracker (Militær Fly Tracker / MilAir Watch)**

A real-time web application for tracking military and special aircraft using open ADS-B (Automatic Dependent Surveillance-Broadcast) data. The application displays live aircraft positions on an interactive map, filtered by military and emergency squawk codes.

**Available in Two Versions:**
- **Desktop**: Traditional web interface with table view and filters
- **Mobile**: Modern mobile-first radar interface with touch-optimized controls

**Tech Stack:**
- Frontend: Vanilla JavaScript (ES6+), HTML5, CSS3
- Module System: ES6 Modules (import/export)
- Map Library: Leaflet.js 1.9.4
- Styling: MVP.css (desktop), Custom dark radar theme (mobile)
- APIs:
  - ADSB.lol v2 Military Aircraft Endpoint (primary)
  - ADSB.lol v2 Aircraft Info API (type lookup)
  - ADSB.fi API (backup type lookup)
- CORS Proxy: corsproxy.io
- Language: Danish (UI and comments)
- Hosting: GitHub Pages (https://joachimth.github.io/adsb-planes-mil/)

**License:** MIT (Copyright 2025 Joachim Thirsbro)

---

## Architecture Overview

### Dual Version Architecture

The project maintains **two separate implementations**:

1. **Desktop Version** (`index.html` + `js/main.js`)
   - Traditional layout with table and filters
   - ES6 module-based architecture
   - Suitable for desktop and tablet landscape

2. **Mobile Version** (`index-mobile.html` + `js/main-mobile.js`)
   - Mobile-first radar interface
   - Touch-optimized controls
   - Dark theme with bottom navigation
   - Deployed to GitHub Pages as primary interface

**Shared Components:**
- Some JS modules are shared (e.g., `aircraft-info.js`, `squawk-lookup.js`)
- Both versions use same APIs and data sources
- CSS is separate for each version

### Design Philosophy

Both versions follow a **modular architecture** with strict separation of concerns:

1. **ES6 Module System**: All JavaScript uses import/export
2. **HTML Componentization**: UI sections split into separate HTML files (desktop only)
3. **Orchestrator Pattern**: Main controller (`main.js` / `main-mobile.js`) coordinates all modules
4. **Global State Management**: State object managed by main controller
5. **Event-Driven Updates**: Central update functions triggered by data/filter changes

### Data Flow (Desktop Version)

```
ADSB.lol v2 API
    ↓
fetchFlightData() [every 30s]
    ↓
state.flightData
    ↓
enrichFlightDataWithAircraftType() [background]
    ↓ (queries ADSB.lol + ADSB.fi)
    ↓
applyFiltersAndUpdate()
    ↓
    ├─→ checkAndDisplayEmergencyAlert() [unfiltered data]
    ├─→ Filter by callsign (state.activeCallsignFilter)
    ├─→ Filter by squawk codes (state.userSelectedSquawks)
    └─→ Update UI:
        ├─→ updateMap()
        └─→ updateFlightTable()
```

### Data Flow (Mobile Version)

```
ADSB.lol v2 API
    ↓
fetchAircraftData() [every 30s]
    ↓
state.allAircraft
    ↓
processAircraftData()
    ↓
    ├─→ determineAircraftCategory() [categorize each aircraft]
    ├─→ filterAircraftByRegion() [filter by geographic region]
    ├─→ showEmergencyAlert() [if emergency exists]
    ├─→ updateFilterCounts() [update badge counts]
    └─→ applyFiltersAndUpdateUI()
        ↓
        ├─→ Filter by category (military/emergency/special)
        ├─→ updateMap() [Leaflet markers with color coding]
        ├─→ updateHeatmapData() [if heatmap enabled]
        └─→ updateListView() [sortable aircraft cards]
```

---

## File Structure

```
adsb-planes-mil/
├── index.html                 # Desktop entry point (ES6 module loader)
├── index-mobile.html          # Mobile entry point (deployed to GitHub Pages)
├── README.md                  # User documentation (desktop)
├── README-MOBILE.md           # Mobile version documentation
├── LICENSE                    # MIT License
├── CLAUDE.md                  # This file - AI assistant guide
├── DEPLOYMENT.md              # GitHub Pages deployment guide
├── deploy-to-docs.sh          # Deployment script (copies to docs/)
├── favicon.svg                # Aircraft radar icon
│
├── Desktop HTML Components (loaded dynamically by index.html):
│   ├── header.html            # Page header
│   ├── footer.html            # Page footer
│   ├── emergency_alert.html   # Emergency alert box
│   ├── filter_section.html    # Callsign filter input
│   ├── squawk_filter.html     # Squawk code filter UI
│   └── flight_table.html      # Aircraft data table
│
├── JavaScript Modules (js/):
│   ├── main.js                # Desktop main controller (348 lines)
│   ├── main-mobile.js         # Mobile main controller (228 lines)
│   │
│   ├── Desktop Modules:
│   │   ├── map_section.js         # Leaflet map (desktop)
│   │   ├── flight_table.js        # Table rendering
│   │   ├── callsign_filter.js     # Callsign search
│   │   ├── squawk_filter.js       # Squawk code filter
│   │   └── emergency_alert.js     # Emergency detection & alerts
│   │
│   ├── Mobile Modules:
│   │   ├── map_section_mobile.js  # Leaflet map with color markers (218 lines)
│   │   ├── mobile-ui.js           # Mobile UI components & bottom sheet (872 lines)
│   │   ├── filter-bar.js          # Bottom filter bar (207 lines)
│   │   ├── list-view.js           # Sortable aircraft list (260 lines)
│   │   ├── regions.js             # Geographic region filtering (190 lines)
│   │   └── heatmap.js             # Heatmap visualization modes (280 lines)
│   │
│   └── Shared Modules:
│       ├── aircraft-info.js       # Aircraft type/info lookup (299 lines)
│       └── squawk-lookup.js       # Squawk code database (114 lines)
│
├── Styling:
│   ├── style.css              # Desktop styles (uses MVP.css base)
│   └── style-mobile.css       # Mobile dark radar theme
│
├── Data/Configuration:
│   └── squawk_codes.json      # Squawk code database
│
└── docs/                      # GitHub Pages deployment folder
    ├── index.html             # (copy of index-mobile.html)
    ├── style.css              # (copy of style-mobile.css)
    ├── js/                    # All JS files
    ├── squawk_codes.json      # Data files
    └── 404.html               # Redirect to main page
```

---

## Desktop Version - Core Components

### 1. Main Controller (`js/main.js`)

**Type:** ES6 Module
**Lines:** 348
**Responsibilities:**
- Application orchestration and lifecycle management
- API data fetching (30-second interval with AbortController)
- State management via `state` object
- Central filtering logic (`applyFiltersAndUpdate()`)
- Background aircraft type enrichment
- Error handling and loading states

**State Object:**
```javascript
const state = {
    flightData: [],              // All aircraft from API
    activeCallsignFilter: '',    // Current callsign search term
    userSelectedSquawks: new Set(), // Selected squawk codes/ranges
    lastUpdated: null,           // Timestamp of last fetch
    isLoading: false,            // Loading state flag
    abortController: null        // For canceling in-flight requests
};
```

**API Configuration:**
```javascript
const API_CONFIG = {
    proxyUrl: 'https://corsproxy.io/?url=',
    baseUrl: 'https://api.adsb.lol/v2/mil',
    updateInterval: 30000 // 30 seconds
};
```

**Key Functions:**
- `main()` - Application entry point (DOMContentLoaded)
- `loadAllHtmlSections()` - Parallel HTML loading with Promise.all
- `initAllJsModules()` - Initialize all imported modules
- `fetchFlightData()` - API data fetch with abort support
- `enrichFlightDataWithAircraftType()` - Background type lookup (batched)
- `applyFiltersAndUpdate()` - Central filtering and UI update
- `checkSquawkMatch(flightSquawk, selectedSquawks)` - Range-aware squawk matching

**ES6 Module Imports:**
```javascript
import { initMap, updateMap } from './map_section.js';
import { updateFlightTable } from './flight_table.js';
import { initializeCallsignFilter } from './callsign_filter.js';
import { initializeSquawkFilter } from './squawk_filter.js';
import { initializeEmergencyAlert, checkAndDisplayEmergencyAlert } from './emergency_alert.js';
import { getAircraftInfo } from './aircraft-info.js';
```

### 2. Aircraft Info Module (`js/aircraft-info.js`)

**Type:** ES6 Module (shared by both versions)
**Lines:** 299
**Responsibilities:**
- Fetch aircraft type information from multiple APIs
- Cache aircraft data (24-hour TTL)
- Provide fallback sources (ADSB.lol → ADSB.fi)
- Build external links (Flightradar24, ADSBexchange, etc.)
- Aircraft categorization (Fighter, Helicopter, Transport, etc.)

**Key Features:**
- **Dual API Strategy**: Tries ADSB.lol first, falls back to ADSB.fi
- **Smart Caching**: Map-based cache with 24-hour expiration
- **Batch Processing**: Desktop version processes 10 aircraft at a time with 500ms delay
- **Error Resilience**: Gracefully handles API failures

**Exported Functions:**
```javascript
export async function getAircraftInfo(registration, hex)
export function getAircraftTypeIcon(type)
export function getAircraftCategory(type)
export function clearAircraftCache()
```

**API Endpoints Used:**
- `https://api.adsb.lol/v2/reg/{registration}` - Lookup by registration
- `https://api.adsb.lol/v2/hex/{hex}` - Lookup by ICAO hex
- `https://opendata.adsb.fi/api/v2/hex/{hex}` - Backup lookup

**Aircraft Categories:**
- Helikopter (Helicopter)
- Kampfly (Fighter)
- Transportfly (Transport)
- Tankfly (Tanker)
- Overvågningsfly (Surveillance/AWACS)
- Bombefly (Bomber)
- Militærfly (Generic military)

### 3. Map Module - Desktop (`js/map_section.js`)

**Type:** ES6 Module
**Lines:** 133

**Exported Functions:**
```javascript
export function initMap()
export function updateMap(flightData)
```

**Map Configuration:**
- Default center: [55.0, 15.0] (Baltic Sea/Northern Europe)
- Default zoom: 4
- Tile layer: OpenStreetMap
- Markers: Blue (default), Red (emergency)

**Key Features:**
- Clears all markers on each update (simple, effective)
- Auto-zooms to emergency aircraft if present
- Popup shows: Callsign, Altitude, Speed, Squawk

### 4. Flight Table Module (`js/flight_table.js`)

**Type:** ES6 Module
**Lines:** 65

**Exported Functions:**
```javascript
export function updateFlightTable(flightData)
```

**Displays:**
- ICAO hex
- Callsign
- Squawk code
- Altitude
- Speed (knots)
- Country
- Aircraft Type (if available)

**Mobile-responsive:** Uses `data-label` attributes for card layout on mobile

### 5. Filter Modules

**Callsign Filter (`js/callsign_filter.js`)** - 39 lines
- Real-time input filtering
- Case-insensitive substring matching
- Triggers `applyFiltersAndUpdate()` on input

**Squawk Filter (`js/squawk_filter.js`)** - 132 lines
- Loads `squawk_codes.json`
- Builds checkbox UI from JSON
- Handles individual codes and ranges (e.g., "4400-4477")
- Emergency codes always enabled (`disabled: true`)

### 6. Emergency Alert Module (`js/emergency_alert.js`)

**Type:** ES6 Module
**Lines:** 81

**Emergency Squawk Codes:**
- `7700` - General Emergency
- `7600` - Lost Communication
- `7500` - Unlawful Interference (Hijacking)

**Key Features:**
- Checks **unfiltered** data (always monitors all aircraft)
- Fixed-position alert box at top of page
- User can dismiss with × button
- Auto-displays first emergency found

---

## Mobile Version - Core Components

### 1. Main Controller Mobile (`js/main-mobile.js`)

**Type:** ES6 Module
**Lines:** 228
**Responsibilities:**
- Mobile app orchestration
- API data fetching
- Aircraft categorization (military/emergency/special/civilian)
- Filter state management
- List view coordination

**State Object:**
```javascript
const state = {
    allAircraft: [],
    filteredAircraft: [],
    lastUpdated: null,
    isLoading: false,
    abortController: null
};
```

**ES6 Module Imports:**
```javascript
import { initMap, updateMap } from './map_section_mobile.js';
import { initMobileUI, showEmergencyAlert, hideEmergencyAlert,
         showStatusIndicator, hideStatusIndicator,
         determineAircraftCategory } from './mobile-ui.js';
import { initFilterBar, updateFilterCounts, shouldShowAircraft,
         getFilterState } from './filter-bar.js';
import { initListView, toggleListView, updateListView } from './list-view.js';
import { filterAircraftByRegion, getRegion, loadRegionPreference,
         saveRegionPreference } from './regions.js';
import { initHeatmap, updateHeatmapData, isHeatmapEnabled } from './heatmap.js';
import { loadSquawkCodes } from './squawk-lookup.js';
```

**Key Functions:**
- `main()` - Entry point
- `fetchAircraftData()` - API fetch
- `processAircraftData()` - Categorize and update UI
- `applyFiltersAndUpdateUI()` - Filter and render
- Event listeners for filter changes and sort changes

### 2. Mobile UI Module (`js/mobile-ui.js`)

**Type:** ES6 Module
**Lines:** 872 (largest module!)
**Responsibilities:**
- Bottom sheet component (swipe-to-dismiss)
- Emergency alert banner
- Hamburger menu
- Status indicators
- Aircraft categorization logic
- Share functionality
- Geolocation handling

**Key Components:**

**Bottom Sheet:**
- Shows detailed aircraft info
- Swipe down to dismiss
- Touch event handling
- Contains: Callsign, Type, Altitude, Speed, Distance, Actions

**Emergency Alert:**
- Fixed top banner
- Pulsing animation
- Priority over all other alerts

**Hamburger Menu:**
- Slide-in from right
- Settings and preferences
- External links

**Exported Functions:**
```javascript
export function initMobileUI()
export function showBottomSheet(aircraft)
export function hideBottomSheet()
export function showEmergencyAlert(aircraft)
export function hideEmergencyAlert()
export function determineAircraftCategory(aircraft)
export function showStatusIndicator(message)
export function hideStatusIndicator()
```

**Aircraft Categorization Logic:**
```javascript
// Priority order:
1. Emergency squawks (7500, 7600, 7700) → 'emergency'
2. Special squawks (e.g., 7000, 1200, etc.) → 'special'
3. Military squawk ranges (e.g., 4400-4477) → 'military'
4. Default → 'civilian'
```

### 3. Filter Bar Module (`js/filter-bar.js`)

**Type:** ES6 Module
**Lines:** 207
**Responsibilities:**
- Bottom navigation filter buttons
- Filter state management
- Badge count updates
- List view toggle
- Touch event handling

**Filter States:**
```javascript
const filterState = {
    military: true,    // Militær
    emergency: true,   // Nød (always active)
    special: true,     // Special
    listViewActive: false
};
```

**Exported Functions:**
```javascript
export function initFilterBar(onFilterChange, onListViewToggle)
export function updateFilterCounts(counts)
export function shouldShowAircraft(aircraft)
export function getFilterState()
```

### 4. List View Module (`js/list-view.js`)

**Type:** ES6 Module
**Lines:** 260
**Responsibilities:**
- Aircraft list rendering
- Sortable cards
- Sort options (Emergency first, Military first, Altitude, Speed)
- Card click handling

**Sort Options:**
```javascript
- 'emergency': Emergency aircraft first
- 'military': Military aircraft first
- 'altitude': Highest altitude first
- 'speed': Fastest first
```

**Exported Functions:**
```javascript
export function initListView()
export function toggleListView()
export function updateListView(aircraft)
```

### 5. Map Module Mobile (`js/map_section_mobile.js`)

**Type:** ES6 Module
**Lines:** 218
**Key Differences from Desktop:**
- Color-coded markers (Green=Military, Red=Emergency, Yellow=Special, Blue=Civilian)
- Custom marker icons from leaflet-color-markers
- Touch-optimized popups
- Click handler opens bottom sheet instead of just popup

**Marker Colors:**
```javascript
🟢 Green  → Military (marker-icon-green.png)
🔴 Red    → Emergency (marker-icon-red.png)
🟡 Yellow → Special (marker-icon-gold.png)
🔵 Blue   → Civilian (marker-icon-blue.png)
```

**Exported Functions:**
```javascript
export function initMap()
export function updateMap(filteredAircraft)
export function centerMapOnAircraft(aircraft)
```

### 6. Regions Module (`js/regions.js`)

**Type:** ES6 Module
**Lines:** 190
**Responsibilities:**
- Geographic region definitions and filtering
- Bounding box calculations
- Distance calculations (Haversine formula)
- Region preference persistence (localStorage)

**Region Definitions:**
```javascript
REGIONS = {
    denmark: {
        name: '🇩🇰 Danmark',
        center: [56.2, 11.5],
        zoom: 6,
        bbox: [8.0, 54.5, 15.2, 58.0],
        buffer: 100  // km buffer zone
    },
    nordic: {
        name: '🌍 Nordeuropa',
        center: [60.0, 15.0],
        zoom: 4,
        bbox: [-10.0, 50.0, 40.0, 70.0],
        buffer: 200
    },
    europe: {
        name: '🌍 Europa',
        center: [50.0, 10.0],
        zoom: 4,
        bbox: [-15.0, 35.0, 40.0, 70.0],
        buffer: 250
    },
    northatlantic: {
        name: '🌊 Nordatlanten',
        center: [55.0, -30.0],
        zoom: 3,
        bbox: [-60.0, 40.0, 0.0, 70.0],
        buffer: 300
    },
    global: {
        name: '🌐 Global',
        center: [40.0, 0.0],
        zoom: 2,
        bbox: null,  // No filtering for global
        buffer: 0
    }
}
```

**Key Features:**
- Bounding box filtering with buffer zones
- Supports global view (no geographic filtering)
- Saves user's selected region to localStorage
- Default region: Nordeuropa

**Exported Functions:**
```javascript
export const REGIONS
export const DEFAULT_REGION
export function filterAircraftByRegion(aircraft, regionId)
export function getRegion(regionId)
export function loadRegionPreference()
export function saveRegionPreference(regionId)
```

### 7. Heatmap Module (`js/heatmap.js`)

**Type:** ES6 Module
**Lines:** 280
**Responsibilities:**
- Heatmap visualization layer (Leaflet.heat)
- Multiple visualization modes
- Dynamic intensity calculation
- Color gradient configuration

**Heatmap Modes:**
```javascript
'density'   - Aircraft concentration (default)
'altitude'  - Color by altitude (red=high, blue=low)
'type'      - Color by aircraft type/category
```

**Key Features:**
- Toggle heatmap on/off
- Switch between visualization modes
- Adjustable intensity and radius
- Auto-scales based on aircraft count
- Legend display for current mode

**Color Gradients:**
```javascript
// Density mode: Yellow → Red
{0.4: 'yellow', 0.65: 'orange', 1: 'red'}

// Altitude mode: Blue → Red
{0.2: 'blue', 0.5: 'cyan', 0.7: 'yellow', 1: 'red'}

// Type mode: Category colors
Military: green, Emergency: red, Special: yellow, Civilian: blue
```

**Exported Functions:**
```javascript
export function initHeatmap(map)
export function updateHeatmapData(aircraft)
export function isHeatmapEnabled()
export function clearHeatmap()
```

**UI Components:**
- Toggle button: `#toggleHeatmap`
- Mode selector: `.heatmap-mode-btn` (density/altitude/type)
- Legend: `#heatmapLegend`

### 8. Squawk Lookup Module (`js/squawk-lookup.js`)

**Type:** ES6 Module (shared)
**Lines:** 114
**Responsibilities:**
- Load `squawk_codes.json`
- Provide squawk description lookup
- Cache squawk database

**Exported Functions:**
```javascript
export async function loadSquawkCodes()
export function getSquawkDescription(code)
export function getSquawkCategory(code)
```

---

## Key Conventions

### Code Style

1. **Language:** All comments and UI text in Danish
2. **Module System:** ES6 import/export (no CommonJS)
3. **Console Logging:** Extensive use of emoji prefixes:
   - ✅ Success/completion
   - ❌ Errors
   - ⚠️ Warnings
   - 🔄 Loading/updating
   - ✈️ Aircraft-related
   - 📌 Map-related
   - 🚨 Emergency alerts

4. **Naming Conventions:**
   - Functions: `camelCase` (e.g., `updateMap`, `fetchFlightData`)
   - Variables: `camelCase` with descriptive names
   - Constants: `UPPER_SNAKE_CASE` for config (e.g., `API_CONFIG`)
   - DOM IDs: `kebab-case` (e.g., `emergency-alert-box`)
   - CSS classes: `kebab-case`

5. **Module Pattern (ES6):**
   - Each JS file logs its loading: `console.log("✅ filename.js er indlæst.")`
   - Export functions/constants explicitly
   - Import only what's needed
   - No global variables (except Leaflet `L` object)

6. **Modern JavaScript:**
   - `async/await` for asynchronous operations
   - `AbortController` for canceling fetch requests
   - Template literals for strings
   - Destructuring where appropriate
   - Arrow functions for callbacks

### HTML Structure

**Desktop:**
- Dynamic loading via `fetch()` into containers
- Container pattern: `*-container` divs in `index.html`
- Mobile-responsive with `data-label` attributes

**Mobile:**
- Single HTML file (`index-mobile.html`)
- All UI in one file (no dynamic loading)
- Semantic HTML5 (`<nav>`, `<section>`, `<header>`)
- ARIA labels for accessibility

### CSS Architecture

**Desktop (`style.css`):**
- Based on MVP.css framework
- CSS variables for colors
- Mobile breakpoint: `@media screen and (max-width: 768px)`
- Responsive tables transform to cards

**Mobile (`style-mobile.css`):**
- Custom dark radar theme
- CSS custom properties extensively used
- Mobile-first approach
- Touch-target minimum 44x44px
- Sticky bottom navigation

**Color Scheme (Mobile):**
```css
--bg-primary: #0a0e1a     /* Deep navy */
--bg-secondary: #1a1f2e   /* Elevated surface */
--accent-primary: #00d4ff /* Cyan */
--military-color: #00ff88 /* Green */
--emergency-color: #ff3366 /* Red */
--special-color: #ffaa00  /* Amber */
```

### API Integration

**Primary Endpoint:** `https://api.adsb.lol/v2/mil`

**Aircraft Info Endpoints:**
- `https://api.adsb.lol/v2/reg/{registration}`
- `https://api.adsb.lol/v2/hex/{hex}`
- `https://opendata.adsb.fi/api/v2/hex/{hex}` (backup)

**CORS Proxy:** `https://corsproxy.io/?url=`

**Response Structure (Military API):**
```javascript
{
  "ac": [
    {
      "r": "ICAO hex",        // Registration
      "hex": "abc123",        // ICAO hex code
      "flight": "CALLSIGN",   // Trimmed callsign
      "lat": 55.123,          // Latitude
      "lon": 12.456,          // Longitude
      "alt_baro": 35000,      // Altitude (or "ground")
      "gs": 450.5,            // Ground speed (knots)
      "squawk": "7700",       // Squawk code
      "cou": "Denmark"        // Country
    }
  ]
}
```

**Response Structure (Aircraft Info API):**
```javascript
{
  "ac": [
    {
      "r": "MM82010",         // Registration
      "hex": "32004e",        // ICAO hex
      "t": "F-35A",           // Aircraft type
      "desc": "Description",  // Full description
      "category": "A5"        // Category code
    }
  ]
}
```

**Update Interval:** 30 seconds (both versions)

**Rate Limiting:**
- No documented strict limits
- Aircraft type lookups batched (10 at a time, 500ms delay)
- Monitor console for HTTP 429 errors

---

## Squawk Code System

### Data Structure (`squawk_codes.json`)

```json
{
  "categories": [
    {
      "name": "Category Name",
      "codes": [
        {
          "code": "7700",           // Can be single or range "4400-4477"
          "description": "...",
          "checked": true,          // Default selected state (desktop only)
          "disabled": false         // Lock checkbox (used for emergency codes)
        }
      ]
    }
  ]
}
```

### Squawk Matching Logic

**Desktop:** `checkSquawkMatch()` in `main.js` (lines 212-237)

1. **Direct Match:** Quick check for exact squawk code in Set
2. **Range Match:** Parse ranges like `"4400-4477"` and check if squawk falls within
3. **Fallback:** Return false if no match

**Mobile:** `determineAircraftCategory()` in `mobile-ui.js`

1. **Emergency Check:** `7500`, `7600`, `7700` (highest priority)
2. **Special Check:** Hardcoded special squawks
3. **Military Check:** Range matching against military squawk ranges
4. **Default:** Civilian category

**Important:** Emergency codes (`7500`, `7600`, `7700`) are always monitored

---

## Development Workflow

### Local Development

**Requirement:** Local web server (CORS restrictions prevent `file://` protocol)

**Start Server:**
```bash
python -m http.server 8000
# Navigate to:
# - Desktop: http://localhost:8000/index.html
# - Mobile:  http://localhost:8000/index-mobile.html
```

**Alternative:**
```bash
npx http-server
php -S localhost:8000
```

### Git Workflow

**Current Branch:** `claude/add-claude-documentation-iVIZx`

**Commit Pattern (from history):**
- Simple, direct messages in Danish
- Examples: "Update filename.ext", "Fix: description"
- No emoji or conventional commit prefixes in existing commits

**Branch Naming:**
- Pattern: `claude/{description}-{sessionId}`
- Must start with `claude/` for GitHub Actions

### Deployment to GitHub Pages

**Live Site:** https://joachimth.github.io/adsb-planes-mil/

**Deployment Process:**

**Option 1: Manual Deployment**
```bash
# Copy files to docs folder
mkdir -p docs
cp index-mobile.html docs/index.html
cp style-mobile.css docs/style.css
cp -r js docs/
cp squawk_codes.json docs/
cp favicon.svg docs/

# Commit and push
git add docs/
git commit -m "Deploy mobile UI to GitHub Pages"
git push
```

**Option 2: Using Deploy Script**
```bash
./deploy-to-docs.sh
git add docs/
git commit -m "Deploy to GitHub Pages"
git push
```

**GitHub Pages Settings:**
- Repository Settings → Pages
- Source: Deploy from branch
- Branch: `main` (or your branch)
- Folder: `/docs`

**Important:** All paths in deployed files must be relative (no leading `/`)

### Testing Checklist

When making changes, verify:

**Desktop Version:**
1. **Map Functionality:**
   - Map initializes correctly
   - Markers appear for aircraft
   - Emergency aircraft use red icons
   - Auto-zoom to emergencies works

2. **Filtering:**
   - Callsign filter updates in real-time
   - Squawk checkboxes filter correctly
   - Range-based squawks work (e.g., `4400-4477`)
   - Emergency codes cannot be disabled

3. **Emergency Alerts:**
   - Alert appears for `7500`, `7600`, `7700`
   - Dismiss button works
   - Alert checks unfiltered data

4. **Aircraft Type Enrichment:**
   - Type info loads in background
   - UI updates progressively as types are fetched
   - Failures are graceful (aircraft still shown)

5. **Data Updates:**
   - 30-second auto-refresh works
   - Console shows fetch progress
   - No memory leaks (markers cleared properly)

**Mobile Version:**
1. **Map Functionality:**
   - Map loads fullscreen
   - Color-coded markers display correctly
   - Marker colors: Green=Military, Red=Emergency, Yellow=Special, Blue=Civilian
   - Click marker opens bottom sheet

2. **Bottom Sheet:**
   - Swipe down to dismiss works
   - Shows all aircraft info
   - Follow aircraft button centers map
   - Share button works (on supported devices)

3. **Filter Bar:**
   - All filter buttons toggle correctly
   - Badge counts update
   - Emergency filter always active (can't disable)
   - List view toggle works

4. **List View:**
   - Aircraft cards render correctly
   - Sorting works (Emergency, Military, Altitude, Speed)
   - Click card centers map and opens bottom sheet
   - Toggle back to map view works

5. **Emergency Alerts:**
   - Top banner appears for emergencies
   - Pulsing animation works
   - Auto-centers on emergency aircraft

6. **Responsive Design:**
   - Works on iPhone (Safari)
   - Works on Android (Chrome)
   - Touch targets are 44x44px minimum
   - Bottom bar sticky positioning works

7. **Performance:**
   - App loads in < 3 seconds
   - UI updates are smooth
   - No jank during scrolling/swiping

---

## Common Modifications

### Adding a New Squawk Code

1. Edit `squawk_codes.json`
2. Add to appropriate category:
   ```json
   {
     "code": "1234",
     "description": "Description in Danish",
     "checked": true,
     "disabled": false
   }
   ```
3. Reload page - no code changes needed

### Adding a New Squawk Range

Same as above, but use range format:
```json
{
  "code": "5000-5377",
  "description": "Range description",
  "checked": true,
  "disabled": false
}
```

### Changing Map Default Position

**Desktop:** Edit `js/map_section.js` line ~45:
```javascript
const map = L.map('map').setView([latitude, longitude], zoomLevel);
```

**Mobile:** Edit `js/map_section_mobile.js` similarly

**Note:** `user_preferences.json` exists but isn't currently implemented

### Changing Update Interval

**Desktop:** Edit `js/main.js` line ~49:
```javascript
setInterval(fetchFlightData, 30000); // milliseconds
```

**Mobile:** Edit `js/main-mobile.js` line ~58:
```javascript
setInterval(fetchAircraftData, 30000); // milliseconds
```

### Adding a New Desktop Filter

1. Create new HTML file (e.g., `altitude_filter.html`)
2. Create new JS module (e.g., `altitude_filter.js`)
3. Add to `loadAllHtmlSections()` in `main.js`
4. Import and initialize in `initAllJsModules()` in `main.js`
5. Update `applyFiltersAndUpdate()` filtering logic
6. Update `state` object if needed

### Adding a New Mobile Filter

1. Edit `index-mobile.html` to add filter button in `.filter-bar`
2. Update `filter-bar.js`:
   - Add to `filterState` object
   - Add click handler
   - Update `shouldShowAircraft()` logic
3. Update `style-mobile.css` for button styling
4. Update `mobile-ui.js` categorization if needed

### Modifying Table Columns (Desktop)

1. Update `flight_table.html` table header
2. Modify `updateFlightTable()` in `flight_table.js`
3. Add corresponding `data-label` attributes for mobile

### Adding Aircraft Photos

The `aircraft-info.js` module includes external link building. To add photos:

1. Use `buildExternalLinks()` function (returns Jetphotos, Planespotters links)
2. Extend bottom sheet in `mobile-ui.js` to fetch and display images
3. Consider caching to avoid repeated requests

### Changing Icon Colors/Styles

**Desktop:** Edit `map_section.js` lines ~10-27:
```javascript
const defaultIcon = L.icon({...});
const emergencyIcon = L.icon({...});
```

**Mobile:** Edit `map_section_mobile.js` lines ~10-50:
```javascript
const militaryIcon = L.icon({...});  // Green
const emergencyIcon = L.icon({...}); // Red
const specialIcon = L.icon({...});   // Yellow
const civilianIcon = L.icon({...});  // Blue
```

Use Leaflet color markers: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-{color}.png`

Available colors: blue, red, green, orange, yellow, violet, grey, black, gold

---

## Debugging Tips

### Console Output

Enable verbose console logs - both versions use extensive logging:

```javascript
// Application lifecycle
console.log("✈️ DOM klar. Starter applikationen...")
console.log("✅ Alle moduler initialiseret.")

// Data fetching
console.log("🔄 Henter flydata...")
console.log(`✅ ${state.flightData.length} fly hentet`)

// Aircraft type enrichment
console.log("🔄 Henter flytype-info for 50 fly...")
console.log("✅ Flytype-info hentet for 35 af 50 fly.")

// Filtering
console.log("📊 Filter opdateret: 15 af 50 fly vises")
```

### Common Issues

**No aircraft appearing:**
1. Check console for API errors
2. Verify data is fetched: `console.log(state.flightData)` (desktop) or `console.log(state.allAircraft)` (mobile)
3. Check filters aren't too restrictive
4. Verify API endpoint is accessible
5. Try disabling all filters

**Map not loading:**
1. Check Leaflet.js loaded correctly (look for `L` object in console)
2. Verify `#map` div exists in HTML
3. Check `initMap()` was called
4. Inspect map object: `console.log(window.myMap)` (if exposed)
5. Check for CSS height issues (map container must have height)

**Filters not working (Desktop):**
1. Verify `applyFiltersAndUpdate()` is being called
2. Check filter state: `console.log(state.activeCallsignFilter)` or `console.log(state.userSelectedSquawks)`
3. Ensure module initialization completed
4. Check squawk_codes.json loaded successfully

**Bottom sheet not opening (Mobile):**
1. Check `showBottomSheet()` is being called
2. Verify aircraft object has required properties
3. Check CSS class `.bottom-sheet.active` is being added
4. Inspect touch event handlers in mobile-ui.js
5. Check for JavaScript errors in console

**Aircraft type not showing:**
1. Check network tab for aircraft info API calls
2. Verify `enrichFlightDataWithAircraftType()` is being called
3. Check aircraft object has `aircraftType` property after enrichment
4. Try clearing cache: `clearAircraftCache()`
5. Check CORS proxy is working

**Emergency alerts not showing:**
1. Check emergency aircraft exist: `state.allAircraft.filter(a => ['7500','7600','7700'].includes(a.squawk))`
2. Verify alert function receives unfiltered data
3. Inspect alert element visibility and CSS classes
4. Check emergency squawk codes in data

### Inspecting State

**Desktop:**
```javascript
// Open browser console and type:

// View all aircraft data
state.flightData

// Check active filters
state.activeCallsignFilter
state.userSelectedSquawks

// Check if loading
state.isLoading

// Test filtering manually
applyFiltersAndUpdate()
```

**Mobile:**
```javascript
// All aircraft
state.allAircraft

// Filtered aircraft
state.filteredAircraft

// Filter state
getFilterState()

// Test categorization
determineAircraftCategory(state.allAircraft[0])
```

### Network Debugging

**Check API Response:**
```javascript
// Manually fetch data
fetch('https://corsproxy.io/?url=https://api.adsb.lol/v2/mil')
  .then(r => r.json())
  .then(data => console.log(data));

// Check aircraft type lookup
fetch('https://corsproxy.io/?url=https://api.adsb.lol/v2/hex/abc123')
  .then(r => r.json())
  .then(data => console.log(data));
```

**Monitor API Calls:**
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Look for corsproxy.io requests
4. Check response status and body
5. Verify update interval (should be ~30s between requests)

---

## API Considerations

### Rate Limiting

**ADSB.lol API:**
- No documented strict rate limits
- Current update interval: 30 seconds (safe)
- Aircraft type lookups are batched (desktop: 10 at a time, 500ms delay)
- Avoid reducing below 10 seconds
- Monitor console for HTTP 429 errors

**ADSB.fi API (Backup):**
- Used only when ADSB.lol fails
- Same rate limiting considerations

### CORS Proxy

**Current:** `corsproxy.io` (free, no auth required)

**Pros:**
- No setup required
- Handles CORS headers
- HTTPS support

**Cons:**
- Third-party dependency
- Potential downtime
- No SLA

**Alternatives if corsproxy.io fails:**
- `https://cors-anywhere.herokuapp.com/` (requires request)
- Self-hosted proxy (recommended for production)
- Browser extension (development only)

**Changing Proxy:**

Desktop: Edit `js/main.js` line ~25:
```javascript
proxyUrl: 'https://new-proxy.example.com/?url=',
```

Mobile: Edit `js/main-mobile.js` line ~25 similarly

### API Data Availability

Not all aircraft include all fields. Always check for `null`/`undefined`:

**Required Checks:**
```javascript
const callsign = flight.flight || 'N/A';
const altitude = flight.alt_baro === 'ground' ? 0 : (flight.alt_baro || 0);
const speed = flight.gs || 0;
const country = flight.cou || 'Unknown';

// For map markers, MUST have position
if (flight.lat && flight.lon) {
  // Create marker
}
```

### Caching Strategy

**Aircraft Info Cache:**
- 24-hour TTL
- Map-based in-memory cache
- Survives page navigation (until browser close)
- Reduces API calls significantly

**Clear Cache:**
```javascript
import { clearAircraftCache } from './aircraft-info.js';
clearAircraftCache();
```

---

## Performance Considerations

### Optimization Strategies

1. **Marker Management:**
   - Use `clearLayers()` to remove all markers at once
   - Recreate markers every update (simple, acceptable for 30s interval)
   - Consider marker clustering for 100+ aircraft

2. **Filtering:**
   - `checkSquawkMatch()` optimized with early return
   - Direct Set lookup before range checking
   - Filter functions run on every update (30s is acceptable)

3. **DOM Updates:**
   - Desktop table: Rebuilt completely each update (simple, could use virtual DOM for 500+ aircraft)
   - Mobile list: Rebuilt with sorting (acceptable for typical aircraft counts)
   - Emergency alert: Only updates when state changes

4. **Data Loading:**
   - HTML sections loaded in parallel (`Promise.all()`)
   - Modules initialized sequentially (required for dependencies)
   - Aircraft type enrichment in background (doesn't block UI)

5. **Batching:**
   - Aircraft type lookups batched (10 at a time, 500ms delay)
   - Prevents API overload
   - Progressive UI updates

### Scalability

**Current Capacity:**
- Tested with ~50-100 aircraft
- Leaflet handles 1000+ markers efficiently
- Table performance may degrade with 500+ rows
- Consider pagination or virtualization for large datasets

**Mobile Optimizations:**
- Bottom sheet uses hardware-accelerated transforms
- Filter bar sticky positioning (no JavaScript scroll listeners)
- List view virtual scrolling could be added for 500+ aircraft

### Memory Management

**Desktop:**
```javascript
// AbortController prevents memory leaks from pending requests
if (state.abortController) {
    state.abortController.abort();
}
state.abortController = new AbortController();
```

**Mobile:**
- Same AbortController pattern
- Bottom sheet properly cleaned up on hide
- Event listeners added once in init functions

### Bundle Size

**Current (Unminified):**
- Total JS: ~3000 lines (~100KB)
- CSS Desktop: ~12KB
- CSS Mobile: ~26KB
- No build step required

**Potential Optimizations:**
- Minify JS and CSS for production
- Tree shaking with module bundler
- Code splitting (load modules on demand)

---

## Security Notes

### XSS Prevention

**Current State:**
- Aircraft data from trusted API
- Basic string interpolation used in most places
- Some modules use `textContent` (safe)
- Map markers use Leaflet's built-in escaping

**Vulnerable Areas:**
- `flight_table.js` - Direct HTML insertion with aircraft data
- `list-view.js` - Card generation with string templates
- `mobile-ui.js` - Bottom sheet content insertion

**Recommendations:**
- Aircraft data is from trusted source (ADSB.lol)
- For user-generated content, sanitize inputs
- Consider DOMPurify for HTML sanitization if adding user input

**Safe Patterns:**
```javascript
// ✅ Good - using textContent
element.textContent = flight.callsign;

// ⚠️ Be careful - using innerHTML
element.innerHTML = `<td>${flight.callsign}</td>`;
// Only safe because data is from trusted API

// ❌ Never do this with user input
element.innerHTML = userInput; // XSS risk!
```

### CORS Proxy Security

**Risk:** CORS proxy can intercept/modify data

**Mitigation:**
- Use HTTPS endpoints only (currently enforced)
- Validate data structure before use
- Consider self-hosted proxy for production
- Monitor for unexpected data

### API Key Management

**Current:** No API keys required (ADSB.lol is public)

**Future:** If adding APIs requiring keys:
- Never commit keys to repository
- Use environment variables
- Consider backend proxy to hide keys

### Content Security Policy

**Recommended CSP Headers:**
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' https://unpkg.com;
               style-src 'self' 'unsafe-inline' https://unpkg.com;
               img-src 'self' https: data:;
               connect-src 'self' https://api.adsb.lol https://corsproxy.io https://opendata.adsb.fi;">
```

---

## Future Enhancement Ideas

### Desktop Features

1. **Persistent Filters:** Save selected squawks to localStorage
2. **Aircraft History:** Track flight paths over time
3. **Search by Country:** Filter by aircraft country
4. **Altitude Filtering:** Show only aircraft above/below certain altitude
5. **Export Data:** Download current aircraft list as CSV/JSON
6. **Multiple Map Layers:** Toggle between different map types
7. **Bookmarks:** Save favorite aircraft or routes

### Mobile Features

1. **PWA Manifest:** Install as standalone app
2. **Service Worker:** Offline support and caching
3. **Push Notifications:** Real-time alerts for emergencies
4. **Aircraft Trails:** Show historical flight paths on map
5. **3D View:** Three.js integration for 3D visualization
6. **Voice Announcements:** TTS for emergency alerts
7. **Favorites:** Save and track specific aircraft
8. **Multi-language:** English/Danish toggle
9. **Dark/Light Toggle:** User preference for theme
10. **Geolocation Accuracy:** Show distance circles

### Architectural Improvements

1. **Module Bundler:** Use Vite or Webpack for better dependency management
2. **Type Safety:** Migrate to TypeScript
3. **State Management:** Implement Redux or Zustand
4. **Testing:** Add unit tests (Jest) and E2E tests (Playwright)
5. **Build Process:** Minification and optimization
6. **CI/CD:** Automated testing and deployment
7. **Error Tracking:** Sentry integration
8. **Analytics:** Privacy-friendly analytics (Plausible)

### Data Enhancements

1. **WebSocket API:** Real-time updates instead of polling
2. **Aircraft Photos:** Integrate Jetphotos or Planespotters API
3. **Weather Overlay:** Show weather conditions
4. **Flight Plans:** Show filed flight plans
5. **Airport Data:** Departure/arrival airports
6. **Historical Data:** Search past flights

---

## Troubleshooting Guide

### Problem: Aircraft data not updating

**Symptoms:**
- No new aircraft after 30 seconds
- Same data persists
- No console errors

**Check:**
1. Network tab in DevTools - is API call succeeding?
2. Console - any error messages?
3. `state.flightData.length` - is data being fetched?
4. Check `state.lastUpdated` timestamp

**Solutions:**
- Hard refresh (Ctrl+Shift+R)
- Check ADSB.lol API status (try accessing directly)
- Try different CORS proxy
- Verify internet connection
- Check browser console for errors

### Problem: Squawk filter not working (Desktop)

**Symptoms:**
- Checking/unchecking squawk codes doesn't filter
- All aircraft still visible

**Check:**
1. `state.userSelectedSquawks` - are codes selected?
2. Console during checkbox change - is event firing?
3. `squawk_codes.json` - is JSON valid?
4. Check `initializeSquawkFilter()` was called

**Solutions:**
- Reload page to reset filters
- Check browser console for JSON parse errors
- Verify `applyFiltersAndUpdate()` is being called
- Test with single squawk code first

### Problem: Map appears but no markers

**Symptoms:**
- Map loads correctly
- No aircraft markers visible
- Zoom/pan works

**Check:**
1. Do aircraft have valid `lat`/`lon` coordinates?
2. Is markers layer initialized?
3. Are filtered results empty?
4. Check zoom level - markers might be outside view

**Solutions:**
- Disable all filters to test
- Verify `updateMap()` is being called
- Check console for marker creation errors
- Zoom out to see if markers are off-screen

### Problem: Bottom sheet not opening (Mobile)

**Symptoms:**
- Click on marker does nothing
- No bottom sheet appears

**Check:**
1. Is `showBottomSheet()` being called? (add console.log)
2. Does aircraft object have required properties?
3. Is `.bottom-sheet.active` class being added?
4. Any JavaScript errors in console?

**Solutions:**
- Check mobile-ui.js initialization
- Verify marker click handler is attached
- Check CSS for bottom sheet (should start off-screen)
- Test on different device/browser

### Problem: Emergency alert not appearing

**Symptoms:**
- Emergency aircraft in data but no alert
- No red banner at top

**Check:**
1. Are there any aircraft with emergency squawks? (`7500`, `7600`, `7700`)
2. Is alert element in DOM?
3. Is CSS class `visible` or `active` being added?
4. Check console for errors in emergency alert module

**Solutions:**
- Test with mock emergency data
- Check CSS for alert visibility rules
- Verify `checkAndDisplayEmergencyAlert()` receives unfiltered data
- Check emergency squawk codes match exactly

### Problem: Aircraft type not loading

**Symptoms:**
- Aircraft appear but no type information
- "Unknown aircraft" or empty type field

**Check:**
1. Network tab - are aircraft info API calls being made?
2. Console - any errors from `getAircraftInfo()`?
3. Check if aircraft has registration or hex code
4. Verify CORS proxy is working for aircraft info endpoints

**Solutions:**
- Check rate limiting (should batch 10 at a time)
- Try clearing cache: `clearAircraftCache()`
- Manually test API: `https://api.adsb.lol/v2/hex/{hex}`
- Check if ADSB.fi backup is working
- Verify cache TTL hasn't expired mid-session

### Problem: GitHub Pages deployment fails

**Symptoms:**
- Push succeeds but site shows 404
- Old version still showing

**Check:**
1. GitHub Actions tab - any build errors?
2. Settings → Pages - is source configured correctly?
3. Are files in correct location (`docs/` folder)?
4. Check file paths are relative (no leading `/`)

**Solutions:**
- Wait 5 minutes after push (Pages rebuild time)
- Check `docs/index.html` exists
- Verify branch and folder settings match
- Hard refresh browser (Ctrl+Shift+F5)
- Check GitHub Actions logs for errors

### Problem: CORS errors

**Symptoms:**
- Console shows "CORS policy" error
- API calls fail

**Check:**
1. Is CORS proxy being used?
2. Is API URL properly encoded?
3. Network tab - what's the actual URL being called?

**Solutions:**
- Verify proxy URL format: `https://corsproxy.io/?url=` + encoded API URL
- Try alternative CORS proxy
- Check if corsproxy.io is down (try in browser)
- Consider self-hosting CORS proxy

---

## Code Modification Examples

### Example 1: Add custom aircraft icon based on country (Desktop)

```javascript
// In map_section.js, add after existing icons:

const danishIcon = L.icon({
    iconUrl: 'https://example.com/danish-flag-marker.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

// Modify updateMap() function where markers are created:
const isEmergency = ['7500', '7600', '7700'].includes(flight.squawk);
const isDanish = flight.cou === 'Denmark';

const iconToUse = isEmergency ? emergencyIcon :
                  isDanish ? danishIcon :
                  defaultIcon;

const marker = L.marker([flight.lat, flight.lon], { icon: iconToUse });
```

### Example 2: Add altitude range filter (Desktop)

```javascript
// 1. Add to state object in main.js:
const state = {
    // ... existing properties
    minAltitudeFilter: 0,
    maxAltitudeFilter: 100000
};

// 2. Modify applyFiltersAndUpdate():
let filteredData = state.flightData.filter(flight => {
    const callsign = (flight.flight || '').toLowerCase();
    const squawk = flight.squawk;
    const altitude = flight.alt_baro === 'ground' ? 0 : (flight.alt_baro || 0);

    const callsignMatch = state.activeCallsignFilter === '' ||
                         callsign.includes(state.activeCallsignFilter);
    const squawkMatch = checkSquawkMatch(squawk, state.userSelectedSquawks);
    const altitudeMatch = altitude >= state.minAltitudeFilter &&
                         altitude <= state.maxAltitudeFilter;

    return callsignMatch && squawkMatch && altitudeMatch;
});

// 3. Create altitude_filter.html with range sliders
// 4. Create altitude_filter.js module with event handlers
// 5. Import and initialize in main.js
```

### Example 3: Add PWA manifest (Mobile)

```json
// Create manifest.json in root:
{
  "name": "MilAir Watch - Live Militær Fly Radar",
  "short_name": "MilAir Watch",
  "description": "Real-time military aircraft tracking",
  "start_url": "/adsb-planes-mil/",
  "display": "standalone",
  "background_color": "#0a0e1a",
  "theme_color": "#0a0e1a",
  "orientation": "portrait",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

```html
<!-- Add to <head> in index-mobile.html: -->
<link rel="manifest" href="manifest.json">
```

### Example 4: Add service worker for offline support

```javascript
// Create service-worker.js in root:
const CACHE_NAME = 'milair-watch-v1';
const urlsToCache = [
  '/',
  '/style-mobile.css',
  '/js/main-mobile.js',
  '/js/mobile-ui.js',
  '/js/filter-bar.js',
  '/js/list-view.js',
  '/js/map_section_mobile.js',
  '/squawk_codes.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

```javascript
// Register in main-mobile.js:
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => console.log('✅ Service Worker registered'))
    .catch(err => console.log('❌ SW registration failed:', err));
}
```

### Example 5: Add aircraft photo display (Mobile)

```javascript
// In mobile-ui.js, extend showBottomSheet():

async function showBottomSheet(aircraft) {
    // ... existing code ...

    // Add photo section
    const photoSection = document.createElement('div');
    photoSection.className = 'aircraft-photo';
    photoSection.innerHTML = '<div class="loading">Loading photo...</div>';

    bottomSheetContent.appendChild(photoSection);

    // Fetch photo from Jetphotos (example)
    const registration = aircraft.r;
    if (registration && registration !== 'N/A') {
        try {
            // This is pseudo-code - actual implementation would need proper API
            const photoUrl = await fetchAircraftPhoto(registration);
            photoSection.innerHTML = `<img src="${photoUrl}" alt="${registration}">`;
        } catch (error) {
            photoSection.innerHTML = '<div class="no-photo">No photo available</div>';
        }
    }
}
```

---

## Additional Resources

### External Documentation

- **Leaflet.js:** https://leafletjs.com/reference.html
- **ADSB.lol API:** https://www.adsb.lol/api/
- **ADSB.fi API:** https://opendata.adsb.fi/
- **MVP.css:** https://andybrewer.github.io/mvp/
- **Squawk Codes:** https://en.wikipedia.org/wiki/Transponder_(aeronautics)#Transponder_codes
- **ES6 Modules:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

### Related Projects

- **tar1090:** Advanced ADS-B visualization (https://github.com/wiedehopf/tar1090)
- **dump1090:** ADS-B decoder for RTL-SDR
- **Virtual Radar Server:** Full-featured aircraft tracking
- **ADSBexchange:** Global ADS-B network

### Project Links

- **GitHub Repository:** https://github.com/joachimth/adsb-planes-mil
- **Live Site (Mobile):** https://joachimth.github.io/adsb-planes-mil/
- **Issues:** https://github.com/joachimth/adsb-planes-mil/issues

---

## Version History

### v2.0 - Mobile Release (2025-01)
- ✅ Complete mobile-first redesign
- ✅ Bottom sheet UI component
- ✅ Touch-optimized filter bar
- ✅ List view with sorting
- ✅ Color-coded markers (Green/Red/Yellow/Blue)
- ✅ Geographic region filtering (Danmark, Nordeuropa, Europa, Nordatlanten, Global)
- ✅ Heatmap visualization with multiple modes (density, altitude, type)
- ✅ Geolocation support
- ✅ Aircraft type detection from ADSB.lol and ADSB.fi
- ✅ ES6 module migration for desktop version
- ✅ GitHub Pages deployment

### v1.0 - Initial Release (2024)
- Desktop-only interface
- Basic military aircraft tracking
- Emergency alert system
- Squawk code filtering
- Callsign search

---

**Document Version:** 2.1
**Last Updated:** 2025-12-26
**Maintained For:** Claude and other AI assistants

**Note:** This documentation reflects the state of the repository as of December 2025, including both desktop and mobile versions with ES6 module architecture, aircraft type detection, geographic region filtering, and heatmap visualization features.
