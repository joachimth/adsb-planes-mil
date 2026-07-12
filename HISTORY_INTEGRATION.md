# Historical Flight Route Integration

When deployed, the MilAir Watch can show historical flight tracks (up to 30 days
back) by fetching from a Cloudflare Worker that proxies the OpenSky Network API.

## How it works

1. The user taps an aircraft → `showTrack` event fires.
2. `map_section_mobile.js` calls `fetchHistoricalTrack(hex, lookbackS)` from
   `js/history-proxy.js`.
3. The proxy fetches historical positions from OpenSky Network's `/tracks/all`
   endpoint and returns them as JSON.
4. `mergeTracks()` deduplicates and merges historical positions with the local
   track-store buffer (from the current app session).
5. The combined route is drawn on the map.

## Setup

### 1. Deploy milair-history-proxy

```bash
git clone git@github.com:joachimth/milair-history-proxy.git
cd milair-history-proxy
npm install
wrangler login
wrangler secret put OPENSKY_CLIENT_ID
wrangler secret put OPENSKY_CLIENT_SECRET
wrangler deploy
```

### 2. Configure the URL in adsb-planes-mil

Edit `js/history-proxy.js` and set `HISTORY_PROXY_BASE`:

```js
export const HISTORY_PROXY_BASE = 'https://milair-history-proxy.your-username.workers.dev';
```

### 3. That's it

The cache-bust version doesn't need bumping for the integration — the proxy
fetch is a soft feature: if the URL is null, the app works exactly as before
with only local tracks.

## Performance notes

- Tracks are cached in-memory for 5 minutes per aircraft+time window
  (Map; max 50 entries).
- Proxy timeout is 15s per request.
- Default lookback for "all" interval is 6 hours — enough to catch most
  military flights over Denmark without hitting rate limits.
- OpenSky rate limit is ~4000 requests/day with credentials. The 5-min cache
  helps, but multiple users tapping the same hexes will reuse cache.
- Prewarm (not yet wired) could fetch history for visible aircraft on app load.
