// Earnings dates and results for the stocks tracked in the app: past reports with EPS estimate vs actual, and the
// next scheduled report with its estimate. Finnhub (free key, FINNHUB_KEY secret) covers every stock; without it,
// Twelve Data's free plan only answers for Apple.
export const EARN_SYMS = { NVDA: 'Nvidia', TSLA: 'Tesla', AAPL: 'Apple', GOOGL: 'Alphabet', TSM: 'TSMC' };
const num = (v) => (v == null || v === '' ? null : +v);
// Twelve Data answer for one stock -> {sym, name, next, time, epsEst, past:[{date, est, act, surprise}]}
export function parseTd(sym, j, now = Date.now()) {
  const rows = (j?.earnings || []).map((e) => ({ date: e.date, time: e.time || '', est: num(e.eps_estimate), act: num(e.eps_actual), surprise: num(e.surprise_prec) }))
    .filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date(now).toISOString().slice(0, 10);
  const next = rows.find((e) => e.date >= today && e.act == null) || null;
  const past = rows.filter((e) => e.act != null).slice(-6).map((e) => ({ ...e, surprise: e.surprise ?? (e.est ? +(((e.act - e.est) / Math.abs(e.est)) * 100).toFixed(1) : null) }));
  // not scheduled yet: companies report about every 13 weeks, so give an estimated date
  const guess = !next && past.length ? new Date(Date.parse(past.at(-1).date) + 91 * 864e5).toISOString().slice(0, 10) : null;
  return { sym, name: EARN_SYMS[sym] || sym, next: next ? next.date : guess, estimated: !next && !!guess, time: next?.time || past.at(-1)?.time || '', epsEst: next?.est ?? null, past };
}
// Finnhub earnings calendar for one stock -> same shape as parseTd
export function parseFinnhub(sym, j, now = Date.now()) {
  const td = { earnings: (j?.earningsCalendar || []).map((e) => ({ date: e.date, time: e.hour === 'bmo' ? 'Before Open' : e.hour === 'amc' ? 'After Hours' : '', eps_estimate: e.epsEstimate, eps_actual: e.epsActual })) };
  return parseTd(sym, td, now);
}
async function finnhub(key) {
  const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10), out = [], errs = [];
  for (const sym of Object.keys(EARN_SYMS)) {
    const j = await fetch(`https://finnhub.io/api/v1/calendar/earnings?from=${day(-420)}&to=${day(200)}&symbol=${sym}&token=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(12000) })
      .then(async (r) => { const t = await r.text(); try { return { status: r.status, ...JSON.parse(t) }; } catch { return { status: r.status, error: t.slice(0, 80) }; } }).catch((e) => ({ error: e.message }));
    if (j?.earningsCalendar?.length) out.push(parseFinnhub(sym, j)); else errs.push(`${sym}: ${j?.status || ''} ${j?.error || (j?.earningsCalendar ? 'no rows' : 'no data')}`);
  }
  if (!out.length) throw new Error('Finnhub: ' + errs.join('; '));
  return out;
}
export async function earnings(key, finnhubKey) {
  if (finnhubKey) return finnhub(finnhubKey);
  if (!key) throw new Error('no Twelve Data key');
  const out = [], errs = [];
  for (const sym of Object.keys(EARN_SYMS)) {
    const j = await fetch(`https://api.twelvedata.com/earnings?symbol=${sym}&apikey=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(12000) }).then((r) => r.json()).catch((e) => ({ message: e.message }));
    if (j?.earnings) out.push(parseTd(sym, j)); else errs.push(`${sym}: ${j?.message || j?.status || 'no data'}`.slice(0, 120));
    await new Promise((r) => setTimeout(r, 9000)); // the free plan allows 8 credits a minute
  }
  if (errs.length) console.warn('earnings:', errs.join('; '));
  if (!out.length) throw new Error(errs.join('; ') || 'no earnings data');
  return out;
}
