/**
 * Kaldesignal-filter modul
 * Håndterer søgning/filtrering efter flyets kaldesignal
 */

console.log("✅ callsign_filter.js er indlæst.");

/**
 * Initialiserer kaldesignal-filteret
 * @param {Function} onFilterChange - Callback når filteret ændres
 */
export function initializeCallsignFilter(onFilterChange) {
    const filterInput = document.getElementById('callsignFilterInput');

    if (!filterInput) {
        console.error("❌ #callsignFilterInput blev ikke fundet.");
        return;
    }

    // Debounce funktion for bedre performance
    let debounceTimer;
    const DEBOUNCE_DELAY = 300; // ms

    filterInput.addEventListener('input', (event) => {
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            const filterValue = event.target.value.toLowerCase().trim();

            if (typeof onFilterChange === 'function') {
                onFilterChange(filterValue);
            } else {
                console.warn("⚠️ onFilterChange callback er ikke defineret.");
            }
        }, DEBOUNCE_DELAY);
    });

    console.log("✅ Kaldesignal-filter initialiseret.");
}
