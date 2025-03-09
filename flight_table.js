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

// Opdater flytabel med præferencebaserede datafelter
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

    let tableHTML = '<table>';
    tableHTML += '<thead><tr>' + fieldsToShow.map(field => `<th>${field}</th>`).join('') + '</tr></thead>';
    tableHTML += '<tbody>';

    flightData.forEach(flight => {
        // Sørg for at alle militære fly altid vises
        const isMilitary = flight.squawk && userPreferences?.default_active_squawks.includes(flight.squawk);
        if (isMilitary || userPreferences?.default_active_squawks.includes(flight.squawk)) {
            tableHTML += '<tr>' + fieldsToShow.map(field => `<td>${flight[field] || 'N/A'}</td>`).join('') + '</tr>';
        }
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
