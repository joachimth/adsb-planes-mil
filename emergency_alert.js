console.log("✅ emergency_alert.js er indlæst.");

// Globale referencer til DOM-elementerne for effektivitet.
let alertBox;
let alertMessage;
let dismissButton;

/**
 * Initialiserer alarm-modulet ved at finde elementerne i DOM'en.
 * Gøres global, så den kan kaldes fra index.html.
 */
window.initializeEmergencyAlert = function() {
    alertBox = document.getElementById('emergencyAlertBox');
    alertMessage = alertBox?.querySelector('.message');
    dismissButton = alertBox?.querySelector('.dismiss-button');

    if (!alertBox || !alertMessage || !dismissButton) {
        console.error("❌ Fejl: Kunne ikke finde alle elementer til nød-alarmen.");
        return;
    }

    // Sæt en listener på lyt-knappen.
    dismissButton.addEventListener('click', () => {
        alertBox.classList.remove('visible');
    });
};

/**
 * Tjekker flydata for nød-squawks og viser/skjuler alarmen.
 * @param {Array} flightData - Den komplette liste af fly.
 */
window.checkAndDisplayEmergencyAlert = function(flightData) {
    if (!alertBox) return; // Gør intet hvis modulet ikke er initialiseret.

    const emergencySquawks = {
        "7700": "Generel Nødsituation",
        "7600": "Tabt Kommunikation",
        "7500": "Ulovlig Handling (Kapring)"
    };
    
    // Find det FØRSTE fly med en nød-kode. .find() er mere effektivt end .filter() her.
    const emergencyFlight = flightData.find(flight => 
        Object.keys(emergencySquawks).includes(flight.squawk)
    );

    if (emergencyFlight) {
        // Der ER et fly i nød.
        const squawk = emergencyFlight.squawk;
        const description = emergencySquawks[squawk];
        const callsign = emergencyFlight.flight ? `(${emergencyFlight.flight.trim()})` : '';

        // Opdater besked og vis boksen.
        alertMessage.textContent = `🚨 ${description} ${callsign} - Squawk: ${squawk}`;
        alertBox.classList.add('visible');

    } else {
        // Der er INGEN fly i nød. Skjul boksen.
        alertBox.classList.remove('visible');
    }
};