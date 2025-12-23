/**
 * Mobile UI Module - MilAir Watch
 * Håndterer mobile-specifikke UI-komponenter: bottom sheet, hamburger menu, osv.
 */

console.log("✅ mobile-ui.js er indlæst.");

// State
const uiState = {
    bottomSheetVisible: false,
    menuVisible: false,
    selectedAircraft: null,
    userLocation: null
};

/**
 * Initialiserer mobile UI-komponenter
 */
export function initMobileUI() {
    console.log("📱 Initialiserer mobile UI...");

    // Hamburger menu
    initHamburgerMenu();

    // Bottom sheet
    initBottomSheet();

    // Status indicator
    initStatusIndicator();

    // Emergency alert
    initEmergencyAlert();

    // Request geolocation if enabled
    checkGeolocation();

    console.log("✅ Mobile UI initialiseret.");
}

/* ========================================
   HAMBURGER MENU
   ======================================== */

function initHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    if (!hamburgerBtn || !sideMenu || !menuOverlay) {
        console.warn("⚠️ Menu-elementer ikke fundet.");
        return;
    }

    // Toggle menu
    hamburgerBtn.addEventListener('click', () => {
        toggleMenu();
    });

    // Close menu on overlay click
    menuOverlay.addEventListener('click', () => {
        closeMenu();
    });

    // Menu items
    initMenuItems();

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && uiState.menuVisible) {
            closeMenu();
        }
    });
}

function toggleMenu() {
    if (uiState.menuVisible) {
        closeMenu();
    } else {
        openMenu();
    }
}

function openMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    uiState.menuVisible = true;
    sideMenu.classList.add('visible');
    menuOverlay.classList.add('visible');
    hamburgerBtn.classList.add('active');
    hamburgerBtn.setAttribute('aria-expanded', 'true');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    uiState.menuVisible = false;
    sideMenu.classList.remove('visible');
    menuOverlay.classList.remove('visible');
    hamburgerBtn.classList.remove('active');
    hamburgerBtn.setAttribute('aria-expanded', 'false');

    // Restore body scroll
    document.body.style.overflow = '';
}

function initMenuItems() {
    // Toggle switches
    const toggleLocation = document.getElementById('toggleLocation');
    const toggleNotifications = document.getElementById('toggleNotifications');

    toggleLocation?.addEventListener('click', () => {
        toggleLocation.classList.toggle('active');
        const isActive = toggleLocation.classList.contains('active');
        toggleLocation.setAttribute('aria-checked', isActive);

        if (isActive) {
            requestGeolocation();
        } else {
            uiState.userLocation = null;
        }
    });

    toggleNotifications?.addEventListener('click', () => {
        toggleNotifications.classList.toggle('active');
        const isActive = toggleNotifications.classList.contains('active');
        toggleNotifications.setAttribute('aria-checked', isActive);

        if (isActive) {
            requestNotificationPermission();
        }
    });

    // Menu item actions
    const menuAbout = document.getElementById('menuAbout');
    const menuSquawks = document.getElementById('menuSquawks');
    const menuDataSource = document.getElementById('menuDataSource');

    menuAbout?.addEventListener('click', (e) => {
        e.preventDefault();
        showAboutModal();
        closeMenu();
    });

    menuSquawks?.addEventListener('click', (e) => {
        e.preventDefault();
        showSquawksModal();
        closeMenu();
    });

    menuDataSource?.addEventListener('click', (e) => {
        e.preventDefault();
        showDataSourceModal();
        closeMenu();
    });
}

/* ========================================
   BOTTOM SHEET
   ======================================== */

function initBottomSheet() {
    const bottomSheet = document.getElementById('bottomSheet');
    const handle = document.getElementById('bottomSheetHandle');

    if (!bottomSheet || !handle) {
        console.warn("⚠️ Bottom sheet-elementer ikke fundet.");
        return;
    }

    // Swipe to close
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    handle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff > 0) {
            bottomSheet.style.transform = `translateY(${diff}px)`;
        }
    }, { passive: true });

    handle.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;

        const diff = currentY - startY;
        if (diff > 100) {
            closeBottomSheet();
        } else {
            bottomSheet.style.transform = '';
        }
    });

    // Action buttons
    const actionFollow = document.getElementById('actionFollow');
    const actionShare = document.getElementById('actionShare');

    actionFollow?.addEventListener('click', () => {
        if (uiState.selectedAircraft) {
            followAircraft(uiState.selectedAircraft);
        }
    });

    actionShare?.addEventListener('click', () => {
        if (uiState.selectedAircraft) {
            shareAircraft(uiState.selectedAircraft);
        }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && uiState.bottomSheetVisible) {
            closeBottomSheet();
        }
    });
}

export function openBottomSheet(aircraft) {
    const bottomSheet = document.getElementById('bottomSheet');
    if (!bottomSheet) return;

    uiState.selectedAircraft = aircraft;
    uiState.bottomSheetVisible = true;

    // Populate data
    populateBottomSheet(aircraft);

    // Show bottom sheet
    bottomSheet.classList.add('visible');
    bottomSheet.style.transform = '';
}

export function closeBottomSheet() {
    const bottomSheet = document.getElementById('bottomSheet');
    if (!bottomSheet) return;

    uiState.bottomSheetVisible = false;
    uiState.selectedAircraft = null;

    bottomSheet.classList.remove('visible');
}

function populateBottomSheet(aircraft) {
    // Callsign
    const callsign = aircraft.flight?.trim() || aircraft.r || 'N/A';
    document.getElementById('detailCallsign').textContent = callsign;

    // Status badge
    const badge = document.getElementById('detailStatusBadge');
    const category = determineAircraftCategory(aircraft);
    badge.className = `aircraft-status-badge ${category}`;
    badge.textContent = getCategoryLabel(category);

    // Altitude
    const altitude = aircraft.alt_baro === 'ground'
        ? 'På jorden'
        : (aircraft.alt_baro ? aircraft.alt_baro.toLocaleString('da-DK') : '---');
    const altitudeEl = document.getElementById('detailAltitude');
    if (aircraft.alt_baro === 'ground') {
        altitudeEl.innerHTML = 'På jorden';
    } else {
        altitudeEl.innerHTML = `${altitude}<span class="detail-unit">fod</span>`;
    }

    // Speed
    const speed = aircraft.gs ? Math.round(aircraft.gs) : '---';
    document.getElementById('detailSpeed').innerHTML =
        `${speed}<span class="detail-unit">knob</span>`;

    // Squawk
    document.getElementById('detailSquawk').textContent = aircraft.squawk || '----';

    // ICAO
    document.getElementById('detailIcao').textContent = aircraft.r || '------';

    // Country
    document.getElementById('detailCountry').textContent = aircraft.cou || '---';

    // Distance (if geolocation available)
    const distanceEl = document.getElementById('detailDistance');
    if (uiState.userLocation && aircraft.lat && aircraft.lon) {
        const distance = calculateDistance(
            uiState.userLocation.latitude,
            uiState.userLocation.longitude,
            aircraft.lat,
            aircraft.lon
        );
        distanceEl.innerHTML = `${distance.toFixed(0)}<span class="detail-unit">km</span>`;
    } else {
        distanceEl.innerHTML = '---<span class="detail-unit">km</span>';
    }
}

/* ========================================
   EMERGENCY ALERT
   ======================================== */

function initEmergencyAlert() {
    const closeBtn = document.getElementById('emergencyCloseBtn');

    closeBtn?.addEventListener('click', () => {
        hideEmergencyAlert();
    });
}

export function showEmergencyAlert(aircraft) {
    const alert = document.getElementById('emergencyAlert');
    const text = document.getElementById('emergencyAlertText');

    if (!alert || !text) return;

    const callsign = aircraft.flight?.trim() || aircraft.r || 'Ukendt';
    const squawk = aircraft.squawk || '----';

    text.textContent = `${callsign} udsender ${squawk} (${getSquawkDescription(squawk)})`;

    alert.classList.add('visible');

    // Auto-hide after 10 seconds
    setTimeout(() => {
        hideEmergencyAlert();
    }, 10000);

    // Send notification if enabled
    sendNotification('NØDSITUATION DETEKTERET', text.textContent);
}

export function hideEmergencyAlert() {
    const alert = document.getElementById('emergencyAlert');
    alert?.classList.remove('visible');
}

/* ========================================
   STATUS INDICATOR
   ======================================== */

function initStatusIndicator() {
    // Status indicator is controlled by main.js
}

export function showStatusIndicator(message) {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');

    if (!indicator || !text) return;

    text.textContent = message;
    indicator.classList.add('visible');
}

export function hideStatusIndicator() {
    const indicator = document.getElementById('statusIndicator');
    indicator?.classList.remove('visible');
}

/* ========================================
   GEOLOCATION
   ======================================== */

function checkGeolocation() {
    // Check if location toggle is enabled from localStorage
    const locationEnabled = localStorage.getItem('locationEnabled') === 'true';
    const toggle = document.getElementById('toggleLocation');

    if (locationEnabled && toggle) {
        toggle.classList.add('active');
        toggle.setAttribute('aria-checked', 'true');
        requestGeolocation();
    }
}

function requestGeolocation() {
    if (!navigator.geolocation) {
        console.warn("⚠️ Geolocation ikke understøttet.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            uiState.userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            console.log("✅ Geolocation hentet:", uiState.userLocation);
            localStorage.setItem('locationEnabled', 'true');
        },
        (error) => {
            console.error("❌ Geolocation fejl:", error.message);
            localStorage.setItem('locationEnabled', 'false');
            const toggle = document.getElementById('toggleLocation');
            if (toggle) {
                toggle.classList.remove('active');
                toggle.setAttribute('aria-checked', 'false');
            }
        }
    );
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/* ========================================
   AIRCRAFT ACTIONS
   ======================================== */

function followAircraft(aircraft) {
    // Dispatch custom event to center map on aircraft
    const event = new CustomEvent('followAircraft', { detail: aircraft });
    document.dispatchEvent(event);
    closeBottomSheet();
}

function shareAircraft(aircraft) {
    const callsign = aircraft.flight?.trim() || aircraft.r || 'Ukendt fly';
    const url = window.location.href;
    const text = `Se ${callsign} på MilAir Watch`;

    if (navigator.share) {
        navigator.share({
            title: 'MilAir Watch',
            text: text,
            url: url
        }).catch(err => console.log('❌ Del fejl:', err));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(`${text}: ${url}`)
            .then(() => {
                alert('Link kopieret til udklipsholder!');
            })
            .catch(err => console.error('❌ Kopiér fejl:', err));
    }
}

/* ========================================
   NOTIFICATIONS
   ======================================== */

function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn("⚠️ Notifikationer ikke understøttet.");
        return;
    }

    if (Notification.permission === 'granted') {
        localStorage.setItem('notificationsEnabled', 'true');
        return;
    }

    if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                localStorage.setItem('notificationsEnabled', 'true');
                new Notification('MilAir Watch', {
                    body: 'Du vil nu modtage notifikationer om nødsituationer',
                    icon: '/favicon.ico'
                });
            } else {
                localStorage.setItem('notificationsEnabled', 'false');
                const toggle = document.getElementById('toggleNotifications');
                if (toggle) {
                    toggle.classList.remove('active');
                    toggle.setAttribute('aria-checked', 'false');
                }
            }
        });
    }
}

function sendNotification(title, body) {
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';

    if (notificationsEnabled && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/badge.png',
            vibrate: [200, 100, 200]
        });
    }
}

/* ========================================
   MODALS (Simple Implementations)
   ======================================== */

function showAboutModal() {
    alert(`MilAir Watch - Live Militær Fly Radar

Dette projekt viser real-time positioner for militære og specielle fly baseret på offentlige ADS-B data fra ADSB.lol API'et.

Udviklet af: Joachim Thirsbro
Licens: MIT
GitHub: github.com/joachimth/adsb-planes-mil

Data opdateres hvert 30. sekund.`);
}

function showSquawksModal() {
    alert(`Squawk Koder - Hvad betyder de?

NØDSITUATIONER:
7700 - Generel nødsituation
7600 - Tabt kommunikation
7500 - Ulovlig handling (kapring)

MILITÆRE KODER:
7777 - Militær afvisning
4400-4477 - Militære områder
7401-7477 - Militære øvelser & UAV

SPECIELLE KODER:
1200 - VFR standard (USA)
7000 - VFR standard (Europa)
1277 - SAR operationer

Se fuld liste i indstillinger.`);
}

function showDataSourceModal() {
    alert(`Datakilde

API: ADSB.lol v2
Endpoint: https://api.adsb.lol/v2/mil

ADS-B (Automatic Dependent Surveillance-Broadcast) er et system hvor fly udsender deres position og andre data automatisk.

Denne applikation bruger offentligt tilgængelige ADS-B data.

VIGTIGT: Brug ikke til navigation eller sikkerhedskritiske formål.`);
}

/* ========================================
   UTILITY FUNCTIONS
   ======================================== */

export function determineAircraftCategory(aircraft) {
    const squawk = aircraft.squawk;

    // Emergency
    if (['7500', '7600', '7700'].includes(squawk)) {
        return 'emergency';
    }

    // Military (simplified - in real app, use squawk_codes.json)
    const militaryRanges = [
        [4400, 4477],
        [7401, 7477],
        [7610, 7676],
        [4000, 4000],
        [7777, 7777]
    ];

    const squawkNum = parseInt(squawk, 10);
    if (!isNaN(squawkNum)) {
        for (const [start, end] of militaryRanges) {
            if (squawkNum >= start && squawkNum <= end) {
                return 'military';
            }
        }
    }

    // Special
    return 'special';
}

function getCategoryLabel(category) {
    const labels = {
        'emergency': 'NØD',
        'military': 'MILITÆR',
        'special': 'SPECIAL'
    };
    return labels[category] || 'CIVIL';
}

function getSquawkDescription(squawk) {
    const descriptions = {
        '7500': 'Kapring',
        '7600': 'Tabt kommunikation',
        '7700': 'Generel nødsituation',
        '7777': 'Militær afvisning'
    };
    return descriptions[squawk] || 'Special kode';
}

export function getUserLocation() {
    return uiState.userLocation;
}
