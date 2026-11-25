// WatchDawg history: a running record of every figure, kept on the repo's `data` branch by the
// scheduled refresh. Figures that sources only publish as a single latest value (Trepp, Kastle,
// Numbeo, dividend yields) gain a trend line and a year-ago comparison from it.
export const HISTORY_URL = 'https://raw.githubusercontent.com/andrewbond24007/watch-dawg/data/history.json';
const MAX_POINTS = 420;

export const metricKey = (sec, region, m) => `${sec}/${region}/${m.id}`;
const day = (d) => String(d).slice(0, 10);

function* metricsOf(health) {
  for (const s of health.sections || []) for (const r of s.regions || []) for (const m of r.metrics || []) if (m && m.value != null && m.date) yield [metricKey(s.id, r.id, m), m];
}

// add today's readings; one point per release date (live figures: one per day)
export function appendHistory(health, hist = {}) {
  let added = 0;
  for (const [k, m] of metricsOf(health)) {
    const s = (hist[k] ||= []), d = day(m.date);
    // weekly sources also report last week's figure: use it to seed the history
    if (m.freq === 'W' && m.prev != null && !s.some((p) => p[0] < d)) { const w = new Date(d); w.setUTCDate(w.getUTCDate() - 7); s.unshift([w.toISOString().slice(0, 10), m.prev]); added++; }
    const last = s.at(-1);
    if (last && last[0] === d) { if (last[1] !== m.value) last[1] = m.value; continue; }
    if (last && last[0] > d) continue; // a source re-sent an older release
    s.push([d, m.value]); added++;
    if (s.length > MAX_POINTS) s.splice(0, s.length - MAX_POINTS);
  }
  return added;
}

// fill in trend lines and year-ago / previous values where a source only gives the latest figure
export function mergeHistory(health, hist) {
  if (!hist) return health;
  for (const [k, m] of metricsOf(health)) {
    const s = hist[k];
    if (!s || !s.length) continue;
    // never step back: if a source briefly returns an older release (e.g. a rate-limited month), keep the newest one recorded
    const newest = s.at(-1);
    if (newest[0] > day(m.date) && m.freq !== 'D') { m.value = newest[1]; m.date = newest[0]; m.heldBack = true; }
    if (s.length < 2) continue;
    const pts = s.filter((p) => p[0] <= day(m.date));
    if ((m.series || []).length < 2 && pts.length >= 2) { m.series = thin(pts); m.fromHistory = true; }
    if (m.prev == null) { const p = pts.filter((x) => x[0] < day(m.date)).at(-1); if (p) m.prev = p[1]; }
    if (m.yr == null) {
      const target = new Date(day(m.date)); target.setUTCFullYear(target.getUTCFullYear() - 1);
      const t = target.toISOString().slice(0, 10), near = pts.filter((p) => Math.abs(Date.parse(p[0]) - Date.parse(t)) <= 45 * 864e5);
      if (near.length) m.yr = near.reduce((a, b) => (Math.abs(Date.parse(b[0]) - Date.parse(t)) < Math.abs(Date.parse(a[0]) - Date.parse(t)) ? b : a))[1];
    }
  }
  return health;
}
function thin(s, n = 60) { if (s.length <= n) return s; const step = (s.length - 1) / (n - 1); return Array.from({ length: n }, (_, i) => s[Math.round(i * step)]); }

export async function loadHistory(timeout = 2500) {
  try { const r = await fetch(HISTORY_URL, { signal: AbortSignal.timeout(timeout) }); return r.ok ? await r.json() : null; } catch { return null; }
}

// friendly names for the source status panel
export const SOURCE_NAMES = {
  bis: 'BIS house prices', bis_cre: 'BIS commercial property prices', fed: 'Federal Reserve arrears', freddie: 'Freddie Mac mortgage rates', fhfa: 'FHFA house prices',
  boe: 'Bank of England', ecb: 'ECB mortgage rates', trepp: 'Trepp office arrears', kastle: 'Kastle office attendance', zillow: 'Zillow rents and values', oecd: 'OECD rents',
  treasury: 'US 10-year Treasury', ons: 'ONS rents', landreg: 'Land Registry UK prices', landreg_ni: 'Land Registry NI prices', numbeo: 'Numbeo rental yields',
  zillow_momentum: 'Zillow sales momentum', hmrc: 'HMRC home sales', cso_sales: 'CSO Irish sales', nowcast: 'Cleveland Fed nowcast',
  'rates:fed': 'New York Fed policy rate', 'rates:boe': 'Bank of England Bank Rate', 'rates:ecb': 'ECB deposit rate', 'rates:treasury': 'US Treasury yields',
  'rates:freddie': 'Freddie Mac (Rates tab)', 'rates:boe_mortgage': 'BoE quoted mortgage rates', 'rates:gilts': 'UK gilt yields', 'rates:ecb_yield': 'Euro-area yields',
  'rates:bls': 'BLS inflation', 'rates:ons': 'ONS inflation', 'rates:futures': 'Fed funds futures', 'rates:polymarket_fed': 'Polymarket (Fed)', 'rates:polymarket_boe': 'Polymarket (BoE)', 'rates:polymarket_ecb': 'Polymarket (ECB)', 'rates:all': 'Rates tab',
  'map:us': 'US price map', 'map:uk': 'UK price map', 'map:ni': 'NI price map', 'map:ie': 'Ireland price map', 'map:med': 'Mediterranean price map',
};
// status: when each source last worked and how long it has been failing
export function updateStatus(prev = {}, errors = {}, checked = [], now = new Date().toISOString()) {
  const src = { ...(prev.sources || {}) };
  for (const k of new Set([...checked, ...Object.keys(errors)])) {
    const e = errors[k], cur = src[k] || {};
    src[k] = e ? { ok: false, error: String(e).slice(0, 120), since: cur.ok === false ? cur.since : now, lastOk: cur.lastOk || null }
      : { ok: true, lastOk: now };
  }
  return { updated: now, sources: src };
}

// A figure that a flaky source leaves out of one refresh keeps its last published value in place
export function keepMissing(h, prev) {
  if (!prev?.sections) return 0;
  let n = 0;
  const cutoff = Date.now() - 200 * 864e5; // don't keep anything older than a normal publishing gap
  for (const ps of prev.sections) {
    const s = h.sections.find((x) => x.id === ps.id); if (!s) continue;
    for (const pr of ps.regions || []) {
      const r = (s.regions || []).find((x) => x.id === pr.id); if (!r) continue;
      r.metrics ||= [];
      for (const pm of pr.metrics || []) {
        if (r.metrics.some((m) => m.id === pm.id) || !pm.date || Date.parse(pm.date) < cutoff) continue;
        const i = (pr.metrics || []).indexOf(pm);
        r.metrics.splice(Math.min(i, r.metrics.length), 0, { ...pm, carried: true }); n++;
      }
    }
  }
  return n;
}

