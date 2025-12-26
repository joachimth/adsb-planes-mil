#!/bin/bash

# Deploy MilAir Watch Mobile to docs/ folder for GitHub Pages
# Usage: ./deploy-to-docs.sh

echo "🚀 Deploying MilAir Watch Mobile to docs/ folder..."

# Create docs directory
echo "📁 Creating docs/ directory..."
mkdir -p docs/js

# Copy HTML (rename to index.html)
echo "📄 Copying HTML..."
cp index-mobile.html docs/index.html

# Copy CSS (rename to style.css)
echo "🎨 Copying CSS..."
cp style-mobile.css docs/style.css

# Copy JavaScript files
echo "📜 Copying JavaScript..."
cp js/main-mobile.js docs/js/
cp js/mobile-ui.js docs/js/
cp js/filter-bar.js docs/js/
cp js/list-view.js docs/js/
cp js/map_section_mobile.js docs/js/
cp js/regions.js docs/js/
cp js/heatmap.js docs/js/
cp js/history.js docs/js/
cp js/aircraft-info.js docs/js/
cp js/squawk-lookup.js docs/js/

# Copy data files
echo "📊 Copying data files..."
cp squawk_codes.json docs/

# Copy assets
echo "🎨 Copying assets..."
cp favicon.svg docs/

# Update script reference in docs/index.html
echo "🔧 Updating script reference..."
sed -i 's/style-mobile.css/style.css/g' docs/index.html

# Create 404 redirect
echo "🔀 Creating 404 redirect..."
cat > docs/404.html << 'EOF'
<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=/adsb-planes-mil/">
    <title>Redirecting...</title>
</head>
<body>
    <p>Redirecting to <a href="/adsb-planes-mil/">MilAir Watch</a>...</p>
</body>
</html>
EOF

# Create README for docs folder
echo "📖 Creating docs/README.md..."
cat > docs/README.md << 'EOF'
# MilAir Watch - Deployment Folder

This folder contains the production-ready files for GitHub Pages deployment.

**Live Site:** https://joachimth.github.io/adsb-planes-mil/

## Files

- `index.html` - Main application (mobile-first)
- `style.css` - Dark radar theme
- `js/` - JavaScript modules

## How to Deploy

1. Push this folder to GitHub
2. Enable GitHub Pages in repository settings
3. Select `main` branch and `/docs` folder
4. Wait 1-5 minutes for deployment

## Updating

Run `../deploy-to-docs.sh` from the root directory to update this folder.
EOF

# Create a simple .nojekyll file to prevent Jekyll processing
echo "🚫 Creating .nojekyll..."
touch docs/.nojekyll

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "📂 Files copied to docs/ folder:"
ls -lh docs/
echo ""
echo "📂 JavaScript files:"
ls -lh docs/js/
echo ""
echo "📋 Next steps:"
echo "1. Review files in docs/ folder"
echo "2. Test locally: python -m http.server 8000"
echo "3. Commit changes: git add docs/ && git commit -m 'Deploy mobile UI'"
echo "4. Push to GitHub: git push origin main"
echo "5. Enable GitHub Pages in Settings → Pages → /docs folder"
echo ""
echo "🌐 Your site will be live at:"
echo "   https://joachimth.github.io/adsb-planes-mil/"
echo ""
echo "🎉 Happy deploying!"
