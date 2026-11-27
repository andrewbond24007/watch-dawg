// Earnings dates and results for the stocks tracked in the app, from Yahoo Finance's company summary
// (next report date with the analysts' EPS and revenue estimates; past quarters' actual EPS against estimate).
// Yahoo wants a session cookie and "crumb" for this, which any visitor gets for free.
export const EARN_SYMS = { NVDA: 'Nvidia', TSLA: 'Tesla', AAPL: 'Apple', GOOGL: 'Alphabet', TSM: 'TSMC' };
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', Accept: '*/*' };
async function session() {
  const notes = [];
  // try a couple of ways to get Yahoo's session cookie, then the crumb that goes with it
  for (const start of ['https://fc.yahoo.com/', 'https://finance.yahoo.com/quote/NVDA/', 'https://login.yahoo.com/']) {
    const r = await fetch(start, { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(10000) }).catch((e) => (notes.push(`${start} ${e.message}`), null));
    const set = r?.headers?.getSetCookie?.() || [];
    const cookie = set.map((c) => c.split(';')[0]).filter((c) => /^(A1|A3|B|GUC|cmp|A1S)=/.test(c)).join('; ');
    notes.push(`${new URL(start).host} ${r?.status} cookies=${set.length}`);
    if (!cookie) continue;
    for (const host of ['query1', 'query2']) {
      const x = await fetch(`https://${host}.finance.yahoo.com/v1/test/getcrumb`, { headers: { ...UA, Cookie: cookie }, signal: AbortSignal.timeout(10000) }).catch(() => null);
      const crumb = x?.ok ? (await x.text()).trim() : '';
      notes.push(`${host} crumb ${x?.status}`);
      if (crumb && crumb.length < 20 && !/</.test(crumb)) return { cookie, crumb };
    }
  }
  throw new Error('no Yahoo crumb (' + notes.join('; ') + ')');
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
