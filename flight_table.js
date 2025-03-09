console.log("📌 flight_table.js indlæst - klar til opdatering af flytabel...");

let userPreferences = null;

// Indlæs brugerpræferencer
async function loadUserPreferences() {
    try {
        const response = await fetch('user_preferences.json');
        if (!response.ok) {
            throw new Error(`HTTP-fejl! Status: ${response.status}`);
        }
        userPreferences = await response.json();
        console.log("✅ Brugerpræferencer indlæst for flytabel:", userPreferences);
    } catch (error) {
        console.error("❌ Fejl ved indlæsning af brugerpræferencer:", error);
    }
}

// Opdater flytabel med præferencebaserede datafelter og squawk-filter
function updateFlightTable(flightData) {
    console.log("📌 Opdaterer flytabel...");

    const container = document.getElementById('flightTableContainer');
    if (!container) return;

    if (flightData.length === 0) {
        container.innerHTML = '<p>Ingen flydata tilgængelig.</p>';
        return;
    }

    if (!userPreferences) {
        console.warn("⚠️ Brugerpræferencer ikke indlæst endnu. Viser standarddata.");
    }

    const fieldsToShow = userPreferences?.display_fields || ["callsign", "alt_baro", "gs", "lat", "lon"];
    let filteredData = flightData;
    
    // Filtrer efter brugerens valgte squawk-koder
    if (typeof userSelectedSquawks !== 'undefined' && userSelectedSquawks.size > 0) {
        filteredData = flightData.filter(flight => 
            userSelectedSquawks.has(flight.squawk) || userPreferences?.default_active_squawks.includes(flight.squawk)
        );
    }
    
    let tableHTML = '<table>';
    tableHTML += '<thead><tr>' + fieldsToShow.map(field => `<th>${field}</th>`).join('') + '</tr></thead>';
    tableHTML += '<tbody>';

    filteredData.forEach(flight => {
        tableHTML += '<tr>' + fieldsToShow.map(field => `<td>${flight[field] || 'N/A'}</td>`).join('') + '</tr>';
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

// Indlæs præferencer før opdatering af tabel
document.addEventListener("DOMContentLoaded", async () => {
    await loadUserPreferences();
    if (typeof window.updateFlightTable === "function" && window.globalFlightData) {
        updateFlightTable(window.globalFlightData);
    }
});

// Gør funktionen global
window.updateFlightTable = updateFlightTable;
