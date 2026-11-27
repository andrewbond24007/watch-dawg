# WatchDawg: how the figures stay up to date

## Schedules

| What | How often | Where |
|---|---|---|
| Full refresh (Health, maps, nowcast, rates, CDS, source checks) | Every scheduled GitHub run (cron `7,37 * * * *`; GitHub usually starts one every 60–90 min) | `.github/workflows/refresh.yml` → `scripts/refresh.mjs` |
| Quick pass (rates, Polymarket/futures odds, today's DTCC CDS trades) | Every 15 min inside each scheduled run (3 passes), so gaps between GitHub runs are covered | same workflow, `FAST=1` |
| Crypto, metals | Every 30 s in the app | CoinGecko, gold-api (browser) |
| Stocks, yields, FX | Every 60–120 s in the app; Twelve Data during US hours through `/api/td` (one shared call per 5-min slot) | `quotes`, `td` functions |
| News | Every 2 min (edge-cached 90 s) | `news` function |
| Release actuals (CPI, jobs, PCE, GDP) | After a release: every 2 min for 30 min, then every 10 min for up to 6 h; only the late agency is asked | `actuals` function |
| Rates after a decision/release | Live refetch every 2 min for 4 h, shared 2-min cache slot; BLS only if US CPI is due | `rates` function |

All `/api/*` answers are edge-cached on Vercel (check with the Probe workflow: `head:/.netlify/functions/<name>`).

## Earnings

`earnings.json` (data branch) is refreshed twice a day. Twelve Data's free plan only answers for Apple; add a free Finnhub key as the GitHub secret `FINNHUB_KEY` to cover Nvidia, Tesla, Alphabet and TSMC. Yahoo refuses GitHub's machines, so it isn't used.

## Optional free keys (each switches a feature on when present)

| Name | Where | What it does |
|---|---|---|
| `FINNHUB_KEY` | GitHub + Vercel | Earnings (GitHub); live US stock prices without Twelve Data's cap (Vercel) |
| `BLS_KEY` | GitHub + Vercel | BLS v2 API: 500 calls/day instead of ~25 |
| `FRED_KEY` | Vercel | First choice for Fed arrears and FHFA prices; backup for the Freddie mortgage rate |
| `BEA_KEY` | Vercel | GDP and PCE from BEA's API instead of its web pages |
| `EIA_KEY` | Vercel | Weekly US crude inventories in Big events, with the actual change |

## Rate limits to respect

- **BLS** keyless API: ~25 calls/day. The refresh only asks when US CPI is due or the copy is 8 h old (`?nobls=1` otherwise).
- **Twelve Data**: 800 credits/day, shared bucket cache.
- **Vercel Hobby**: 12 functions (all used), 100 deploys/day; the data branch never deploys.

## Source checks and alerts

`status.json` (data branch) records every source each run: Health, Rates, CDS, each news feed (`news:*`, flagged when it returns nothing) and the hand-kept date lists (`schedule:*`, flagged 40 days before they run out). The Health tab shows a source as failing only after 24 h, so brief outages don't alarm.

## Hand-kept lists to top up

When a `Calendar:` source is flagged in Health → sources, add the next dates:

- `netlify/functions/rates.mjs`: `FOMC`, `MPC`, `ECBM`, `US_CPI` (also feed the calendar automatically)
- `netlify/functions/calendar.mjs`: `SCHEDULE` (jobs, PCE/GDP, PPI, JOLTS), `HEALTH` (housing releases)

Official sources: bls.gov/schedule, bea.gov/news/schedule, federalreserve.gov FOMC calendar, BoE MPC dates, ECB meeting calendar.

## Known source quirks

- ECB moved euro-area inflation to the `HICP` dataset (key `M.U2.N.000000.4D0.ANR`) in Feb 2026; the old `ICP` stopped at Dec 2025.
- BLS has no October 2025 CPI (shutdown): the Oct 2026 yearly rate is estimated from Sep/Nov 2025 and shown with ≈.
- Telegram marked @WalterBloomberg fake (no posts); it was removed.
- DTCC public swap data: personal use only.
- Google News feeds (Reuters, Bloomberg, Kitco) retry with US settings, then fall back to the saved archive when throttled.
- News mood (v2) weights sources and relevance; changing the method (bump `MOOD_VERSION`) rescores and re-backfills.
- Monthly sources now used instead of quarterly BIS where possible: UK (Land Registry UK HPI), Ireland (CSO RPPI).
