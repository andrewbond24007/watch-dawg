// Earnings dates and results for the stocks tracked in the app, from Twelve Data's earnings endpoint (the
// app's own key): past reports with EPS estimate vs actual, and the next scheduled report with its estimate.
export const EARN_SYMS = { NVDA: 'Nvidia', TSLA: 'Tesla', AAPL: 'Apple', GOOGL: 'Alphabet', TSM: 'TSMC' };
const num = (v) => (v == null || v === '' ? null : +v);
// Twelve Data answer for one stock -> {sym, name, next, time, epsEst, past:[{date, est, act, surprise}]}
export function parseTd(sym, j, now = Date.now()) {
  const rows = (j?.earnings || []).map((e) => ({ date: e.date, time: e.time || '', est: num(e.eps_estimate), act: num(e.eps_actual), surprise: num(e.surprise_prec) }))
    .filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date(now).toISOString().slice(0, 10);
  const next = rows.find((e) => e.date >= today && e.act == null) || null;
  return { sym, name: EARN_SYMS[sym] || sym, next: next ? next.date : null, time: next?.time || '', epsEst: next?.est ?? null,
    past: rows.filter((e) => e.act != null).slice(-6) };
}
export async function earnings(key) {
  if (!key) throw new Error('no Twelve Data key');
  const out = [], errs = [];
  for (const sym of Object.keys(EARN_SYMS)) {
    const j = await fetch(`https://api.twelvedata.com/earnings?symbol=${sym}&apikey=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(12000) }).then((r) => r.json()).catch((e) => ({ message: e.message }));
    if (j?.earnings) out.push(parseTd(sym, j)); else errs.push(`${sym}: ${j?.message || j?.status || 'no data'}`.slice(0, 120));
  }
  if (!out.length) throw new Error(errs.join('; ') || 'no earnings data');
  return out;
}
