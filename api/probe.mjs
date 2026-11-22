const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en' };
const T = (ms) => AbortSignal.timeout(ms);
const P = {
  page: 'https://www.clevelandfed.org/indicators-and-data/inflation-nowcasting',
  m1: 'https://www.clevelandfed.org/-/media/files/webcharts/inflationnowcasting/nowcast_month.json',
  q1: 'https://www.clevelandfed.org/-/media/files/webcharts/inflationnowcasting/nowcast_quarter.json',
  y1: 'https://www.clevelandfed.org/-/media/files/webcharts/inflationnowcasting/nowcast_year.json',
};
export const GET = async () => {
  const out = {};
  await Promise.all(Object.entries(P).map(async ([k, u]) => {
    try { const r = await fetch(u, { headers: UA, signal: T(12000) }); const t = await r.text();
      out[k] = `${r.status} ${r.headers.get('content-type')} ${t.length}b :: ` + (k === 'page' ? [...new Set([...t.matchAll(/["'(]([^"'()]*(?:nowcast|webcharts)[^"'()]*\.(?:json|csv|xlsx))/gi)].map((m) => m[1]))].slice(0, 12).join(' | ') : t.slice(0, 700));
    } catch (e) { out[k] = 'ERR ' + String(e.cause?.code || e.message); }
  }));
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
