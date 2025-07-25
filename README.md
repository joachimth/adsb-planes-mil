# Militær Fly Tracker

> Et interaktivt realtids-kort til at spore militære og andre specialflyvninger via åbne ADS-B data.

Projektet viser live-positioner for fly, der udsender specifikke militære eller nød-relaterede squawk-koder. Data hentes fra [ADSB.lol API'en](https://www.adsb.lol/api/) og opdateres automatisk.

## Hovedfunktioner

*   🗺️ **Interaktivt Realtids-kort:** Se flyenes positioner på et Leaflet-kort, der opdateres hvert 30. sekund.
*   📊 **Dynamisk Flytabel:** En tabel med detaljer om alle synlige fly, som opdateres synkront med kortet.
*   🔍 **Dobbelt Filtrering:**
    *   **Kaldesignal:** Søg og filtrer dynamisk på flyets kaldesignal.
    *   **Squawk-koder:** Vælg og fravælg kategorier af squawk-koder for at tilpasse, hvilke flytyper du vil se.
*   🚨 **Automatisk Nød-detektering:** Siden identificerer automatisk fly, der udsender nød-squawks (`7500`, `7600`, `7700`), fremhæver dem med et rødt ikon, viser en tydelig advarselsboks og zoomer automatisk ind på dem på kortet.
*   ⚙️ **Modulært Design:** Projektet er bygget med en ren og vedligeholdelsesvenlig kodestruktur, hvor HTML, CSS og JavaScript er fuldstændigt adskilt.

## Teknisk Overblik

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Kort-bibliotek:** [Leaflet.js](https://leafletjs.com/)
*   **Styling:** [MVP.css](https://mvp.css.io/) for simpel, responsiv styling.
*   **API:** [ADSB.lol](https://api.adsb.lol/v2/mil)
*   **CORS Proxy:** [corsproxy.io](https://corsproxy.io/) for at muliggøre API-kald fra browseren.

## Installation og Kørsel

Da dette projekt henter lokale filer (f.eks. `header.html`, `squawk_codes.json`) via `fetch()`, kan du ikke køre det ved blot at åbne `index.html` direkte i browseren (på grund af browserens sikkerhedsregler).

Du skal køre det fra en **lokal webserver**. Den nemmeste måde at starte en på er:

1.  Åbn en terminal eller kommandoprompt i projektets mappe.
2.  Kør denne kommando (kræver Python 3):
    ```bash
    python -m http.server
    ```
3.  Åbn din browser og gå til adressen `http://localhost:8000`.

## Sådan Bruger Du Siden

1.  **Automatisk Opdatering:** Kortet og tabellen opdateres automatisk hvert 30. sekund.
2.  **Filtrér på Kaldesignal:** Begynd at taste i "Filtrér efter kaldesignal"-feltet for at se en live-filtreret liste.
3.  **Filtrér på Squawk:** Vælg eller fravælg de forskellige squawk-koder i tabellen for at vise eller skjule de tilsvarende fly. Nød-koderne er altid aktive.
4.  **Nødsituationer:** Hvis et fly udsender en nød-squawk, vises en rød alarmboks øverst. Klik på krydset (`×`) for at skjule den.

## Fejlfinding

*   **Siden viser ingen fly?**
    *   Prøv at genindlæse siden (hard refresh: `Ctrl+Shift+R` eller `Cmd+Shift+R`).
    *   API'et fra ADSB.lol kan midlertidigt være nede.
    *   Tjek, at du kører siden fra en lokal webserver som beskrevet ovenfor.

## Bidrag

Har du forslag til forbedringer, eller har du fundet en fejl? Du er meget velkommen til at oprette en "Issue" her på GitHub!

## Licens

Dette projekt er udgivet under **MIT-licensen**. Se `LICENSE`-filen for flere detaljer. Du er fri til at bruge, ændre og distribuere koden.