// Big tech's AI spending: quarterly capital expenditure (cash spent on property and equipment: data centres, chips,
// power) as filed with the SEC: from the SEC's own XBRL data, with Finnhub's "financials as reported" filling gaps. Cash-flow figures are
// filed year-to-date, so each quarter is the year-to-date total minus the one before it.
export const CAPEX_COS = [
  ['microsoft', 'Microsoft', 'MSFT', '0000789019'], ['alphabet', 'Alphabet', 'GOOGL', '0001652044'], ['amazon', 'Amazon', 'AMZN', '0001018724'],
  ['meta', 'Meta', 'META', '0001326801'], ['oracle', 'Oracle', 'ORCL', '0001341439'],
];
// SEC's fair-access rules ask every caller to name itself with a contact email
const SEC_UA = { 'User-Agent': `WatchDawg personal market app ${process.env.SEC_CONTACT || 'abond24007@gmail.com'}`, 'Accept-Encoding': 'gzip, deflate' };
async function secFacts(cik) {
  let best = [];
  for (const tag of TAGS) {
    const j = await fetch(`https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${tag}.json`, { headers: SEC_UA, signal: AbortSignal.timeout(15000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const f = (j?.units?.USD || []).map((x) => ({ start: x.start, end: x.end, val: x.val, form: x.form, filed: x.filed }));
    const newest = (a) => a.reduce((m, x) => (x.end > m ? x.end : m), '');
    if (f.length && newest(f) > newest(best)) best = f; // the tag the company uses now
    await new Promise((r) => setTimeout(r, 150)); // SEC allows up to 10 requests a second
  }
  return best;
}
const TAGS = ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets', 'PaymentsForCapitalImprovements'];
// Finnhub filings -> XBRL-style facts for the capex line
export function factsFromFinnhub(j) {
  const out = [];
  for (const f of j?.data || []) {
    const cf = f.report?.cf || [];
    const row = TAGS.map((t) => cf.find((x) => (x.concept || '').replace(/^[a-z-]+_/, '') === t)).find(Boolean)
      || cf.find((x) => /^(purchases? of property and equipment|capital expenditures?|payments for (acquisition of )?property(, plant)? and equipment)/i.test(x.label || ''));
    if (row && f.startDate && f.endDate) out.push({ start: f.startDate.slice(0, 10), end: f.endDate.slice(0, 10), val: Math.abs(+row.value), form: f.form || '10-Q', filed: (f.filedDate || '').slice(0, 10) });
  }
  return out;
}
const days = (a, b) => (Date.parse(b) - Date.parse(a)) / 864e5;
// XBRL facts [{start, end, val, filed, form}] -> [[quarter-end date, $bn]]
export function quarterly(facts) {
  const best = new Map();
  for (const f of facts) {
    if (!f.start || !f.end || f.val == null || !/^10-[QK]/.test(f.form || '')) continue;
    const k = f.start + '|' + f.end, o = best.get(k);
    if (!o || (f.filed || '') > (o.filed || '')) best.set(k, f); // latest filing wins (restatements)
  }
  const byStart = {};
  for (const f of best.values()) (byStart[f.start] ||= []).push(f);
  const q = new Map();
  for (const list of Object.values(byStart)) {
    list.sort((a, b) => a.end.localeCompare(b.end));
    let prev = null;
    for (const f of list) {
      const len = days(f.start, f.end);
      if (len > 380) continue;
      if (len < 100) q.set(f.end, f.val);
      else if (prev && Math.abs(days(prev.end, f.end) - 91) < 20) q.set(f.end, f.val - prev.val);
      prev = f;
    }
  }
  return [...q.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => [d, +(v / 1e9).toFixed(2)]).filter(([, v]) => v > 0);
}
// calendar quarter a period ending on this date belongs to (Oracle's quarters end Aug/Nov/Feb/May)
export const calQ = (d) => { const t = new Date(Date.parse(d) - 20 * 864e5); return `${t.getUTCFullYear()}-Q${Math.floor(t.getUTCMonth() / 3) + 1}`; };
export function buildCapex(series, now = Date.now()) {
  const cos = {}, qs = new Set();
  for (const [id, name] of CAPEX_COS) {
    const s = series[id]; if (!s?.length) continue;
    const byQ = {}; for (const [d, v] of s) byQ[calQ(d)] = v;
    cos[id] = { name, byQ, last: s.at(-1) };
    Object.keys(byQ).forEach((k) => qs.add(k));
  }
  if (Object.keys(cos).length < 3) throw new Error('capex: too few companies');
  // quarters that every reporting company has filed (the newest quarter can be partly in)
  const quarters = [...qs].sort().slice(-14);
  const rows = quarters.map((qk) => { const by = Object.fromEntries(Object.entries(cos).map(([id, c]) => [id, c.byQ[qk] ?? null])); const have = Object.values(by).filter((v) => v != null);
    return { q: qk, by, total: +have.reduce((a, v) => a + v, 0).toFixed(1), complete: have.length === Object.keys(cos).length }; });
  const done = rows.filter((r) => r.complete), last = done.at(-1), yago = last && rows.find((r) => r.q === `${+last.q.slice(0, 4) - 1}${last.q.slice(4)}`);
  const ttm = done.slice(-4).reduce((a, r) => a + r.total, 0), ttmPrev = done.slice(-8, -4).reduce((a, r) => a + r.total, 0);
  return { v: 3, updated: new Date(now).toISOString(), companies: Object.fromEntries(Object.entries(cos).map(([id, c]) => [id, { name: c.name, last: c.last }])),
    rows, latest: last?.q || null, latestTotal: last?.total ?? null, yoy: last && yago?.complete ? +((last.total / yago.total - 1) * 100).toFixed(0) : null,
    ttm: +ttm.toFixed(0), ttmGrowth: done.length >= 8 && ttmPrev ? +((ttm / ttmPrev - 1) * 100).toFixed(0) : null };
}
export async function fetchCapex(key) {
  if (!key) throw new Error('no Finnhub key');
  const series = {}, errs = [];
  for (const [id, name, sym, cik] of CAPEX_COS) {
    // quarterly filings (10-Q) plus annual ones (10-K), which hold each year's last quarter
    const get = (freq) => fetch(`https://finnhub.io/api/v1/stock/financials-reported?symbol=${sym}&freq=${freq}&token=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(20000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [jq, ja] = await Promise.all([get('quarterly'), get('annual')]);
    // the SEC's own data first, Finnhub's copy to fill any gaps (for the same period the later filing wins)
    const sec = await secFacts(cik).catch(() => []);
    const q = quarterly([...factsFromFinnhub(jq), ...factsFromFinnhub(ja).map((f) => ({ ...f, form: '10-K' })), ...sec]);
    if (!sec.length) errs.push(name + ' (SEC)');
    if (q.length) series[id] = q; else errs.push(name);
  }
  const out = buildCapex(series);
  if (errs.length) out.missing = errs;
  return out;
}
