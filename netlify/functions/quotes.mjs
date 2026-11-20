// WatchDawg price helper: fetches Yahoo Finance quotes server-side for symbols
// the free Twelve Data plan doesn't cover (silver, palladium, new listings).
export default async (req) => {
  const url = new URL(req.url);
  const syms = (url.searchParams.get('s') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 25);
  const out = {};
  await Promise.all(syms.map(async (s) => {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=1d&interval=5m&includePrePost=true`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)' } });
      const j = await r.json();
      const res = j?.chart?.result?.[0];
      const m = res?.meta;
      if (!m || m.regularMarketPrice == null) { out[s] = { error: j?.chart?.error?.description || 'no data' }; return; }
      const price = m.regularMarketPrice;
      const prev = m.chartPreviousClose ?? m.previousClose ?? null;
      const closes = (res.indicators?.quote?.[0]?.close || []).filter(x => x != null);
      const last = closes.length ? closes[closes.length - 1] : price;
      out[s] = {
        price, prev, last,
        pct: prev ? (price / prev - 1) * 100 : null,
        lastPct: prev ? (last / prev - 1) * 100 : null,
        state: m.marketState || null,
        time: m.regularMarketTime || null,
      };
    } catch (e) { out[s] = { error: String(e).slice(0, 120) }; }
  }));
  return new Response(JSON.stringify(out), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60', 'access-control-allow-origin': '*', 'netlify-vary': 'query' },
  });
};
