const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en' };
const T = (ms) => AbortSignal.timeout(ms);
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const P = {
  o1: ['https://sdmx.oecd.org/public/rest/data/OECD.ECO.MPD,DSD_AN_HOUSE_PRICES@DF_HOUSE_PRICES,1.0/GBR+IRL+ESP+PRT+ITA+GRC+USA.Q.HPI_RPI.?startPeriod=2025-Q1&dimensionAtObservation=AllDimensions&format=csvfilewithlabels', (t) => t.split('\n')[0].slice(0, 300) + ' ... ' + t.trim().split('\n').slice(-3).join(' / ').slice(0, 600)],
  o2: ['https://sdmx.oecd.org/public/rest/data/OECD.ECO.MPD,DSD_AN_HOUSE_PRICES@DF_HOUSE_PRICES,1.0/GBR.Q..?startPeriod=2026-Q1&format=csvfile', (t) => [...new Set(t.trim().split('\n').slice(1).map((l) => l.split(',').slice(2, 5).join(',')))].join(' | ').slice(0, 600)],
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
