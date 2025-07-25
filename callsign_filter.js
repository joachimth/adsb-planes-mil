console.log("✅ callsign_filter.js er indlæst.");

/**
 * Initialiserer logikken for kaldesignal-filteret.
 */
function initializeCallsignFilter() {
    const filterInput = document.getElementById('callsignFilterInput');

    if (!filterInput) {
        console.error("❌ Fejl: Kunne ikke finde #callsignFilterInput.");
        return;
    }

    // Lyt efter 'input'-hændelsen. Den aktiveres hver gang, brugeren taster.
    filterInput.addEventListener('input', () => {
        // Hent den aktuelle tekst fra input-feltet, og konverter til små bogstaver.
        const filterValue = filterInput.value.toLowerCase();

        // Gem filter-værdien i en global variabel, som index.html kan læse.
        // Vi definerer denne variabel i index.html senere.
        window.activeCallsignFilter = filterValue;

        // Kald den centrale opdateringsfunktion i index.html for at anvende alle filtre.
        // Denne funktion vil læse den nye filter-værdi og opdatere kort og tabel.
        if (typeof window.applyFiltersAndUpdate === "function") {
            window.applyFiltersAndUpdate();
        } else {
            console.warn("⚠️ applyFiltersAndUpdate() er ikke defineret endnu.");
        }
    });
}

// Vi venter med at køre initialiseringen, til hele siden er indlæst.
// Vi kalder denne funktion fra `index.html` for at sikre korrekt rækkefølge.
window.initializeCallsignFilter = initializeCallsignFilter;