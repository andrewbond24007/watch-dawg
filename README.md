# WatchDawg

Live market watcher: prices, candles, news, economic calendar and market-health dashboard.

## Hosting

Deployed on Vercel from this repo (every push to `main` redeploys).

- `index.html` – the app (static)
- `netlify/functions/*.mjs` – data functions (web-standard `Request → Response` handlers)
- `api/*.mjs` – thin Vercel wrappers around those functions
- `vercel.json` – maps the app's existing `/.netlify/functions/<name>` calls to `/api/<name>`

The same code still deploys on Netlify unchanged (`netlify.toml`).
