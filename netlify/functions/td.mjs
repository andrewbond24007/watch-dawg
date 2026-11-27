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
  // ?deep=NVDA: the stock deep-dive (company, key stats, analysts, earnings, company news) from Finnhub's free
  // plan, six calls cached for an hour; shares this function to stay within Vercel's limit of 12
  const deep = (u.searchParams.get('deep') || '').toUpperCase();
  if (deep) {
    if (!/^[A-Z.]{1,6}$/.test(deep) || !process.env.FINNHUB_KEY) return json({ error: 'not available' }, 300);
    return json(await deepDive(deep, process.env.FINNHUB_KEY), 3600);
  }
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

const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
export async function deepDive(sym, key) {
  const get = (path) => fetch(`https://finnhub.io/api/v1/${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(9000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [prof, met, rec, earn, cal, news] = await Promise.all([
    get(`stock/profile2?symbol=${sym}`), get(`stock/metric?symbol=${sym}&metric=all`), get(`stock/recommendation?symbol=${sym}`),
    get(`stock/earnings?symbol=${sym}`), get(`calendar/earnings?symbol=${sym}&from=${day(0)}&to=${day(150)}`), get(`company-news?symbol=${sym}&from=${day(-7)}&to=${day(0)}`),
  ]);
  const m = met?.metric || {}, pick = (...k) => { for (const x of k) if (m[x] != null && isFinite(m[x])) return +m[x]; return null; };
  const nx = (cal?.earningsCalendar || []).filter((e) => e.date >= day(0)).sort((a, b) => a.date.localeCompare(b.date))[0];
  return {
    sym, at: Date.now(),
    profile: prof && prof.name ? { name: prof.name, industry: prof.finnhubIndustry || '', country: prof.country || '', ipo: prof.ipo || '', web: prof.weburl || '', logo: prof.logo || '', cap: prof.marketCapitalization ?? null, cur: prof.currency || 'USD' } : null,
    stats: { cap: pick('marketCapitalization'), pe: pick('peTTM', 'peBasicExclExtraTTM', 'peNormalizedAnnual'), eps: pick('epsTTM', 'epsBasicExclExtraItemsTTM'), hi52: pick('52WeekHigh'), lo52: pick('52WeekLow'),
      beta: pick('beta'), div: pick('dividendYieldIndicatedAnnual', 'currentDividendYieldTTM'), revGrowth: pick('revenueGrowthTTMYoy', 'revenueGrowthQuarterlyYoy'), margin: pick('netProfitMarginTTM', 'netProfitMarginAnnual'), ret52: pick('52WeekPriceReturnDaily') },
    recs: (rec || []).slice(0, 4).map((r) => ({ period: r.period, sb: r.strongBuy, b: r.buy, h: r.hold, s: r.sell, ss: r.strongSell })),
    earnings: (earn || []).slice(0, 4).map((e) => ({ period: e.period, q: e.quarter, y: e.year, act: e.actual, est: e.estimate, surprise: e.surprisePercent })),
    next: nx ? { date: nx.date, hour: nx.hour || '', est: nx.epsEstimate ?? null } : null,
    news: (news || []).filter((n) => n.headline && n.url).sort((a, b) => b.datetime - a.datetime).slice(0, 8).map((n) => ({ t: n.headline, src: n.source, at: n.datetime * 1000, url: n.url })),
  };
}
