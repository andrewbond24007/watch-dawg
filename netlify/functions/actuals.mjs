// WatchDawg actuals: the released figures for the big US data (CPI, core CPI,
// jobs, unemployment, PPI) from the official BLS data service.
const SERIES = {
  cpi: 'CUSR0000SA0', core: 'CUSR0000SA0L1E', cpiNsa: 'CUUR0000SA0', coreNsa: 'CUUR0000SA0L1E',
  nfp: 'CES0000000001', unemp: 'LNS14000000', unempN: 'LNS13000000', labour: 'LNS11000000', ppi: 'WPSFD4', corePpi: 'WPSFD49104',
};
// two decimals, worked out from the official index levels (BLS headlines round to one)
const pct = (a, b) => (a != null && b) ? Math.round((a / b - 1) * 10000) / 100 : null;
export default async (req) => {
  const pu = new URL(req.url);
  if (pu.searchParams.get('probe')) {
    const urls = ['https://www.bea.gov/data/gdp/gross-domestic-product', 'https://www.bea.gov/data/personal-consumption-expenditures-price-index-excluding-food-and-energy', 'https://www.bea.gov/data/personal-consumption-expenditures-price-index', 'https://www.bea.gov/'];
    const out = {};
    await Promise.all(urls.map(async (u) => { try { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' }, signal: AbortSignal.timeout(15000) }); const t = await r.text();
      const txt = t.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' | ').replace(/\s+/g, ' ');
      const hits = [...txt.matchAll(/.{0,160}(?:[+−-]\d+\.\d%).{0,120}/g)].slice(0, 6).map((m) => m[0]);
      out[u] = { status: r.status, len: t.length, hits }; } catch (e) { out[u] = String(e); } }));
    return new Response(JSON.stringify(out, null, 1), { headers: { 'content-type': 'application/json' } });
  }
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
    unemp: at('unemp', 0) ? { p: at('unemp', 0).p, v: at('unemp', 0).v, v2: at('unempN', 0) && at('labour', 0) && at('unempN', 0).p === at('unemp', 0).p ? Math.round(at('unempN', 0).v / at('labour', 0).v * 10000) / 100 : null } : null,
    ppiMoM: mom('ppi'), corePpiMoM: mom('corePpi'),
  } : { error: res?.message?.[0] || res?.error || 'BLS unavailable' };
  // Cache for 6h once data is in; retry sooner if BLS failed.
  const ttl = ok ? 21600 : 300;
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300', 'netlify-cdn-cache-control': `public, s-maxage=${ttl}`, 'access-control-allow-origin': '*', 'netlify-vary': 'query' } });
};
