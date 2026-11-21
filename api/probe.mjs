const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en' };
const T = (ms) => AbortSignal.timeout(ms);
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const P = {
  zori: ['https://files.zillowstatic.com/research/public_csvs/zori/Metro_zori_uc_sfrcondomfr_sm_month.csv', (t) => { const l = t.split('\n'); return l[0].slice(0, 120) + ' ... ' + l[0].split(',').slice(-2).join(',') + ' || ' + (l.find((x) => x.includes('United States')) || '').split(',').slice(-3).join(','); }],
  zhvi: ['https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv', (t) => { const l = t.split('\n'); return l[0].split(',').slice(-2).join(',') + ' || ' + (l.find((x) => x.includes('United States')) || '').split(',').slice(-3).join(','); }],
  gpg: ['https://www.globalpropertyguide.com/rental-yields', (t) => { const x = plain(t); return [...x.matchAll(/(United Kingdom|Ireland|Spain|Portugal|Italy|Greece|Croatia|Cyprus|Malta|United States)[^%]{0,40}?(\d{1,2}\.\d{1,2})%/g)].slice(0, 14).map((m) => m[1] + ' ' + m[2]).join(' | ') || x.slice(0, 300); }],
  oecd: ['https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_AN_HOUSE_PRICES@DF_HOUSE_PRICES,1.0/GBR+USA+IRL+ESP.Q.HPI_RPI.?startPeriod=2024-Q1&format=csvfilewithlabels', (t) => t.slice(0, 200) + ' ... ' + t.trim().split('\n').slice(-2).join(' / ').slice(0, 400)],
  ydiv: ['https://query1.finance.yahoo.com/v8/finance/chart/BXP?range=1y&interval=1mo&events=div', (t) => { const j = JSON.parse(t); const d = j.chart.result[0].events?.dividends; return 'divs ' + JSON.stringify(d).slice(0, 200) + ' price ' + j.chart.result[0].meta.regularMarketPrice; }],
  tnx: ['https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?range=5d&interval=1d', (t) => JSON.parse(t).chart.result[0].meta.regularMarketPrice],
  gilt: ['https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Sep/2026&Dateto=now&SeriesCodes=IUDMNZC&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N', (t) => t.trim().split('\n').slice(-2).join(' / ')],
};
export const GET = async () => {
  const out = {};
  await Promise.all(Object.entries(P).map(async ([k, [u, f]]) => {
    const s = Date.now();
    try { const r = await fetch(u, { headers: UA, signal: T(15000) }); const t = await r.text(); out[k] = `${r.status} ${Date.now() - s}ms ${t.length}b :: ${r.ok ? f(t) : t.slice(0, 160)}`; }
    catch (e) { out[k] = `ERR ${Date.now() - s}ms ${String(e.cause?.code || e.cause || e.message || e).slice(0, 160)}`; }
  }));
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
