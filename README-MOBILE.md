# ✈️ MilAir Watch - Live Militær Fly Radar

> En moderne, mobile-first web-applikation til tracking af militære fly og nødsituationer i realtid baseret på offentlige ADS-B data.

**🌐 Live Demo:** https://joachimth.github.io/adsb-planes-mil/

---

## 📱 Features

### 🎯 Mobile-First Design
- **Fullscreen radar-style map** som primær visning
- **Touch-optimerede kontrolelementer** med stor touch-target
- **Dark tema** med høj kontrast for nem aflæsning
- **App-lignende oplevelse** optimeret til smartphones og tablets

### ✈️ Aircraft Tracking
- **Real-time opdateringer** hvert 30. sekund fra ADSB.lol API
- **Color-coded markers:**
  - 🟢 Grøn = Militære fly
  - 🔴 Rød = Nødsituationer (7500, 7600, 7700)
  - 🟡 Gul = Specielle squawk koder
  - 🔵 Blå = Civile fly

### 🎛️ Smart Filtering
- **Bottom filter bar** med store, touch-venlige knapper
- **Militær filter** - Vis/skjul militære operationer
- **Nød-alarm** - Altid aktiv, fremhæver kritiske situationer
- **Special squawk** - Søge- og redningsmissioner, testflyvninger mm.

### 📊 Multiple Views
- **Kortvisning** - Interaktivt Leaflet-kort med live positioner
- **Listevisning** - Sortérbar liste over alle aktive fly
- **Detaljeret aircraft info** - Bottom sheet med alle data

### 🌐 Advanced Features
- **Geolocation** - Vis afstand til fly fra din position
- **Follow aircraft** - Centrér kortet på specifikt fly
- **Share funktionalitet** - Del interessante fly
- **Notifikationer** - Modtag alerts ved nødsituationer (opt-in)

---

## 🏗️ Teknisk Stack

### Frontend
- **HTML5** - Moderne, semantisk markup
- **CSS3** - Mobile-first responsive design med CSS custom properties
- **Vanilla JavaScript (ES6+)** - Modulær arkitektur, ingen frameworks

### Libraries
- **Leaflet.js 1.9.4** - Interaktivt kort
- **Color Markers** - Farvekodede fly-ikoner

### Data & APIs
- **ADSB.lol v2 API** - Real-time ADS-B data
- **CORS Proxy** - corsproxy.io for browser-baserede API calls

### Hosting
- **GitHub Pages** - Static site hosting (gratis)
- **100% client-side** - Ingen backend påkrævet

---

## 🚀 Quick Start

### Local Development

Du skal køre applikationen fra en webserver (ikke `file://` protokollen):

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

Åbn derefter:
```
http://localhost:8000/index-mobile.html
```

---

## 📂 Project Structure

```
adsb-planes-mil/
├── index-mobile.html          # Mobile-first HTML
├── style-mobile.css           # Dark radar theme CSS
├── js/
│   ├── main-mobile.js         # Main controller
│   ├── mobile-ui.js           # Mobile UI components
│   ├── filter-bar.js          # Bottom filter bar
│   ├── list-view.js           # List view functionality
│   └── map_section_mobile.js  # Leaflet map med colored markers
├── DEPLOYMENT.md              # GitHub Pages guide
├── CLAUDE.md                  # AI assistant documentation
└── README-MOBILE.md           # This file
```

---

## 🎨 UI/UX Design

### Layout
```
┌─────────────────────────────┐
│  ✈️ MilAir Watch      ☰     │ Top Bar (56px)
├─────────────────────────────┤
│                             │
│                             │
│      Fullscreen Map         │
│      (Leaflet.js)           │
│                             │
│                             │
├─────────────────────────────┤
│ 🪖    🚨    ⭐    📋       │ Filter Bar
│ MIL   NØD  SPEC  LISTE     │ (Bottom Sticky)
└─────────────────────────────┘
```

### Color Scheme (Dark Radar Theme)
```css
Background:    #0a0e1a  /* Deep navy */
Surface:       #1a1f2e  /* Elevated surface */
Primary:       #00d4ff  /* Cyan accent */
Military:      #00ff88  /* Green */
Emergency:     #ff3366  /* Red */
Special:       #ffaa00  /* Amber */
```

### Typography
- System fonts for optimal performance
- Courier New for data (callsigns, squawks)
- Sans-serif for UI labels

---

## 📱 Mobile Features

### Bottom Sheet
Swipe up from aircraft marker for detailed info:
- Callsign & status badge
- Altitude, speed, squawk code
- ICAO hex, country
- Distance from your location (if enabled)
- Actions: Follow aircraft, Share

### Hamburger Menu
Right-slide menu with:
- Dark mode toggle (always on)
- Geolocation toggle
- Notification preferences
- About & info pages
- GitHub link

### Gestures
- **Tap marker** → Open aircraft details
- **Tap bottom sheet handle** → Swipe to close
- **Pinch/zoom** → Standard map zoom
- **Tap filter button** → Toggle category

---

## 🔐 Privacy & Security

### Data Collection
- ✅ NO user data collected
- ✅ NO tracking cookies
- ✅ NO analytics by default

### Geolocation
- 🔒 Opt-in only
- 🔒 Stored locally (never sent to server)
- 🔒 Can be disabled anytime

### Notifications
- 🔒 Requires user permission
- 🔒 Only for emergency alerts
- 🔒 Can be disabled

### API Security
- ✅ HTTPS only
- ✅ Public ADS-B data (no secrets)
- ✅ CORS proxy for browser compatibility

---

## 🌍 Browser Support

### Mobile
- ✅ iOS Safari 14+
- ✅ Android Chrome 90+
- ✅ Samsung Internet
- ✅ Firefox Mobile

### Desktop
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+

### Progressive Web App
Can be installed on mobile:
1. Open in Safari/Chrome
2. Tap "Share" → "Add to Home Screen"
3. Launch like a native app

---

## 📊 Performance

### Lighthouse Scores (Target)
- 🎯 Performance: 90+
- 🎯 Accessibility: 95+
- 🎯 Best Practices: 95+
- 🎯 SEO: 100

### Optimizations
- ✅ Minimal JavaScript (no frameworks)
- ✅ CSS custom properties (no preprocessing)
- ✅ Lazy loading
- ✅ Efficient map rendering
- ✅ 30s update interval (not too aggressive)

---

## 🛠️ Development

### Prerequisites
- Git
- Modern browser
- Local webserver (Python/Node/PHP)

### Setup
```bash
# Clone repository
git clone https://github.com/joachimth/adsb-planes-mil.git
cd adsb-planes-mil

# Start dev server
python -m http.server 8000

# Open browser
open http://localhost:8000/index-mobile.html
```

### Making Changes
1. Edit files in your preferred editor
2. Refresh browser to see changes
3. Test on mobile (use DevTools device mode)
4. Commit and push

---

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

**Quick deploy to GitHub Pages:**

```bash
# Method 1: Deploy from /docs
mkdir -p docs
cp index-mobile.html docs/index.html
cp style-mobile.css docs/style.css
cp -r js docs/
git add docs/
git commit -m "Deploy mobile UI"
git push

# Enable in Settings → Pages → /docs folder
```

---

## 🤝 Contributing

Contributions are welcome!

### How to contribute:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly (mobile + desktop)
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Areas for contribution:
- 🎨 UI/UX improvements
- 🐛 Bug fixes
- 📱 PWA features (manifest, service worker)
- 🌍 Internationalization
- 📊 New filters or sorting options
- 🗺️ Alternative map layers
- ⚡ Performance optimizations

---

## 📖 Documentation

- [CLAUDE.md](CLAUDE.md) - Complete technical documentation for AI assistants
- [DEPLOYMENT.md](DEPLOYMENT.md) - GitHub Pages deployment guide
- [README.md](README.md) - Original project README

---

## 🐛 Known Issues

1. **CORS Proxy dependency** - Using free public proxy (could have downtime)
2. **API rate limits** - ADSB.lol may throttle requests
3. **Map tile loading** - Depends on OpenStreetMap CDN
4. **Geolocation accuracy** - Varies by device/browser

---

## 🗺️ Roadmap

### v2.0 (Mobile Release) ✅
- [x] Mobile-first redesign
- [x] Bottom sheet UI
- [x] Filter bar
- [x] List view
- [x] Color-coded markers
- [x] Geolocation support

### v2.1 (Planned)
- [ ] PWA manifest & service worker
- [ ] Offline support
- [ ] Aircraft trails (history)
- [ ] Custom squawk code filters
- [ ] Multi-language support (EN/DA)
- [ ] Dark/light theme toggle

### v3.0 (Future)
- [ ] Advanced search
- [ ] Save favorite aircraft
- [ ] Flight path predictions
- [ ] Historical data
- [ ] 3D map view
- [ ] Voice announcements

---

## 📜 License

MIT License - Copyright (c) 2025 Joachim Thirsbro

See [LICENSE](LICENSE) for full text.

---

## 🙏 Credits

### Data Sources
- **ADSB.lol** - Real-time ADS-B data
- **OpenStreetMap** - Map tiles

### Libraries
- **Leaflet.js** - Interactive maps
- **leaflet-color-markers** - Colored map markers

### Icons
- Emoji used for UI elements (universal, no external deps)

---

## 📞 Contact

**Author:** Joachim Thirsbro

**GitHub:** [@joachimth](https://github.com/joachimth)

**Project:** https://github.com/joachimth/adsb-planes-mil

---

## ⚠️ Disclaimer

**VIGTIGT:**
- Data er fra offentlige kilder og kan være unøjagtig
- Brug IKKE til navigation eller sikkerhedskritiske formål
- Real-time tracking kan have forsinkelse (op til 30 sek)
- Ikke alle fly udsender ADS-B signaler
- Militære fly kan bruge "stealth" mode uden transponder

Dette projekt er udelukkende til informations- og uddannelsesformål.

---

**🎉 Enjoy tracking!**

*Made with ❤️ for aviation enthusiasts*
