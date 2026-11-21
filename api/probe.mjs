const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en' };
const T = (ms) => AbortSignal.timeout(ms);
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const P = {
  numbeo: 'https://www.numbeo.com/property-investment/rankings_by_country.jsp',
  numbeo_uk: 'https://www.numbeo.com/property-investment/country_result.jsp?country=United+Kingdom',
  ons: 'https://api.beta.ons.gov.uk/v1/search?q=price%20index%20of%20private%20rents%20average%20rent&limit=5',
  ukhpi: 'https://landregistry.data.gov.uk/data/ukhpi/region/united-kingdom/month/2026-08.json',
};
export const GET = async () => {
  const out = {};
  await Promise.all(Object.entries(P).map(async ([k, u]) => {
    const s = Date.now();
    try {
      const r = await fetch(u, { headers: UA, signal: T(12000) }); const t = await r.text();
      let x = t;
      if (k === 'numbeo') { const tb = plain(t); x = tb.match(/Rank Country[\s\S]{0,400}/)?.[0] + ' ... ' + ['United Kingdom', 'Ireland', 'Spain', 'Portugal', 'Italy', 'Greece', 'Croatia', 'Cyprus', 'Malta', 'United States', 'Albania', 'Montenegro'].map((c) => (tb.match(new RegExp(c + '(\\s+[\\d.]+){1,8}')) || [c + ' ?'])[0]).join(' | '); }
      else if (k === 'numbeo_uk') { x = [...plain(t).matchAll(/(Gross Rental Yield[^%]{0,60}%|Price to Rent Ratio[^\d]{0,40}[\d.]+)/g)].map((m) => m[0]).join(' | '); }
      else if (k === 'ukhpi') { x = t.slice(0, 120) + ' ... ' + (t.match(/"averagePrice"[^,]{0,40}/) || [''])[0]; }
      else x = t.slice(0, 600);
      out[k] = `${r.status} ${Date.now() - s}ms :: ${x.slice(0, 900)}`;
    } catch (e) { out[k] = `ERR ${Date.now() - s}ms ${String(e.cause?.code || e.message).slice(0, 120)}`; }
  }));
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
