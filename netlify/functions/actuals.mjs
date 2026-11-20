// WatchDawg actuals: the released figures for the big US data (CPI, core CPI,
// jobs, unemployment, PPI) from the official BLS data service.
const SERIES = {
  cpi: 'CUSR0000SA0', core: 'CUSR0000SA0L1E', cpiNsa: 'CUUR0000SA0', coreNsa: 'CUUR0000SA0L1E',
  nfp: 'CES0000000001', unemp: 'LNS14000000', ppi: 'WPSFD4', corePpi: 'WPSFD49104',
};
const pct = (a, b) => (a != null && b) ? Math.round((a / b - 1) * 1000) / 10 : null;
export default async (req) => {
  let res, ok = false;
  try {
    const r = await fetch('https://api.bls.gov/publicAPI/v1/timeseries/data/', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)' },
      body: JSON.stringify({ seriesid: Object.values(SERIES) }),
    });
    res = await r.json();
    ok = res && res.status === 'REQUEST_SUCCEEDED';
  } catch (e) { res = { error: String(e).slice(0, 120) }; }
  const by = {};
  if (ok) for (const s of res.Results?.series || []) {
    by[s.seriesID] = (s.data || []).filter((d) => /^M(0[1-9]|1[0-2])$/.test(d.period))
      .map((d) => ({ p: `${d.year}-${d.period.slice(1)}`, v: parseFloat(d.value) }))
      .sort((a, b) => (a.p < b.p ? 1 : -1));
  }
  const at = (id, i) => by[SERIES[id]]?.[i];
  const yoy = (id) => { const a = at(id, 0); if (!a) return null; const [y, m] = a.p.split('-'); const b = by[SERIES[id]].find((d) => d.p === `${+y - 1}-${m}`); return b ? { p: a.p, v: pct(a.v, b.v) } : null; };
  const mom = (id) => { const a = at(id, 0), b = at(id, 1); return a && b ? { p: a.p, v: pct(a.v, b.v) } : null; };
  const out = ok ? {
    cpiMoM: mom('cpi'), coreCpiMoM: mom('core'), cpiYoY: yoy('cpiNsa'), coreCpiYoY: yoy('coreNsa'),
    nfp: at('nfp', 0) && at('nfp', 1) ? { p: at('nfp', 0).p, v: Math.round(at('nfp', 0).v - at('nfp', 1).v) } : null,
    unemp: at('unemp', 0) ? { p: at('unemp', 0).p, v: at('unemp', 0).v } : null,
    ppiMoM: mom('ppi'), corePpiMoM: mom('corePpi'),
  } : { error: res?.message?.[0] || res?.error || 'BLS unavailable' };
  // Cache for 6h once data is in; retry sooner if BLS failed.
  const ttl = ok ? 21600 : 300;
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300', 'netlify-cdn-cache-control': `public, s-maxage=${ttl}`, 'access-control-allow-origin': '*', 'netlify-vary': 'query' } });
};
