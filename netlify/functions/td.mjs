// WatchDawg: one shared Twelve Data quote call for every device.
// The app asks for a time "bucket" (a 5-minute slot while Wall Street is open, or the
// last session's close when it's shut). The CDN keeps each bucket's answer, so however
// many phones or tabs are open, Twelve Data is called at most once per bucket.
export const DEFAULT_KEY = '8832a67956484780a1b390aa395a0eeb';
export default async (req) => {
  const u = new URL(req.url);
  const syms = [...new Set((u.searchParams.get('s') || '').split(',').map((s) => s.trim()).filter(Boolean))].sort().slice(0, 20);
  const key = u.searchParams.get('k') || process.env.TD_KEY || DEFAULT_KEY;
  const bucket = u.searchParams.get('b') || '';
  const json = (body, maxAge) => new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'no-store',
      'netlify-cdn-cache-control': `public, s-maxage=${maxAge}`, 'netlify-vary': 'query' },
  });
  if (!syms.length) return json({ error: 'no symbols' }, 60);
  // Finnhub (free key, FINNHUB_KEY on Vercel) answers US stocks without Twelve Data's daily cap; Twelve Data then
  // only gets what Finnhub can't do (metals, FX) or misses
  const fh = {}, fkey = process.env.FINNHUB_KEY;
  if (fkey) await Promise.all(syms.filter((s) => /^[A-Z.]{1,6}$/.test(s)).map(async (s) => {
    const q = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(s)}&token=${encodeURIComponent(fkey)}`, { signal: AbortSignal.timeout(8000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (q && q.c > 0 && q.pc > 0) fh[s] = { pct: q.dp ?? +(((q.c / q.pc) - 1) * 100).toFixed(3), price: q.c, prev: q.pc, open: Date.now() / 1000 - (q.t || 0) < 20 * 60, src: 'finnhub' };
  }));
  const rest = syms.filter((s) => !fh[s]);
  if (!rest.length) return json({ quotes: fh, at: Date.now(), bucket, src: 'finnhub' }, bucket.startsWith('c') ? 6 * 3600 : 300);
  try {
    const j = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(rest.join(','))}&apikey=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(15000) }).then((r) => r.json());
    // out of credits for the day: remember that until midnight UTC (when Twelve Data resets) so nobody keeps retrying
    const untilReset = () => Math.max(60, Math.ceil((Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1) - Date.now()) / 1000) + 60);
    if (j && j.status === 'error' && !j[rest[0]] && !Object.keys(fh).length) { const day = /for the day/i.test(j.message || ''); return json({ error: j.message || 'rejected', code: j.code || null, daily: day, retryAt: day ? Date.now() + untilReset() * 1000 : null }, day ? untilReset() : 60); }
    const map = rest.length === 1 ? { [rest[0]]: j } : j, out = { ...fh };
    let limited = false;
    for (const k of rest) {
      const v = map[k];
      if (v && v.status !== 'error' && v.percent_change != null && !isNaN(+v.percent_change)) out[k] = { pct: +v.percent_change, price: +v.close, prev: +v.previous_close || null, open: !!v.is_market_open };
      else { out[k] = { error: v?.message || 'missing', code: v?.code || null }; if (v?.code === 429) limited = true; }
    }
    // a whole bucket is kept for its length; a rate-limited answer only briefly so the next try can succeed
    const keep = limited ? 60 : bucket.startsWith('c') ? 6 * 3600 : 300;
    return json({ quotes: out, at: Date.now(), bucket }, keep);
  } catch (e) { return Object.keys(fh).length ? json({ quotes: fh, at: Date.now(), bucket }, 120) : json({ error: 'Twelve Data unreachable' }, 30); }
};
