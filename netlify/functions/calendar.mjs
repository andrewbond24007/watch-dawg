// WatchDawg big events: high-impact economic releases and central-bank
// decisions from the Forex Factory weekly calendar (this week + next week).
const COUNTRIES = ['USD', 'GBP', 'EUR', 'CNY', 'JPY'];
const KEY = /(core )?cpi|non-farm|unemployment rate|federal funds|fomc|pce|gdp|retail sales|ppi|official bank rate|monetary policy|main refinancing|ism (manufacturing|services)|jolts|unemployment claims/i;
// Official release dates for the big US/UK/EU events beyond Forex Factory's current week.
// Sources: BLS release schedule, Federal Reserve FOMC calendar, BEA release schedule,
// Bank of England MPC dates, ECB monetary policy calendar. Times are local to each agency.
export const SCHEDULE = [
  ['2026-11-25T08:30:00-05:00', 'USD', 'Core PCE Price Index (October)', "The Fed's preferred inflation gauge"],
  ['2026-11-25T08:30:00-05:00', 'USD', 'GDP, Q3 second estimate', 'Economic growth'],
  ['2026-12-01T10:00:00-05:00', 'USD', 'JOLTS Job Openings (October)', 'Job openings'],
  ['2026-12-04T08:30:00-05:00', 'USD', 'Non-Farm Payrolls and Unemployment Rate (November)', 'The monthly US jobs report'],
  ['2026-12-09T14:00:00-05:00', 'USD', 'Fed interest-rate decision (FOMC) and projections', 'Rate decision, then the Fed Chair press conference at 2:30pm ET'],
  ['2026-12-10T08:30:00-05:00', 'USD', 'CPI and Core CPI (November)', 'US inflation, headline and excluding food and energy'],
  ['2026-12-15T08:30:00-05:00', 'USD', 'PPI (November)', 'Producer (wholesale) inflation'],
  ['2026-12-17T12:00:00+00:00', 'GBP', 'Bank of England rate decision', 'MPC decision and minutes'],
  ['2026-12-17T14:15:00+01:00', 'EUR', 'ECB rate decision', 'Press conference follows at 14:45 CET'],
  ['2026-12-23T08:30:00-05:00', 'USD', 'Core PCE Price Index (November)', "The Fed's preferred inflation gauge"],
  ['2026-12-23T08:30:00-05:00', 'USD', 'GDP, Q3 third estimate', 'Economic growth'],
  ['2027-01-05T10:00:00-05:00', 'USD', 'JOLTS Job Openings (November)', 'Job openings'],
  ['2027-01-08T08:30:00-05:00', 'USD', 'Non-Farm Payrolls and Unemployment Rate (December)', 'The monthly US jobs report'],
  ['2027-01-13T08:30:00-05:00', 'USD', 'CPI and Core CPI (December)', 'US inflation, headline and excluding food and energy'],
  ['2027-01-14T08:30:00-05:00', 'USD', 'PPI (December)', 'Producer (wholesale) inflation'],
  ['2027-01-27T14:00:00-05:00', 'USD', 'Fed interest-rate decision (FOMC)', 'Rate decision, then the Fed Chair press conference at 2:30pm ET'],
  ['2027-02-04T14:15:00+01:00', 'EUR', 'ECB rate decision', 'Press conference follows at 14:45 CET'],
  // BLS Employment Situation and BEA 2027 schedules (published Oct 2026)
  ['2027-01-28T08:30:00-05:00', 'USD', 'GDP, Q4 advance estimate', 'Economic growth'],
  ['2027-01-28T08:30:00-05:00', 'USD', 'Core PCE Price Index (December)', "The Fed's preferred inflation gauge"],
  ['2027-02-05T08:30:00-05:00', 'USD', 'Non-Farm Payrolls and Unemployment Rate (January)', 'The monthly US jobs report'],
  ['2027-02-25T08:30:00-05:00', 'USD', 'GDP, Q4 second estimate', 'Economic growth'],
  ['2027-02-25T08:30:00-05:00', 'USD', 'Core PCE Price Index (January)', "The Fed's preferred inflation gauge"],
  ['2027-03-05T08:30:00-05:00', 'USD', 'Non-Farm Payrolls and Unemployment Rate (February)', 'The monthly US jobs report'],
  ['2027-03-31T08:30:00-04:00', 'USD', 'GDP, Q4 third estimate', 'Economic growth'],
  ['2027-03-31T08:30:00-04:00', 'USD', 'Core PCE Price Index (February)', "The Fed's preferred inflation gauge"],
  ['2027-04-02T08:30:00-04:00', 'USD', 'Non-Farm Payrolls and Unemployment Rate (March)', 'The monthly US jobs report'],
  ['2027-04-14T08:30:00-04:00', 'USD', 'PPI (March)', 'Producer (wholesale) inflation'],
  ['2027-04-29T08:30:00-04:00', 'USD', 'GDP, Q1 advance estimate', 'Economic growth'],
  ['2027-04-29T08:30:00-04:00', 'USD', 'Core PCE Price Index (March)', "The Fed's preferred inflation gauge"],
  ['2027-05-07T08:30:00-04:00', 'USD', 'Non-Farm Payrolls and Unemployment Rate (April)', 'The monthly US jobs report'],
  ['2027-05-27T08:30:00-04:00', 'USD', 'GDP, Q1 second estimate', 'Economic growth'],
  ['2027-05-27T08:30:00-04:00', 'USD', 'Core PCE Price Index (April)', "The Fed's preferred inflation gauge"],
].map(([date, country, title, hint]) => ({ date: new Date(date).toISOString(), country, title, hint, forecast: '', previous: '', key: true, official: true }));
// Housing, commercial property and AI dates for the Health tab. Sources: US Census Bureau
// economic indicator calendar, ONS release calendar; "expected" = the publisher's usual day, not yet confirmed.
export const HEALTH = [
  ['2026-11-24T09:00:00-05:00', 'USD', 'Case-Shiller home prices (September)', 'US house prices, 20 cities and national', 'housing', true],
  ['2026-11-25T10:00:00-05:00', 'USD', 'New home sales (October)', 'Sales of newly built US homes', 'housing', false],
  ['2026-12-01T07:00:00+00:00', 'GBP', 'Nationwide house price index (November)', 'UK house prices from the biggest building society', 'housing', true],
  ['2026-12-01T09:30:00+00:00', 'GBP', 'Bank of England mortgage approvals (October)', 'Money and Credit: approvals and mortgage lending', 'housing', true],
  ['2026-12-07T07:00:00+00:00', 'GBP', 'Halifax house price index (November)', 'UK house prices from the biggest mortgage lender', 'housing', true],
  ['2026-12-16T09:30:00+00:00', 'GBP', 'UK house price index (October)', 'Official UK and Northern Ireland house prices (ONS)', 'housing', false],
  ['2026-12-17T08:30:00-05:00', 'USD', 'Housing starts and building permits (November)', 'New US homes started and approved', 'housing', false],
  ['2026-12-23T10:00:00-05:00', 'USD', 'New home sales (November)', 'Sales of newly built US homes', 'housing', false],
  ['2026-12-29T09:00:00-05:00', 'USD', 'Case-Shiller home prices (October)', 'US house prices, 20 cities and national', 'housing', true],
  ['2027-01-05T07:00:00+00:00', 'GBP', 'Nationwide house price index (December)', 'UK house prices from the biggest building society', 'housing', true],
  // Q1 2027: each publisher's usual day, not yet confirmed (marked expected)
  ['2027-01-04T09:30:00+00:00', 'GBP', 'Bank of England mortgage approvals (November)', 'Money and Credit: approvals and mortgage lending', 'housing', true],
  ['2027-01-07T07:00:00+00:00', 'GBP', 'Halifax house price index (December)', 'UK house prices from the biggest mortgage lender', 'housing', true],
  ['2027-01-20T09:30:00+00:00', 'GBP', 'UK house price index (November)', 'Official UK and Northern Ireland house prices (ONS)', 'housing', true],
  ['2027-01-20T08:30:00-05:00', 'USD', 'Housing starts and building permits (December)', 'New US homes started and approved', 'housing', true],
  ['2027-01-26T09:00:00-05:00', 'USD', 'Case-Shiller home prices (November)', 'US house prices, 20 cities and national', 'housing', true],
  ['2027-01-26T10:00:00-05:00', 'USD', 'New home sales (December)', 'Sales of newly built US homes', 'housing', true],
  ['2027-02-01T07:00:00+00:00', 'GBP', 'Nationwide house price index (January)', 'UK house prices from the biggest building society', 'housing', true],
  ['2027-02-01T09:30:00+00:00', 'GBP', 'Bank of England mortgage approvals (December)', 'Money and Credit: approvals and mortgage lending', 'housing', true],
  ['2027-02-05T07:00:00+00:00', 'GBP', 'Halifax house price index (January)', 'UK house prices from the biggest mortgage lender', 'housing', true],
  ['2027-02-17T09:30:00+00:00', 'GBP', 'UK house price index (December)', 'Official UK and Northern Ireland house prices (ONS)', 'housing', true],
  ['2027-02-18T08:30:00-05:00', 'USD', 'Housing starts and building permits (January)', 'New US homes started and approved', 'housing', true],
  ['2027-02-23T09:00:00-05:00', 'USD', 'Case-Shiller home prices (December)', 'US house prices, 20 cities and national', 'housing', true],
  ['2027-02-24T10:00:00-05:00', 'USD', 'New home sales (January)', 'Sales of newly built US homes', 'housing', true],
  ['2027-03-01T07:00:00+00:00', 'GBP', 'Nationwide house price index (February)', 'UK house prices from the biggest building society', 'housing', true],
  ['2027-03-01T09:30:00+00:00', 'GBP', 'Bank of England mortgage approvals (January)', 'Money and Credit: approvals and mortgage lending', 'housing', true],
  ['2027-03-05T07:00:00+00:00', 'GBP', 'Halifax house price index (February)', 'UK house prices from the biggest mortgage lender', 'housing', true],
  ['2027-03-17T08:30:00-04:00', 'USD', 'Housing starts and building permits (February)', 'New US homes started and approved', 'housing', true],
  ['2027-03-24T09:30:00+00:00', 'GBP', 'UK house price index (January)', 'Official UK and Northern Ireland house prices (ONS)', 'housing', true],
  ['2027-03-24T10:00:00-04:00', 'USD', 'New home sales (February)', 'Sales of newly built US homes', 'housing', true],
  ['2027-03-30T09:00:00-04:00', 'USD', 'Case-Shiller home prices (January)', 'US house prices, 20 cities and national', 'housing', true],
].map(([date, country, title, hint, cat, expected]) => ({ date: new Date(date).toISOString(), country, title, hint, cat, expected, forecast: '', previous: '', key: false, official: true }));
// rate decisions and US CPI dates are kept in one place (rates.mjs) and added here beyond the hand-written list
import { FOMC, MPC, ECBM, US_CPI, EA_HICP } from './rates.mjs';
const monthName = (d) => new Date(new Date(d).getTime() - 20 * 864e5).toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
const DERIVED = [
  ...FOMC.map((d) => [d, 'USD', 'Fed interest-rate decision (FOMC)', 'Rate decision, then the Fed Chair press conference at 2:30pm ET']),
  ...MPC.map((d) => [d, 'GBP', 'Bank of England rate decision', 'MPC decision and minutes']),
  ...ECBM.map((d) => [d, 'EUR', 'ECB rate decision', 'Press conference follows at 14:45 CET']),
  ...EA_HICP.map((d) => [d, 'EUR', `Euro-area inflation, flash (${monthName(d)})`, 'Eurostat’s first estimate of euro-area inflation']),
  ...US_CPI.map((d) => [d, 'USD', `CPI and Core CPI (${monthName(d)})`, 'US inflation, headline and excluding food and energy']),
].map(([date, country, title, hint]) => ({ date: new Date(date).toISOString(), country, title, hint, forecast: '', previous: '', key: true, official: true }));
async function week(name) {
  try {
    const r = await fetch(`https://nfs.faireconomy.media/ff_calendar_${name}.json`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)' } });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
}
// EIA weekly US crude inventories (free key, EIA_KEY): the latest release with its actual change, and the next one.
// Released Wednesdays 10:30am New York for the week ending the previous Friday (a day later in holiday weeks).
const nyAt = (ymd, hm) => { const m = +ymd.slice(5, 7), off = m >= 4 && m <= 10 ? '-04:00' : '-05:00'; return new Date(`${ymd}T${hm}:00${off}`).toISOString(); };
export function eiaEvents(rows) {
  const r = (rows || []).map((x) => ({ p: x.period, v: +x.value })).filter((x) => x.p && !isNaN(x.v)).sort((a, b) => b.p.localeCompare(a.p));
  if (r.length < 2) return [];
  const rel = (p) => new Date(Date.parse(p + 'T12:00:00Z') + 5 * 864e5).toISOString().slice(0, 10);
  const chg = ((r[0].v - r[1].v) / 1000).toFixed(1), title = 'US crude oil inventories (EIA)', hint = 'Weekly change in US commercial crude stocks; a fall (draw) tends to lift oil prices';
  const last = { date: nyAt(rel(r[0].p), '10:30'), country: 'USD', title, hint, forecast: '', previous: '', key: false, official: true, result: `${chg > 0 ? '+' : ''}${chg}M barrels` };
  const nx = new Date(Date.parse(r[0].p + 'T12:00:00Z') + 7 * 864e5).toISOString().slice(0, 10);
  return [last, { date: nyAt(rel(nx), '10:30'), country: 'USD', title, hint, forecast: '', previous: `${chg > 0 ? '+' : ''}${chg}M`, key: false, official: true }];
}
async function eia(key) {
  const u = `https://api.eia.gov/v2/petroleum/stoc/wstk/data/?api_key=${encodeURIComponent(key)}&frequency=weekly&data[0]=value&facets[series][]=WCESTUS1&sort[0][column]=period&sort[0][direction]=desc&length=3`;
  const j = await fetch(u, { signal: AbortSignal.timeout(8000) }).then((r) => r.json());
  return eiaEvents(j?.response?.data);
}
// report time of day: before the open is about 8am New York, after hours about 4:05pm
const earnAt = (d, time) => { const pre = /before|pre/i.test(time || ''), m = +d.slice(5, 7), off = m >= 4 && m <= 10 ? '-04:00' : '-05:00'; return new Date(`${d}T${pre ? '08:00' : '16:05'}:00${off}`).toISOString(); };
// TSMC reports earnings per share in Taiwan dollars
const EPS_CUR = { TSM: 'NT$' };
export function earnEvents(st) {
  const c = EPS_CUR[st.sym] || '$';
  const out = (st.past || []).map((p) => ({ date: earnAt(p.date, p.time), country: 'USD', title: `${st.name} earnings`, hint: `${st.sym} quarterly results`, forecast: p.est != null ? `EPS ${c}${p.est.toFixed(2)}` : '', previous: '', key: false, official: true, earn: { sym: st.sym, cur: c, act: p.act, est: p.est, surprise: p.surprise } }));
  if (st.next) out.push({ date: earnAt(st.next, st.time), country: 'USD', title: `${st.name} earnings${st.estimated ? ' (date expected)' : ''}`, hint: `${st.sym} quarterly results${st.estimated ? '; the company hasn’t confirmed the date yet' : ''}`, forecast: st.epsEst != null ? `EPS ${c}${st.epsEst.toFixed(2)}` : '', previous: '', key: false, official: true, expected: !!st.estimated, earn: { sym: st.sym } });
  return out;
}
export default async () => {
  const all = await week('thisweek');
  const seen = new Set();
  const events = all
    .filter((e) => COUNTRIES.includes(e.country) && e.impact === 'High')
    .map((e) => ({ title: e.title, country: e.country, date: e.date, forecast: e.forecast || '', previous: e.previous || '', key: KEY.test(e.title) && ['USD', 'GBP', 'EUR'].includes(e.country) }))
    .filter((e) => { const k = e.title + e.country + e.date; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  // add official dates that Forex Factory's week doesn't already cover (same country within 3 hours)
  const near = (a, b) => a.country === b.country && Math.abs(new Date(a.date) - new Date(b.date)) < 3 * 3600e3;
  const horizon = Date.now() + 75 * 864e5;
  const ff = events.slice();
  SCHEDULE.forEach((e) => { if (new Date(e.date) < horizon && !ff.some((f) => near(f, e))) events.push(e); });
  DERIVED.forEach((e) => { if (new Date(e.date) < horizon && new Date(e.date) > Date.now() - 8 * 864e5 && !events.some((f) => near(f, e))) events.push(e); });
  HEALTH.forEach((e) => { if (new Date(e.date) < horizon && new Date(e.date) > Date.now() - 8 * 864e5 && !ff.some((f) => f.title.toLowerCase() === e.title.toLowerCase())) events.push(e); });
  // earnings for the tracked stocks (saved by the scheduled refresh): next report, and results from the past week
  try {
    const ej = await fetch('https://raw.githubusercontent.com/andrewbond24007/watch-dawg/data/earnings.json', { signal: AbortSignal.timeout(6000) }).then((r) => (r.ok ? r.json() : null));
    for (const st of ej?.stocks || []) events.push(...earnEvents(st).filter((e) => new Date(e.date) < horizon && new Date(e.date) > Date.now() - 8 * 864e5));
  } catch (e) { /* calendar still works without them */ }
  // crude inventories: saved by the scheduled refresh (GitHub has the EIA key), or asked directly if this site has one
  try {
    let ev = [];
    const sj = await fetch('https://raw.githubusercontent.com/andrewbond24007/watch-dawg/data/eia.json', { signal: AbortSignal.timeout(6000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (sj?.rows) ev = eiaEvents(sj.rows); else if (process.env.EIA_KEY) ev = await eia(process.env.EIA_KEY);
    for (const e of ev) if (new Date(e.date) > Date.now() - 8 * 864e5) events.push(e);
  } catch (e) { /* optional */ }
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  return new Response(JSON.stringify({ events, fetched: new Date().toISOString() }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300', 'netlify-cdn-cache-control': 'public, s-maxage=900, stale-while-revalidate=1800', 'access-control-allow-origin': '*' },
  });
};
