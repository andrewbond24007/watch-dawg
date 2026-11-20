// WatchDawg market health: housing, commercial property (CRE) and the AI trade.
// Official data from the Federal Reserve, Freddie Mac, FHFA, the BIS, the Bank of England
// and the ECB (FRED blocks cloud servers, so it isn't used), plus share prices from Yahoo.
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const T = (ms) => AbortSignal.timeout(ms);
const START = '2019-01-01';

// Small CSV parser that copes with quoted fields (BIS metadata columns contain commas).
function csv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.length > 1);
}
const qDate = (p) => { const m = /(\d{4})-Q(\d)/.exec(p); return m ? `${m[1]}-${String(m[2] * 3 - 2).padStart(2, '0')}-01` : p; };
// BIS residential (WS_SPP, real index) or commercial (WS_CPP) property prices, straight from the BIS API.
async function bis(flow, key, by = 'REF_AREA') {
  const r = await fetch(`https://stats.bis.org/api/v2/data/dataflow/BIS/${flow}/1.0/${key}?format=csv&startPeriod=2017`, { headers: UA, signal: T(9000) });
  if (!r.ok) throw new Error('BIS ' + r.status);
  const rows = csv(await r.text()), h = rows[0];
  const iK = h.indexOf(by), iT = h.indexOf('TIME_PERIOD'), iV = h.indexOf('OBS_VALUE');
  const out = {};
  for (const c of rows.slice(1)) if (c[iV] !== '' && !isNaN(+c[iV])) (out[c[iK]] ||= []).push([qDate(c[iT]), +c[iV]]);
  Object.values(out).forEach((s) => s.sort((a, b) => (a[0] < b[0] ? -1 : 1)));
  return out;
}
// Federal Reserve delinquency rates on bank loans (seasonally adjusted), quarterly.
async function fedDelinq() {
  const r = await fetch('https://www.federalreserve.gov/releases/chargeoff/delallsa.htm', { headers: UA, signal: T(9000) });
  if (!r.ok) throw new Error('Fed ' + r.status);
  const h = await r.text(), res = [], com = [];
  for (const m of h.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const c = [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((x) => x[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
    const q = /^(\d{4}):(\d)$/.exec(c[0] || '');
    if (!q || +q[1] < 2017) continue;
    const d = `${q[1]}-${String(q[2] * 3 - 2).padStart(2, '0')}-01`;
    if (!isNaN(+c[2]) && c[2] !== '') res.push([d, +c[2]]);
    if (!isNaN(+c[3]) && c[3] !== '') com.push([d, +c[3]]);
  }
  if (!res.length) throw new Error('Fed table changed');
  const asc = (s) => s.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return { res: asc(res), com: asc(com) };
}
// Freddie Mac weekly 30-year fixed mortgage rate.
async function freddie() {
  const r = await fetch('https://www.freddiemac.com/pmms/docs/PMMS_history.csv', { headers: UA, signal: T(9000) });
  if (!r.ok) throw new Error('Freddie ' + r.status);
  return (await r.text()).trim().split(/\r?\n/).slice(1).map((l) => l.split(',')).map(([d, v]) => {
    const m = /(\d+)\/(\d+)\/(\d{4})/.exec(d); return m && v && !isNaN(+v) ? [`${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`, +v] : null;
  }).filter((p) => p && p[0] >= START);
}
// FHFA purchase-only house price index for the whole US, monthly (seasonally adjusted).
async function fhfa() {
  const r = await fetch('https://www.fhfa.gov/hpi/download/monthly/hpi_master.csv', { headers: UA, signal: T(9000) });
  if (!r.ok) throw new Error('FHFA ' + r.status);
  const out = [];
  for (const l of (await r.text()).split(/\r?\n/)) {
    if (!l.startsWith('traditional,purchase-only,monthly,USA or Census Division,United States,')) continue;
    const c = l.split(','), v = +(c[9] || c[8]);
    if (+c[6] >= 2017 && !isNaN(v) && v) out.push([`${c[6]}-${String(c[7]).padStart(2, '0')}-01`, v]);
  }
  if (!out.length) throw new Error('FHFA: no US rows');
  return out;
}
async function boe(codes) {
  const u = `https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/2019&Dateto=now&SeriesCodes=${codes.join(',')}&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`;
  const r = await fetch(u, { headers: { ...UA, Accept: 'text/csv,*/*' }, signal: T(15000) });
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
  let r;
  try { r = await fetch(u + '&detail=dataonly', { headers: { ...UA, Accept: 'text/csv' }, signal: T(20000) }); if (!r.ok) throw new Error('ECB ' + r.status); }
  catch (e) { return ecbBackup(countries); }
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
async function ecbBackup(countries) {
  const ids = countries.map((c) => `M.${c}.B.A2C.AM.R.A.2250.EUR.N`).join('+');
  const r = await fetch(`https://api.db.nomics.world/v22/series/ECB/MIR/${ids}?observations=1`, { headers: UA, signal: T(8000) });
  if (!r.ok) throw new Error('ECB backup ' + r.status);
  const out = {};
  for (const d of (await r.json()).series?.docs || []) {
    const cc = d.series_code.split('.')[1];
    out[cc] = d.period.map((p, i) => [p + '-01', d.value[i]]).filter((x) => x[0] >= START && typeof x[1] === 'number');
  }
  return out;
}
// ---------- offices ----------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ');
// Published Trepp readings (office CMBS delinquency, and the all-property rate including performing matured
// loans), used only for months the live reports no longer list. Sources: Trepp via Connect CRE, Scotsman Guide, CRE Daily.
const TREPP_SEED = { office: [['2025-09-01', 11.13], ['2025-10-01', 11.76], ['2026-01-01', 12.34], ['2026-09-01', 12.16]], matured: [['2026-08-01', 9.81]] };
async function trepp() {
  const h = await fetch('https://www.trepp.com/trepptalk/topic/cmbs-delinquencies', { headers: UA, signal: T(8000) }).then((r) => r.text());
  const links = [...new Set([...h.matchAll(/href="(https:\/\/www\.trepp\.com\/trepptalk\/[a-z0-9-]+)"/g)].map((m) => m[1]))]
    .filter((l) => /delinquency-(rate|report)|cmbs-delinquenc/.test(l)).slice(0, 4);
  const posts = await Promise.all(links.map((l) => fetch(l, { headers: UA, signal: T(8000) }).then((r) => r.text()).then(plain).catch(() => '')));
  const office = [], matured = [], overall = [];
  posts.forEach((t, i) => {
    const start = t.search(/The Trepp (commercial mortgage-backed securities \(CMBS\) |CMBS )?delinquency rate/i);
    if (start < 0) return;
    const b = t.slice(start, start + 6000);
    const mo = new RegExp(`in (${MONTHS.join('|')}) (\\d{4})`).exec(b);
    if (!mo) return;
    const d = `${mo[2]}-${String(MONTHS.indexOf(mo[1]) + 1).padStart(2, '0')}-01`;
    const all = /delinquency rate[^%]{0,90}?(\d{1,2}\.\d{1,2})%/i.exec(b);
    if (all) overall.push([d, +all[1]]);
    // the office reading: "office ... to 12.33%", "the office delinquency rate ... 12.33%"
    for (const m of b.matchAll(/\boffice\b([^%]{0,110}?)(\d{1,2}\.\d{1,2})%/gi)) {
      if (/retail|multifamily|lodging|hotel|industrial|mixed-use|overall/i.test(m[1])) continue;
      if (/loan|tower|portfolio|building|propert/i.test(m[1]) && !/rate|basis points|bps/i.test(m[1])) continue;
      const v = +m[2]; if (v >= 4 && v <= 30) { office.push([d, v]); break; }
    }
    const mb = /(?:matured balloon|beyond (?:their|the) maturity|past (?:their|the) maturity)[^%]{0,220}?(\d{1,2}\.\d{1,2})%/i.exec(b);
    if (mb && +mb[1] > 4) matured.push([d, +mb[1]]);
  });
  const merge = (live, seed) => { const m = new Map(seed); live.forEach(([d, v]) => m.set(d, v)); return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)); };
  if (!office.length && !overall.length) throw new Error('Trepp: no readings found');
  return { office: merge(office, TREPP_SEED.office), matured: matured.length ? merge(matured, TREPP_SEED.matured) : null, overall: merge(overall, []), live: office.length };
}
// Kastle weekly office occupancy (10 big US cities, share of pre-pandemic attendance).
async function kastle() {
  const t = plain(await fetch('https://www.kastle.com/safety-wellness/getting-america-back-to-work/', { headers: UA, signal: T(8000) }).then((r) => r.text()));
  const m = /national average occupancy of (\d{2}\.\d)%(?:,? (up|down) (\d+(?:\.\d)?) points?)?/i.exec(t);
  if (!m) throw new Error('Kastle: figure not found');
  const v = +m[1], ch = m[3] ? (m[2].toLowerCase() === 'up' ? 1 : -1) * +m[3] : null;
  const peak = /peak day nationally[^%]{0,120}?(\d{2}\.\d)%/i.exec(t);
  const wk = new Date(); wk.setUTCDate(wk.getUTCDate() - ((wk.getUTCDay() + 6) % 7) - 7);
  return { value: v, prev: ch == null ? null : +(v - ch).toFixed(1), peak: peak ? +peak[1] : null, date: wk.toISOString().slice(0, 10) };
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
  XHB: 'US homebuilders (ETF)', VNQ: 'US property REITs (ETF)', BXP: 'BXP', SLG: 'SL Green', VNO: 'Vornado', KRC: 'Kilroy', HPP: 'Hudson Pacific', CUZ: 'Cousins',
  'DLN.L': 'Derwent London', 'GPE.L': 'Great Portland', 'GFC.PA': 'Gecina (Paris)',
  'PSN.L': 'Persimmon', 'BTRW.L': 'Barratt Redrow', 'TW.L': 'Taylor Wimpey', 'LAND.L': 'Landsec', 'BLND.L': 'British Land', 'BBOX.L': 'Tritax Big Box',
  'IRES.IR': 'I-RES (Irish rental homes)', 'GVR.IR': 'Glenveagh (Irish homebuilder)', 'MRL.MC': 'Merlin Properties (Spain)', 'COL.MC': 'Colonial (Spain/Paris offices)',
  NVDA: 'Nvidia', MSFT: 'Microsoft', GOOGL: 'Alphabet', META: 'Meta', AMZN: 'Amazon', ORCL: 'Oracle', AVGO: 'Broadcom', AMD: 'AMD', CRWV: 'CoreWeave', NBIS: 'Nebius', ANT: 'Anthropic',
};
const STOCKS = {
  us_h: ['XHB'], us_c: ['VNQ'], off_us: ['BXP', 'SLG', 'VNO', 'KRC', 'HPP', 'CUZ'], off_eu: ['DLN.L', 'GPE.L', 'GFC.PA', 'COL.MC'], uk_h: ['PSN.L', 'BTRW.L', 'TW.L'], uk_c: ['LAND.L', 'BLND.L', 'BBOX.L'],
  ie_h: ['IRES.IR', 'GVR.IR'], med_c: ['MRL.MC'],
  ai: ['NVDA', 'MSFT', 'GOOGL', 'META', 'AMZN', 'ORCL', 'AVGO', 'AMD', 'CRWV', 'NBIS', 'ANT'],
};
const MED = [['ES', '🇪🇸', 'Spain'], ['PT', '🇵🇹', 'Portugal'], ['IT', '🇮🇹', 'Italy'], ['GR', '🇬🇷', 'Greece'], ['HR', '🇭🇷', 'Croatia'], ['CY', '🇨🇾', 'Cyprus'], ['MT', '🇲🇹', 'Malta']];

export default async (req) => {
  const allSyms = [...new Set(Object.values(STOCKS).flat())];
  const PX = ['GB', 'IE', ...MED.map((m) => m[0])];
  const [BS, BC, FD, FM, FH, B, E, Y, TR, KS] = await Promise.all([
    safe(bis('WS_SPP', `Q.${PX.join("+")}.N.628`)),
    safe(bis('WS_CPP', 'Q.US.0.A.0.2.6.0')),
    safe(fedDelinq()), safe(freddie()), safe(fhfa()),
    safe(boe(['IUMBV34', 'IUMBV42', 'LPMVTVX'])),
    safe(ecb(['IE', 'U2', ...MED.map((m) => m[0])])),
    Promise.all(allSyms.map((s) => safe(yahoo(s)))).then((a) => Object.fromEntries(allSyms.map((s, i) => [s, a[i] && !a[i].error ? { ...a[i], name: NAMES[s] || s } : null]))),
    safe(trepp()), safe(kastle()),
  ]);
  const ok = (x) => (x && !x.error ? x : null);
  const F = {
    DRSFRMACBS: ok(FD)?.res, DRCRELEXFACBS: ok(FD)?.com, MORTGAGE30US: ok(FM), HPI: ok(FH),
    COMRE: ok(BC)?.US || null,
  };
  const errors = {};
  [['bis', BS], ['bis_cre', BC], ['fed', FD], ['freddie', FM], ['fhfa', FH], ['trepp', TR], ['kastle', KS]].forEach(([k, x]) => { if (x && x.error) errors[k] = x.error; });
  if (B.error) errors.boe = B.error;
  if (E.error) errors.ecb = E.error;
  const stocks = (k) => STOCKS[k].map((s) => Y[s]).filter(Boolean);
  const bisY = (cc) => (ok(BS)?.[cc] ? yoy(BS[cc], 4) : null);

  // ---------- housing ----------
  const usH = [
    metric('us_dq', F.DRSFRMACBS, { label: 'Mortgage delinquency (banks)', short: 'Delinquency', unit: '%', freq: 'Q', good: 'down', lead: true, tol: 0.05, src: 'Federal Reserve' }),
    metric('us_rate', F.MORTGAGE30US, { label: '30-year fixed mortgage rate', short: 'Mortgage rates', unit: '%', freq: 'W', good: 'down', tol: 0.2, src: 'Freddie Mac' }),
    metric('us_hpi', F.HPI ? yoy(F.HPI, 12) : null, { label: 'Home prices, year on year (FHFA)', short: 'Prices', unit: '%', kind: 'growth', freq: 'M', good: 'up', tol: 0.5, src: 'FHFA house price index' }),
  ];
  const ukH = [
    metric('uk_2y', B.IUMBV34, { label: '2-year fixed mortgage rate (75% LTV)', short: 'Mortgage rates', unit: '%', freq: 'M', good: 'down', tol: 0.2, src: 'Bank of England' }),
    metric('uk_appr', B.LPMVTVX ? B.LPMVTVX.map((p) => [p[0], +(p[1] / 1000).toFixed(1)]) : null, { label: 'Mortgage approvals for house purchase', short: 'Approvals', unit: 'k', freq: 'M', good: 'up', tol: 3, src: 'Bank of England' }),
    metric('uk_hpi', bisY('GB'), { label: 'House prices, year on year', short: 'Prices', unit: '%', kind: 'growth', freq: 'Q', good: 'up', tol: 0.5, src: 'BIS' }),
  ];
  const ieH = [
    metric('ie_rate', E.IE, { label: 'Mortgage rate on new loans', short: 'Mortgage rates', unit: '%', freq: 'M', good: 'down', tol: 0.15, src: 'ECB' }),
    metric('ie_hpi', bisY('IE'), { label: 'House prices, year on year', short: 'Prices', unit: '%', kind: 'growth', freq: 'Q', good: 'up', tol: 0.5, src: 'BIS' }),
  ];
  const medRows = MED.map(([cc, flag, name]) => {
    const r = E[cc], p = bisY(cc);
    return { cc, flag, name, rate: r?.at(-1)?.[1] ?? null, rateDate: r?.at(-1)?.[0] ?? null, rateYr: r ? lastAt(r, 12) : null, px: p?.at(-1)?.[1] ?? null, pxDate: p?.at(-1)?.[0] ?? null, pxPrev: p && p.length > 1 ? p.at(-2)[1] : null };
  });
  const medM = [
    metric('ea_rate', E.U2, { label: 'Euro-area mortgage rate', short: 'Mortgage rates', unit: '%', freq: 'M', good: 'down', tol: 0.15, src: 'ECB' }),
    ...['ES', 'PT', 'IT', 'GR'].map((cc) => metric(`${cc.toLowerCase()}_hpi`, bisY(cc), { label: `${MED.find((m) => m[0] === cc)[2]} house prices, year on year`, short: `${MED.find((m) => m[0] === cc)[2]} prices`, unit: '%', kind: 'growth', freq: 'Q', good: 'up', tol: 0.5, hidden: true, src: 'BIS' })),
  ];
  // ---------- CRE ----------
  const usC = [
    metric('us_cre_dq', F.DRCRELEXFACBS, { label: 'Commercial property loan delinquency (banks, all types)', short: 'CRE delinquency', unit: '%', freq: 'Q', good: 'down', lead: true, tol: 0.05, src: 'Federal Reserve' }),
    metric('us_cre_px', F.COMRE ? yoy(F.COMRE, 4) : null, { label: 'Commercial property prices, year on year', short: 'CRE prices', unit: '%', kind: 'growth', freq: 'Q', good: 'up', tol: 0.5, src: 'BIS (CoStar index)' }),
  ];

  const tr = ok(TR), ks = ok(KS);
  const offUs = [
    metric('off_dq', tr?.office, { label: 'Office loan delinquency (CMBS)', short: 'Office delinquency', unit: '%', freq: 'M', good: 'down', lead: true, tol: 0.1, src: 'Trepp' }),
    metric('cmbs_mat', tr?.matured, { label: 'All CMBS loans in trouble, incl. matured and unpaid', short: 'Matured loans', unit: '%', freq: 'M', good: 'down', tol: 0.1, src: 'Trepp' }),
    ks ? { id: 'off_occ', label: 'Office attendance, 10 big cities', short: 'Attendance', unit: '%', freq: 'W', good: 'up', tol: 0.3, src: 'Kastle (vs pre-2020)', value: ks.value, prev: ks.prev, yr: null, date: ks.date, series: [], extra: ks.peak ? `Busiest day ${ks.peak}%` : '' } : null,
  ];
  const offAvg = (st) => { const xs = st.filter((x) => x.offHigh != null); return xs.length ? { offHigh: xs.reduce((a, x) => a + x.offHigh, 0) / xs.length, m3: xs.reduce((a, x) => a + (x.m3 ?? 0), 0) / xs.length, y1: xs.reduce((a, x) => a + (x.y1 ?? 0), 0) / xs.length } : null; };
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
        R('off_us', 'US offices', '🏙️', offUs, stocks('off_us'), { group: 'Offices', dd: true, avg: offAvg(stocks('off_us')), note: 'Office share prices are the market’s live view of office values: the bar shows how far each landlord is below its 12-month high. Trepp’s delinquency is the share of office loans in commercial mortgage-backed securities that are 30+ days late, published early each month.' }),
        R('off_eu', 'UK and Europe offices', '🇬🇧', [], stocks('off_eu'), { group: 'Offices', dd: true, avg: offAvg(stocks('off_eu')), note: 'London (Derwent, Great Portland), Paris (Gecina) and Madrid/Barcelona (Colonial) office landlords. Official office values in the UK and Europe are quarterly and paywalled.' }),
        R('us', 'US, all commercial property', '🇺🇸', usC, stocks('us_c'), { group: 'Other commercial property', note: 'Bank loans and prices across all property types: offices, shops, warehouses, flats and hotels.' }),
        R('uk', 'UK landlords', '🇬🇧', [], stocks('uk_c'), { group: 'Other commercial property', note: 'Judged on listed landlords’ share prices; official UK figures are quarterly.' }),
        R('med', 'Spain', '🇪🇸', [], stocks('med_c'), { group: 'Other commercial property', note: 'Judged on Merlin, Spain’s biggest listed landlord.' }),
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
