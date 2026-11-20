// WatchDawg candles: price history for coins TradingView doesn't carry,
// from NonKYC's public market API (no key). e.g. ?symbol=LKY/USDT&res=60&count=72
const RES = [5, 15, 30, 60, 180, 240, 480, 720, 1440];
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60', 'netlify-cdn-cache-control': 'public, s-maxage=60, stale-while-revalidate=120', 'access-control-allow-origin': '*', 'netlify-vary': 'query' } });
export default async (req) => {
  const u = new URL(req.url);
  const sym = (u.searchParams.get('symbol') || '').toUpperCase();
  if (!/^[A-Z0-9]{1,15}\/[A-Z0-9]{1,15}$/.test(sym)) return json({ error: 'bad symbol' }, 400);
  const res = RES.includes(+u.searchParams.get('res')) ? +u.searchParams.get('res') : 60;
  const count = Math.min(500, Math.max(10, +u.searchParams.get('count') || 120));
  const to = Math.floor(Date.now() / 1000);
  const H = { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)', Accept: 'application/json' } };
  const [c, t] = await Promise.all([
    fetch(`https://api.nonkyc.io/api/v2/market/candles?symbol=${encodeURIComponent(sym)}&resolution=${res}&countBack=${count}&to=${to}&firstDataRequest=1`, H).then((r) => r.json()).catch(() => null),
    fetch(`https://api.nonkyc.io/api/v2/ticker/${sym.replace('/', '_')}`, H).then((r) => r.json()).catch(() => null),
  ]);
  const bars = (Array.isArray(c?.bars) ? c.bars : []).map((b) => ({ t: b.time > 1e12 ? b.time : b.time * 1000, o: +b.open, h: +b.high, l: +b.low, c: +b.close, v: +b.volume })).filter((b) => b.c > 0).sort((a, b) => a.t - b.t);
  const ticker = t && t.last_price ? { last: +t.last_price, prev: +t.previous_day_price || null, high: +t.high || null, low: +t.low || null, vol: +t.target_volume || null } : null;
  return json({ symbol: sym, res, bars, ticker });
};
