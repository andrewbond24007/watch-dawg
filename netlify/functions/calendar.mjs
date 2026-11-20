// WatchDawg big events: high-impact economic releases and central-bank
// decisions from the Forex Factory weekly calendar (this week + next week).
const COUNTRIES = ['USD', 'GBP', 'EUR', 'CNY', 'JPY'];
const KEY = /(core )?cpi|non-farm|unemployment rate|federal funds|fomc|pce|gdp|retail sales|ppi|official bank rate|monetary policy|main refinancing|ism (manufacturing|services)|jolts|unemployment claims/i;
// Official release dates for the big US/UK/EU events beyond Forex Factory's current week.
// Sources: BLS release schedule, Federal Reserve FOMC calendar, BEA release schedule,
// Bank of England MPC dates, ECB monetary policy calendar. Times are local to each agency.
const SCHEDULE = [
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
].map(([date, country, title, hint]) => ({ date: new Date(date).toISOString(), country, title, hint, forecast: '', previous: '', key: true, official: true }));
// Housing, commercial property and AI dates for the Health tab. Sources: US Census Bureau
// economic indicator calendar, ONS release calendar; "expected" = the publisher's usual day, not yet confirmed.
const HEALTH = [
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
].map(([date, country, title, hint, cat, expected]) => ({ date: new Date(date).toISOString(), country, title, hint, cat, expected, forecast: '', previous: '', key: false, official: true }));
async function week(name) {
  try {
    const r = await fetch(`https://nfs.faireconomy.media/ff_calendar_${name}.json`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)' } });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
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
  HEALTH.forEach((e) => { if (new Date(e.date) < horizon && new Date(e.date) > Date.now() - 8 * 864e5 && !ff.some((f) => f.title.toLowerCase() === e.title.toLowerCase())) events.push(e); });
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  return new Response(JSON.stringify({ events, fetched: new Date().toISOString() }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300', 'netlify-cdn-cache-control': 'public, s-maxage=900, stale-while-revalidate=1800', 'access-control-allow-origin': '*' },
  });
};
