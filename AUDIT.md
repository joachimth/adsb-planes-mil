# AUDIT.md - adsb-planes-mil

**Gennemgang:** 2026-06-03  
**Udført af:** Kit  
**Commit udgangspunkt:** current main  
**Live site:** https://joachimth.github.io/adsb-planes-mil/

---

## Resumé

Solid codebase med god modulstruktur. 5 bugs fundet og fikset. Vigtigste: manglende PWA manifest (app installerede ikke korrekt), `og:image` der pegede på en ikke-eksisterende fil, og en forældet CSS-fil i `docs/` der skabte forvirring om kilden. CI/CD tilføjet - deployment er nu automatisk.

---

## Bugs fundet og fikset

### 🔴 BUG 1 - Manglende PWA manifest (kritisk for installation)
**Problem:** `docs/index.html` havde PWA meta-tags og `apple-mobile-web-app-capable`, men ingen `manifest.json`. Appen kunne ikke installeres korrekt som PWA - ingen ikon, navn eller splash screen ved installation.

**Fix:** Oprettet `docs/manifest.json` med navn, ikoner (192px + 512px), theme color, display mode. Linket i `docs/index.html`.

---

### 🔴 BUG 2 - `apple-touch-icon` pegede på SVG
**Problem:** `<link rel="apple-touch-icon" href="favicon.svg">` - iOS ignorerer SVG som touch icon. App-ikon på hjemskærm ville bruge en blank/standard placeholder.

**Fix:** Genereret `icon-192.png` og `icon-512.png` fra SVG-designet (mørk navy baggrund + grøn radar). `apple-touch-icon` opdateret til at pege på `icon-192.png`.

---

### 🔴 BUG 3 - `og:image` pegede på ikke-eksisterende fil
**Problem:** `<meta property="og:image" content="./assets/og-image.png">` - ingen `assets/` mappe eksisterede. Deling af siden på sociale medier ville vise intet billede.

**Fix:** Opdateret til `./icon-512.png` (genereret i Bug 2).

---

### 🟡 BUG 4 - Stale `docs/style-mobile.css` (forældet fil)
**Problem:** `docs/style-mobile.css` (1201 linjer) var et gammelt deploy-artefakt der ikke refereres af noget. `docs/index.html` bruger `style.css` (1360 linjer, nyere version). Den forældede fil skabte forvirring om hvilken CSS-fil der er aktiv.

**Fix:** Slettet `docs/style-mobile.css`.

---

### 🟡 BUG 5 - `index-mobile.html` divergerede fra `docs/index.html`
**Problem:** Deploy-scriptet kopierer `index-mobile.html` → `docs/index.html`, men `docs/index.html` var den eneste fil der havde de nye PWA-fixes og manifest-link. `index-mobile.html` var bagud. Kørte man `deploy-to-docs.sh`, ville de nye rettelser blive overskrevet.

**Fix:** `index-mobile.html` synkroniseret fra `docs/index.html` (kun CSS-reference bevaret som `style-mobile.css`). Deploy-scriptet opdateret med `set -e` og korrekte filreferencer.

---

## CI/CD tilføjet

**Tilføjet:** `.github/workflows/pages.yml`

GitHub Actions workflow der automatisk deployer `docs/` til GitHub Pages ved hvert push til `main`. Kræver at GitHub Pages er konfigureret til "GitHub Actions" deployment source (Settings → Pages → Source: GitHub Actions).

Tidligere var deployment 100% manuelt (kør `deploy-to-docs.sh`, commit, push).

---

## Kodevurdering

### JavaScript arkitektur
- ✅ Ren ES6 modul-arkitektur
- ✅ State management er centraliseret i `main-mobile.js`
- ✅ God fejlhåndtering med AbortController til API-kald
- ✅ `determineAircraftCategory()` er eksporteret korrekt og bruges konsistent
- ✅ Region-filtrering med Haversine-distance og buffer-zone er solid
- ✅ Grid-approach til store regioner (>250 NM radius) er fornuftigt
- ⚠️ **Single point of failure:** `corsproxy.io` bruges som CORS proxy til alle API-kald. Hvis den går ned, stopper appen. Ingen fallback-proxy konfigureret. Acceptabelt for et hobbyproject.

### CSS
- ✅ CSS custom properties gennemgående brugt
- ✅ Dark radar-tema er konsistent
- ⚠️ Region-button `.active` state bruger både CSS-klasse og JavaScript inline styles (i `initRegionSelector()`). Inline styles overskriver CSS-klassen. Fungerer men er skrøbeligt - en CSS-only løsning ville være renere.

### Data flow
- ✅ Emergency detection kører på UNFILTERED data (korrekt)
- ✅ Deduplication via `Map` ved grid-baserede API-kald
- ✅ Performance safeguard: 500 fly max

---

## Hvad der er tilbage til dig

1. **GitHub Pages konfiguration** - Gå til Settings → Pages → Source → sæt til "GitHub Actions" (ikke "Deploy from branch / docs/"). Når det er gjort, deployer CI/CD automatisk.

2. **iOS PWA-ikon test** - `icon-192.png` er genereret programmatisk. Tjek at det ser rimeligt ud når du tilføjer siden til hjemskærm.

3. **corsproxy.io dependency** - Overvej at tilføje en backup-proxy i `API_CONFIG.proxyUrl` som fallback.

4. **CORS proxy fjernelse** - `api.adsb.lol` og `api.adsb.fi` svarer sandsynligvis med `Access-Control-Allow-Origin: *` headers. Tjek om du overhovedet behøver proxy. Fjernes den, fjernes SPOF.
