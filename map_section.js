console.log("📌 map_section.js indlæst - starter kort initialisering...");

// Global variabel til at spore kortets tilstand
window.mapReady = false;

// Funktion til at initialisere kortet med brugerpræferencer
function initMap(preferences) {
    try {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error("❌ FEJL: #map container ikke fundet i DOM'en!");
            return;
        }

        console.log("✅ Kort-container fundet. Initialiserer Leaflet kort...");
        
        let mapCenter = [55.450047, 19.746850];
        let zoomLevel = 3;
        
        if (preferences && preferences.map) {
            mapCenter = preferences.map.center;
            zoomLevel = preferences.map.zoom;
        }

        window.myMap = L.map('map').setView(mapCenter, zoomLevel);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(window.myMap);

        window.mapReady = true;
        console.log("✅ Kortet er initialiseret!");

        if (window.globalFlightData && window.globalFlightData.length > 0) {
            console.log("🔄 Kort opdateres med eksisterende flydata...");
            updateMap(window.globalFlightData);
        }
    } catch (error) {
        console.error("❌ Fejl ved initialisering af kortet:", error);
    }
}

// Global funktion til at opdatere kortet med flydata
window.updateMap = function updateMap(flightData) {
    console.log("📌 updateMap kaldt med flydata:", flightData);

    if (!window.mapReady || !window.myMap) {
        console.warn("⏳ Kortet er ikke klar endnu! Forsøger igen om 500ms...");
        setTimeout(() => updateMap(flightData), 500);
        return;
    }

    if (!Array.isArray(flightData)) {
        console.error("❌ FEJL: flightData er ikke et array!", flightData);
        return;
    }

    window.myMap.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            window.myMap.removeLayer(layer);
        }
    });

    flightData.forEach((flight, index) => {
        if (!flight.lat || !flight.lon) {
            console.warn(`⚠️ Fly [${index}] mangler lat/lon og bliver ikke vist.`, flight);
            return;
        }

        let marker = L.marker([flight.lat, flight.lon]).addTo(window.myMap)
            .bindPopup(`<b>${flight.callsign || 'Ukendt'}</b><br>
                        Højde: ${flight.alt_baro || 'N/A'} ft<br>
                        Hastighed: ${flight.gs || 'N/A'} kn`);

        if (flight.squawk === "7500" || flight.squawk === "7600" || flight.squawk === "7700") {
            marker.setIcon(L.icon({
                iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            }));
            console.warn(`🚨 Fly ${flight.callsign} har en nød-squawk: ${flight.squawk}`);
        }
    });

    console.log("✅ Kort opdateret med nye flymarkører!");
};

// Indlæs brugerpræferencer og initialiser kortet
async function loadAndInitMap() {
    try {
        const response = await fetch('user_preferences.json');
        if (!response.ok) {
            throw new Error(`HTTP-fejl! Status: ${response.status}`);
        }
        const preferences = await response.json();
        console.log("✅ Brugerpræferencer indlæst for kortet:", preferences);
        initMap(preferences);
    } catch (error) {
        console.error("❌ Fejl ved indlæsning af brugerpræferencer:", error);
        initMap();
    }
}

document.addEventListener("DOMContentLoaded", loadAndInitMap);
