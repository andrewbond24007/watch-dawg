// WatchDawg nowcast: the Cleveland Fed's inflation nowcasts (CPI, core CPI, PCE, core PCE),
// month-on-month and year-on-year at full precision, plus the unrounded actuals once released.
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)' };
const NAMES = { 'CPI Inflation': 'cpi', 'Core CPI Inflation': 'coreCpi', 'PCE Inflation': 'pce', 'Core PCE Inflation': 'corePce' };
async function file(kind) {
  const r = await fetch(`https://www.clevelandfed.org/-/media/files/webcharts/inflationnowcasting/nowcast_${kind}.json`, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('Cleveland Fed ' + r.status);
  return JSON.parse(await r.text());
}
const last = (d) => { const v = (d.data || []).map((x) => x.value).filter((x) => x !== '' && x != null && !isNaN(+x)); return v.length ? +(+v.at(-1)).toFixed(2) : null; };
export default async () => {
  const out = { months: {}, updated: null };
  try {
    const [m, y] = await Promise.all([file('month'), file('year')]);
    for (const [kind, charts] of [['mom', m], ['yoy', y]]) {
      for (const c of charts.slice(-5)) {
        const [yr, mo] = String(c.chart?.subcaption || '').split('-');
        if (!yr || !mo) continue;
        const key = `${yr}-${mo.padStart(2, '0')}`;
        const slot = (out.months[key] ||= { mom: {}, yoy: {}, act: { mom: {}, yoy: {} } });
        for (const d of c.dataset || []) {
          const actual = /^Actual /.test(d.seriesname), id = NAMES[d.seriesname.replace(/^Actual /, '')];
          if (!id) continue;
          const v = last(d);
          if (v == null) continue;
          if (actual) slot.act[kind][id] = v; else slot[kind][id] = v;
        }
        out.updated = c.chart?._comment || out.updated;
      }
    }
  } catch (e) { out.error = String(e.message || e).slice(0, 120); }
  const ttl = out.error ? 300 : 10800;
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=600', 'netlify-cdn-cache-control': `public, s-maxage=${ttl}, stale-while-revalidate=43200`, 'access-control-allow-origin': '*' } });
};
