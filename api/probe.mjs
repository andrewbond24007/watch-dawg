const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)' };
const T = (ms) => AbortSignal.timeout(ms);
const fields = (t) => [...t.matchAll(/"(refMonth|averagePrice|percentageAnnualChange|refRegion|regionName|_about)"\s*:\s*("?[^,}\n]+)/g)].slice(0, 6).map((m) => m[1] + '=' + m[2]).join(' ');
const P = {
  lr_london: ['https://landregistry.data.gov.uk/data/ukhpi/region/london/month/2026-09.json', fields],
  lr_belfast: ['https://landregistry.data.gov.uk/data/ukhpi/region/belfast/month/2026-09.json', fields],
  lr_abc: ['https://landregistry.data.gov.uk/data/ukhpi/region/armagh-city-banbridge-and-craigavon/month/2026-09.json', fields],
  lr_abc6: ['https://landregistry.data.gov.uk/data/ukhpi/region/armagh-city-banbridge-and-craigavon/month/2026-06.json', fields],
  zillow_state: ['https://files.zillowstatic.com/research/public_csvs/zhvi/State_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv', (t) => { const l = t.split('\n'); return l[0].slice(0, 90) + ' ... last=' + l[0].split(',').at(-1) + ' rows=' + l.length + ' | ' + l[1].split(',').slice(0, 5).join(',') + ' ' + l[1].split(',').at(-1); }],
  cso_hpm09: ['https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/HPM09/JSON-stat/2.0/en', (t) => { const j = JSON.parse(t); return j.label + ' || dims ' + Object.entries(j.dimension).map(([k, d]) => k + ':' + Object.values(d.category.label).slice(0, 14).join('/')).join(' || ').slice(0, 1500); }],
  cso_hpm04: ['https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/HPM04/JSON-stat/2.0/en', (t) => { const j = JSON.parse(t); return j.label + ' || dims ' + Object.entries(j.dimension).map(([k, d]) => k + ':' + Object.values(d.category.label).slice(0, 12).join('/')).join(' || ').slice(0, 900); }],
};
export const GET = async () => {
  const out = {};
  await Promise.all(Object.entries(P).map(async ([k, [u, f]]) => {
    try { const r = await fetch(u, { headers: UA, signal: T(14000) }); const t = await r.text(); out[k] = r.status + ' ' + t.length + 'b :: ' + (r.ok ? f(t) : t.slice(0, 160)); }
    catch (e) { out[k] = 'ERR ' + String(e.cause?.code || e.message).slice(0, 140); }
  }));
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
