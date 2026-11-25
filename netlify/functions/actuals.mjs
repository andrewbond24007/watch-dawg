// WatchDawg actuals: the released figures for the big US data (CPI, core CPI,
// jobs, unemployment, PPI) from the official BLS data service.
const SERIES = {
  cpi: 'CUSR0000SA0', core: 'CUSR0000SA0L1E', cpiNsa: 'CUUR0000SA0', coreNsa: 'CUUR0000SA0L1E',
  nfp: 'CES0000000001', unemp: 'LNS14000000', unempN: 'LNS13000000', labour: 'LNS11000000', ppi: 'WPSFD4', corePpi: 'WPSFD49104',
};
// BEA (GDP and the PCE price index) has no keyless API, so the figures come from its own pages: the home
// page's headline tiles (GDP) and the latest Personal Income and Outlays news release (PCE, core PCE)
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#8212;|&mdash;/g, '—').replace(/\s+/g, ' ');
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const num = (s) => s == null ? null : parseFloat(String(s).replace('−', '-'));
export function parseBeaHome(html) {
  const t = text(html), out = {};
  const g = /Gross Domestic Product\s+Q([1-4]) (\d{4}) \(([^)]+)\)\s+([+−-]?\d+\.\d)%/.exec(t);
  if (g) out.gdp = { p: `${g[2]}-Q${g[1]}`, est: g[3], v: num(g[4]) };
  const links = [...html.matchAll(/href="([^"]*personal-income-and-outlays[^"]*)"/gi)].map((m) => m[1]);
  out.pioLink = links[0] ? new URL(links[0], 'https://www.bea.gov').href : null;
  return out;
}
export function parseBeaPio(html) {
  const t = text(html), out = {};
  const mm = /PCE price index increased ([\d.]+) percent[^.]*?\. Excluding food and energy, the PCE price index increased ([\d.]+) percent/i.exec(t)
    || /PCE price index (?:increased|decreased|was unchanged)[^.]*?([\d.]+)? percent[\s\S]{0,200}?Excluding food and energy, the PCE price index (?:increased|decreased)? ?([\d.]+)? percent/i.exec(t);
  const yy = /From the same month one year ago, the PCE price index (?:for [A-Za-z]+ )?increased ([\d.]+) percent[\s\S]{0,200}?Excluding food and energy, the PCE price index increased ([\d.]+) percent/i.exec(t);
  const mon = /Personal Income and Outlays,? ([A-Z][a-z]+) (\d{4})/.exec(t);
  const dn = (re) => re && /decreased/i.test(re[0]) ? -1 : 1;
  if (mon) { const m = MONTHS.indexOf(mon[1].toLowerCase()) + 1; if (m) out.p = `${mon[2]}-${String(m).padStart(2, '0')}`; }
  if (mm) { out.pceMoM = num(mm[1]); out.corePceMoM = num(mm[2]); }
  if (yy) { out.pceYoY = num(yy[1]); out.corePceYoY = num(yy[2]); }
  return out;
}
async function bea() {
  const home = parseBeaHome(await fetch('https://www.bea.gov/', { headers: UA, signal: AbortSignal.timeout(12000) }).then((r) => r.text()));
  let pio = {};
  let snip = null;
  if (home.pioLink) { const h = await fetch(home.pioLink, { headers: UA, signal: AbortSignal.timeout(12000) }).then((r) => r.text()); pio = parseBeaPio(h); snip = [...text(h).matchAll(/.{0,260}(?:food and energy|PCE price index).{0,160}/g)].slice(0, 5).map((m) => m[0]); }
  return { home, pio, snip };
}
// two decimals, worked out from the official index levels (BLS headlines round to one)
const pct = (a, b) => (a != null && b) ? Math.round((a / b - 1) * 10000) / 100 : null;
export default async (req) => {
  const pu = new URL(req.url);
  const B = await bea().catch((e) => ({ error: String(e).slice(0, 100) }));
  if (pu.searchParams.get('debug')) return new Response(JSON.stringify(B, null, 1), { headers: { 'content-type': 'application/json' } });
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
