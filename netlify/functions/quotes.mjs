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
      // Yahoo's meta.regularMarketPrice can pick up overnight (Blue Ocean ATS) trades, so the
      // regular-session price comes from daily bars, which only hold regular-session trading
      let price = m.regularMarketPrice, prev = m.chartPreviousClose ?? m.previousClose ?? null;
      try {
        const d = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=5d&interval=1d`,
          { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)' }, signal: AbortSignal.timeout(8000) }).then((r) => r.json());
        const dc = (d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter((x) => x != null);
        if (dc.length >= 2) { price = dc[dc.length - 1]; prev = dc[dc.length - 2]; }
      } catch (e) { /* keep the meta values */ }
      const closes = (res.indicators?.quote?.[0]?.close || []).filter(x => x != null);
      const last = closes.length ? closes[closes.length - 1] : price;
      // extended hours: if the latest trade is outside the regular session, report it against the regular close
      const ts = res.timestamp || [], cl = res.indicators?.quote?.[0]?.close || [];
      let li = cl.length - 1; while (li >= 0 && cl[li] == null) li--;
      const tp = m.currentTradingPeriod || {}, lt = li >= 0 ? ts[li] : null;
      const sess = lt == null || !tp.regular ? null : lt >= tp.regular.end ? 'post' : lt < tp.regular.start ? 'pre' : 'regular';
      const ext = sess === 'post' || sess === 'pre' ? { session: sess, price: +cl[li].toFixed(4), chg: price ? +((cl[li] / price - 1) * 100).toFixed(2) : null, time: lt } : null;
      out[s] = {
        price, prev, last, ext,
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
