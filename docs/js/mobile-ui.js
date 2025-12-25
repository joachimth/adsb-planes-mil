/**
 * Mobile UI Module - MilAir Watch
 * Håndterer mobile-specifikke UI-komponenter: bottom sheet, hamburger menu, osv.
 */

console.log("✅ mobile-ui.js er indlæst.");

import { getSquawkDescription, getSquawkInfo } from './squawk-lookup.js';
import { getAircraftInfo, getAircraftTypeIcon, getAircraftCategory } from './aircraft-info.js';

// State
const uiState = {
    bottomSheetVisible: false,
    menuVisible: false,
    selectedAircraft: null,
    userLocation: null,
    isFollowingAircraft: false
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

    // Close when tapping outside (on map or overlay)
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        mapContainer.addEventListener('click', (e) => {
            // Only close if clicking directly on map container, not on markers/popups
            if (e.target === mapContainer || e.target.id === 'map') {
                if (uiState.bottomSheetVisible) {
                    closeBottomSheet();
                }
            }
        });
    }

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

    // Update follow button state
    updateFollowButton();

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

/**
 * Update follow button text and state
 */
function updateFollowButton() {
    const followBtn = document.getElementById('actionFollow');
    if (!followBtn || !uiState.selectedAircraft) return;

    // Check if this aircraft is being followed
    const isFollowing = uiState.isFollowingAircraft &&
                       uiState.selectedAircraft.r === getFollowedAircraftId();

    if (isFollowing) {
        followBtn.innerHTML = '<span>⏹️</span><span>Stop følge</span>';
        followBtn.classList.add('following');
    } else {
        followBtn.innerHTML = '<span>📍</span><span>Følg fly</span>';
        followBtn.classList.remove('following');
    }
}

/**
 * Get ID of currently followed aircraft
 */
function getFollowedAircraftId() {
    // This will be updated when we integrate with map module
    return window._followedAircraftId || null;
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
    const squawkCode = aircraft.squawk || '----';
    const squawkEl = document.getElementById('detailSquawk');

    let squawkInfo = null;
    try {
        squawkInfo = getSquawkInfo(squawkCode);
    } catch (err) {
        // Squawk lookup not available - just show code
    }

    if (squawkInfo && squawkInfo.description) {
        squawkEl.innerHTML = `
            ${squawkCode}
            <div class="squawk-desc">${squawkInfo.description}</div>
        `;
    } else {
        squawkEl.textContent = squawkCode;
    }

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

    // Fetch and display aircraft info (photo, type, etc.)
    loadAircraftInfo(aircraft);
}

/**
 * Load and display aircraft information (async)
 */
async function loadAircraftInfo(aircraft) {
    const registration = aircraft.r;
    const hex = aircraft.hex || null;

    // Debug logging
    console.log('🔍 loadAircraftInfo kaldt:', { registration, hex, aircraft });

    if (!registration && !hex) {
        console.warn('⚠️ Ingen registration eller hex - skjuler aircraft info');
        hideAircraftInfo();
        return;
    }

    try {
        // Show loading state
        showAircraftInfoLoading();

        // Fetch aircraft info (updated API)
        console.log(`🔄 Henter aircraft info for reg=${registration}, hex=${hex}`);
        const info = await getAircraftInfo(registration, hex);
        console.log('📦 Aircraft info modtaget:', info);
        console.log('📦 info.type:', info?.type);
        console.log('📦 info.description:', info?.description);
        console.log('📦 info.photoUrl:', info?.photoUrl);

        // Always hide photo container initially
        const photoContainer = document.getElementById('aircraftPhotoContainer');
        photoContainer.style.display = 'none';

        if (!info || (!info.type && !info.description && !info.photoUrl)) {
            console.warn('⚠️ Viser unknown state fordi:', {
                infoExists: !!info,
                hasType: !!info?.type,
                hasDesc: !!info?.description,
                hasPhoto: !!info?.photoUrl
            });
            // No data available - show unknown aircraft state
            showUnknownAircraftState();

            // Still show external links if available
            if (info && info.externalLinks) {
                document.getElementById('linkFlightradar').href = info.externalLinks.flightradar24;
                document.getElementById('linkAdsbex').href = info.externalLinks.adsbexchange;
                document.getElementById('linkPlanespotters').href = info.externalLinks.planespotters;

                const jetphotosLink = document.getElementById('linkJetphotos');
                if (info.externalLinks.jetphotos) {
                    jetphotosLink.href = info.externalLinks.jetphotos;
                    jetphotosLink.style.display = 'flex';
                } else {
                    jetphotosLink.style.display = 'none';
                }
            }
            return;
        }

        // Display type information
        // Check if type is just the registration duplicated (no real type data)
        const hasRealType = info.type && info.type !== info.registration;

        if (hasRealType || info.description) {
            console.log('✅ Viser flytype:', info.type, 'beskrivelse:', info.description);
            document.getElementById('typeName').textContent = info.type || info.description || 'Ukendt flytype';

            // Show description as category if available, otherwise generic message
            if (info.description && info.description !== info.type) {
                document.getElementById('typeCategory').textContent = info.description;
            } else {
                document.getElementById('typeCategory').textContent = 'Commercial aircraft';
            }

            document.getElementById('typeIcon').textContent =
                info.type ? getAircraftTypeIcon(info.type) : '✈️';
        } else {
            console.warn(`⚠️ Ingen rigtig flytype (type="${info.type}" === registration="${info.registration}") - viser unknown state`);
            // Show default unknown state
            document.getElementById('typeName').textContent = 'Flytype ikke tilgængelig';
            document.getElementById('typeCategory').textContent = 'Information er klassificeret eller utilgængelig';
            document.getElementById('typeIcon').textContent = '❓';
        }

        // Display photo if available
        const photoImg = document.getElementById('aircraftPhoto');
        const photoLoader = document.getElementById('photoLoader');

        if (info.photoUrl) {
            photoContainer.style.display = 'block';
            photoImg.src = info.photoUrl;
            photoImg.style.display = 'none';
            photoLoader.style.display = 'flex';

            photoImg.onerror = () => {
                // Photo failed to load, hide photo section
                photoContainer.style.display = 'none';
            };

            photoImg.onload = () => {
                photoImg.style.display = 'block';
                photoLoader.style.display = 'none';
            };
        }

        // Display external links (always show if we have ICAO)
        if (info.externalLinks) {
            document.getElementById('linkFlightradar').href = info.externalLinks.flightradar24;
            document.getElementById('linkAdsbex').href = info.externalLinks.adsbexchange;
            document.getElementById('linkPlanespotters').href = info.externalLinks.planespotters;

            const jetphotosLink = document.getElementById('linkJetphotos');
            if (info.externalLinks.jetphotos) {
                jetphotosLink.href = info.externalLinks.jetphotos;
                jetphotosLink.style.display = 'flex';
            } else {
                jetphotosLink.style.display = 'none';
            }

            document.getElementById('externalLinks').style.display = 'block';
        }

        // Show info section
        document.getElementById('aircraftInfoSection').style.display = 'block';

    } catch (error) {
        console.warn('⚠️ Kunne ikke hente flyinformation:', error);
        hideAircraftInfo();
    }
}

/**
 * Show loading state for aircraft info
 */
function showAircraftInfoLoading() {
    const photoLoader = document.getElementById('photoLoader');
    const photoContainer = document.getElementById('aircraftPhotoContainer');
    const photoImg = document.getElementById('aircraftPhoto');

    photoImg.style.display = 'none';
    photoLoader.style.display = 'flex';
    photoContainer.style.display = 'block';

    document.getElementById('typeName').textContent = 'Henter...';
    document.getElementById('typeCategory').textContent = '---';
    document.getElementById('aircraftInfoSection').style.display = 'block';
}

/**
 * Hide aircraft info section
 */
function hideAircraftInfo() {
    document.getElementById('aircraftInfoSection').style.display = 'none';
    document.getElementById('externalLinks').style.display = 'none';
}

/**
 * Show unknown aircraft state (when no data is available)
 */
function showUnknownAircraftState() {
    // Hide photo container
    document.getElementById('aircraftPhotoContainer').style.display = 'none';

    // Show unknown state
    document.getElementById('typeName').textContent = 'Ukendt flytype';
    document.getElementById('typeCategory').textContent = 'Information ikke tilgængelig for dette fly';
    document.getElementById('typeIcon').textContent = '❓';

    // Show info section (so user sees it's unknown, not just loading)
    document.getElementById('aircraftInfoSection').style.display = 'block';

    // Still show external links if we have ICAO - user can look up manually
    document.getElementById('externalLinks').style.display = 'block';
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

    // Only show alert if aircraft has valid coordinates
    if (!aircraft.lat || !aircraft.lon) {
        console.log("⚠️ Nødfly uden position - springer alarm over");
        return;
    }

    const callsign = aircraft.flight?.trim() || aircraft.r || 'Ukendt';
    const squawk = aircraft.squawk || '----';

    let squawkDesc = '';
    try {
        const desc = getSquawkDescription(squawk);
        squawkDesc = desc ? ` (${desc})` : '';
    } catch (err) {
        // Squawk lookup not available
    }

    text.textContent = `${callsign} udsender ${squawk}${squawkDesc}`;

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
    if (!aircraft) return;

    // Check if already following this aircraft
    const isFollowing = uiState.isFollowingAircraft &&
                       window._followedAircraftId === aircraft.r;

    if (isFollowing) {
        // Unfollow
        uiState.isFollowingAircraft = false;
        window._followedAircraftId = null;
        const event = new CustomEvent('unfollowAircraft');
        document.dispatchEvent(event);
        console.log("⏹️ Stopper med at følge fly");

        // Update button
        updateFollowButton();
    } else {
        // Follow
        uiState.isFollowingAircraft = true;
        window._followedAircraftId = aircraft.r;
        const event = new CustomEvent('followAircraft', { detail: aircraft });
        document.dispatchEvent(event);
        console.log(`📍 Følger nu ${aircraft.flight?.trim() || aircraft.r}`);

        // Update button
        updateFollowButton();

        // Close bottom sheet after a short delay
        setTimeout(() => {
            closeBottomSheet();
        }, 300);
    }
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
    alert(`Squawk Koder - Forklaring

NØDSITUATIONER (Altid aktiv):
7700 - Generel nødsituation
7600 - Tabt kommunikation
7500 - Ulovlig handling (kapring)

MILITÆRE OPERATIONER:
7777 - Militær afvisning (interception)
4000 - Militære operationer (generelt)
4400-4477 - Militære reserverede områder
7401-7477 - Militære øvelser & UAV-missioner
7610-7676 - Specifikke militære missioner
4575 - NATO AWACS-flyvning

SPECIELLE OPERATIONER:
0021-0022 - VFR lavhøjde (Tyskland)
0030 - Testflyvning
0033 - Faldskærmsudspring (Europa)
1200 - VFR standard (USA/Canada)
1255 - Brandbekæmpelse
1277 - Søge- og redningsoperationer (SAR)
7000 - VFR standard (Europa)
7400 - UAV mistet forbindelse

RANGES:
3000-3777 - Diverse specialmissioner
5000-5377 - Operationelle militærflyvninger

Kilde: Offentligt tilgængelige ADS-B data`);
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

    // Emergency (highest priority)
    if (['7500', '7600', '7700'].includes(squawk)) {
        return 'emergency';
    }

    // Special squawk codes (including civilian special operations)
    const specialSquawks = ['7000', '1200', '0020', '0021', '0022', '0023', '0024', '0025',
                           '0030', '0031', '0032', '0033', '0100', '1255', '1277', '7400'];
    if (specialSquawks.includes(squawk)) {
        return 'special';
    }

    // Special squawk ranges (civilian special missions)
    const specialRanges = [
        [3000, 3777],  // Diverse specialmissioner (often civilian)
        [5000, 5377]   // Operationelle specialflyvninger
    ];

    // Military squawk ranges (actual military operations)
    const militaryRanges = [
        [4400, 4477],  // Militære reserverede områder
        [7401, 7477],  // Militære øvelser & UAV-missioner
        [7610, 7676],  // Specifikke militære missioner
        [4000, 4000],  // Militære operationer (generelt)
        [7777, 7777],  // Militær afvisning (interception)
        [4575, 4575]   // NATO AWACS-flyvning
    ];

    const squawkNum = parseInt(squawk, 10);
    if (!isNaN(squawkNum)) {
        // Check special ranges first
        for (const [start, end] of specialRanges) {
            if (squawkNum >= start && squawkNum <= end) {
                return 'special';
            }
        }

        // Then check military ranges
        for (const [start, end] of militaryRanges) {
            if (squawkNum >= start && squawkNum <= end) {
                return 'military';
            }
        }
    }

    // Everything else is civilian
    return 'civilian';
}

function getCategoryLabel(category) {
    const labels = {
        'emergency': 'NØD',
        'military': 'MILITÆR',
        'special': 'SPECIAL',
        'civilian': 'CIVIL'
    };
    return labels[category] || 'CIVIL';
}

export function getUserLocation() {
    return uiState.userLocation;
}
