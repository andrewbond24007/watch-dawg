const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const T = (ms) => AbortSignal.timeout(ms);
const P = {
  bis_spp: 'https://stats.bis.org/api/v2/data/dataflow/BIS/WS_SPP/1.0/Q.GB+US+IE+ES.N.628?format=csv&startPeriod=2024',
  bis_cpp: 'https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CPP/1.0/?format=csv&startPeriod=2024&c%5BREF_AREA%5D=US',
  fhfa_csv: 'https://www.fhfa.gov/hpi/download/monthly/hpi_master.csv',
  fhfa_old: 'https://www.fhfa.gov/HPI_master.csv',
  dbn_ecb: 'https://api.db.nomics.world/v22/series/ECB/MIR/M.IE.B.A2C.AM.R.A.2250.EUR.N+M.U2.B.A2C.AM.R.A.2250.EUR.N?observations=1',
  dbn_cpp_us: 'https://api.db.nomics.world/v22/series/BIS/WS_CPP?dimensions=%7B%22REF_AREA%22%3A%5B%22US%22%5D%7D&observations=1&limit=5',
  ecb_multi: 'https://data-api.ecb.europa.eu/service/data/MIR/M.IE+U2+ES+PT+IT+GR+HR+CY+MT.B.A2C.AM.R.A.2250.EUR.N?format=csvdata&detail=dataonly&startPeriod=2024-06',
};
const pick = (k, t) => {
  if (k.startsWith('dbn')) { try { const j = JSON.parse(t); return (j.series?.docs || []).map((d) => `${d.series_code} ${d.series_name?.slice(0, 60)} ${d.period?.at(-1)}=${d.value?.at(-1)}`).join(' || '); } catch (e) { return t.slice(0, 200); } }
  if (k.startsWith('bis') || k.startsWith('ecb')) return t.split(/\r?\n/).slice(0, 2).join(' / ').slice(0, 300) + ' ... ' + t.trim().split(/\r?\n/).slice(-3).join(' / ').slice(0, 400);
  if (k.startsWith('fhfa')) return t.slice(0, 200) + ' ... ' + t.trim().split(/\r?\n/).filter((l) => /USA or Census|United States/i.test(l)).slice(-2).join(' / ');
  return t.slice(0, 200);
};
async function fed() {
  const r = await fetch('https://www.federalreserve.gov/releases/chargeoff/delallsa.htm', { headers: UA, signal: T(9000) });
  const h = await r.text();
  const rows = [...h.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()));
  return rows.slice(0, 8).map((r) => r.join(' | ')).join('\n');
}
export const GET = async () => {
  const out = {};
  await Promise.all([...Object.entries(P).map(async ([k, u]) => {
    const s = Date.now();
    try { const r = await fetch(u, { headers: UA, signal: T(14000) }); const t = await r.text(); out[k] = `${r.status} ${Date.now() - s}ms ${pick(k, t)}`; }
    catch (e) { out[k] = `ERR ${Date.now() - s}ms ${String(e.cause?.code || e.cause || e).slice(0, 120)}`; }
  }), fed().then((x) => (out.fed = x)).catch((e) => (out.fed = 'ERR ' + e))]);
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
