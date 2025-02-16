# Militære og Civile Fly Tracker (ADSB.lol)

## Beskrivelse

Dette projekt er en webapplikation, der viser militære og civile fly over Europa i realtid ved hjælp af **ADSB.lol API**. Siden har automatisk opdatering, viser flyveveje, og markerer fly med **nød-squawk** tydeligt.

## Funktioner

✅ **Henter data fra ADSB.lol API (ingen API-nøgle krævet)**\
✅ **Automatisk opdatering hvert 30. sekund**\
✅ **Visuel alarm for fly med squawk 7500 (kapring), 7600 (kommunikationsfejl) eller 7700 (nødsituation)**\
✅ **Mulighed for at filtrere kun fly med nød-squawk**\
✅ **Mulighed for at vise civile fly som et tilvalg**\
✅ **Viser flyveveje over tid**\
✅ **Hostes på GitHub Pages**

## Teknologier

- **HTML, CSS, JavaScript**
- **Leaflet.js** til kortvisualisering
- **ADSB.lol API** til flydata
- **GitHub Pages** til hosting

## Brugervejledning

1. **Åbn websiden** via GitHub Pages linket.
2. **Siden opdateres automatisk** hver 30. sekund.
3. **Klik på "Filtrér kun nød-squawk"** for at vise kun fly i nødsituationer.
4. **Klik på "Vis civile fly"** for at inkludere civile fly i visningen.
5. **Hvis en nød-squawk opdages, vises en blinkende rød alarm**.
6. **Klik på alarm-banneret for at skjule det**.

## Fejlfinding

**Siden viser ikke fly?**

- Tjek at ADSB.lol API'et er online: [api.adsb.lol](https://api.adsb.lol/).
- Opdater siden.

**GitHub Pages viser ikke siden?**

- Tjek at du har aktiveret GitHub Pages korrekt.
- Brug `main` eller `master` branch til deployment.

## Mulige Udvidelser

🚀 **Lydalarm ved nød-squawk**\
🚀 **Automatisk zoom til fly med nød-squawk**\
🚀 **Dynamiske flyikoner afhængigt af flytype**

## Bidrag

- Opret en **Issue** for fejl eller forslag.
- Lav en **Pull Request**, hvis du vil bidrage.

## Licens

Dette projekt er åbent kildekode og udgivet under **MIT-licensen**.

