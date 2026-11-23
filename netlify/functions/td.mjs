// WatchDawg: one shared Twelve Data quote call for every device.
// The app asks for a time "bucket" (a 5-minute slot while Wall Street is open, or the
// last session's close when it's shut). The CDN keeps each bucket's answer, so however
// many phones or tabs are open, Twelve Data is called at most once per bucket.
const DEFAULT_KEY = '8832a67956484780a1b390aa395a0eeb';
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
  try {
    const j = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(syms.join(','))}&apikey=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(15000) }).then((r) => r.json());
    if (j && j.status === 'error' && !j[syms[0]]) return json({ error: j.message || 'rejected', code: j.code || null }, 60);
    const map = syms.length === 1 ? { [syms[0]]: j } : j, out = {};
    let limited = false;
    for (const k of syms) {
      const v = map[k];
      if (v && v.status !== 'error' && v.percent_change != null && !isNaN(+v.percent_change)) out[k] = { pct: +v.percent_change, price: +v.close, prev: +v.previous_close || null, open: !!v.is_market_open };
      else { out[k] = { error: v?.message || 'missing', code: v?.code || null }; if (v?.code === 429) limited = true; }
    }
    // a whole bucket is kept for its length; a rate-limited answer only briefly so the next try can succeed
    const keep = limited ? 60 : bucket.startsWith('c') ? 6 * 3600 : 300;
    return json({ quotes: out, at: Date.now(), bucket }, keep);
  } catch (e) { return json({ error: 'Twelve Data unreachable' }, 30); }
};
