// WatchDawg reaction: how S&P futures, gold and Bitcoin moved in the 30 minutes
// after a release time (?t=unix seconds). Uses Yahoo Finance minute data.
const SYMS = { spx: 'ES=F', gold: 'GC=F', btc: 'BTC-USD' };
const H = { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)' } };
async function move(sym, t) {
  const age = Date.now() / 1000 - t, iv = age < 6 * 86400 ? '1m' : '5m';
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${iv}&period1=${t - 900}&period2=${t + 2400}`, H);
    const j = await r.json(); const res = j?.chart?.result?.[0];
    const ts = res?.timestamp || [], c = res?.indicators?.quote?.[0]?.close || [];
    let base = null, after = null;
    for (let i = 0; i < ts.length; i++) { if (c[i] == null) continue; if (ts[i] < t) base = c[i]; if (ts[i] <= t + 1800) after = c[i]; }
    return base && after && ts.some((x) => x >= t + 1500) ? Math.round((after / base - 1) * 10000) / 100 : null;
  } catch (e) { return null; }
}
export default async (req) => {
  const q = new URL(req.url).searchParams;
  const t = Math.floor(+(q.get('at') || q.get('t')) || 0);
  const now = Date.now() / 1000;
  if (!t || t > now + 60 || now - t > 50 * 86400) return new Response(JSON.stringify({ t, error: 'bad time', now: Math.floor(now) }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'netlify-vary': 'query' } });
  const done = now > t + 1860;
  const out = {}; if (done) await Promise.all(Object.entries(SYMS).map(async ([k, s]) => { out[k] = await move(s, t); }));
  const complete = done && Object.values(out).some((v) => v != null);
  return new Response(JSON.stringify({ t, done: complete, ...out }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300', 'netlify-cdn-cache-control': `public, s-maxage=${complete ? 604800 : 120}`, 'access-control-allow-origin': '*', 'netlify-vary': 'query' } });
};
