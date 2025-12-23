## 🚀 GitHub Pages Deployment Guide - MilAir Watch

This guide explains how to deploy the MilAir Watch mobile app to GitHub Pages as a static site.

---

## 📋 Prerequisites

- GitHub repository: `joachimth/adsb-planes-mil`
- Git installed locally
- Basic understanding of GitHub Pages

---

## 🎯 Deployment Methods

### Method 1: Deploy from `docs/` folder (Recommended)

This method keeps deployment files separate from source code.

#### Step 1: Prepare deployment files

```bash
# Create docs directory
mkdir -p docs

# Copy mobile app files
cp index-mobile.html docs/index.html
cp style-mobile.css docs/style.css
cp -r js docs/

# Create a simple 404 page
echo "<!DOCTYPE html><html><head><meta http-equiv='refresh' content='0;url=/adsb-planes-mil/'></head></html>" > docs/404.html
```

#### Step 2: Update file paths (if needed)

Since the site will be served from `https://joachimth.github.io/adsb-planes-mil/`, all paths in your HTML should be relative (which they already are).

**✅ Good (relative paths):**
```html
<link rel="stylesheet" href="style.css">
<script src="js/main-mobile.js"></script>
```

**❌ Bad (absolute paths):**
```html
<link rel="stylesheet" href="/style.css">
<script src="/js/main-mobile.js"></script>
```

#### Step 3: Enable GitHub Pages

1. Go to your repository: https://github.com/joachimth/adsb-planes-mil
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - Branch: `main` (or your branch)
   - Folder: `/docs`
4. Click **Save**

#### Step 4: Wait for deployment

GitHub will build and deploy your site. This takes 1-5 minutes.

Your site will be available at:
```
https://joachimth.github.io/adsb-planes-mil/
```

---

### Method 2: Deploy from root

If you want to deploy directly from the repository root:

#### Step 1: Rename files

```bash
# Rename mobile files to main files
mv index-mobile.html index.html
mv style-mobile.css style.css

# Backup old files if needed
mv index.html index-old.html (if exists)
mv style.css style-old.css (if exists)
```

#### Step 2: Update main.js reference

In `index.html`, update the script tag:
```html
<script type="module" src="js/main-mobile.js"></script>
```

#### Step 3: Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Select:
   - Branch: `main`
   - Folder: `/ (root)`
3. Click **Save**

---

## 🧪 Testing Locally

Before deploying, always test locally:

### Using Python (recommended)

```bash
# Python 3
python -m http.server 8000

# Then open: http://localhost:8000/index-mobile.html
```

### Using Node.js

```bash
npx http-server

# Then open: http://localhost:8080/index-mobile.html
```

### Using PHP

```bash
php -S localhost:8000

# Then open: http://localhost:8000/index-mobile.html
```

---

## ✅ Pre-Deployment Checklist

Before pushing to GitHub:

- [ ] All file paths are relative (no `/` prefix)
- [ ] CSS file is linked correctly
- [ ] JavaScript modules load without errors
- [ ] Map displays correctly
- [ ] Filters work (military, emergency, special)
- [ ] Bottom sheet opens when clicking aircraft
- [ ] List view toggles correctly
- [ ] Hamburger menu opens
- [ ] No console errors
- [ ] Mobile view tested (use browser DevTools)
- [ ] API calls work (check Network tab)
- [ ] Emergency alerts display

---

## 🔧 Common Issues & Solutions

### Issue: Page loads but CSS missing

**Problem:** CSS not loading, page looks broken

**Solution:**
- Check CSS path in HTML: should be `style.css` not `/style.css`
- Verify file exists in same directory as HTML
- Check browser console for 404 errors

### Issue: JavaScript errors

**Problem:** `Failed to load module script`

**Solution:**
- Ensure `type="module"` in script tag
- Check all import paths are correct
- Verify all JS files exist in `js/` folder

### Issue: Map doesn't load

**Problem:** Map container is empty or shows error

**Solution:**
- Check Leaflet CSS and JS are loaded from CDN
- Verify API URL is correct
- Check CORS proxy is working
- Look for console errors

### Issue: API calls fail

**Problem:** No aircraft data loads

**Solution:**
- Verify CORS proxy URL: `https://corsproxy.io/?url=`
- Check API endpoint: `https://api.adsb.lol/v2/mil`
- Try accessing API directly in browser
- Check Network tab in DevTools for errors

### Issue: 404 on GitHub Pages

**Problem:** GitHub Pages shows 404 error

**Solution:**
- Wait 5 minutes after enabling Pages
- Check branch and folder settings are correct
- Verify index.html exists in deployment folder
- Check Actions tab for build errors

---

## 📱 Mobile Testing

Test on actual mobile devices:

### iOS (Safari)
1. Deploy to GitHub Pages
2. Open on iPhone/iPad
3. Test touch interactions
4. Check bottom sheet swipe
5. Verify filters work

### Android (Chrome)
1. Deploy to GitHub Pages
2. Open on Android device
3. Test all touch interactions
4. Check geolocation permission
5. Verify notifications (if enabled)

### Desktop Responsive
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test various screen sizes
4. Check both portrait and landscape

---

## 🔄 Update Workflow

When you make changes:

```bash
# 1. Make changes to files
# 2. Test locally
python -m http.server 8000

# 3. Commit changes
git add .
git commit -m "Update mobile UI"

# 4. Push to GitHub
git push origin main

# 5. Wait for GitHub Pages to rebuild (1-5 minutes)
```

---

## 🌐 Custom Domain (Optional)

To use a custom domain like `milair.example.com`:

1. Add CNAME file to deployment folder:
   ```bash
   echo "milair.example.com" > docs/CNAME
   ```

2. Configure DNS with your domain provider:
   ```
   Type: CNAME
   Name: milair (or @)
   Value: joachimth.github.io
   ```

3. In GitHub Settings → Pages, enter custom domain

4. Wait for DNS propagation (up to 24 hours)

---

## 📊 Performance Tips

### Optimize for GitHub Pages

1. **Enable caching:**
   - GitHub Pages automatically caches static assets
   - Use versioned filenames for cache busting: `style-v2.css`

2. **Minimize files:**
   - Minify CSS: Use a tool like `cssnano`
   - Minify JS: Use `terser` or `uglify-js`

3. **Lazy load:**
   - Images: Use `loading="lazy"`
   - Scripts: Use `defer` or `async`

4. **Reduce requests:**
   - Combine CSS files
   - Inline critical CSS
   - Use CDN for libraries (Leaflet, etc.)

---

## 🔐 Security Considerations

### API Keys
- ✅ No API keys needed (ADSB.lol is public)
- ✅ CORS proxy handles cross-origin requests
- ⚠️ Never commit secrets or API keys to GitHub

### CORS Proxy
- Current proxy: `corsproxy.io` (free, public)
- Alternative: Host your own proxy
- Consider rate limiting for production

### HTTPS
- ✅ GitHub Pages enforces HTTPS automatically
- ✅ All API calls use HTTPS

---

## 📈 Analytics (Optional)

To track usage, add Google Analytics or Plausible:

### Google Analytics 4

Add to `<head>` in index.html:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Plausible (Privacy-friendly)

```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

---

## 🆘 Getting Help

If you encounter issues:

1. **Check browser console** (F12 → Console)
2. **Check Network tab** (F12 → Network)
3. **Review GitHub Actions** (if deployment fails)
4. **Create an issue** on GitHub
5. **Check CLAUDE.md** for architecture details

---

## 📝 File Structure for Deployment

```
docs/  (or root)
├── index.html (renamed from index-mobile.html)
├── style.css (renamed from style-mobile.css)
├── js/
│   ├── main-mobile.js
│   ├── mobile-ui.js
│   ├── filter-bar.js
│   ├── list-view.js
│   └── map_section_mobile.js
├── assets/ (optional)
│   ├── favicon.ico
│   ├── og-image.png
│   └── badge.png
└── CNAME (optional, for custom domain)
```

---

## ✨ Post-Deployment

After successful deployment:

1. ✅ Test site on mobile device
2. ✅ Share URL with users
3. ✅ Monitor for errors
4. ✅ Update README with live site link
5. ✅ Consider PWA manifest for "install" option

---

**Your site will be live at:**
```
https://joachimth.github.io/adsb-planes-mil/
```

**🎉 Happy deploying!**
