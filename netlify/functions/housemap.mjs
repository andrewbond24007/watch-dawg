// WatchDawg house price maps: latest average price and change on a year ago for each area.
// US states: Zillow typical home value. UK regions and NI council areas: HM Land Registry UK HPI.
// Ireland regions: CSO residential property price index. Mediterranean countries: BIS.
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)' };
const T = (ms) => AbortSignal.timeout(ms);
const sleep = (ms) => new Promise((z) => setTimeout(z, ms));
const ym = (n) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 7); };

async function us() {
  const t = await fetch('https://files.zillowstatic.com/research/public_csvs/zhvi/State_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv', { headers: UA, signal: T(12000) }).then((r) => r.text());
  const rows = t.trim().split('\n').map((l) => l.split(','));
  const h = rows[0], last = h.length - 1, yr = last - 12;
  return { date: h[last].slice(0, 7), cur: '$', src: 'Zillow typical home value', areas: rows.slice(1).map((c) => {
    const name = c[2].replace(/"/g, ''), v = +c[last], b = +c[yr];
    return { id: name, name, price: v ? Math.round(v) : null, yoy: v && b ? +((v / b - 1) * 100).toFixed(1) : null };
  }) };
}
// Land Registry: few requests at a time, retry politely on 429
async function lr(slug, month) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(`https://landregistry.data.gov.uk/data/ukhpi/region/${slug}/month/${month}.json`, { headers: UA, signal: T(9000) }).catch(() => null);
    if (r && r.status === 404) return null;
    if (r && r.ok) { const t = await r.text(); const p = /"averagePrice"\s*:\s*([\d.]+)/.exec(t), c = /"percentageAnnualChange"\s*:\s*(-?[\d.]+)/.exec(t); return p ? { price: Math.round(+p[1]), yoy: c ? +c[1] : null, month } : null; }
    await sleep(700 * (i + 1));
  }
  return null;
}
async function pool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }
async function lrSet(list, probe) {
  let month = null;
  for (let n = 1; n <= 6 && !month; n++) if (await lr(probe, ym(n))) month = ym(n);
  if (!month) throw new Error('Land Registry: no recent month');
  const got = await pool(list, 3, async ([id, slug, name]) => {
    // some areas publish a month or two behind the rest
    let v = null;
    for (let back = 0; back <= 3 && !v; back++) { const [y, m] = month.split('-').map(Number); v = await lr(slug, new Date(Date.UTC(y, m - 1 - back, 1)).toISOString().slice(0, 7)); }
    return { id, name, ...(v || { price: null, yoy: null }) };
  });
  return { date: month, cur: '£', src: 'HM Land Registry UK house price index', areas: got };
}
const UK = [['UKC', 'north-east', 'North East'], ['UKD', 'north-west', 'North West'], ['UKE', 'yorkshire-and-the-humber', 'Yorkshire and the Humber'], ['UKF', 'east-midlands', 'East Midlands'], ['UKG', 'west-midlands', 'West Midlands'], ['UKH', 'east-of-england', 'East of England'], ['UKI', 'london', 'London'], ['UKJ', 'south-east', 'South East'], ['UKK', 'south-west', 'South West'], ['UKL', 'wales', 'Wales'], ['UKM', 'scotland', 'Scotland'], ['UKN', 'northern-ireland', 'Northern Ireland']];
const NI = [['N09000001', 'antrim-and-newtownabbey', 'Antrim and Newtownabbey'], ['N09000002', 'armagh-city-banbridge-and-craigavon', 'Armagh City, Banbridge and Craigavon'], ['N09000003', 'belfast', 'Belfast'], ['N09000004', 'causeway-coast-and-glens', 'Causeway Coast and Glens'], ['N09000005', 'derry-city-and-strabane', 'Derry City and Strabane'], ['N09000006', 'fermanagh-and-omagh', 'Fermanagh and Omagh'], ['N09000007', 'lisburn-and-castlereagh', 'Lisburn and Castlereagh'], ['N09000008', 'mid-and-east-antrim', 'Mid and East Antrim'], ['N09000009', 'mid-ulster', 'Mid Ulster'], ['N09000010', 'newry-mourne-and-down', 'Newry, Mourne and Down'], ['N09000011', 'ards-and-north-down', 'Ards and North Down']];
// CSO residential property price index (JSON-stat), 12-month change by region
async function ie() {
  const j = await fetch('https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/HPM09/JSON-stat/2.0/en', { headers: UA, signal: T(12000) }).then((r) => r.json());
  const ids = j.id, size = j.size, dim = (k) => j.dimension[k].category;
  const pos = ids.map((k) => dim(k).index), lab = (k) => dim(k).label;
  const idxOf = (k, code) => (Array.isArray(pos[ids.indexOf(k)]) ? pos[ids.indexOf(k)].indexOf(code) : pos[ids.indexOf(k)][code]);
  const val = (sel) => { let o = 0; ids.forEach((k, i) => { o = o * size[i] + sel[k]; }); return j.value[o]; };
  const kS = ids.find((k) => /STATISTIC/i.test(k)), kT = ids.find((k) => /TLIST/i.test(k)), kR = ids.find((k) => k !== kS && k !== kT);
  const stat = Object.entries(lab(kS)).find(([, l]) => /12 months/i.test(l))[0];
  const regions = Object.entries(lab(kR));
  const times = Object.keys(lab(kT));
  const MAP = { IE041: 'Border - houses', IE042: 'West - houses', IE051: 'Mid-West - houses', IE052: 'South-East - houses', IE053: 'South-West - houses', IE061: 'Dublin - all residential properties', IE062: 'Mid-East - houses', IE063: 'Midland - houses' };
  const NAME = { IE041: 'Border', IE042: 'West', IE051: 'Mid-West', IE052: 'South-East', IE053: 'South-West', IE061: 'Dublin', IE062: 'Mid-East', IE063: 'Midland' };
  let ti = times.length - 1;
  const get = (code, t) => { const rc = regions.find(([, l]) => l === MAP[code]); if (!rc) return null; return val({ [kS]: idxOf(kS, stat), [kT]: t, [kR]: idxOf(kR, rc[0]) }); };
  while (ti > 0 && get('IE061', ti) == null) ti--;
  return { date: lab(kT)[times[ti]], cur: '€', src: 'CSO residential property price index', noPrice: true, areas: Object.keys(MAP).map((id) => ({ id, name: NAME[id], price: null, yoy: get(id, ti) })) };
}
async function med() {
  const C = { ES: 'Spain', PT: 'Portugal', IT: 'Italy', GR: 'Greece', HR: 'Croatia', CY: 'Cyprus', MT: 'Malta' };
  const t = await fetch(`https://stats.bis.org/api/v2/data/dataflow/BIS/WS_SPP/1.0/Q.${Object.keys(C).join('+')}.N.628?format=csv&startPeriod=2023`, { headers: UA, signal: T(10000) }).then((r) => r.text());
  const rows = t.trim().split(/\r?\n/).map((l) => l.split(',')), h = rows[0];
  const iA = h.indexOf('REF_AREA'), iT = h.indexOf('TIME_PERIOD'), iV = h.indexOf('OBS_VALUE'), s = {};
  rows.slice(1).forEach((c) => { if (c[iV] !== '' && !isNaN(+c[iV])) (s[c[iA]] ||= []).push([c[iT], +c[iV]]); });
  let date = '';
  const areas = Object.entries(C).map(([id, name]) => { const x = (s[id] || []).sort(); const a = x.at(-1), b = x.at(-5); if (a && a[0] > date) date = a[0]; return { id, name, price: null, yoy: a && b ? +((a[1] / b[1] - 1) * 100).toFixed(1) : null }; });
  areas.push({ id: 'AL', name: 'Albania', price: null, yoy: null }, { id: 'ME', name: 'Montenegro', price: null, yoy: null });
  return { date, cur: '', src: 'BIS residential property prices', noPrice: true, areas };
}
export default async (req) => {
  const area = new URL(req.url).searchParams.get('area') || 'uk';
  let out;
  try {
    out = area === 'us' ? await us() : area === 'ni' ? await lrSet(NI, 'belfast') : area === 'ie' ? await ie() : area === 'med' ? await med() : await lrSet(UK, 'london');
    out.fetched = new Date().toISOString();
  } catch (e) { out = { error: String(e.message || e).slice(0, 160) }; }
  const ttl = out.error ? 120 : 21600;
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=900', 'netlify-cdn-cache-control': `public, s-maxage=${ttl}, stale-while-revalidate=86400`, 'netlify-vary': 'query', 'access-control-allow-origin': '*' } });
};
