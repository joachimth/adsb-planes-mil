// map_section.js

// Log script load and define updateMap as global
console.log("map_section.js: script loaded, setting up updateMap");

// Global updateMap function
window.updateMap = function updateMap(flightData) {
    console.log("map_section.js: updateMap called", flightData);
    const data = flightData || window.globalFlightData;
    if (!data) {
        console.warn("map_section.js: No flight data to update on the map.");
        return;
    }
    // Update the map with flight data (markers, lines, etc.)
    // Example: add a marker for each flight coordinate in data
    data.flights.forEach(f => {
        L.marker([f.lat, f.lng]).addTo(window.myMap);
    });
    // ...additional map update logic...
};

// Initialize the map after DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    const mapDiv = document.getElementById('map');
    if (!mapDiv) {
        console.error("map_section.js: #map element not found. Map not initialized.");
        return;
    }
    console.log("map_section.js: DOMContentLoaded – creating Leaflet map");
    // Create Leaflet map (set view to some default center and zoom)
    window.myMap = L.map('map').setView([55.676, 12.568], 10);  // Example coordinates
    // Add a tile layer (OpenStreetMap tiles example)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://osm.org/copyright">OSM</a> contributors'
    }).addTo(window.myMap);

    // If flight data was already fetched, update the map now
    if (window.globalFlightData) {
        console.log("map_section.js: globalFlightData found on init, calling updateMap");
        window.updateMap(window.globalFlightData);
    }
});