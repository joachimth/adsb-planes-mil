#!/usr/bin/env node
/**
 * render-screenshots.js — Automated screenshot rendering for MilAir Watch
 *
 * Opens the local docs/index.html in a headless browser via a simple HTTP
 * server, renders screenshots at multiple device viewport sizes, and saves
 * them to docs/screenshots/.
 *
 * Usage:
 *   node scripts/render-screenshots.js
 *
 * Requirements: puppeteer installed (npm install puppeteer or bun add puppeteer)
 */

const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Configuration ────────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const SCREENSHOTS_DIR = path.join(DOCS_DIR, 'screenshots');
const PORT = 9876;
const BASE_URL = `http://localhost:${PORT}`;

// Device viewport configurations
const DEVICES = [
    {
        name: 'iphone-17-pro',
        label: 'iPhone 17 Pro',
        width: 402,
        height: 874,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
    },
    {
        name: 'iphone-se',
        label: 'iPhone SE',
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
    },
    {
        name: 'ipad',
        label: 'iPad',
        width: 768,
        height: 1024,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
    },
    {
        name: 'desktop',
        label: 'Desktop',
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
    },
];

// Wait time for API fetch + map render (ms)
const DATA_WAIT_MS = 8000;
const EXTRA_SETTLE_MS = 2000;

// ── Utility: sleep (replaces page.waitForTimeout which was removed in newer Puppeteer) ─
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Simple static file server ────────────────────────────────────────────────

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
};

function createServer(rootDir) {
    return http.createServer((req, res) => {
        let urlPath = decodeURIComponent(req.url.split('?')[0]);
        if (urlPath === '/') urlPath = '/index.html';

        const filePath = path.join(rootDir, urlPath);

        // Prevent directory traversal
        if (!filePath.startsWith(rootDir)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not found: ' + urlPath);
                return;
            }
            const ext = path.extname(filePath).toLowerCase();
            const mime = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': mime });
            res.end(data);
        });
    });
}

// ── Screenshot helpers ───────────────────────────────────────────────────────

/**
 * Wait for the Leaflet map to be initialized and tiles to start loading.
 */
async function waitForMap(page) {
    try {
        await page.waitForSelector('#map.leaflet-container', { timeout: 15000 });
        console.log('  ✓ Map container found');
    } catch (e) {
        console.log('  ⚠ Map container not detected, continuing anyway...');
    }
}

/**
 * Wait for aircraft markers to appear on the map.
 * Checks for Leaflet marker elements (img.leaflet-marker-icon).
 */
async function waitForAircraft(page) {
    console.log(`  ⏳ Waiting ${DATA_WAIT_MS / 1000}s for API data...`);
    await sleep(DATA_WAIT_MS);

    // Check if markers appeared
    const markerCount = await page.evaluate(() => {
        const markers = document.querySelectorAll('.leaflet-marker-icon');
        return markers.length;
    });

    if (markerCount > 0) {
        console.log(`  ✓ ${markerCount} aircraft markers found on map`);
    } else {
        console.log('  ⚠ No aircraft markers found (API may be unreachable). Taking screenshots of UI layout.');
    }

    // Extra settle time for tile rendering
    await sleep(EXTRA_SETTLE_MS);
}

/**
 * Try to click the first aircraft marker to open the bottom sheet.
 * Returns true if bottom sheet became visible.
 */
async function tryOpenBottomSheet(page) {
    try {
        // Get first marker position
        const markerInfo = await page.evaluate(() => {
            const markers = document.querySelectorAll('.leaflet-marker-icon');
            if (markers.length === 0) return null;
            const m = markers[0];
            const rect = m.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                count: markers.length,
            };
        });

        if (!markerInfo) {
            console.log('  ⚠ No markers to click for bottom sheet');
            return false;
        }

        console.log(`  🖱 Clicking first marker at (${markerInfo.x}, ${markerInfo.y})...`);

        // Click the marker
        await page.mouse.click(markerInfo.x, markerInfo.y);
        await sleep(1500);

        // Check if bottom sheet is now visible
        const sheetVisible = await page.evaluate(() => {
            const sheet = document.getElementById('bottomSheet');
            if (!sheet) return false;
            return sheet.classList.contains('visible') ||
                   getComputedStyle(sheet).transform !== 'translateY(100%)' &&
                   getComputedStyle(sheet).bottom !== '-100%';
        });

        if (sheetVisible) {
            console.log('  ✓ Bottom sheet opened');
            // Wait for sheet animation
            await sleep(1000);
            return true;
        }

        // Fallback: try directly calling openBottomSheet via the page
        console.log('  ⚠ Click did not open sheet, trying fallback...');
        const fallbackWorked = await page.evaluate(() => {
            // Try to find and dispatch a click event on the marker
            const markers = document.querySelectorAll('.leaflet-marker-icon');
            if (markers.length > 0) {
                markers[0].click();
                return true;
            }
            return false;
        });

        if (fallbackWorked) {
            await sleep(1500);
            const visibleNow = await page.evaluate(() => {
                const sheet = document.getElementById('bottomSheet');
                return sheet && sheet.classList.contains('visible');
            });
            if (visibleNow) {
                console.log('  ✓ Bottom sheet opened (fallback)');
                return true;
            }
        }

        console.log('  ⚠ Could not open bottom sheet');
        return false;
    } catch (e) {
        console.log('  ⚠ Error opening bottom sheet:', e.message);
        return false;
    }
}

/**
 * Take a screenshot at the current viewport.
 */
async function takeScreenshot(page, filename, fullPage = false) {
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({
        path: filepath,
        fullPage: fullPage,
        type: 'png',
    });
    const stats = fs.statSync(filepath);
    const sizeKB = (stats.size / 1024).toFixed(0);
    console.log(`  📸 Saved ${filename} (${sizeKB} KB)`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    // Ensure screenshots directory exists
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
        fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    // Start static file server
    const server = createServer(DOCS_DIR);
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`🌐 HTTP server running at ${BASE_URL}`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--force-device-scale-factor=1',
            ],
        });
        console.log('🖥  Browser launched');

        for (const device of DEVICES) {
            console.log(`\n📱 Rendering: ${device.label} (${device.width}x${device.height})`);

            const page = await browser.newPage();
            await page.setViewport({
                width: device.width,
                height: device.height,
                deviceScaleFactor: device.deviceScaleFactor,
                isMobile: device.isMobile,
                hasTouch: device.hasTouch,
            });

            // Set user agent for mobile devices
            if (device.isMobile) {
                await page.setUserAgent(
                    device.width >= 768
                        ? 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                        : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                );
            }

            // Collect console messages for debugging
            page.on('console', (msg) => {
                if (msg.type() === 'error') {
                    console.log(`  [console.error] ${msg.text()}`);
                }
            });

            // Navigate to the app
            console.log(`  → Navigating to ${BASE_URL}/`);
            await page.goto(`${BASE_URL}/`, {
                waitUntil: 'networkidle2',
                timeout: 30000,
            });

            // Wait for map to initialize
            await waitForMap(page);

            // Wait for aircraft data to load
            await waitForAircraft(page);

            // Take the main screenshot
            const mainFilename = `${device.name}.png`;
            await takeScreenshot(page, mainFilename);

            // Try to open bottom sheet and take another screenshot
            console.log('  → Attempting bottom sheet screenshot...');
            const sheetOpened = await tryOpenBottomSheet(page);
            if (sheetOpened) {
                const sheetFilename = `${device.name}-bottom-sheet.png`;
                await takeScreenshot(page, sheetFilename);
            }

            await page.close();
        }

        console.log('\n✅ All screenshots rendered successfully!');
        console.log(`📁 Saved to: ${SCREENSHOTS_DIR}`);

        // List generated files
        const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
        console.log(`\nGenerated ${files.length} screenshot(s):`);
        files.forEach(f => {
            const stats = fs.statSync(path.join(SCREENSHOTS_DIR, f));
            console.log(`   ${f} (${(stats.size / 1024).toFixed(0)} KB)`);
        });

    } finally {
        if (browser) await browser.close();
        server.close();
        console.log('\n🔌 Server stopped');
    }
}

main().catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
