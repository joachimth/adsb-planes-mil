// Bekræfter at scriptet er indlæst korrekt.
console.log("✅ flight_table.js er indlæst og klar.");

/**
 * Opdaterer tabellen med flydata.
 * Denne funktion gøres global, så den kan kaldes fra index.html.
 * @param {Array} flightData - En liste af fly-objekter fra API'et.
 */
window.updateFlightTable = function(flightData) {
    const tableBody = document.getElementById("flightTableBody");
    if (!tableBody) {
        console.error("❌ Fejl: Kunne ikke finde elementet #flightTableBody.");
        return;
    }

    if (!flightData || flightData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">Ingen militære fly fundet, der matcher de nuværende filtre.</td></tr>';
        return;
    }

    const tableRowsHTML = flightData.map(flight => {
        const icao = flight.r || 'N/A';
        const callsign = flight.flight ? flight.flight.trim() : 'N/A';
        const squawk = flight.squawk || '----';
        const altitude = flight.alt_baro === 'ground' ? 'På jorden' : (flight.alt_baro || 'N/A');
        const speed = flight.gs ? flight.gs.toFixed(0) : 'N/A'; 
        const country = flight.cou || 'Ukendt';

        // Returner den færdige HTML for én række (<tr>).
        // NYT: Hver <td> har nu en 'data-label' attribut til mobil-visning.
        return `
            <tr>
                <td data-label="ICAO">${icao.toUpperCase()}</td>
                <td data-label="Kaldesignal">${callsign}</td>
                <td data-label="Squawk">${squawk}</td>
                <td data-label="Højde (fod)">${altitude}</td>
                <td data-label="Hastighed (knob)">${speed}</td>
                <td data-label="Land">${country}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = tableRowsHTML.join('');
};