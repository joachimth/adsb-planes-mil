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

    // Opret Leaflet-kortet
    window.myMap = L.map('map').setView([56.0, 10.0], 6); // Centreret over Danmark
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(window.myMap);

    console.log("✅ Kortet (window.myMap) er nu initialiseret!");

    // Når kortet er klar, opdater det med eksisterende flydata
    if (window.globalFlightData && window.globalFlightData.length > 0) {
        console.log("🔄 Kort opdateres med eksisterende flydata...");
        updateMap(window.globalFlightData);
    }

    window.mapReady = true; // Marker at kortet er klar
}

// Definerer updateMap globalt
window.updateMap = function updateMap(flightData) {
    console.log("📌 updateMap kaldt med flydata:", flightData);

    // Vent på, at kortet er initialiseret
    if (!window.myMap) {
        console.error("❌ FEJL: Kortet (window.myMap) er ikke initialiseret endnu! Prøver igen om 500ms...");
        setTimeout(() => updateMap(flightData), 500);
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