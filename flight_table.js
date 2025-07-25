// Bekræfter at scriptet er indlæst korrekt.
console.log("✅ flight_table.js er indlæst og klar.");

/**
 * Opdaterer tabellen med flydata.
 * Denne funktion gøres global, så den kan kaldes fra index.html.
 * @param {Array} flightData - En liste af fly-objekter fra API'et.
 */
window.updateFlightTable = function(flightData) {
    // Find kun "kroppen" af tabellen, som vi vil opdatere.
    const tableBody = document.getElementById("flightTableBody");

    // En sikkerhedsforanstaltning, hvis HTML-elementet ikke findes.
    if (!tableBody) {
        console.error("❌ Fejl: Kunne ikke finde elementet #flightTableBody.");
        return;
    }

    // 1. Håndter situationen, hvor der ingen flydata er.
    if (!flightData || flightData.length === 0) {
        // Indsæt en enkelt række med en informativ besked.
        // 'colspan="6"' sikrer, at cellen strækker sig over alle 6 kolonner.
        tableBody.innerHTML = '<tr><td colspan="6">Ingen militære fly fundet i øjeblikket.</td></tr>';
        return; // Stop funktionen her.
    }

    // 2. Omdan flydata til HTML-rækker
    // Vi bruger .map() til at lave en ny liste, der består af HTML-strenge.
    const tableRowsHTML = flightData.map(flight => {
        // Brug "||" til at indsætte en standardværdi, hvis data mangler.
        const icao = flight.r || 'N/A';
        // Nogle kaldesignaler har unødvendige mellemrum. .trim() fjerner dem.
        const callsign = flight.flight ? flight.flight.trim() : 'N/A';
        const squawk = flight.squawk || '----';
        // Håndterer den specielle værdi "ground".
        const altitude = flight.alt_baro === 'ground' ? 'På jorden' : (flight.alt_baro || 'N/A');
        // Viser hastighed som et heltal.
        const speed = flight.gs ? flight.gs.toFixed(0) : 'N/A'; 
        const country = flight.cou || 'Ukendt';

        // Returner den færdige HTML for én række (<tr>).
        return `
            <tr>
                <td>${icao.toUpperCase()}</td>
                <td>${callsign}</td>
                <td>${squawk}</td>
                <td>${altitude}</td>
                <td>${speed}</td>
                <td>${country}</td>
            </tr>
        `;
    });

    // 3. Indsæt alle rækker i tabellen på én gang.
    // .join('') samler alle HTML-strengene i listen til én stor streng.
    // Dette er meget mere effektivt end at opdatere tabellen for hver række.
    tableBody.innerHTML = tableRowsHTML.join('');
};

// Vi fjerner logikken med 'user_preferences.json' fra denne fil for nu.
// Hovedlogikken i `index.html` sørger for at hente data og kalde `updateFlightTable`
// på det rigtige tidspunkt. Dette gør denne fil mere fokuseret på sin ene opgave:
// at opdatere flytabellen.