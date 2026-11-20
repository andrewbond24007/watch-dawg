const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en' };
const T = (ms) => AbortSignal.timeout(ms);
const P = {
  trepp_rss: 'https://www.trepp.com/trepptalk/rss.xml',
  trepp_blog: 'https://www.trepp.com/trepptalk',
  kastle: 'https://www.kastle.com/safety-wellness/getting-america-back-to-work/',
  gs_cppi: 'https://www.greenstreet.com/insights/CPPI',
  msci_2610: 'https://www.msci.com/downloads/web/msci-com/research-and-insights/paper/rca-commercial-property-price-indexes-rca-cppi/2610_RCACPPI_US.pdf',
  msci_2609: 'https://www.msci.com/downloads/web/msci-com/research-and-insights/paper/rca-commercial-property-price-indexes-rca-cppi/2609_RCACPPI_US.pdf',
  kbra: 'https://www.kbra.com/publications?q=CMBS%20Loan%20Performance%20Trends',
  gnews: 'https://news.google.com/rss/search?q=Trepp%20office%20delinquency%20rate%20when:45d&hl=en-US&gl=US&ceid=US:en',
};
const pick = (t) => { const x = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const hits = [...x.matchAll(/[^.]{0,140}(office|occupancy|CPPI|delinquen)[^.]{0,160}/gi)].slice(0, 5).map((m) => m[0].trim()); return hits.join(' ¦ ').slice(0, 900) || x.slice(0, 300); };
export const GET = async () => {
  const out = {};
  await Promise.all(Object.entries(P).map(async ([k, u]) => {
    const s = Date.now();
    try { const r = await fetch(u, { headers: UA, signal: T(12000) }); const ct = r.headers.get('content-type') || ''; const t = ct.includes('pdf') ? '[pdf ' + (await r.arrayBuffer()).byteLength + ' bytes]' : await r.text(); out[k] = `${r.status} ${Date.now() - s}ms ${ct.split(';')[0]} :: ${t.startsWith('[pdf') ? t : pick(t)}`; }
    catch (e) { out[k] = `ERR ${Date.now() - s}ms ${String(e.cause?.code || e.cause || e).slice(0, 120)}`; }
  }));
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
