// Bekræfter at scriptet er indlæst korrekt.
console.log("✅ map_section.js er indlæst.");

// Globale variabler for kortet og markører.
// Ved at have dem her, kan vi tilgå dem fra alle funktioner i denne fil.
let myMap;
let flightMarkersLayer; // Et specielt lag kun til vores fly-markører.

// Definerer vores ikoner på forhånd for nem genbrug.
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
});

const emergencyIcon = L.icon({
    // Bruger et tydeligt rødt ikon for nødsituationer.
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
});

/**
 * Initialiserer Leaflet-kortet.
 * Denne funktion kaldes fra index.html, når siden er klar.
 */
function initMap() {
    // Tjekker om kortet allerede er initialiseret for at undgå fejl.
    if (myMap) {
        console.warn("⚠️ Forsøgte at initialisere kortet, men det er allerede initialiseret.");
        return;
    }

    try {
        console.log("📌 Initialiserer kort...");
        // Opretter kortet og centrerer det over et relevant område (f.eks. Europa).
        myMap = L.map('map').setView([55.0, 15.0], 4);

        // Tilføjer baggrundskortet fra OpenStreetMap.
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(myMap);

        // Opretter vores specielle lag til markører og tilføjer det til kortet.
        // Fra nu af skal vi kun interagere med dette lag, ikke kortet direkte.
        flightMarkersLayer = L.layerGroup().addTo(myMap);

        console.log("✅ Kortet er succesfuldt initialiseret.");

    } catch (error) {
        console.error("❌ Kritisk fejl under kort-initialisering:", error);
        // Skjuler kort-containeren hvis der sker en fejl, for at undgå en tom, hvid boks.
        document.getElementById('map').style.display = 'none'; 
    }
}

/**
 * Opdaterer kortet med fly-positioner.
 * Gøres global så den kan kaldes fra index.html.
 * @param {Array} flightData - En liste af fly-objekter fra API'et.
 */
window.updateMap = function(flightData) {
    // Afbryd hvis kortet eller markerings-laget ikke er klar endnu.
    if (!myMap || !flightMarkersLayer) {
        console.warn("⚠️ updateMap blev kaldt, før kortet var klar. Afventer...");
        return;
    }

    // 1. Ryd alle gamle markører.
    // Dette er meget mere effektivt end at fjerne dem én efter én.
    flightMarkersLayer.clearLayers();

    // En liste til at holde styr på fly i nød.
    const emergencyFlights = [];
    const emergencySquawks = ["7500", "7600", "7700"];

    // 2. Gennemgå alle fly og opret nye markører.
    flightData.forEach(flight => {
        // Spring over fly uden positionsdata.
        if (!flight.lat || !flight.lon) {
            return; 
        }

        // Vælg ikon baseret på squawk-koden.
        const isEmergency = emergencySquawks.includes(flight.squawk);
        const iconToUse = isEmergency ? emergencyIcon : defaultIcon;
        
        if (isEmergency) {
            // Tilføj flyets position til listen for senere auto-zoom.
            emergencyFlights.push([flight.lat, flight.lon]);
        }

        // Opret en popup med relevant information.
        const popupContent = `
            <b>Kaldesignal:</b> ${flight.flight ? flight.flight.trim() : 'N/A'}<br>
            <b>Højde:</b> ${flight.alt_baro === 'ground' ? 'På jorden' : (flight.alt_baro + ' fod' || 'N/A')}<br>
            <b>Fart:</b> ${flight.gs ? flight.gs.toFixed(0) + ' knob' : 'N/A'}<br>
            <b>Squawk:</b> ${flight.squawk || '----'}
        `;

        // Opret markøren med det rigtige ikon og popup, og føj den til vores lag.
        L.marker([flight.lat, flight.lon], { icon: iconToUse })
            .bindPopup(popupContent)
            .addTo(flightMarkersLayer);
    });

    // 3. Zoom automatisk ind på nød-fly, hvis der er nogen.
    if (emergencyFlights.length > 0) {
        // Opret et 'bounds' objekt, der omslutter alle nød-fly.
        const bounds = L.latLngBounds(emergencyFlights);
        // Fortæl kortet at det skal panorere og zoome for at vise dette område.
        myMap.fitBounds(bounds, { padding: [50, 50] }); // Tilføjer lidt "luft" rundt i kanten.
    }
};

// Vi skal kalde initMap() fra vores hovedlogik i `index.html`
// efter DOM'en er loadet, for at sikre den korrekte rækkefølge.
// Derfor fjerner vi `DOMContentLoaded`-listeneren fra denne fil for at
// centralisere styringen.
// For at det skal virke, skal vi sørge for at `index.html` kan kalde initMap.
window.initMap = initMap;