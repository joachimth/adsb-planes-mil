console.log("📌 Venter på at kortet bliver klar...");

function initMap() {
    if (document.getElementById('map')) {
        console.log("✅ Kort-container fundet. Initialiserer kort...");

        const map = L.map('map').setView([56.0, 10.0], 6); // Centreret over Danmark
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        window.updateMap = function updateMap(flightData) {
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
        };

        // Hvis globalFlightData allerede er hentet, opdater kortet
        if (window.globalFlightData && window.globalFlightData.length > 0) {
            window.updateMap(window.globalFlightData);
        }
    } else {
        console.warn("⏳ Kort-container ikke fundet. Prøver igen om 500ms...");
        setTimeout(initMap, 500);
    }
}

// Vent på at DOM'en er klar
document.addEventListener("DOMContentLoaded", initMap);