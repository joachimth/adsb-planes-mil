#!/bin/bash

# Deploy MilAir Watch Mobile to docs/ folder for GitHub Pages
# Usage: ./deploy-to-docs.sh
#
# NOTE: index-mobile.html and docs/index.html are kept in sync.
# The ONLY difference is the CSS filename reference:
#   index-mobile.html  → style-mobile.css  (source/dev)
#   docs/index.html    → style.css         (deployed)
# Run this script after editing source files to sync to docs/.

set -e

echo "🚀 Deploying MilAir Watch Mobile to docs/ folder..."

# Create docs directory structure
echo "📁 Creating docs/ directory..."
mkdir -p docs/js

# Sync HTML (replace CSS ref for deployment)
echo "📄 Syncing HTML..."
sed 's/href="style-mobile.css"/href="style.css"/' index-mobile.html > docs/index.html

# Sync CSS
echo "🎨 Syncing CSS..."
cp style-mobile.css docs/style.css

# Sync JavaScript modules
echo "📜 Syncing JavaScript..."
cp js/main-mobile.js docs/js/
cp js/mobile-ui.js docs/js/
cp js/filter-bar.js docs/js/
cp js/list-view.js docs/js/
cp js/map_section_mobile.js docs/js/
cp js/regions.js docs/js/
cp js/heatmap.js docs/js/
cp js/aircraft-info.js docs/js/
cp js/squawk-lookup.js docs/js/

# Also copy desktop JS (kept for reference, not loaded by mobile)
cp js/main.js docs/js/
cp js/map_section.js docs/js/
cp js/flight_table.js docs/js/
cp js/callsign_filter.js docs/js/
cp js/squawk_filter.js docs/js/
cp js/emergency_alert.js docs/js/

# Sync data files
echo "📊 Syncing data files..."
cp squawk_codes.json docs/

# Sync assets
echo "🎨 Syncing assets..."
cp favicon.svg docs/
[ -f icon-192.png ] && cp icon-192.png docs/ || echo "⚠️  icon-192.png not found (run: python3 scripts/gen-icons.py)"
[ -f icon-512.png ] && cp icon-512.png docs/ || echo "⚠️  icon-512.png not found (run: python3 scripts/gen-icons.py)"
[ -f manifest.json ] && cp manifest.json docs/ || echo "⚠️  manifest.json not found in root (using docs/ version)"

# Ensure .nojekyll exists
touch docs/.nojekyll

echo ""
echo "✅ Deployment sync complete!"
echo ""
echo "📂 docs/ contents:"
ls -lh docs/
echo ""
echo "📋 Next steps:"
echo "1. Test locally: cd docs && python -m http.server 8000"
echo "2. Commit: git add docs/ && git commit -m 'chore: sync docs/ for GitHub Pages'"
echo "3. Push: git push origin main"
echo ""
echo "🌐 Live at: https://joachimth.github.io/adsb-planes-mil/"
