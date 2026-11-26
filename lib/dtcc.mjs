// Five-year CDS levels on AI hyperscalers and chipmakers from DTCC's public swap tape (SEC Regulation SBSR
// public price dissemination: every reported single-name CDS trade, free, no key; DTCC's terms allow
// personal use, which is what WatchDawg is).
//
// Each print gives either a quoted spread ("Spread-Leg 1", a decimal: 0.0097 = 97 bp) or the standard
// contract's fixed coupon (100 or 500 bp) plus an upfront cash amount. Upfronts are turned into a spread with
// the usual flat-hazard approximation; the cash amount is unsigned and includes accrued coupon, so both signs
// are tried and the one closer to that company's recent level (or its quoted prints) is kept.
export const DTCC_NAMES = [
  ['oracle', 'Oracle', /\boracle\b|^6EC42L/i], ['coreweave', 'CoreWeave', /coreweave|^239FAV/i], ['meta', 'Meta', /meta platforms|facebook/i],
  ['amazon', 'Amazon', /amazon/i], ['microsoft', 'Microsoft', /microsoft/i], ['alphabet', 'Alphabet', /alphabet|google|^0C27GT/i],
  ['broadcom', 'Broadcom', /broadcom|^1C248K/i], ['nvidia', 'Nvidia', /nvidia|^6D76CM/i], ['amd', 'AMD', /advanced micro devices/i], ['spacex', 'SpaceX', /space exploration|spacex/i],
];
export const dtccUrl = (ymd) => `https://pddata.dtcc.com/ppd/api/report/cumulative/sec/SEC_CUMULATIVE_CREDITS_${ymd.replace(/-/g, '_')}.zip`;

// the files quote every field: split on "," between quotes
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.startsWith('"'));
  if (!lines.length) return [];
  const cells = (l) => l.replace(/^"|"$/g, '').split('","');
  const h = cells(lines[0]);
  return lines.slice(1).map((l) => { const c = cells(l), o = {}; h.forEach((k, i) => { if (c[i]) o[k] = c[i]; }); return o; });
}
const num = (s) => { if (s == null || s === '') return null; const v = parseFloat(String(s).replace(/[,+]/g, '')); return isFinite(v) ? v : null; };
// last standard coupon date (20 Mar/Jun/Sep/Dec) on or before a date, for accrued coupon
function lastImm(d) { const y = d.getUTCFullYear(); const c = [[y - 1, 11], [y, 2], [y, 5], [y, 8], [y, 11]].map(([yy, m]) => Date.UTC(yy, m, 20)).filter((t) => t <= d.getTime()); return c[c.length - 1]; }
// risky annuity (years) for a spread s (decimal) and maturity T (years): flat hazard s/(1-R), 4% rates
const rpv01 = (s, T) => { const k = 0.04 + Math.max(s, 1e-5) / 0.6; return (1 - Math.exp(-k * T)) / k; };
// upfront (fraction of notional) -> par spread (decimal)
export function upfrontToSpread(u, c, T) { let s = c; for (let i = 0; i < 40; i++) s = Math.max(1e-5, c + u / rpv01(s, T)); return s; }

export function nameOf(r) {
  const txt = [r['Underlying Asset Name'], r['UPI Underlier Name'], r['Underlier ID-Leg 1']].filter(Boolean).join(' | ');
  if (/DDTL|TRS|TOTAL RETURN/i.test(txt) || r['Underlier ID source-Leg 1'] === 'SingleOther') return null; // loan swaps, not CDS
  const hit = DTCC_NAMES.find(([, , rx]) => [r['Underlying Asset Name'], r['UPI Underlier Name'], r['Underlier ID-Leg 1']].some((v) => v && rx.test(v)));
  return hit ? hit[0] : null;
}
// one day's file -> that day's prints per company, kept compact for storage:
// {id: {q: [quoted bp...], c: [[bp if upfront paid, bp if upfront received]...]}}
export function printsFrom(rows) {
  const out = {}, seen = new Set();
  for (const r of rows) {
    if (!/^(NEWT|CORR)$/.test(r['Action type'] || '')) continue; // skip errors, terminations, lifecycle edits
    if (!/CDS/i.test(r['UPI FISN'] || '')) continue;
    const key = r['Dissemination Identifier']; if (key) { if (seen.has(key)) continue; seen.add(key); }
    const id = nameOf(r); if (!id) continue;
    const exec = new Date(r['Execution Timestamp'] || Date.now()), mat = Date.parse((r['Expiration Date'] || '') + 'T00:00:00Z');
    const T = (mat - exec.getTime()) / (365.25 * 864e5);
    if (!(T > 4.4 && T < 5.6)) continue; // five-year contracts only
    const o = (out[id] ||= { q: [], c: [] });
    const sp = num(r['Spread-Leg 1']);
    if (sp != null && (r['Spread notation-Leg 1'] || '3') === '3') { if (sp >= 0.0005 && sp < 0.5) o.q.push(Math.round(sp * 1e5) / 10); continue; } // under 5 bp is a mis-keyed print
    const c = num(r['Fixed rate-Leg 1']), amt = num(r['Other payment amount']), N = num(r['Notional amount-Leg 1']);
    if (!c || amt == null || !N || r['Other payment type'] !== 'UFRO') continue;
    // the cash includes accrued coupon, which the seller hands back: clean upfront = ±cash/notional + accrued
    const acc = c * (exec.getTime() - lastImm(exec)) / (360 * 864e5), a = amt / N;
    o.c.push([a + acc, -a + acc].map((u) => Math.round(upfrontToSpread(u, c, T) * 1e5) / 10));
  }
  return out;
}
const median = (a) => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
// one company's prints + a reference level -> [level bp, trades]
export function levelOf(p, ref) {
  const q = p.q.filter((v) => ref == null || (v > ref / 3 && v < ref * 3)), r0 = q.length ? median(q) : ref;
  // each upfront could have been paid either way: keep the reading nearer the quoted prints or the recent level
  // (with nothing to go on, assume the buyer paid, i.e. the spread is above the coupon)
  let vals = q.concat(p.c.map(([a, b]) => r0 == null ? a : (Math.abs(Math.log(a / r0)) <= Math.abs(Math.log(b / r0)) ? a : b)));
  const m = median(vals); if (m == null) return null;
  vals = vals.filter((v) => v > m / 2.5 && v < m * 2.5); // drop off-scale prints
  return [Math.round(median(vals) * 10) / 10, vals.length];
}
// stored days {ymd: prints} + news anchors {id: [{date, bp}]} -> daily series {id: [[ymd, bp, trades]]}
export function buildDaily(days, anchors = {}) {
  const series = {}, last = {}, dates = Object.keys(days).sort();
  // quoted-spread prints settle which way upfronts were paid, so the nearest day that has some is the best guide
  const quoted = {};
  for (const d of dates) for (const [id, p] of Object.entries(days[d] || {})) if (p.q && p.q.length) (quoted[id] ||= []).push({ date: d, bp: median(p.q) });
  const nearest = (list, d) => (list || []).filter((x) => x.bp).sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(d)) - Math.abs(Date.parse(b.date) - Date.parse(d)))[0];
  for (const d of dates) {
    for (const [id, p] of Object.entries(days[d] || {})) {
      const nq = nearest(quoted[id], d), near = nq && Math.abs(Date.parse(nq.date) - Date.parse(d)) <= 7 * 864e5;
      let ref = near ? nq.bp : last[id] && (Date.parse(d) - Date.parse(last[id][0])) < 45 * 864e5 ? last[id][1] : null;
      if (ref == null) ref = nq?.bp ?? nearest(anchors[id], d)?.bp ?? null;
      const lv = levelOf(p, ref); if (!lv) continue;
      // a thinly traded day far from the recent level is a bad print, not a move
      if (last[id] && lv[1] < 3 && (lv[0] > last[id][1] * 1.5 || lv[0] < last[id][1] / 1.5)) continue;
      (series[id] ||= []).push([d, ...lv]); last[id] = [d, lv[0]];
    }
  }
  // one-day spikes that the next day undoes (bad prints, contract-roll days) are dropped
  for (const id of Object.keys(series)) {
    const a = series[id];
    series[id] = a.filter((r, i) => {
      if (i === 0 || i === a.length - 1) return true;
      const p = a[i - 1][1], n = a[i + 1][1], v = r[1];
      return !(Math.abs(p / n - 1) < 0.1 && ((v > p * 1.15 && v > n * 1.15) || (v < p / 1.15 && v < n / 1.15)));
    });
  }
  return series;
}
