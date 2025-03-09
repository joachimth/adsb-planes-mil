console.log("📌 map_section.js indlæst - starter kort initialisering...");

// Funktion til at initialisere kortet
function initMap() {
    const mapContainer = document.getElementById('map');
    
    if (!mapContainer) {
        console.error("❌ FEJL: #map container ikke fundet i DOM! Prøver igen om 500ms...");
        setTimeout(initMap, 500);
        return;
    }

    console.log("✅ Kort-container fundet. Initialiserer Leaflet kort...");
    
    window.myMap = L.map('map').setView([56.0, 10.0], 6); // Centreret over Danmark
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(window.myMap);

    // Hvis flydata allerede er tilgængelige, opdater kortet
    if (window.globalFlightData && window.globalFlightData.length > 0) {
        console.log("🔄 Initial kortopdatering med eksisterende data...");
        updateMap(window.globalFlightData);
    }
}

// Definerer updateMap globalt
window.updateMap = function updateMap(flightData) {
    console.log("📌 updateMap kaldt med flydata:", flightData);

    if (!window.myMap) {
        console.error("❌ FEJL: Kortet (window.myMap) er ikke initialiseret endnu!");
        return;
    }

    if (!Array.isArray(flightData)) {
        console.error("❌ FEJL: flightData er ikke et array!", flightData);
        return;
    }

    // Fjern gamle markører
    window.myMap.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            window.myMap.removeLayer(layer);
        }
    });

    // Tilføj nye markører for hvert fly
    flightData.forEach((flight, index) => {
        if (!flight.lat || !flight.lon) {
            console.warn(`⚠️ Fly [${index}] mangler lat/lon og bliver ikke vist.`, flight);
            return;
        }

        L.marker([flight.lat, flight.lon])
            .addTo(window.myMap)
            .bindPopup(`<b>${flight.callsign || 'Ukendt'}</b><br>
                        Højde: ${flight.alt_baro || 'N/A'} ft<br>
                        Hastighed: ${flight.gs || 'N/A'} kn`);
    });

    console.log("✅ Kort opdateret med nye flymarkører!");
};

// Vent på at DOM'en er klar, så kortet initialiseres korrekt
document.addEventListener("DOMContentLoaded", initMap);