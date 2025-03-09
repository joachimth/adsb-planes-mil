console.log("📌 map_section.js indlæst - starter kort initialisering...");

// Global variabel for at holde styr på om kortet er initialiseret
window.mapReady = false;

// Funktion til at vente på, at #map bliver tilgængeligt i DOM'en
function waitForMapContainer(attempts = 20) {
    const mapContainer = document.getElementById('map');

    if (!mapContainer) {
        if (attempts > 0) {
            console.warn(`⏳ #map container ikke fundet! Forsøger igen om 500ms... (${20 - attempts} forsøg tilbage)`);
            setTimeout(() => waitForMapContainer(attempts - 1), 500);
        } else {
            console.error("❌ FEJL: #map container kunne ikke findes efter flere forsøg.");
        }
        return;
    }

    console.log("✅ #map container fundet. Initialiserer Leaflet kort...");
    initMap(); // Kald kort-initialisering
}

// Funktion til at initialisere Leaflet-kortet
function initMap() {
    if (window.myMap) {
        console.warn("⚠️ Kortet er allerede initialiseret.");
        return;
    }

    window.myMap = L.map('map').setView([56.0, 10.0], 6); // Centreret over Danmark
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(window.myMap);

    window.mapReady = true;
    console.log("✅ Kortet er initialiseret!");

    // Hvis vi allerede har hentet flydata, opdater kortet
    if (window.globalFlightData && window.globalFlightData.length > 0) {
        console.log("🔄 Kort opdateres med eksisterende flydata...");
        updateMap(window.globalFlightData);
    }
}

// Global updateMap-funktion til at vise flydata på kortet
window.updateMap = function updateMap(flightData) {
    console.log("📌 updateMap kaldt med flydata:", flightData);

    // Vent på, at kortet er klar, hvis nødvendigt
    if (!window.mapReady) {
        console.warn("⏳ Kortet er ikke klar endnu! Forsøger igen om 500ms...");
        setTimeout(() => updateMap(flightData), 500);
        return;
    }

    if (!Array.isArray(flightData)) {
        console.error("❌ FEJL: flightData er ikke et array!", flightData);
        return;
    }

    // Fjern gamle markører fra kortet
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

// Start kortinitialisering, når DOM er klar
document.addEventListener("DOMContentLoaded", () => waitForMapContainer());