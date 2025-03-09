console.log(\"map_section.js: updateMap kaldt med data:\", flightData);

if (!flightData || !Array.isArray(flightData)) {
    console.error(\"❌ map_section.js: flightData er ugyldigt eller ikke et array!\", flightData);
    return;
}

flightData.forEach((flight, index) => {
    if (!flight.lat || !flight.lon) {
        console.warn(`⚠️ map_section.js: Fly nr. ${index} mangler lat/lon`, flight);
    } else {
        console.log(`📍 Fly ${index}: ${flight.lat}, ${flight.lon}`);
    }
});

try {
    window.myMap.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            window.myMap.removeLayer(layer);
        }
    });
    
    flightData.forEach(flight => {
        if (flight.lat && flight.lon) {
            L.marker([flight.lat, flight.lon])
                .addTo(window.myMap)
                .bindPopup(`<b>${flight.callsign || 'Ukendt'}</b><br>Højde: ${flight.alt_baro || 'N/A'} ft<br>Hastighed: ${flight.gs || 'N/A'} kn`);
        }
    });
    console.log(\"✅ map_section.js: Kort opdateret med nye fly!\");
} catch (error) {
    console.error(\"❌ Fejl ved opdatering af kortet:\", error);
}