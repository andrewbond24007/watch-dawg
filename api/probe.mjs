const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
export const GET = async () => {
  const out = {};
  for (const k of ['month', 'year']) {
    const t0 = Date.now();
    const j = JSON.parse(await fetch(`https://www.clevelandfed.org/-/media/files/webcharts/inflationnowcasting/nowcast_${k}.json`, { headers: UA, signal: AbortSignal.timeout(15000) }).then((r) => r.text()));
    out[k] = { n: j.length, ms: Date.now() - t0, last: j.slice(-3).map((c) => ({ sub: c.chart.subcaption, comment: c.chart._comment, cats: (c.categories?.[0]?.category || []).slice(-3).map((x) => x.label), sets: (c.dataset || []).map((d) => { const v = (d.data || []).map((x) => x.value).filter((x) => x !== '' && x != null); return d.seriesname + ' n' + (d.data || []).length + ' last=' + v.at(-1) + ' prev=' + v.at(-2); }) })) };
  }
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
