// Recession radar: six US warning signals from FRED, each scored 0 (calm) to 100 (recession-like), combined into
// one risk score. Scores are worked out "as of" each week, so the history shows how the reading has moved.
import { fredSeries } from './fred.mjs';

const lin = (v, lo, hi) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
const asOf = (s, d) => { let r = null; for (const p of s) { if (p[0] <= d) r = p; else break; } return r; };
const since = (s, d) => s.filter((p) => p[0] >= d);
const ymd = (t) => new Date(t).toISOString().slice(0, 10);
const back = (d, days) => ymd(Date.parse(d) - days * 864e5);

export const SIGNALS = [
  { id: 'curve', fred: 'T10Y3M', name: 'Yield curve (10-year minus 3-month)', short: 'Yield curve', unit: 'pts', weight: 1,
    what: 'Long-term minus short-term US government borrowing costs. Below zero (inverted) has come before every US recession since the 1960s; the recession usually starts after it turns positive again.',
    score(s, d) { const p = asOf(s, d); if (!p) return null; let sc = lin(-p[1], -1, 0.5);
      const low = Math.min(...since(s, back(d, 540)).filter((x) => x[0] <= d).map((x) => x[1]));
      if (low < -0.25 && p[1] > 0) sc = Math.max(sc, 60); // re-steepening after a long inversion
      return sc; } },
  { id: 'sahm', fred: 'SAHMREALTIME', name: 'Sahm rule (unemployment rise)', short: 'Sahm rule', unit: 'pts', weight: 1.5,
    what: 'How far the 3-month average unemployment rate has risen above its low of the past year. 0.5 or more has marked the start of every US recession since 1970.',
    score(s, d) { const p = asOf(s, d); return p ? lin(p[1], 0, 0.5) : null; } },
  { id: 'hy', fred: 'BAMLH0A0HYM2', name: 'Junk-bond spread', short: 'Credit stress', unit: '%', weight: 1.5,
    what: 'Extra interest riskier companies pay over the US government. It widens when lenders fear defaults: under 4% is calm, over 6% is stress.',
    score(s, d) { const p = asOf(s, d), q = asOf(s, back(d, 91)); if (!p) return null; return Math.min(100, lin(p[1], 3, 7) + (q && p[1] - q[1] > 1 ? 20 : 0)); } },
  { id: 'claims', fred: 'ICSA', name: 'Jobless claims (4-week average)', short: 'Jobless claims', unit: 'k', weight: 1,
    what: 'New unemployment claims each week, compared with the lowest level of the past year. A rise of 20% or more off the low has preceded past recessions.',
    value(s, d) { const w = s.filter((p) => p[0] <= d).slice(-4); return w.length ? w.reduce((a, p) => a + p[1], 0) / w.length / 1000 : null; },
    score(s, d) { const w = s.filter((p) => p[0] <= d); if (w.length < 56) return null; const avg = (a) => a.reduce((x, p) => x + p[1], 0) / a.length;
      const now = avg(w.slice(-4)), lows = []; for (let i = w.length - 52; i < w.length; i++) lows.push(avg(w.slice(i - 3, i + 1)));
      return lin(now / Math.min(...lows), 1.05, 1.3); } },
  { id: 'nfci', fred: 'NFCI', name: 'Financial conditions (Chicago Fed)', short: 'Financial conditions', unit: '', weight: 1,
    what: 'How easy it is to borrow across US markets, banks and shadow banks. Zero is average; above zero is tighter than normal, which slows the economy.',
    score(s, d) { const p = asOf(s, d); return p ? lin(p[1], -0.5, 0.5) : null; } },
  { id: 'prob', fred: 'RECPROUSM156N', name: 'Recession probability model', short: 'Model odds', unit: '%', weight: 1,
    what: 'A statistical model (Chauvet and Piger) that reads jobs, income, output and sales. Published with about a two-month lag.',
    score(s, d) { const p = asOf(s, d); return p ? lin(p[1], 5, 50) : null; } },
];

export const radarLabel = (v) => (v < 25 ? 'Low' : v < 45 ? 'Moderate' : v < 65 ? 'Elevated' : 'High');
export const light = (v) => (v < 35 ? 'green' : v < 65 ? 'amber' : 'red');

// combined score for a date: weighted average of the signals that have a reading
export function composite(data, d) {
  let w = 0, t = 0;
  for (const sg of SIGNALS) { const s = data[sg.id]; if (!s?.length) continue; const v = sg.score(s, d); if (v == null) continue; w += sg.weight; t += v * sg.weight; }
  return w ? Math.round(t / w) : null;
}
const thin = (s, n = 160) => { if (s.length <= n) return s; const k = Math.ceil(s.length / n), o = s.filter((_, i) => i % k === 0); if (o.at(-1) !== s.at(-1)) o.push(s.at(-1)); return o; };

// FRED series {id: [[date, value]]} -> the radar
export function buildRadar(data, now = Date.now()) {
  const today = ymd(now), signals = [];
  for (const sg of SIGNALS) {
    const s = data[sg.id]; if (!s?.length) continue;
    const last = s.at(-1), val = sg.value ? sg.value(s, today) : last[1], sc = sg.score(s, today);
    if (sc == null) continue;
    const prev = sg.score(s, back(today, 91));
    signals.push({ id: sg.id, name: sg.name, short: sg.short, unit: sg.unit, what: sg.what, value: +(+val).toFixed(sg.unit === 'k' ? 0 : 2), date: last[0],
      score: Math.round(sc), light: light(sc), prev: prev == null ? null : Math.round(prev), series: thin(since(s, back(today, 3 * 365)).map(([d, v]) => [d, sg.id === 'claims' ? Math.round(v / 1000) : v])), fred: sg.fred });
  }
  const history = [];
  for (let t = Date.parse(back(today, 5 * 365)); t <= now; t += 7 * 864e5) { const v = composite(data, ymd(t)); if (v != null) history.push([ymd(t), v]); }
  const score = composite(data, today);
  return { updated: new Date(now).toISOString(), score, label: score == null ? null : radarLabel(score), m3: composite(data, back(today, 91)), y1: composite(data, back(today, 365)), signals, history };
}

export async function fetchRadar(key) {
  const start = ymd(Date.now() - 7 * 365 * 864e5), data = {};
  await Promise.all(SIGNALS.map(async (sg) => { try { data[sg.id] = await fredSeries(sg.fred, start, key); } catch (e) { /* a missing signal is left out */ } }));
  if (Object.keys(data).length < 4) throw new Error(`FRED: only ${Object.keys(data).length} of ${SIGNALS.length} signals`);
  return buildRadar(data);
}
