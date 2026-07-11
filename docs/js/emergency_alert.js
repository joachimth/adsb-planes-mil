/**
 * Nød-alarm modul
 * Håndterer visning af nød-alarmer for fly i problemer
 */

console.log("✅ emergency_alert.js er indlæst.");

// DOM-referencer
let alertBox;
let alertMessage;
let dismissButton;

// Nød-koder og deres beskrivelser
const EMERGENCY_SQUAWKS = {
    '7700': 'Generel Nødsituation',
    '7600': 'Tabt Kommunikation',
    '7500': 'Ulovlig Handling (Kapring)'
};

/**
 * Initialiserer nød-alarm modulet
 */
export function initializeEmergencyAlert() {
    alertBox = document.getElementById('emergencyAlertBox');
    alertMessage = alertBox?.querySelector('.message');
    dismissButton = alertBox?.querySelector('.dismiss-button');

    if (!alertBox || !alertMessage || !dismissButton) {
        console.error("❌ Kunne ikke finde nød-alarm elementer.");
        return;
    }

    // Luk-knap event listener
    dismissButton.addEventListener('click', () => {
        alertBox.classList.remove('visible');
    });

    // Luk med Escape-tasten (tilgængelighed)
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && alertBox.classList.contains('visible')) {
            alertBox.classList.remove('visible');
        }
    });

    console.log("✅ Nød-alarm initialiseret.");
}

/**
 * Tjekker for nød-fly og opdaterer alarm
 * @param {Array} flightData - Komplet liste af fly (ufiltreret)
 */
export function checkAndDisplayEmergencyAlert(flightData) {
    if (!alertBox) return;

    // Find første fly med nød-kode
    const emergencyFlight = flightData.find(flight =>
        Object.keys(EMERGENCY_SQUAWKS).includes(flight.squawk)
    );

    if (emergencyFlight) {
        const squawk = emergencyFlight.squawk;
        const description = EMERGENCY_SQUAWKS[squawk];
        const callsign = emergencyFlight.flight?.trim()
            ? `(${emergencyFlight.flight.trim()})`
            : '';

        // Opdater alarm-tekst
        alertMessage.textContent = `🚨 ${description} ${callsign} - Squawk: ${squawk}`;

        // Vis alarm - add role/aria dynamically only for real emergencies
        alertBox.setAttribute('role', 'alert');
        alertBox.setAttribute('aria-live', 'assertive');
        alertBox.setAttribute('aria-hidden', 'false');
        alertBox.classList.add('visible');

    } else {
        // Ingen nød-fly - skjul alarm og fjern role/aria
        alertBox.classList.remove('visible');
        alertBox.removeAttribute('role');
        alertBox.removeAttribute('aria-live');
        alertBox.setAttribute('aria-hidden', 'true');
    }
}
