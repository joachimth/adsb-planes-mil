console.log("📌 Initialiserer kort...");

const map = L.map('map').setView([56.0, 10.0], 6); // Centreret over Danmark
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

function updateMap(flightData) {
    console.log("📌 Opdaterer kort...");

    // Fjern eksisterende markører
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    // Tilføj nye markører
    flightData.forEach(flight => {
        if (flight.lat && flight.lon) {
            L.marker([flight.lat, flight.lon])
                .addTo(map)
                .bindPopup(`<b>${flight.callsign || 'Ukendt'}</b><br>Højde: ${flight.alt_baro || 'N/A'} ft<br>Hastighed: ${flight.gs || 'N/A'} kn`);
        }
    });
}

// Gør funktionen global
window.updateMap = updateMap;
