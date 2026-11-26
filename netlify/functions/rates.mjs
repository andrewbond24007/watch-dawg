import { freddieSeries } from '../../lib/freddie.mjs';
// WatchDawg rates and money: central-bank rates and their decision history, what futures
// markets expect from the Fed, government bond yields, mortgage rates and inflation, each
// with the date of its next scheduled update. All official sources, no API keys.
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const T = (ms) => AbortSignal.timeout(ms);
const get = (u, ms = 12000, h = {}) => fetch(u, { headers: { ...UA, ...h }, signal: T(ms) }).then((r) => { if (!r.ok) throw new Error(r.status + ' ' + new URL(u).host); return r.text(); });
const START = '2022-01-01';

// ---------- official meeting and release schedules (decision times in each bank's local time) ----------
// Fed: statement at 2pm ET on the second day. The 27 Oct 2027 meeting is strategy only, with no decision.
export const FOMC = ['2026-12-09T14:00:00-05:00', '2027-01-27T14:00:00-05:00', '2027-03-17T14:00:00-04:00', '2027-04-28T14:00:00-04:00', '2027-06-09T14:00:00-04:00',
  '2027-07-28T14:00:00-04:00', '2027-09-15T14:00:00-04:00', '2027-11-17T14:00:00-05:00', '2028-01-26T14:00:00-05:00'];
export const MPC = ['2026-12-17T12:00:00+00:00', '2027-02-04T12:00:00+00:00', '2027-03-18T12:00:00+00:00', '2027-04-29T12:00:00+01:00', '2027-06-17T12:00:00+01:00',
  '2027-07-29T12:00:00+01:00', '2027-09-16T12:00:00+01:00', '2027-11-04T12:00:00+00:00', '2027-12-16T12:00:00+00:00'];
export const ECBM = ['2026-12-17T14:15:00+01:00', '2027-02-04T14:15:00+01:00', '2027-03-18T14:15:00+01:00', '2027-04-29T14:15:00+02:00', '2027-06-10T14:15:00+02:00',
  '2027-07-22T14:15:00+02:00', '2027-09-09T14:15:00+02:00', '2027-10-28T14:15:00+02:00', '2027-12-16T14:15:00+01:00'];
// BLS consumer price index, 8:30am ET
export const US_CPI = ['2026-12-10T08:30:00-05:00', '2027-01-13T08:30:00-05:00', '2027-02-11T08:30:00-05:00', '2027-03-10T08:30:00-05:00', '2027-04-13T08:30:00-04:00',
  '2027-05-12T08:30:00-04:00', '2027-06-10T08:30:00-04:00', '2027-07-14T08:30:00-04:00', '2027-08-11T08:30:00-04:00', '2027-09-14T08:30:00-04:00',
  '2027-10-14T08:30:00-04:00', '2027-11-10T08:30:00-05:00', '2027-12-10T08:30:00-05:00'];
const nextOf = (list, now = Date.now()) => list.find((d) => Date.parse(d) > now) || null;
// Freddie Mac's weekly survey: Thursdays at noon ET, a day early in holiday weeks
const FREDDIE_MOVED = { '2026-11-26': '2026-11-25', '2026-12-24': '2026-12-23', '2026-12-31': '2026-12-30', '2027-11-25': '2027-11-24' };
export function nextFreddie(now = Date.now()) {
  for (let i = 0; i < 9; i++) {
    const d = new Date(now + i * 864e5), ymd = d.toISOString().slice(0, 10);
    const dow = new Date(ymd + 'T12:00:00Z').getUTCDay();
    if (dow !== 4) continue;
    const day = FREDDIE_MOVED[ymd] || ymd;
    const t = `${day}T12:00:00${dstNY(day) ? '-04:00' : '-05:00'}`;
    if (Date.parse(t) > now) return t;
  }
  return null;
}
// the most recent survey release at or before now (to spot a figure that's out but not yet in the data)
export function lastFreddie(now = Date.now()) { const t = nextFreddie(now - 8 * 864e5); let x = t; while (x) { const n = nextFreddie(Date.parse(x) + 60e3); if (!n || Date.parse(n) > now) break; x = n; } return x && Date.parse(x) <= now ? x : null; }
// next figure for a weekly series: the release just gone if the data hasn't caught up with it yet, else next week's
function freddieNext(lastDate, now = Date.now()) { const lr = lastFreddie(now); return lr && lastDate < lr.slice(0, 10) && now - Date.parse(lr) < 3 * 864e5 ? lr : nextFreddie(now); }
// US daylight saving: second Sunday of March to first Sunday of November
function dstNY(ymd) {
  const y = +ymd.slice(0, 4), sun = (m, n) => { const d = new Date(Date.UTC(y, m, 1)); return 1 + ((7 - d.getUTCDay()) % 7) + 7 * (n - 1); };
  const s = `${y}-03-${String(sun(2, 2)).padStart(2, '0')}`, e = `${y}-11-${String(sun(10, 1)).padStart(2, '0')}`;
  return ymd >= s && ymd < e;
}

// ---------- sources ----------
// Fed target range and the effective rate, daily, from the New York Fed
async function fed() {
  const j = JSON.parse(await get(`https://markets.newyorkfed.org/api/rates/unsecured/effr/search.json?startDate=${START}&endDate=${new Date(Date.now() + 864e5).toISOString().slice(0, 10)}`, 15000));
  const rows = (j.refRates || []).map((r) => ({ d: r.effectiveDate, effr: +r.percentRate, lo: +r.targetRateFrom, hi: +r.targetRateTo })).filter((r) => r.d >= START).sort((a, b) => (a.d < b.d ? -1 : 1));
  if (!rows.length) throw new Error('no Fed data');
  return rows;
}
// BoE Bank Rate, daily
async function boeDaily(code) {
  const t = await get(`https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/2022&Dateto=now&SeriesCodes=${code}&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`, 15000, { Accept: 'text/csv,*/*' });
  const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  return t.trim().split(/\r?\n/).slice(1).map((l) => { const c = l.split(','), m = /(\d+) (\w{3}) (\d{4})/.exec(c[0]); return m && c[1] && !isNaN(+c[1]) ? [`${m[3]}-${String(MON[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`, +c[1]] : null; }).filter(Boolean).sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
async function boeMonthly(codes) {
  const t = await get(`https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/2022&Dateto=now&SeriesCodes=${codes.join(',')}&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`, 15000, { Accept: 'text/csv,*/*' });
  const lines = t.trim().split(/\r?\n/), head = lines[0].split(',').map((s) => s.trim()), out = {};
  const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  codes.forEach((c) => (out[c] = []));
  for (const l of lines.slice(1)) { const c = l.split(','), m = /(\d+) (\w{3}) (\d{4})/.exec(c[0]); if (!m) continue; head.forEach((h, i) => { if (out[h] && c[i] && !isNaN(+c[i]) && c[i].trim() !== '') out[h].push([`${m[3]}-${String(MON[m[2]]).padStart(2, '0')}-01`, +c[i]]); }); }
  return out;
}
// ECB series (deposit facility rate, euro-area 10-year yield, inflation), with DBnomics as a backup
async function ecbSeries(flow, key) {
  try {
    const t = await get(`https://data-api.ecb.europa.eu/service/data/${flow}/${key}?format=csvdata&detail=dataonly&startPeriod=2022-01`, 20000, { Accept: 'text/csv' });
    const lines = t.trim().split(/\r?\n/), h = lines[0].split(','), iT = h.indexOf('TIME_PERIOD'), iV = h.indexOf('OBS_VALUE');
    return lines.slice(1).map((l) => l.split(',')).filter((c) => c[iV] && !isNaN(+c[iV])).map((c) => [c[iT].length === 7 ? c[iT] + '-01' : c[iT], +c[iV]]);
  } catch (e) {
    const j = JSON.parse(await get(`https://api.db.nomics.world/v22/series/ECB/${flow}/${key}?observations=1`, 10000));
    const d = j.series?.docs?.[0]; if (!d) throw e;
    return d.period.map((p, i) => [p.length === 7 ? p + '-01' : p, d.value[i]]).filter((x) => x[0] >= START && typeof x[1] === 'number');
  }
}
// US Treasury par yield curve, daily closes
async function treasury() {
  const y = new Date().getUTCFullYear(), out = { m3: [], y2: [], y10: [], y30: [] };
  for (const yr of [y - 1, y]) {
    const t = await get(`https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${yr}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${yr}&page&_format=csv`, 15000).catch(() => '');
    const lines = t.trim().split(/\r?\n/); if (lines.length < 2) continue;
    const h = lines[0].split(',').map((s) => s.replace(/"/g, '').trim()), ix = (n) => h.indexOf(n);
    const cols = { m3: ix('3 Mo'), y2: ix('2 Yr'), y10: ix('10 Yr'), y30: ix('30 Yr') };
    for (const l of lines.slice(1)) {
      const c = l.split(','), m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(c[0]); if (!m) continue;
      const d = `${m[3]}-${m[1]}-${m[2]}`;
      for (const k in cols) if (cols[k] >= 0 && c[cols[k]] && !isNaN(+c[cols[k]])) out[k].push([d, +c[cols[k]]]);
    }
  }
  for (const k in out) out[k].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (!out.y10.length) throw new Error('no Treasury data');
  return out;
}
const freddie = () => freddieSeries(START, 12000);
// one month's 12-month change from a {YYYY-MM: index} map. BLS collected no prices in October 2025 (shutdown), so
// for October 2026 it publishes no annual rate; we approximate the missing base month as the geometric mean of the
// months either side (BLS's own suggested approach) and flag the point as an estimate.
const ym = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
export function yoyPoint(idx, k) {
  const [yy, mm] = k.split('-').map(Number);
  let b = idx[ym(yy - 1, mm)], est = false;
  if (!b) {
    const pm = mm === 1 ? ym(yy - 2, 12) : ym(yy - 1, mm - 1), nm = mm === 12 ? ym(yy, 1) : ym(yy - 1, mm + 1);
    if (idx[pm] && idx[nm]) { b = Math.sqrt(idx[pm] * idx[nm]); est = true; }
  }
  if (!b) return null;
  const v = +((idx[k] / b - 1) * 100).toFixed(1);
  return est ? [`${k}-01`, v, 1] : [`${k}-01`, v];
}
// BLS CPI index -> 12-month change
async function usCpi() {
  const y = new Date().getUTCFullYear();
  const r = await fetch('https://api.bls.gov/publicAPI/v1/timeseries/data/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seriesid: ['CUUR0000SA0', 'CUUR0000SA0L1E'], startyear: String(y - 3), endyear: String(y) }), signal: T(15000) });
  const j = await r.json(), out = {};
  for (const s of j?.Results?.series || []) {
    const idx = {}; s.data.filter((p) => /^M(0\d|1[0-2])$/.test(p.period) && p.value !== '-').forEach((p) => (idx[`${p.year}-${p.period.slice(1)}`] = +p.value));
    out[s.seriesID] = Object.keys(idx).sort().map((k) => yoyPoint(idx, k)).filter(Boolean);
  }
  if (!out.CUUR0000SA0?.length) throw new Error('no BLS data');
  return { all: out.CUUR0000SA0, core: out.CUUR0000SA0L1E || [] };
}
// ONS CPI annual rate, with ONS's own next release date
async function ukCpi() {
  const j = JSON.parse(await get('https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23/data', 15000));
  const MON = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  const s = (j.months || []).map((m) => { const [yy, mm] = m.date.split(' '); return [`${yy}-${String(MON[mm]).padStart(2, '0')}-01`, +m.value]; }).filter((p) => p[0] >= START && !isNaN(p[1]));
  const nr = j.description?.nextRelease; const t = nr ? Date.parse(nr + ' 07:00 GMT') : NaN;
  return { series: s, next: isNaN(t) ? null : new Date(t).toISOString() };
}
// Euro-area inflation: the ECB's own series, or Eurostat's via DBnomics when the ECB copy is behind
async function euroInflation() {
  const fresh = (s) => s?.length && Date.now() - Date.parse(s.at(-1)[0]) < 100 * 864e5;
  const a = await ecbSeries('ICP', 'M.U2.N.000000.4.ANR').catch(() => null);
  if (fresh(a)) return a;
  const j = JSON.parse(await get('https://api.db.nomics.world/v22/series/Eurostat/prc_hicp_manr/M.RCH_A.CP00.EA?observations=1', 12000));
  const d = j.series?.docs?.[0], b = d ? d.period.map((p, i) => [p + '-01', d.value[i]]).filter((x) => x[0] >= START && typeof x[1] === 'number') : null;
  if (fresh(b)) return b;
  throw new Error('euro-area inflation is out of date at source');
}
// Fed funds futures (CME, via Yahoo): monthly average rate the market expects = 100 - price
const MCODE = 'FGHJKMNQUVXZ';
async function fedFutures(months) {
  const out = {};
  await Promise.all(months.map(async ([y, m]) => {
    const sym = `ZQ${MCODE[m - 1]}${String(y).slice(2)}.CBT`;
    try {
      const j = JSON.parse(await get(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=5d&interval=1d`, 8000));
      const res = j?.chart?.result?.[0], cl = (res?.indicators?.quote?.[0]?.close || []).filter((x) => x != null);
      const px = cl.at(-1) ?? res?.meta?.regularMarketPrice;
      if (px > 80 && px < 100) out[`${y}-${String(m).padStart(2, '0')}`] = +(100 - px).toFixed(4);
    } catch (e) { /* missing month */ }
  }));
  if (!Object.keys(out).length) throw new Error('no futures prices');
  return out;
}
// CME-style reading of the futures: for each meeting, the rate expected after it and the odds of a 25bp move
export function fedPath(effr, fut, meetings) {
  let pre = effr; const path = [];
  for (const iso of meetings) {
    const d = new Date(iso), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, key = `${y}-${String(m).padStart(2, '0')}`;
    const N = new Date(Date.UTC(y, m, 0)).getUTCDate(), day = d.getUTCDate(), after = N - day; // new rate applies from the day after
    const avg = fut[key]; if (avg == null) break;
    // if the next month has a contract and no meeting, it's a cleaner read of the post-meeting rate
    const nk = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`;
    const nextHasMeeting = meetings.some((x) => x.startsWith(nk));
    let post = after >= 8 ? (avg - pre * (day / N)) / (after / N) : (!nextHasMeeting && fut[nk] != null ? fut[nk] : (avg - pre * (day / N)) / Math.max(after, 1) * N);
    const move = post - pre;
    path.push({ date: iso, pre: +pre.toFixed(3), post: +post.toFixed(3), move: +move.toFixed(3), cut: +Math.max(0, Math.min(1, -move / 0.25)).toFixed(3), hike: +Math.max(0, Math.min(1, move / 0.25)).toFixed(3) });
    pre = post;
  }
  return path;
}

// Polymarket: betting-market odds for each central-bank meeting (public API, no key). Each meeting is an
// event with one yes/no market per outcome ("25 bps increase", "No change"...); the yes price is the odds.
const PM_Q = { fed: 'fed decision', boe: 'bank of england decision', ecb: 'ecb interest rates' };
const PM_BANK = { fed: /\bfed\b/i, boe: /bank of england/i, ecb: /\becb\b/i };
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
export function readPoly(ev) {
  const outs = (ev.markets || []).filter((m) => !m.closed || ev.closed).map((m) => {
    let pr = m.outcomePrices; try { pr = typeof pr === 'string' ? JSON.parse(pr) : pr; } catch (e) { pr = null; }
    return { label: (m.groupItemTitle || m.question || '').replace(/^No Change$/i, 'No change'), p: pr ? +pr[0] : null };
  }).filter((o) => o.p != null && o.label);
  if (!outs.length) return null;
  const sum = (rx) => +outs.filter((o) => rx.test(o.label)).reduce((a, o) => a + o.p, 0).toFixed(3);
  return { cut: sum(/decrease|cut/i), hold: sum(/no change/i), hike: sum(/increase|hike/i), outcomes: outs, vol: Math.round(ev.volume || 0), url: `https://polymarket.com/event/${ev.slug}`, title: ev.title, closed: !!ev.closed };
}
async function polymarket(bank, meetings) {
  const out = [];
  for (const iso of meetings.slice(0, 2)) {
    const d = new Date(iso), mon = MONTHS[d.getUTCMonth()];
    try {
      const j = JSON.parse(await get(`https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(PM_Q[bank] + ' ' + mon)}&limit_per_type=8`, 10000));
      const ev = (j.events || []).filter((e) => PM_BANK[bank].test(e.title) && new RegExp(mon, 'i').test(e.title + ' ' + e.slug) && !/dissent|how many|chair|vote/i.test(e.title)
        && Math.abs(Date.parse(e.endDate) - d.getTime()) < 4 * 864e5).sort((a, b) => (b.volume || 0) - (a.volume || 0))[0];
      const r = ev && readPoly(ev);
      if (r) out.push({ date: iso, ...r });
    } catch (e) { /* this meeting has no market yet */ }
  }
  if (!out.length) throw new Error('no Polymarket odds');
  return out;
}

// ---------- shaping ----------
const lastOf = (s) => s?.length ? s[s.length - 1] : null;
const before = (s, days) => { if (!s?.length) return null; const cut = Date.parse(s.at(-1)[0]) - days * 864e5; for (let i = s.length - 1; i >= 0; i--) if (Date.parse(s[i][0]) <= cut) return s[i][1]; return s[0][1]; };
// keep one point per week for long daily series so the payload stays small
const thin = (s, step = 7) => s.filter((_, i) => i % step === 0 || i === s.length - 1);
// [[date, value]] daily -> list of changes. lag = days between the decision and the day the new rate
// first shows (Fed: next day; ECB: the following Wednesday, 6 days on; BoE: same day)
function decisions(series, lag = 0) {
  const shift = (d) => new Date(Date.parse(d + 'T12:00:00Z') - lag * 864e5).toISOString().slice(0, 10);
  const out = []; for (let i = 1; i < series.length; i++) if (Math.abs(series[i][1] - series[i - 1][1]) > 1e-9) out.push({ date: shift(series[i][0]), value: series[i][1], change: +((series[i][1] - series[i - 1][1]) * 100).toFixed(0) });
  return out;
}
const safe = async (p, errs, name) => { try { return await p; } catch (e) { errs.push(name + ': ' + String(e.message || e).slice(0, 80)); return null; } };

export default async (req) => {
  const errs = [], now = Date.now();
  // BLS's keyless API allows about 25 calls a day, so the scheduled refresh skips it (?nobls=1) between releases
  const noBls = (() => { try { return new URL(req.url).searchParams.get('nobls') === '1'; } catch { return false; } })();
  const fomcLeft = FOMC.filter((d) => Date.parse(d) > now);
  const futMonths = []; { const d = new Date(); for (let i = 0; i < 9; i++) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, 1)); futMonths.push([x.getUTCFullYear(), x.getUTCMonth() + 1]); } }
  const [F, BR, DFR, TR, FM, UKM, UKG, EAY, USC, UKC, EAC, FUT] = await Promise.all([
    safe(fed(), errs, 'fed'), safe(boeDaily('IUDBEDR'), errs, 'boe'), safe(ecbSeries('FM', 'D.U2.EUR.4F.KR.DFR.LEV'), errs, 'ecb'),
    safe(treasury(), errs, 'treasury'), safe(freddie(), errs, 'freddie'), safe(boeMonthly(['IUMBV34', 'IUMBV42']), errs, 'boe_mortgage'),
    safe(boeDaily('IUDMNPY'), errs, 'gilts'), safe(ecbSeries('YC', 'B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y'), errs, 'ecb_yield'),
    noBls ? null : safe(usCpi(), errs, 'bls'), safe(ukCpi(), errs, 'ons'), euroInflation().catch(() => null), safe(fedFutures(futMonths), errs, 'futures'),
  ]);
  const PM = {};
  await Promise.all([['fed', FOMC], ['boe', MPC], ['ecb', ECBM]].map(async ([b, list]) => { PM[b] = await safe(polymarket(b, list.filter((d) => Date.parse(d) > now)), errs, 'polymarket_' + b); }));
  const banks = [];
  if (F) {
    const cur = F.at(-1), mid = F.map((r) => [r.d, r.hi]);
    const dec = decisions(mid, 1).map((x, i, a) => ({ ...x, lo: x.value - (cur.hi - cur.lo) }));
    const path = FUT && Object.keys(FUT).length ? fedPath(cur.effr, FUT, fomcLeft.slice(0, 4)) : [];
    banks.push({ id: 'fed', name: 'Federal Reserve', short: 'Fed', flag: '🇺🇸', what: 'Fed funds target range', lo: cur.lo, hi: cur.hi, value: cur.hi, effective: cur.effr, date: cur.d,
      decisions: dec.slice(-10), series: thin(F.map((r) => [r.d, r.hi]), 5), next: fomcLeft[0] || null, meetings: fomcLeft.slice(0, 6), path,
      note: 'Decided at the second day of each FOMC meeting, 2pm New York time. The 27 Oct 2027 meeting is for strategy only, with no rate decision.' });
  }
  if (BR?.length) {
    const cur = lastOf(BR), dec = decisions(BR);
    banks.push({ id: 'boe', name: 'Bank of England', short: 'BoE', flag: '🇬🇧', what: 'Bank Rate', value: cur[1], date: cur[0], decisions: dec.slice(-10), series: thin(BR, 5),
      next: nextOf(MPC), meetings: MPC.filter((d) => Date.parse(d) > now).slice(0, 6), note: 'Announced at noon UK time with the MPC minutes.' });
  }
  if (DFR?.length) {
    const cur = lastOf(DFR), dec = decisions(DFR, 6);
    banks.push({ id: 'ecb', name: 'European Central Bank', short: 'ECB', flag: '🇪🇺', what: 'Deposit facility rate', value: cur[1], date: cur[0], decisions: dec.slice(-10), series: thin(DFR, 5),
      next: nextOf(ECBM), meetings: ECBM.filter((d) => Date.parse(d) > now).slice(0, 6), note: 'Announced at 14:15 Frankfurt time, press conference at 14:45.' });
  }
  const yld = (id, name, s, src, extra = {}) => s?.length ? { id, name, value: lastOf(s)[1], date: lastOf(s)[0], w1: before(s, 7), m1: before(s, 30), y1: before(s, 365), series: thin(s.filter((p) => Date.parse(p[0]) > now - 400 * 864e5), 3), src, ...extra } : null;
  const yields = [
    TR && yld('us2', 'US 2-year', TR.y2, 'US Treasury', {}),
    TR && yld('us10', 'US 10-year', TR.y10, 'US Treasury', { live: '^TNX' }),
    TR && yld('us30', 'US 30-year', TR.y30, 'US Treasury', { live: '^TYX' }),
    yld('uk10', 'UK 10-year gilt', UKG, 'Bank of England'),
    yld('ea10', 'Euro area 10-year', EAY, 'ECB (AAA-rated governments)'),
  ].filter(Boolean);
  if (TR?.y2?.length && TR?.y10?.length) yields.curve = { us: +(lastOf(TR.y10)[1] - lastOf(TR.y2)[1]).toFixed(2), usY1: before(TR.y10, 365) != null && before(TR.y2, 365) != null ? +(before(TR.y10, 365) - before(TR.y2, 365)).toFixed(2) : null };
  const mort = [];
  if (FM?.length) { const s = FM.map((r) => [r[0], r[1]]); mort.push({ id: 'us30m', name: 'US 30-year fixed', flag: '🇺🇸', value: lastOf(s)[1], date: lastOf(s)[0], prev: s.at(-2)?.[1], y1: before(s, 365), series: thin(s.filter((p) => Date.parse(p[0]) > now - 400 * 864e5), 1), next: freddieNext(lastOf(s)[0]), freq: 'Weekly, Thursdays', src: 'Freddie Mac' });
    const s15 = FM.filter((r) => r[2] != null).map((r) => [r[0], r[2]]); if (s15.length) mort.push({ id: 'us15m', name: 'US 15-year fixed', flag: '🇺🇸', value: lastOf(s15)[1], date: lastOf(s15)[0], prev: s15.at(-2)?.[1], y1: before(s15, 365), series: thin(s15.filter((p) => Date.parse(p[0]) > now - 400 * 864e5), 1), next: freddieNext(lastOf(s15)[0]), freq: 'Weekly, Thursdays', src: 'Freddie Mac' }); }
  if (UKM) for (const [k, nm] of [['IUMBV34', 'UK 2-year fixed (75% LTV)'], ['IUMBV42', 'UK 5-year fixed (75% LTV)']]) { const s = UKM[k]; if (s?.length) mort.push({ id: k, name: nm, flag: '🇬🇧', value: lastOf(s)[1], date: lastOf(s)[0], prev: s.at(-2)?.[1], y1: before(s, 365), series: s.slice(-24), next: null, freq: 'Monthly, early in the month', src: 'Bank of England' }); }
  const infl = [];
  if (USC) { infl.push({ id: 'uscpi', name: 'US inflation (CPI)', flag: '🇺🇸', value: lastOf(USC.all)[1], date: lastOf(USC.all)[0], prev: USC.all.at(-2)?.[1], series: USC.all.slice(-36), next: nextOf(US_CPI), src: 'BLS', target: 2, est: !!lastOf(USC.all)[2] });
    if (USC.core.length) infl.push({ id: 'uscore', name: 'US core inflation', flag: '🇺🇸', value: lastOf(USC.core)[1], date: lastOf(USC.core)[0], prev: USC.core.at(-2)?.[1], series: USC.core.slice(-36), next: nextOf(US_CPI), src: 'BLS', target: 2, est: !!lastOf(USC.core)[2] }); }
  if (UKC?.series?.length) infl.push({ id: 'ukcpi', name: 'UK inflation (CPI)', flag: '🇬🇧', value: lastOf(UKC.series)[1], date: lastOf(UKC.series)[0], prev: UKC.series.at(-2)?.[1], series: UKC.series.slice(-36), next: UKC.next && Date.parse(UKC.next) > now ? UKC.next : null, src: 'ONS', target: 2 });
  if (EAC?.length) infl.push({ id: 'eahicp', name: 'Euro-area inflation', flag: '🇪🇺', value: lastOf(EAC)[1], date: lastOf(EAC)[0], prev: EAC.at(-2)?.[1], series: EAC.slice(-36), next: null, freq: 'Monthly, flash estimate at the start of the month', src: 'Eurostat via ECB', target: 2 });
  banks.forEach((b) => { if (PM[b.id]) b.poly = PM[b.id]; });
  // real rate: policy rate minus inflation
  const realOf = { fed: 'uscpi', boe: 'ukcpi', ecb: 'eahicp' };
  banks.forEach((b) => { const i = infl.find((x) => x.id === realOf[b.id]); if (i) b.real = +((b.effective ?? b.value) - i.value).toFixed(2); });
  const body = { fetched: new Date().toISOString(), blsAt: USC ? new Date().toISOString() : undefined, banks, yields, curve: yields.curve || null, mortgages: mort, inflation: infl, errors: errs };
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300', 'netlify-cdn-cache-control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
  });
};
