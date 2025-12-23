# CLAUDE.md - AI Assistant Guide

## Project Overview

**Military Aircraft Tracker (Militær Fly Tracker)**

A real-time web application for tracking military and special aircraft using open ADS-B (Automatic Dependent Surveillance-Broadcast) data. The application displays live aircraft positions on an interactive map, filtered by military and emergency squawk codes.

**Tech Stack:**
- Frontend: Vanilla JavaScript (ES6+), HTML5, CSS3
- Map Library: Leaflet.js
- Styling Framework: MVP.css (minimal responsive CSS)
- API: ADSB.lol v2 Military Aircraft Endpoint
- CORS Proxy: corsproxy.io
- Language: Danish (UI and comments)

**License:** MIT (Copyright 2025 Joachim Thirsbro)

## Architecture Overview

### Design Philosophy

The application follows a **modular architecture** with strict separation of concerns:

1. **HTML Componentization**: UI sections are split into separate HTML files loaded dynamically
2. **JavaScript Modules**: Each feature has its own JS file with specific responsibilities
3. **Central Orchestrator**: `index.html` contains the main orchestration logic
4. **Global State Management**: Shared state via `window` object
5. **Event-Driven Updates**: Central filter/update function triggered by all modules

### Data Flow

```
API (ADSB.lol)
    ↓
fetchFlightData() [every 30s]
    ↓
globalFlightData
    ↓
applyFiltersAndUpdate()
    ↓
    ├─→ checkAndDisplayEmergencyAlert() [unfiltered data]
    ├─→ Filter by callsign (activeCallsignFilter)
    ├─→ Filter by squawk codes (userSelectedSquawks)
    └─→ Update UI:
        ├─→ updateMap()
        └─→ updateFlightTable()
```

## File Structure

```
adsb-planes-mil/
├── index.html                 # Main entry point, orchestration logic
├── README.md                  # User documentation (Danish)
├── LICENSE                    # MIT License
├── CLAUDE.md                  # This file - AI assistant guide
│
├── HTML Components (loaded dynamically):
│   ├── header.html            # Page header
│   ├── footer.html            # Page footer
│   ├── emergency_alert.html   # Emergency alert box
│   ├── filter_section.html    # Callsign filter input
│   ├── squawk_filter.html     # Squawk code filter UI
│   ├── flight_table.html      # Aircraft data table
│   └── openapi_checker.html   # API status checker (utility)
│
├── JavaScript Modules:
│   ├── map_section.js         # Leaflet map initialization & updates
│   ├── flight_table.js        # Table rendering logic
│   ├── callsign_filter.js     # Callsign search filter
│   ├── squawk_filter.js       # Squawk code filter logic
│   └── emergency_alert.js     # Emergency detection & alerts
│
├── Styling:
│   └── style.css              # Custom styles (uses MVP.css base)
│
└── Data/Configuration:
    ├── squawk_codes.json      # Squawk code database
    └── user_preferences.json  # User preferences (map center/zoom)
```

## Core Components

### 1. Main Orchestrator (`index.html`)

**Location:** Lines 54-221

**Responsibilities:**
- DOM initialization (`main()` function)
- Dynamic HTML section loading
- Module initialization coordination
- API data fetching (30-second interval)
- Central filtering logic (`applyFiltersAndUpdate()`)
- Squawk range matching (`checkSquawkMatch()`)

**Global Variables:**
```javascript
globalFlightData        // Array of all aircraft from API
activeCallsignFilter    // String - current callsign search term
userSelectedSquawks     // Set - selected squawk codes/ranges
apiProxyUrl            // CORS proxy URL
apiUrl                 // Full API endpoint URL
```

**Key Functions:**
- `main()` - Application entry point
- `loadAllHtmlSections()` - Parallel HTML loading
- `initAllJsModules()` - Initialize all modules
- `fetchFlightData()` - API data fetch
- `applyFiltersAndUpdate()` - Central update function
- `checkSquawkMatch(flightSquawk, selectedSquawks)` - Range-aware squawk matching

### 2. Map Module (`map_section.js`)

**Global Variables:**
```javascript
myMap                  // Leaflet map instance
flightMarkersLayer     // LayerGroup for aircraft markers
defaultIcon            // Blue marker icon
emergencyIcon          // Red marker icon
```

**Key Functions:**
- `initMap()` - Initialize Leaflet map (called from main)
- `window.updateMap(flightData)` - Update markers with filtered data
  - Clears all existing markers
  - Creates markers for each aircraft
  - Auto-zooms to emergency aircraft if present

**Map Configuration:**
- Default center: [55.0, 15.0] (Baltic Sea/Northern Europe)
- Default zoom: 4
- Tile layer: OpenStreetMap

### 3. Flight Table Module (`flight_table.js`)

**Key Functions:**
- `window.updateFlightTable(flightData)` - Render table with filtered data
  - Displays: ICAO, Callsign, Squawk, Altitude, Speed, Country
  - Mobile-responsive with `data-label` attributes

### 4. Callsign Filter Module (`callsign_filter.js`)

**Key Functions:**
- `initializeCallsignFilter()` - Set up input event listener
  - Updates `window.activeCallsignFilter` on input
  - Triggers `applyFiltersAndUpdate()`

**Filter Logic:** Case-insensitive substring matching

### 5. Squawk Filter Module (`squawk_filter.js`)

**Key Functions:**
- `initializeSquawkFilter()` - Load JSON and initialize UI
- `populateSquawkTable(squawkData)` - Build checkbox table from JSON
- `initializeSquawkSet(squawkData)` - Pre-select default squawks
- `handleCheckboxChange(event)` - Update selected squawks on checkbox change

**Important:** Supports both individual codes (`7700`) and ranges (`4400-4477`)

### 6. Emergency Alert Module (`emergency_alert.js`)

**Emergency Squawk Codes:**
- `7700` - General Emergency
- `7600` - Lost Communication
- `7500` - Unlawful Interference (Hijacking)

**Key Functions:**
- `initializeEmergencyAlert()` - Set up DOM references and dismiss button
- `checkAndDisplayEmergencyAlert(flightData)` - Check for emergencies in UNFILTERED data
  - Shows fixed-position alert box at top of page
  - Auto-displays first emergency found
  - User can dismiss with × button

## Key Conventions

### Code Style

1. **Language:** All comments and UI text in Danish
2. **Console Logging:** Extensive use of emoji prefixes:
   - ✅ Success/completion
   - ❌ Errors
   - ⚠️ Warnings
   - 🔄 Loading/updating
   - ✈️ Aircraft-related
   - 📌 Map-related
   - 🚨 Emergency alerts

3. **Naming Conventions:**
   - Global functions: `camelCase` (e.g., `updateMap`, `fetchFlightData`)
   - Global variables: `camelCase` with descriptive names
   - Constants: Use existing pattern (e.g., `apiProxyUrl`)
   - DOM IDs: `kebab-case` (e.g., `emergency-alert-box`)
   - CSS classes: `kebab-case`

4. **Module Pattern:**
   - Each JS file logs its loading: `console.log("✅ filename.js er indlæst.")`
   - Init functions exposed via `window.functionName`
   - Modules communicate via global state and central update function

### HTML Structure

- **Dynamic Loading:** HTML sections loaded via `fetch()` into containers
- **Container Pattern:** Each section has a `*-container` div in `index.html`
- **Mobile-First:** Use `data-label` attributes on table cells for responsive design

### CSS Architecture

- **CSS Variables:** Use `:root` variables for colors
  ```css
  --brand-color: #007bff
  --danger-color: #d32f2f
  ```
- **Mobile Breakpoint:** `@media screen and (max-width: 768px)`
- **Responsive Tables:** Transform to card layout on mobile

### API Integration

**Endpoint:** `https://api.adsb.lol/v2/mil`

**CORS Proxy:** `https://corsproxy.io/?url=`

**Response Structure:**
```javascript
{
  "ac": [
    {
      "r": "ICAO hex",        // Registration
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

**Update Interval:** 30 seconds (configured in `setInterval(fetchFlightData, 30000)`)

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
          "checked": true,          // Default selected state
          "disabled": false         // Lock checkbox (used for emergency codes)
        }
      ]
    }
  ]
}
```

### Squawk Matching Logic

The `checkSquawkMatch()` function in `index.html` (lines 154-179) handles:

1. **Direct Match:** Quick check for exact squawk code
2. **Range Match:** Parse ranges like `"4400-4477"` and check if flight squawk falls within
3. **Fallback:** Return false if no match

**Important:** Emergency codes (`7500`, `7600`, `7700`) are always enabled (`disabled: true`)

## Development Workflow

### Local Development

**Requirement:** Local web server (CORS restrictions prevent `file://` protocol)

**Start Server:**
```bash
python -m http.server
# Navigate to http://localhost:8000
```

**Alternative:**
```bash
npx http-server
php -S localhost:8000
```

### Git Workflow

**Current Branch:** `claude/add-claude-documentation-CoJYl`

**Commit Pattern (from history):**
- Simple, direct messages: "Update filename.ext"
- No emoji or conventional commit prefixes in existing commits

### Testing Checklist

When making changes, verify:

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

4. **Responsive Design:**
   - Desktop table layout works
   - Mobile card layout works (< 768px)
   - Map aspect ratio correct on mobile

5. **Data Updates:**
   - 30-second auto-refresh works
   - Console shows fetch progress
   - No memory leaks (markers cleared properly)

## Common Modifications

### Adding a New Squawk Code

1. Edit `squawk_codes.json`
2. Add to appropriate category:
   ```json
   {
     "code": "1234",
     "description": "Description",
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

Edit `user_preferences.json`:
```json
{
  "map": {
    "center": [latitude, longitude],
    "zoom": zoomLevel
  }
}
```

**Note:** Currently not implemented in code - would need to modify `initMap()` in `map_section.js:43`

### Changing Update Interval

Edit `index.html:82`:
```javascript
setInterval(fetchFlightData, 30000); // milliseconds
```

### Adding a New Filter

1. Create new HTML file (e.g., `altitude_filter.html`)
2. Create new JS module (e.g., `altitude_filter.js`)
3. Add to `loadAllHtmlSections()` in `index.html`
4. Add init call to `initAllJsModules()` in `index.html`
5. Update `applyFiltersAndUpdate()` filtering logic
6. Update global state if needed

### Modifying Table Columns

Edit `flight_table.js`:
1. Update table header in `flight_table.html`
2. Modify `updateFlightTable()` mapping logic
3. Add corresponding `data-label` attributes for mobile

### Changing Icon Colors/Styles

Edit `map_section.js:10-27`:
- `defaultIcon` - normal aircraft
- `emergencyIcon` - emergency aircraft

Use Leaflet color markers: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-{color}.png`

## Debugging Tips

### Console Output

Enable verbose console logs - the app uses extensive logging:
```javascript
console.log("✅ All HTML sections loaded")
console.log("🔄 Fetching flight data...")
console.log(`✅ ${globalFlightData.length} aircraft fetched`)
```

### Common Issues

**No aircraft appearing:**
1. Check console for API errors
2. Verify `globalFlightData` is populated: `console.log(window.globalFlightData)`
3. Check filters aren't too restrictive: `console.log(window.userSelectedSquawks)`
4. Verify API endpoint is accessible

**Map not loading:**
1. Check Leaflet.js loaded correctly
2. Verify `#map` div exists
3. Check `initMap()` was called
4. Inspect `myMap` variable in console

**Filters not working:**
1. Verify `applyFiltersAndUpdate()` is being called
2. Check filter state: `window.activeCallsignFilter` or `window.userSelectedSquawks`
3. Ensure module initialization completed

**Emergency alerts not showing:**
1. Check `checkAndDisplayEmergencyAlert()` receives unfiltered data
2. Verify emergency squawk codes in data
3. Inspect `#emergencyAlertBox` visibility and classes

### Inspecting Global State

Open browser console:
```javascript
// View all aircraft data
window.globalFlightData

// Check active filters
window.activeCallsignFilter
window.userSelectedSquawks

// Test filtering manually
window.applyFiltersAndUpdate()

// Check map instance
window.myMap
```

## API Considerations

### Rate Limiting

The ADSB.lol API doesn't document strict rate limits, but:
- Current update interval: 30 seconds
- Avoid reducing below 10 seconds
- Monitor console for HTTP 429 errors

### CORS Proxy

**Current:** `corsproxy.io` (free, no auth required)

**Alternatives if corsproxy.io fails:**
- `https://cors-anywhere.herokuapp.com/`
- Set up own proxy server
- Use browser extension (development only)

**Changing Proxy:**
Edit `index.html:61`:
```javascript
const apiProxyUrl = "https://new-proxy.example.com/?url=";
```

### API Data Availability

- Not all aircraft include all fields
- Check for `null`/`undefined` before using:
  - `flight` (callsign)
  - `lat`/`lon` (position)
  - `alt_baro` (altitude)
  - `gs` (ground speed)
  - `squawk` (transponder code)

## Performance Considerations

### Optimization Strategies

1. **Marker Management:**
   - Use `flightMarkersLayer.clearLayers()` instead of individual removal
   - Markers are recreated every update (acceptable for 30s interval)

2. **Filtering:**
   - `checkSquawkMatch()` optimized with early return
   - Direct Set lookup before range checking
   - Consider caching if update interval decreases

3. **DOM Updates:**
   - Table rebuilt completely each update (simple, but could use virtual DOM for large datasets)
   - Emergency alert only updates when state changes

4. **Data Loading:**
   - HTML sections loaded in parallel (`Promise.all()`)
   - Modules initialized sequentially (required for dependencies)

### Scalability

**Current Capacity:**
- Tested with ~50-100 aircraft
- Leaflet handles 1000+ markers efficiently
- Table performance may degrade with 500+ rows (consider pagination)

## Security Notes

### XSS Prevention

**Current State:** Basic string interpolation used throughout

**Vulnerable Areas:**
- `flight_table.js` - Direct HTML insertion with aircraft data
- `emergency_alert.js` - Uses `textContent` (safe)
- `map_section.js` - Leaflet handles escaping

**Recommendations:**
- Aircraft data comes from trusted API
- For user-generated content, sanitize inputs
- Consider DOMPurify for HTML sanitization

### CORS Proxy Security

**Risk:** CORS proxy can intercept/modify data

**Mitigation:**
- Use HTTPS endpoints only
- Validate data structure before use
- Consider self-hosted proxy for production

## Future Enhancement Ideas

### Potential Features

1. **Persistent Filters:** Save selected squawks to localStorage
2. **Aircraft History:** Track flight paths over time
3. **Search by Country:** Filter by aircraft country
4. **Altitude Filtering:** Show only aircraft above/below certain altitude
5. **Export Data:** Download current aircraft list as CSV/JSON
6. **Notifications:** Browser notifications for specific aircraft
7. **Multiple Layers:** Toggle between different map types
8. **Aircraft Images:** Fetch aircraft photos from external API

### Architectural Improvements

1. **Module Bundler:** Use Webpack/Vite for better dependency management
2. **Type Safety:** Migrate to TypeScript
3. **State Management:** Implement proper state management (Redux/Zustand)
4. **Testing:** Add unit tests for filtering logic
5. **Build Process:** Minification and optimization
6. **PWA:** Make it a Progressive Web App with offline support

## Troubleshooting Guide

### Problem: Aircraft data not updating

**Check:**
1. Network tab in DevTools - is API call succeeding?
2. Console - any error messages?
3. `window.globalFlightData.length` - is data being fetched?

**Solutions:**
- Hard refresh (Ctrl+Shift+R)
- Check ADSB.lol API status
- Try different CORS proxy
- Verify internet connection

### Problem: Squawk filter not working

**Check:**
1. `window.userSelectedSquawks` - are codes selected?
2. Console during checkbox change - is event firing?
3. `squawk_codes.json` - is JSON valid?

**Solutions:**
- Reload page to reset filters
- Check browser console for JSON parse errors
- Verify `initializeSquawkFilter()` was called

### Problem: Map appears but no markers

**Check:**
1. Do aircraft have valid `lat`/`lon` coordinates?
2. Is `flightMarkersLayer` initialized?
3. Are filtered results empty?

**Solutions:**
- Check filter settings (disable all filters to test)
- Verify `updateMap()` is being called
- Check zoom level - markers might be outside view

### Problem: Emergency alert not appearing

**Check:**
1. Are there any aircraft with emergency squawks in data?
2. Is `#emergencyAlertBox` in DOM?
3. CSS class `visible` being added?

**Solutions:**
- Test with mock data containing `7700` squawk
- Check CSS for `visibility` and `opacity` rules
- Verify `initializeEmergencyAlert()` completed

## Code Modification Examples

### Example 1: Add custom aircraft icon based on country

```javascript
// In map_section.js, modify updateMap():

// Add after line 17
const danishIcon = L.icon({
    iconUrl: 'https://example.com/danish-flag-marker.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

// Modify line 91-92
const isEmergency = emergencySquawks.includes(flight.squawk);
const isDanish = flight.cou === 'Denmark';
const iconToUse = isEmergency ? emergencyIcon :
                  isDanish ? danishIcon :
                  defaultIcon;
```

### Example 2: Add altitude range filter

```javascript
// In index.html, add to applyFiltersAndUpdate():

// After line 194, add:
const minAltitude = window.minAltitudeFilter || 0;
const maxAltitude = window.maxAltitudeFilter || 100000;

// Modify line 194-206:
let filteredData = globalFlightData.filter(flight => {
    const callsign = (flight.flight || '').toLowerCase();
    const squawk = flight.squawk;
    const altitude = flight.alt_baro === 'ground' ? 0 : (flight.alt_baro || 0);

    const callsignMatch = activeCallsignFilter === '' ||
                         callsign.includes(activeCallsignFilter);
    const squawkMatch = checkSquawkMatch(squawk, userSelectedSquawks);
    const altitudeMatch = altitude >= minAltitude && altitude <= maxAltitude;

    return callsignMatch && squawkMatch && altitudeMatch;
});
```

### Example 3: Add aircraft count display

```javascript
// Create new file: aircraft_counter.js

console.log("✅ aircraft_counter.js er indlæst.");

function initializeAircraftCounter() {
    // Called from index.html after DOM loaded
}

window.updateAircraftCount = function(filteredCount, totalCount) {
    const counter = document.getElementById('aircraft-count');
    if (counter) {
        counter.textContent = `Viser ${filteredCount} af ${totalCount} fly`;
    }
};

window.initializeAircraftCounter = initializeAircraftCounter;

// In index.html, applyFiltersAndUpdate(), after line 206:
if (typeof window.updateAircraftCount === "function") {
    window.updateAircraftCount(filteredData.length, globalFlightData.length);
}
```

## Additional Resources

### External Documentation

- **Leaflet.js:** https://leafletjs.com/reference.html
- **ADSB.lol API:** https://www.adsb.lol/api/
- **MVP.css:** https://andybrewer.github.io/mvp/
- **Squawk Codes:** https://en.wikipedia.org/wiki/Transponder_(aeronautics)#Transponder_codes

### Related Projects

- **tar1090:** Advanced ADS-B visualization
- **dump1090:** ADS-B decoder for RTL-SDR
- **Virtual Radar Server:** Full-featured aircraft tracking

---

**Document Version:** 1.0
**Last Updated:** 2025-12-23
**Maintained For:** Claude and other AI assistants
