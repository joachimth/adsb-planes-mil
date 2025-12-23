/**
 * Fly-tabel modul
 * Håndterer visning af flydata i tabelformat
 */

console.log("✅ flight_table.js er indlæst.");

/**
 * Opdaterer fly-tabellen med filtreret data
 * @param {Array} flightData - Liste af fly-objekter
 */
export function updateFlightTable(flightData) {
    const tableBody = document.getElementById('flightTableBody');

    if (!tableBody) {
        console.error("❌ #flightTableBody blev ikke fundet.");
        return;
    }

    // Vis besked hvis ingen fly matcher filtrene
    if (!flightData || flightData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">
                    Ingen fly matcher de nuværende filtre.
                </td>
            </tr>
        `;
        return;
    }

    // Generer tabel-rækker
    const rowsHTML = flightData.map(flight => {
        const icao = flight.r || 'N/A';
        const callsign = flight.flight?.trim() || 'N/A';
        const squawk = flight.squawk || '----';
        const altitude = flight.alt_baro === 'ground'
            ? 'På jorden'
            : (flight.alt_baro || 'N/A');
        const speed = flight.gs
            ? flight.gs.toFixed(0)
            : 'N/A';
        const country = flight.cou || 'Ukendt';

        // Tilføj emergency class hvis det er et nød-fly
        const emergencyClass = ['7500', '7600', '7700'].includes(squawk)
            ? ' class="emergency-row"'
            : '';

        return `
            <tr${emergencyClass}>
                <td data-label="ICAO">${icao.toUpperCase()}</td>
                <td data-label="Kaldesignal">${callsign}</td>
                <td data-label="Squawk">${squawk}</td>
                <td data-label="Højde">${altitude}</td>
                <td data-label="Hastighed">${speed}</td>
                <td data-label="Land">${country}</td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rowsHTML;
}
