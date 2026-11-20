// WatchDawg market health: housing, commercial property (CRE) and the AI trade.
// Official data from FRED (Federal Reserve Bank of St. Louis, incl. BIS property prices),
// the Bank of England database and the ECB data portal, plus share prices from Yahoo.
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const T = (ms) => AbortSignal.timeout(ms);
const START = '2019-01-01';

async function fred(id) {
  const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${START}`, { headers: UA, signal: T(7000) });
  if (!r.ok) throw new Error('FRED ' + r.status);
  const rows = (await r.text()).trim().split('\n').slice(1).map((l) => l.split(','));
  return rows.filter((x) => x[1] && x[1] !== '.' && !isNaN(+x[1])).map((x) => [x[0], +x[1]]);
}
async function boe(codes) {
  const u = `https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/2019&Dateto=now&SeriesCodes=${codes.join(',')}&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`;
  const r = await fetch(u, { headers: { ...UA, Accept: 'text/csv,*/*' }, signal: T(7000) });
  if (!r.ok) throw new Error('BoE ' + r.status);
  const lines = (await r.text()).trim().split(/\r?\n/);
  const head = lines[0].split(',').map((s) => s.trim());
  const out = {};
  codes.forEach((c) => (out[c] = []));
  const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  for (const l of lines.slice(1)) {
    const c = l.split(',');
    const m = /(\d+) (\w{3}) (\d{4})/.exec(c[0]);
    if (!m) continue;
    const d = `${m[3]}-${String(MON[m[2]] + 1).padStart(2, '0')}-01`;
    head.forEach((h, i) => { if (out[h] && c[i] && c[i].trim() !== '' && !isNaN(+c[i])) out[h].push([d, +c[i]]); });
  }
  return out;
}
async function ecb(countries) {
  const u = `https://data-api.ecb.europa.eu/service/data/MIR/M.${countries.join('+')}.B.A2C.AM.R.A.2250.EUR.N?format=csvdata&startPeriod=2019-01`;
  const r = await fetch(u, { headers: UA, signal: T(7000) });
  if (!r.ok) throw new Error('ECB ' + r.status);
  const lines = (await r.text()).trim().split(/\r?\n/);
  const head = lines[0].split(',');
  const iA = head.indexOf('REF_AREA'), iT = head.indexOf('TIME_PERIOD'), iV = head.indexOf('OBS_VALUE');
  const out = {};
  for (const l of lines.slice(1)) {
    const c = l.split(',');
    if (!c[iV] || isNaN(+c[iV])) continue;
    (out[c[iA]] ||= []).push([c[iT] + '-01', +c[iV]]);
  }
  return out;
}
async function yahoo(sym) {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1y&interval=1d`, { headers: UA, signal: T(7000) });
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  if (!res) throw new Error('no data');
  const ts = res.timestamp || [], cl = res.indicators?.quote?.[0]?.close || [];
  const pts = ts.map((t, i) => [t, cl[i]]).filter((p) => p[1] != null);
  const m = res.meta;
  const price = m.regularMarketPrice ?? pts.at(-1)?.[1];
  const prevClose = m.chartPreviousClose && pts.length > 1 ? pts.at(-2)[1] : null;
  const back = (days) => { const cut = Date.now() / 1000 - days * 86400; const p = pts.find((x) => x[0] >= cut); return p ? p[1] : null; };
  const hi = Math.max(...pts.map((p) => p[1]), price);
  const pc = (a, b) => (a != null && b ? (a / b - 1) * 100 : null);
  const step = Math.max(1, Math.floor(pts.length / 60));
  return {
    sym, price, cur: m.currency || 'USD',
    d1: pc(price, prevClose), m3: pc(price, back(91)), y1: pc(price, pts[0]?.[1]), offHigh: pc(price, hi),
    spark: pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map((p) => +p[1].toFixed(4)),
  };
}

// ---------- helpers ----------
const yoy = (s, per) => s.slice(per).map((p, i) => [p[0], +((p[1] / s[i][1] - 1) * 100).toFixed(2)]);
function lastAt(s, monthsBack) {
  if (!s.length) return null;
  const end = new Date(s.at(-1)[0]); end.setMonth(end.getMonth() - monthsBack);
  let best = null;
  for (const p of s) if (new Date(p[0]) <= end) best = p;
  return best ? best[1] : null;
}
function thin(s, max = 72) {
  const cut = new Date(); cut.setFullYear(cut.getFullYear() - 5);
  const x = s.filter((p) => new Date(p[0]) >= cut);
  const step = Math.max(1, Math.ceil(x.length / max));
  return x.filter((_, i) => i % step === 0 || i === x.length - 1);
}
// metric: label, unit, freq (Q/M/W), good: which direction is healthy, lead: the key early-warning figure
function metric(id, s, o) {
  if (!s || !s.length) return null;
  const v = s.at(-1)[1], prev = s.length > 1 ? s.at(-2)[1] : null, yr = lastAt(s, 12);
  return { id, ...o, value: v, date: s.at(-1)[0], prev, yr, series: thin(s) };
}
// +1 improving, -1 worsening, 0 steady, judged against a year ago (and, for price growth, its sign)
function score(m) {
  if (!m) return null;
  const tol = m.tol ?? 0.15;
  const ref = m.yr ?? m.prev;
  if (ref == null) return 0;
  let d = m.value - ref;
  if (m.good === 'down') d = -d;
  let s = d > tol ? 1 : d < -tol ? -1 : 0;
  if (m.kind === 'growth') { if (m.value < 0) s = Math.min(s, 0) - 1; else if (m.value > 0 && s === 0) s = 0; }
  return Math.max(-1, Math.min(1, s));
}
function stockScore(st) {
  const xs = st.filter((x) => x && x.m3 != null);
  if (!xs.length) return null;
  const avg = xs.reduce((a, x) => a + x.m3, 0) / xs.length;
  return avg > 5 ? 1 : avg < -10 ? -1 : 0;
}
function regionSignal(metrics, stocks, words) {
  let tot = 0, w = 0;
  const notes = [];
  metrics.filter(Boolean).forEach((m) => {
    const s = score(m), wt = m.lead ? 2 : 1;
    m.trend = s;
    tot += s * wt; w += wt;
    if (s) notes.push([Math.abs(s) * wt, `${m.short || m.label} ${s > 0 ? words.better(m) : words.worse(m)}`]);
  });
  const ss = stocks && stocks.length ? stockScore(stocks) : null;
  if (ss != null) { tot += ss; w += 1; if (ss) notes.push([1, ss > 0 ? 'shares rising' : 'shares falling']); }
  if (!w) return { signal: 'none', why: '' };
  const r = tot / w;
  const signal = r >= 0.3 ? 'green' : r <= -0.3 ? 'red' : 'amber';
  notes.sort((a, b) => b[0] - a[0]);
  return { signal, why: notes.slice(0, 2).map((n) => n[1]).join(', ') };
}
const WORDS = {
  better: (m) => (m.kind === 'growth' ? 'picking up' : m.good === 'down' ? 'easing' : 'improving'),
  worse: (m) => (m.kind === 'growth' ? (m.value < 0 ? 'falling' : 'slowing') : m.good === 'down' ? 'rising' : 'weakening'),
};
const safe = (p) => p.catch((e) => ({ error: String(e.message || e).slice(0, 80) }));

const NAMES = {
  XHB: 'US homebuilders (ETF)', VNQ: 'US property REITs (ETF)', BXP: 'BXP (offices)', SLG: 'SL Green (NYC offices)',
  'PSN.L': 'Persimmon', 'BTRW.L': 'Barratt Redrow', 'TW.L': 'Taylor Wimpey', 'LAND.L': 'Landsec', 'BLND.L': 'British Land', 'BBOX.L': 'Tritax Big Box',
  'IRES.IR': 'I-RES (Irish rental homes)', 'GVR.IR': 'Glenveagh (Irish homebuilder)', 'MRL.MC': 'Merlin Properties (Spain)', 'COL.MC': 'Colonial (Spain/Paris offices)',
  NVDA: 'Nvidia', MSFT: 'Microsoft', GOOGL: 'Alphabet', META: 'Meta', AMZN: 'Amazon', ORCL: 'Oracle', AVGO: 'Broadcom', AMD: 'AMD', CRWV: 'CoreWeave', NBIS: 'Nebius', ANT: 'Anthropic',
};
const STOCKS = {
  us_h: ['XHB'], us_c: ['VNQ', 'BXP', 'SLG'], uk_h: ['PSN.L', 'BTRW.L', 'TW.L'], uk_c: ['LAND.L', 'BLND.L', 'BBOX.L'],
  ie_h: ['IRES.IR', 'GVR.IR'], med_c: ['MRL.MC', 'COL.MC'],
  ai: ['NVDA', 'MSFT', 'GOOGL', 'META', 'AMZN', 'ORCL', 'AVGO', 'AMD', 'CRWV', 'NBIS', 'ANT'],
};
const MED = [['ES', '🇪🇸', 'Spain'], ['PT', '🇵🇹', 'Portugal'], ['IT', '🇮🇹', 'Italy'], ['GR', '🇬🇷', 'Greece'], ['HR', '🇭🇷', 'Croatia'], ['CY', '🇨🇾', 'Cyprus'], ['MT', '🇲🇹', 'Malta']];

let fredErr = {};
export default async (req) => {
  const dbg = new URL(req.url).searchParams.get('debug');
  if (dbg) { const t0 = Date.now(); const out = {};
    const E1 = (c, q) => async () => { const r = await fetch(`https://data-api.ecb.europa.eu/service/data/MIR/M.${c}.B.A2C.AM.R.A.2250.EUR.N?${q}`, { headers: { ...UA, Accept: 'text/csv' }, signal: T(9000) }); return r.status + ' ' + (await r.text()).slice(0, 400); };
    await Promise.all([['e_dataonly', E1('ES', 'format=csvdata&detail=dataonly&lastNObservations=3')], ['e_multi', E1('ES+IE+PT+IT+GR+HR+CY+MT+U2', 'format=csvdata&detail=dataonly&startPeriod=2021-01')], ['e_json', E1('IE', 'format=jsondata&detail=dataonly&lastNObservations=3')]].map(async ([k, f]) => { const t = Date.now(); try { const v = await f(); out[k] = { ms: Date.now() - t, ok: true, sample: typeof v === 'string' ? v : JSON.stringify(v).slice(0, 200) }; } catch (e) { out[k] = { ms: Date.now() - t, err: String(e.cause || e).slice(0, 200) }; } }));
    return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'netlify-vary': 'query' } }); }
  const fredIds = ['DRSFRMACBS', 'MORTGAGE30US', 'CSUSHPINSA', 'DRCRELEXFACBS', 'COMREPUSQ159N',
    'QGBN628BIS', 'QIEN628BIS', ...MED.map((m) => `Q${m[0]}N628BIS`)];
  const allSyms = [...new Set(Object.values(STOCKS).flat())];
  const [F, B, E, Y] = await Promise.all([
    Promise.all(fredIds.map((id) => safe(fred(id)))).then((a) => { fredErr = Object.fromEntries(fredIds.map((id, i) => [id, a[i]?.error])); return Object.fromEntries(fredIds.map((id, i) => [id, Array.isArray(a[i]) ? a[i] : null])); }),
    safe(boe(['IUMBV34', 'IUMBV42', 'LPMVTVX'])),
    safe(ecb(['IE', 'U2', ...MED.map((m) => m[0])])),
    Promise.all(allSyms.map((s) => safe(yahoo(s)))).then((a) => Object.fromEntries(allSyms.map((s, i) => [s, a[i] && !a[i].error ? { ...a[i], name: NAMES[s] || s } : null]))),
  ]);
  const errors = {};
  fredIds.forEach((id) => { if (!F[id]) errors[id] = fredErr[id] || 'unavailable'; });
  if (B.error) errors.boe = B.error;
  if (E.error) errors.ecb = E.error;
  const stocks = (k) => STOCKS[k].map((s) => Y[s]).filter(Boolean);
  const bis = (cc) => (F[`Q${cc}N628BIS`] ? yoy(F[`Q${cc}N628BIS`], 4) : null);

  // ---------- housing ----------
  const usH = [
    metric('us_dq', F.DRSFRMACBS, { label: 'Mortgage delinquency (banks)', short: 'Delinquency', unit: '%', freq: 'Q', good: 'down', lead: true, tol: 0.05, src: 'Federal Reserve via FRED' }),
    metric('us_rate', F.MORTGAGE30US, { label: '30-year fixed mortgage rate', short: 'Mortgage rates', unit: '%', freq: 'W', good: 'down', tol: 0.2, src: 'Freddie Mac via FRED' }),
    metric('us_hpi', F.CSUSHPINSA ? yoy(F.CSUSHPINSA, 12) : null, { label: 'Home prices, year on year (Case-Shiller)', short: 'Prices', unit: '%', kind: 'growth', freq: 'M', good: 'up', tol: 0.5, src: 'S&P Cotality Case-Shiller via FRED' }),
  ];
  const ukH = [
    metric('uk_2y', B.IUMBV34, { label: '2-year fixed mortgage rate (75% LTV)', short: 'Mortgage rates', unit: '%', freq: 'M', good: 'down', tol: 0.2, src: 'Bank of England' }),
    metric('uk_appr', B.LPMVTVX ? B.LPMVTVX.map((p) => [p[0], +(p[1] / 1000).toFixed(1)]) : null, { label: 'Mortgage approvals for house purchase', short: 'Approvals', unit: 'k', freq: 'M', good: 'up', tol: 3, src: 'Bank of England' }),
    metric('uk_hpi', bis('GB'), { label: 'House prices, year on year', short: 'Prices', unit: '%', kind: 'growth', freq: 'Q', good: 'up', tol: 0.5, src: 'BIS via FRED' }),
  ];
  const ieH = [
    metric('ie_rate', E.IE, { label: 'Mortgage rate on new loans', short: 'Mortgage rates', unit: '%', freq: 'M', good: 'down', tol: 0.15, src: 'ECB' }),
    metric('ie_hpi', bis('IE'), { label: 'House prices, year on year', short: 'Prices', unit: '%', kind: 'growth', freq: 'Q', good: 'up', tol: 0.5, src: 'BIS via FRED' }),
  ];
  const medRows = MED.map(([cc, flag, name]) => {
    const r = E[cc], p = bis(cc);
    return { cc, flag, name, rate: r?.at(-1)?.[1] ?? null, rateDate: r?.at(-1)?.[0] ?? null, rateYr: r ? lastAt(r, 12) : null, px: p?.at(-1)?.[1] ?? null, pxDate: p?.at(-1)?.[0] ?? null, pxPrev: p && p.length > 1 ? p.at(-2)[1] : null };
  });
  const medM = [
    metric('ea_rate', E.U2, { label: 'Euro-area mortgage rate', short: 'Mortgage rates', unit: '%', freq: 'M', good: 'down', tol: 0.15, src: 'ECB' }),
    ...['ES', 'PT', 'IT', 'GR'].map((cc) => metric(`${cc.toLowerCase()}_hpi`, bis(cc), { label: `${MED.find((m) => m[0] === cc)[2]} house prices, year on year`, short: `${MED.find((m) => m[0] === cc)[2]} prices`, unit: '%', kind: 'growth', freq: 'Q', good: 'up', tol: 0.5, hidden: true, src: 'BIS via FRED' })),
  ];
  // ---------- CRE ----------
  const usC = [
    metric('us_cre_dq', F.DRCRELEXFACBS, { label: 'Commercial property loan delinquency (banks)', short: 'CRE delinquency', unit: '%', freq: 'Q', good: 'down', lead: true, tol: 0.05, src: 'Federal Reserve via FRED' }),
    metric('us_cre_px', F.COMREPUSQ159N, { label: 'Commercial property prices, year on year', short: 'CRE prices', unit: '%', kind: 'growth', freq: 'Q', good: 'up', tol: 0.5, src: 'BIS via FRED' }),
  ];

  const R = (id, name, flag, metrics, st, extra = {}) => {
    const sig = regionSignal(metrics, st, WORDS);
    return { id, name, flag, ...sig, metrics: metrics.filter(Boolean), stocks: st, ...extra };
  };
  const ai = stocks('ai');
  const aiAvg = (k) => { const xs = ai.filter((x) => x[k] != null); return xs.length ? xs.reduce((a, x) => a + x[k], 0) / xs.length : null; };
  const aiOff = aiAvg('offHigh'), ai3 = aiAvg('m3'), aiY = aiAvg('y1');
  const aiSignal = aiOff == null ? 'none' : aiOff < -25 ? 'red' : aiOff < -12 ? 'amber' : 'green';
  const deep = ai.filter((x) => x.offHigh != null && x.offHigh < -30).map((x) => x.name);
  const aiWhy = aiOff == null ? '' : `AI shares on average ${Math.abs(aiOff).toFixed(0)}% below their 12-month highs` + (deep.length ? `; ${deep.slice(0, 3).join(', ')} down 30%+` : '');

  const body = {
    fetched: new Date().toISOString(),
    sections: [
      { id: 'housing', title: 'Housing', icon: '🏠', regions: [
        R('us', 'United States', '🇺🇸', usH, stocks('us_h')),
        R('uk', 'UK and NI', '🇬🇧', ukH, stocks('uk_h'), { note: 'Arrears for the UK and Northern Ireland are published quarterly by the FCA and aren’t in a live feed yet.' }),
        R('ie', 'Ireland', '🇮🇪', ieH, stocks('ie_h')),
        R('med', 'Mediterranean', '🌊', medM, [], { table: medRows, note: 'Albania and Montenegro have no regular live data feed.' }),
      ] },
      { id: 'cre', title: 'Commercial property', icon: '🏢', regions: [
        R('us', 'United States', '🇺🇸', usC, stocks('us_c')),
        R('uk', 'UK', '🇬🇧', [], stocks('uk_c'), { note: 'Judged on listed landlords’ share prices; official UK figures are quarterly.' }),
        R('med', 'Spain and Med', '🌊', [], stocks('med_c'), { note: 'Judged on Spain’s two biggest listed landlords.' }),
      ] },
      { id: 'ai', title: 'AI bubble watch', icon: '🤖', regions: [
        { id: 'ai', name: 'AI shares', flag: '🤖', signal: aiSignal, why: aiWhy, metrics: [], stocks: ai, avg: { offHigh: aiOff, m3: ai3, y1: aiY } },
      ] },
    ],
    errors,
  };
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=600', 'netlify-cdn-cache-control': 'public, s-maxage=1800, stale-while-revalidate=21600', 'access-control-allow-origin': '*' },
  });
};
