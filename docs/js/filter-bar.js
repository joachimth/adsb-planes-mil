/**
 * Filter Bar Module - MilAir Watch
 * Håndterer bottom filter bar med touch-venlige buttons
 */

console.log("✅ filter-bar.js er indlæst.");

// Filter state
const filterState = {
    military: true,
    emergency: true,
    special: true,
    showAllAircraft: false,  // Include civilian aircraft
    listViewActive: false
};

let onFilterChangeCallback = null;
let onListViewToggleCallback = null;

/**
 * Initialiserer filter bar
 */
export function initFilterBar(onFilterChange, onListViewToggle) {
    console.log("🎛️ Initialiserer filter bar...");

    onFilterChangeCallback = onFilterChange;
    onListViewToggleCallback = onListViewToggle;

    // Get button elements
    const militaryBtn = document.getElementById('filterMilitary');
    const emergencyBtn = document.getElementById('filterEmergency');
    const specialBtn = document.getElementById('filterSpecial');
    const allAircraftBtn = document.getElementById('filterAllAircraft');
    const listBtn = document.getElementById('filterList');

    // Add event listeners
    militaryBtn?.addEventListener('click', () => toggleFilter('military', militaryBtn));
    emergencyBtn?.addEventListener('click', () => toggleFilter('emergency', emergencyBtn));
    specialBtn?.addEventListener('click', () => toggleFilter('special', specialBtn));
    allAircraftBtn?.addEventListener('click', () => toggleAllAircraftFilter(allAircraftBtn));
    listBtn?.addEventListener('click', () => toggleListView(listBtn));

    // Load saved filters from localStorage
    loadFilterState();

    // Set initial active state for "Alle" button if needed
    if (allAircraftBtn && filterState.showAllAircraft) {
        allAircraftBtn.classList.add('active');
        allAircraftBtn.setAttribute('aria-pressed', 'true');

        // Pænere inline styles
        allAircraftBtn.style.background = 'rgba(0, 212, 255, 0.2)';
        allAircraftBtn.style.border = '2px solid #00d4ff';
        allAircraftBtn.style.borderColor = '#00d4ff';
        allAircraftBtn.style.color = '#00d4ff';
        allAircraftBtn.style.boxShadow = '0 0 8px rgba(0, 212, 255, 0.5)';
        allAircraftBtn.style.fontWeight = '600';
    }

    console.log("✅ Filter bar initialiseret.");
}

/**
 * Toggle filter
 */
function toggleFilter(filterType, button) {
    // Emergency filter is always active
    if (filterType === 'emergency') {
        console.log("⚠️ Nød-filter er altid aktivt.");
        return;
    }

    filterState[filterType] = !filterState[filterType];

    // Update button state
    if (filterState[filterType]) {
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
    } else {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
    }

    // Save to localStorage
    saveFilterState();

    // Trigger callback
    if (onFilterChangeCallback) {
        onFilterChangeCallback(filterState);
    }

    // Haptic feedback (if supported)
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

/**
 * Toggle "Alle Fly" filter (civilian aircraft)
 */
function toggleAllAircraftFilter(button) {
    console.log("🔘 toggleAllAircraftFilter kaldt, før:", filterState.showAllAircraft);

    filterState.showAllAircraft = !filterState.showAllAircraft;

    console.log("🔘 toggleAllAircraftFilter efter toggle:", filterState.showAllAircraft);
    console.log("🔘 Callback defineret?", !!onFilterChangeCallback);

    // Update button state
    if (filterState.showAllAircraft) {
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');

        // Pænere inline styles - samme som region buttons
        button.style.background = 'rgba(0, 212, 255, 0.2)';
        button.style.border = '2px solid #00d4ff';
        button.style.borderColor = '#00d4ff';
        button.style.color = '#00d4ff';
        button.style.boxShadow = '0 0 8px rgba(0, 212, 255, 0.5)';
        button.style.fontWeight = '600';

        console.log("✈️ Viser ALLE fly (inkl. civile)");
    } else {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');

        // Clear inline styles
        button.style.cssText = '';

        console.log("🪖 Viser kun militære fly");
    }

    // Save to localStorage
    saveFilterState();

    // Trigger callback - this will switch API endpoint
    if (onFilterChangeCallback) {
        console.log("📞 Kalder onFilterChangeCallback med:", filterState);
        onFilterChangeCallback(filterState);
    } else {
        console.error("❌ onFilterChangeCallback er ikke defineret!");
    }

    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

/**
 * Toggle list view
 */
function toggleListView(button) {
    filterState.listViewActive = !filterState.listViewActive;

    // Update button state
    if (filterState.listViewActive) {
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
    } else {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
    }

    // Trigger callback
    if (onListViewToggleCallback) {
        onListViewToggleCallback(filterState.listViewActive);
    }

    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

/**
 * Update filter counts (badges)
 */
export function updateFilterCounts(counts) {
    // Military count
    const militaryBadge = document.getElementById('militaryCount');
    if (militaryBadge && counts.military > 0) {
        militaryBadge.textContent = counts.military;
        militaryBadge.style.display = 'block';
    } else if (militaryBadge) {
        militaryBadge.style.display = 'none';
    }

    // Emergency count
    const emergencyBadge = document.getElementById('emergencyCount');
    if (emergencyBadge && counts.emergency > 0) {
        emergencyBadge.textContent = counts.emergency;
        emergencyBadge.style.display = 'block';
    } else if (emergencyBadge) {
        emergencyBadge.style.display = 'none';
    }

    // Special count
    const specialBadge = document.getElementById('specialCount');
    if (specialBadge && counts.special > 0) {
        specialBadge.textContent = counts.special;
        specialBadge.style.display = 'block';
    } else if (specialBadge) {
        specialBadge.style.display = 'none';
    }
}

/**
 * Get current filter state
 */
export function getFilterState() {
    return { ...filterState };
}

/**
 * Save filter state to localStorage
 */
function saveFilterState() {
    localStorage.setItem('filterState', JSON.stringify({
        military: filterState.military,
        emergency: filterState.emergency,
        special: filterState.special
    }));
}

/**
 * Load filter state from localStorage
 */
function loadFilterState() {
    const saved = localStorage.getItem('filterState');
    if (!saved) return;

    try {
        const state = JSON.parse(saved);

        // Apply saved state
        if (state.military !== undefined) {
            filterState.military = state.military;
            const btn = document.getElementById('filterMilitary');
            if (btn) {
                btn.classList.toggle('active', state.military);
                btn.setAttribute('aria-pressed', state.military);
            }
        }

        // Emergency is always active
        filterState.emergency = true;

        if (state.special !== undefined) {
            filterState.special = state.special;
            const btn = document.getElementById('filterSpecial');
            if (btn) {
                btn.classList.toggle('active', state.special);
                btn.setAttribute('aria-pressed', state.special);
            }
        }

        console.log("✅ Filter state loaded:", filterState);
    } catch (err) {
        console.error("❌ Fejl ved indlæsning af filter state:", err);
    }
}

/**
 * Check if aircraft should be shown based on filters
 */
export function shouldShowAircraft(aircraft, category) {
    // Emergency always shown
    if (category === 'emergency') return true;

    // Civilian aircraft only shown if "Alle Fly" is active
    if (category === 'civilian' && !filterState.showAllAircraft) return false;

    // Check filter state for military/special
    if (category === 'military' && !filterState.military) return false;
    if (category === 'special' && !filterState.special) return false;

    return true;
}
