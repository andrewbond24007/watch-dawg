// Liquidity tracker: "net liquidity" = the Fed's balance sheet minus money parked at the Treasury's account and the
// Fed's reverse repo facility. That's roughly the cash the Fed has put into the financial system and left there;
// when it rises, stocks and bitcoin have tended to do well, and the reverse. All in $ billions, weekly (Wednesdays).
import { fredSeries } from './fred.mjs';

const asOf = (s, d) => { let r = null; for (const p of s) { if (p[0] <= d) r = p; else break; } return r; };
const ymd = (t) => new Date(t).toISOString().slice(0, 10);

// {walcl ($m, weekly), tga ($m, weekly), rrp ($bn, daily)} -> weekly rows
export function netLiquidity({ walcl, tga, rrp }) {
  return walcl.map(([d, w]) => {
    const t = asOf(tga, d), r = asOf(rrp, d);
    if (!t || !r) return null;
    return { d, fed: Math.round(w / 1000), tga: Math.round(t[1] / 1000), rrp: Math.round(r[1]), net: Math.round(w / 1000 - t[1] / 1000 - r[1]) };
  }).filter(Boolean);
}
// change in $bn over n weeks
const chg = (rows, n) => (rows.length > n ? rows.at(-1).net - rows.at(-1 - n).net : null);
// correlation of 13-week changes (does liquidity move with the asset?)
export function corr(a, b) {
  const n = Math.min(a.length, b.length); if (n < 10) return null;
  const x = a.slice(-n), y = b.slice(-n), mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; }
  return sx && sy ? +(sxy / Math.sqrt(sx * sy)).toFixed(2) : null;
}
export function buildLiquidity(src, assets = {}, now = Date.now()) {
  const rows = netLiquidity(src).filter((r) => r.d >= ymd(now - 3 * 365 * 864e5));
  if (rows.length < 20) throw new Error('not enough liquidity data');
  const last = rows.at(-1), w4 = chg(rows, 4), w13 = chg(rows, 13), w52 = chg(rows, 52);
  const trend = w13 == null ? 'steady' : w13 > 150 ? 'rising' : w13 < -150 ? 'falling' : 'steady';
  // asset prices on the same Wednesdays, and how closely their 13-week moves track liquidity's
  const out = { updated: new Date(now).toISOString(), date: last.d, ...last, w4, w13, w52, trend, rows: rows.map((r) => [r.d, r.net, r.fed, r.tga, r.rrp]), assets: {} };
  const dl = rows.map((r, i) => (i >= 13 ? r.net - rows[i - 13].net : null));
  for (const [k, s] of Object.entries(assets)) {
    if (!s?.length) continue;
    const px = rows.map((r) => asOf(s, r.d)?.[1] ?? null);
    const da = px.map((p, i) => (i >= 13 && p && px[i - 13] ? (p / px[i - 13] - 1) * 100 : null));
    const pairs = dl.map((v, i) => [v, da[i]]).filter(([a, b]) => a != null && b != null);
    out.assets[k] = { px: px.map((p) => (p == null ? null : +p.toFixed(2))), corr: corr(pairs.map((p) => p[0]), pairs.map((p) => p[1])) };
  }
  return out;
}
export async function yahooDaily(sym) {
  const j = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=5y&interval=1d`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) }).then((r) => r.json());
  const r = j.chart.result[0], c = r.indicators.quote[0].close;
  return r.timestamp.map((t, i) => [ymd(t * 1000), c[i]]).filter((p) => p[1] != null);
}
export async function fetchLiquidity(key) {
  const start = ymd(Date.now() - 4 * 365 * 864e5);
  const [walcl, tga, rrp] = await Promise.all(['WALCL', 'WTREGEN', 'RRPONTSYD'].map((id) => fredSeries(id, start, key)));
  const assets = {};
  await Promise.all([['spx', '^GSPC'], ['btc', 'BTC-USD']].map(async ([k, s]) => { try { assets[k] = await yahooDaily(s); } catch (e) { /* chart works without it */ } }));
  return buildLiquidity({ walcl, tga, rrp }, assets);
}
