let userSelectedSquawks = new Set();

async function loadSquawkCodes() {
    try {
        console.log("🔄 Forsøger at hente squawk_codes.json...");
        const response = await fetch('squawk_codes.json');
        
        if (!response.ok) {
            throw new Error(`HTTP-fejl! Status: ${response.status}`);
        }
        
        const squawkData = await response.json();
        console.log("✅ Squawk-koder indlæst:", squawkData);
        populateSquawkTable(squawkData);
    } catch (error) {
        console.error("❌ Fejl ved indlæsning af squawk-koder:", error);
    }
}

function populateSquawkTable(squawkData) {
    const tableBody = document.getElementById('squawkTableBody');
    if (!tableBody) {
        console.error("❌ FEJL: squawkTableBody ikke fundet i DOM'en!");
        return;
    }
    
    tableBody.innerHTML = '';
    
    const allSquawks = [...(squawkData.international || []), ...(squawkData.national_usa || []), ...(squawkData.military || [])];
    
    if (allSquawks.length === 0) {
        console.warn("⚠️ Ingen squawk-koder blev fundet i JSON-filen!");
    }
    
    allSquawks.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.code}</td>
            <td>${entry.description}</td>
            <td><input type="checkbox" data-squawk="${entry.code}"></td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('#squawkTable input[type=checkbox]').forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            const squawk = event.target.dataset.squawk;
            
            // Håndterer ranges fx "7500-7600"
            if (squawk.includes("-")) {
                const [start, end] = squawk.split("-").map(Number);
                for (let i = start; i <= end; i++) {
                    if (event.target.checked) {
                        userSelectedSquawks.add(i.toString());
                    } else {
                        userSelectedSquawks.delete(i.toString());
                    }
                }
            } else {
                if (event.target.checked) {
                    userSelectedSquawks.add(squawk);
                } else {
                    userSelectedSquawks.delete(squawk);
                }
            }
            updateFlightTable(globalFlightData);
        });
    });
}

document.addEventListener("DOMContentLoaded", loadSquawkCodes);

// Opdaterer flytabel med prioriteret visning, men viser alle fly
function updateFlightTable(flightData) {
    console.log("📌 Opdaterer flytabel...");

    const container = document.getElementById('flightTableContainer');
    if (!container) return;

    if (flightData.length === 0) {
        container.innerHTML = '<p>Ingen flydata tilgængelig.</p>';
        return;
    }

    let prioritizedFlights = [];
    let otherFlights = [];
    
    flightData.forEach(flight => {
        if (userSelectedSquawks.size > 0 && userSelectedSquawks.has(flight.squawk)) {
            prioritizedFlights.push(flight);
        } else {
            otherFlights.push(flight);
        }
    });

    let sortedFlights = [...prioritizedFlights, ...otherFlights];

    let tableHTML = '<table>';
    tableHTML += '<thead><tr><th>Fly</th><th>Højde</th><th>Hastighed</th><th>Squawk</th><th>Type</th></tr></thead>';
    tableHTML += '<tbody>';

    sortedFlights.forEach(flight => {
        tableHTML += `<tr>
            <td>${flight.flight || ''}</td>
            <td>${flight.alt_baro || ''} ft</td>
            <td>${flight.gs || ''} kn</td>
            <td>${flight.squawk || ''}</td>
            <td>${flight.type || ''}</td>
        </tr>`;
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}
