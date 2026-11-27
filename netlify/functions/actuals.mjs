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
  // the release's table: 'PCE price index 0.5 0.3 PCE price index excluding food and energy 0.3 0.3' (latest month last)
  const tb = /PCE price index (-?[\d.]+) (-?[\d.]+) PCE price index excluding food and energy (-?[\d.]+) (-?[\d.]+)/i.exec(t);
  if (tb) { out.pceMoM = num(tb[2]); out.corePceMoM = num(tb[4]); }
  else if (mm) { out.pceMoM = num(mm[1]) * dn(mm); out.corePceMoM = num(mm[2]); }
  if (yy) { out.pceYoY = num(yy[1]); out.corePceYoY = num(yy[2]); }
  return out;
}
// BEA's own API (free key, BEA_KEY): GDP growth from table 1.1.1 and PCE price indexes from table 2.8.4, matched by
// row name so renumbered lines don't matter. Used ahead of reading BEA's web pages when a key is set.
export function beaRows(j) { return (j?.BEAAPI?.Results?.Data || []).map((d) => ({ line: d.LineDescription, t: d.TimePeriod, v: parseFloat(String(d.DataValue).replace(/,/g, '')) })).filter((d) => !isNaN(d.v)); }
export function beaFromApi(gdpJ, pceJ) {
  const g = beaRows(gdpJ).filter((d) => /^gross domestic product$/i.test(d.line)).sort((a, b) => a.t.localeCompare(b.t)).at(-1);
  const series = (rx) => beaRows(pceJ).filter((d) => rx.test(d.line)).map((d) => [d.t.replace('M', '-'), d.v]).sort((a, b) => a[0].localeCompare(b[0]));
  const all = series(/^personal consumption expenditures \(pce\)$/i), core = series(/^pce excluding food and energy$/i);
  const last = (s) => s.at(-1), ago = (s, k) => s.find((x) => x[0] === k);
  const yAgo = (k) => `${+k.slice(0, 4) - 1}${k.slice(4)}`;
  const ch = (a, b) => (a && b ? Math.round((a[1] / b[1] - 1) * 10000) / 100 : null);
  const out = {};
  if (g) out.gdp = { p: g.t.replace('Q', '-Q'), v: g.v };
  if (all.length > 12 && core.length > 12) {
    const la = last(all), lc = last(core);
    out.pio = { p: la[0], pceMoM: ch(la, all.at(-2)), corePceMoM: ch(lc, core.at(-2)), pceYoY: ch(la, ago(all, yAgo(la[0]))), corePceYoY: ch(lc, ago(core, yAgo(lc[0]))) };
  }
  return out;
}
async function beaApi(key) {
  const y = new Date().getUTCFullYear(), yrs = `${y - 2},${y - 1},${y}`;
  const get = (t, f) => fetch(`https://apps.bea.gov/api/data/?UserID=${encodeURIComponent(key)}&method=GetData&datasetname=NIPA&TableName=${t}&Frequency=${f}&Year=${yrs}&ResultFormat=JSON`, { signal: AbortSignal.timeout(15000) }).then((r) => r.json());
  const [g, p] = await Promise.all([get('T10101', 'Q'), get('T20804', 'M')]);
  const o = beaFromApi(g, p);
  if (!o.gdp && !o.pio) throw new Error('BEA API: no rows');
  return o;
}
async function bea() {
  if (process.env.BEA_KEY) { try { const a = await beaApi(process.env.BEA_KEY); return { home: { gdp: a.gdp }, pio: a.pio || {} , api: true }; } catch (e) { /* fall back to the web pages */ } }
  const home = parseBeaHome(await fetch('https://www.bea.gov/', { headers: UA, signal: AbortSignal.timeout(12000) }).then((r) => r.text()));
  let pio = {};
  if (home.pioLink) pio = parseBeaPio(await fetch(home.pioLink, { headers: UA, signal: AbortSignal.timeout(12000) }).then((r) => r.text()));
  return { home, pio };
}
// two decimals, worked out from the official index levels (BLS headlines round to one)
const pct = (a, b) => (a != null && b) ? Math.round((a / b - 1) * 10000) / 100 : null;
export default async (req) => {
  // ?only=bea or ?only=bls while waiting on one release, so BLS's ~25 calls a day aren't spent on a BEA wait
  const only = (() => { try { return new URL(req.url).searchParams.get('only') || ''; } catch { return ''; } })();
  const B = only === 'bls' ? {} : await bea().catch((e) => ({ error: String(e).slice(0, 100) }));
  let res, ok = false;
  if (only === 'bea') res = { error: 'skipped' }; else try {
    // with a free BLS key (BLS_KEY) the v2 API allows 500 calls a day instead of ~25
    const bk = process.env.BLS_KEY;
    const r = await fetch(`https://api.bls.gov/publicAPI/${bk ? 'v2' : 'v1'}/timeseries/data/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)' },
      body: JSON.stringify({ seriesid: Object.values(SERIES), ...(bk ? { registrationkey: bk } : {}) }),
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
  // year-ago month missing (no prices were collected in October 2025): use the months either side, flagged as an estimate
  const yoy = (id) => { const a = at(id, 0); if (!a) return null; const [y, m] = a.p.split('-').map(Number); const f = (yy, mm) => { const d = new Date(Date.UTC(yy, mm - 1, 1)); return by[SERIES[id]].find((x) => x.p === d.toISOString().slice(0, 7))?.v; };
    const b = f(y - 1, m); if (b) return { p: a.p, v: pct(a.v, b) }; const lo = f(y - 1, m - 1), hi = f(y - 1, m + 1); return lo && hi ? { p: a.p, v: pct(a.v, Math.sqrt(lo * hi)), est: true } : null; };
  const mom = (id) => { const a = at(id, 0), b = at(id, 1); return a && b ? { p: a.p, v: pct(a.v, b.v) } : null; };
  const out = ok ? {
    cpiMoM: mom('cpi'), coreCpiMoM: mom('core'), cpiYoY: yoy('cpiNsa'), coreCpiYoY: yoy('coreNsa'),
    nfp: at('nfp', 0) && at('nfp', 1) ? { p: at('nfp', 0).p, v: Math.round(at('nfp', 0).v - at('nfp', 1).v) } : null,
    unemp: at('unemp', 0) ? { p: at('unemp', 0).p, v: at('unemp', 0).v, v2: at('unempN', 0) && at('labour', 0) && at('unempN', 0).p === at('unemp', 0).p ? Math.round(at('unempN', 0).v / at('labour', 0).v * 10000) / 100 : null } : null,
    ppiMoM: mom('ppi'), corePpiMoM: mom('corePpi'),
  } : { error: res?.message?.[0] || res?.error || 'BLS unavailable' };
  // BEA figures ride along whether or not BLS answered
  const P = B.pio || {}, wrap = (v) => v != null && P.p ? { p: P.p, v } : null;
  Object.assign(out, { pceMoM: wrap(P.pceMoM), corePceMoM: wrap(P.corePceMoM), pceYoY: wrap(P.pceYoY), corePceYoY: wrap(P.corePceYoY), gdp: B.home?.gdp || null, beaError: B.error || null, beaSrc: B.api ? 'api' : 'web', blsApi: process.env.BLS_KEY ? 'v2' : 'v1', keyNames: Object.keys(process.env).filter((k) => /KEY/i.test(k) && !/^(AWS|VERCEL)/.test(k)), env: process.env.VERCEL_ENV || '' });
  // Cache for 6h once data is in; retry sooner if BLS failed.
  const ttl = ok ? 21600 : only ? 120 : 300;
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300', 'netlify-cdn-cache-control': `public, s-maxage=${ttl}`, 'access-control-allow-origin': '*', 'netlify-vary': 'query' } });
};
