const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const T = (ms) => AbortSignal.timeout(ms);
const P = {
  fredgraph: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US&cosd=2026-01-01',
  fredapi: 'https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&file_type=json&limit=2&sort_order=desc',
  freddie: 'https://www.freddiemac.com/pmms/docs/PMMS_history.csv',
  fedddp: 'https://www.federalreserve.gov/datadownload/Output.aspx?rel=CHGDEL&series=b8c9bd4b0b3e6b9b6a4a1a1f0f3f7f2c&lastobs=4&from=&to=&filetype=csv&label=include&layout=seriescolumn',
  fedhtml: 'https://www.federalreserve.gov/releases/chargeoff/delallsa.htm',
  fhfa: 'https://www.fhfa.gov/hpi/download/monthly/hpi_po_monthly_hist.xls',
  dbn_cpp: 'https://api.db.nomics.world/v22/series/BIS/WS_CPP?dimensions=%7B%22REF_AREA%22%3A%5B%22US%22%5D%7D&observations=1&limit=3',
  ecb: 'https://data-api.ecb.europa.eu/service/data/MIR/M.IE.B.A2C.AM.R.A.2250.EUR.N?format=csvdata&detail=dataonly&lastNObservations=2',
};
export const GET = async (req) => {
  const out = {};
  await Promise.all(Object.entries(P).map(async ([k, u]) => {
    const s = Date.now();
    try { const r = await fetch(u, { headers: UA, signal: T(12000) }); const t = await r.text(); out[k] = `${r.status} ${Date.now() - s}ms ${t.slice(0, 300)}`; }
    catch (e) { out[k] = `ERR ${Date.now() - s}ms ${String(e.cause?.code || e.cause || e).slice(0, 120)}`; }
  }));
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
