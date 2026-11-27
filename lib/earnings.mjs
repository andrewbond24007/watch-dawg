// Earnings dates and results for the stocks tracked in the app, from Yahoo Finance's company summary
// (next report date with the analysts' EPS and revenue estimates; past quarters' actual EPS against estimate).
// Yahoo wants a session cookie and "crumb" for this, which any visitor gets for free.
export const EARN_SYMS = { NVDA: 'Nvidia', TSLA: 'Tesla', AAPL: 'Apple', GOOGL: 'Alphabet', TSM: 'TSMC' };
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', Accept: '*/*' };
async function session() {
  const r = await fetch('https://fc.yahoo.com/', { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(10000) }).catch(() => null);
  const set = r?.headers?.getSetCookie?.() || [];
  const cookie = set.map((c) => c.split(';')[0]).join('; ');
  const crumb = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { ...UA, Cookie: cookie }, signal: AbortSignal.timeout(10000) }).then((x) => (x.ok ? x.text() : ''));
  if (!crumb || crumb.length > 20 || /</.test(crumb)) throw new Error('no Yahoo crumb');
  return { cookie, crumb };
}
const raw = (v) => (v && typeof v === 'object' ? v.raw : v);
export function parseSummary(sym, j) {
  const q = j?.quoteSummary?.result?.[0];
  if (!q) return null;
  const ce = q.calendarEvents?.earnings || {}, hist = q.earningsHistory?.history || [];
  const dates = (ce.earningsDate || []).map((d) => raw(d)).filter(Boolean).map((t) => new Date(t * 1000).toISOString());
  const past = hist.map((h) => ({ q: raw(h.quarter) ? new Date(raw(h.quarter) * 1000).toISOString().slice(0, 10) : null, period: h.period, act: raw(h.epsActual), est: raw(h.epsEstimate), surprise: raw(h.surprisePercent) }))
    .filter((h) => h.act != null && h.q).sort((a, b) => a.q.localeCompare(b.q));
  return { sym, name: EARN_SYMS[sym] || sym, next: dates[0] || null, nextEnd: dates[1] || null, estimated: !!ce.isEarningsDateEstimate,
    epsEst: raw(ce.earningsAverage) ?? null, revEst: raw(ce.revenueAverage) ?? null, past };
}
export async function earnings() {
  const { cookie, crumb } = await session();
  const out = [];
  for (const sym of Object.keys(EARN_SYMS)) {
    try {
      const j = await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${sym}?modules=calendarEvents,earningsHistory&crumb=${encodeURIComponent(crumb)}`, { headers: { ...UA, Cookie: cookie }, signal: AbortSignal.timeout(10000) }).then((r) => r.json());
      const p = parseSummary(sym, j); if (p) out.push(p);
    } catch (e) { /* one stock failing doesn't stop the rest */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!out.length) throw new Error('no earnings data');
  return out;
}
