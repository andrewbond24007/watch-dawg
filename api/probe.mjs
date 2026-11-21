const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en' };
const T = (ms) => AbortSignal.timeout(ms);
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const P = {
  ons_ds: 'https://api.beta.ons.gov.uk/v1/datasets?limit=500',
  ons_pipr: 'https://api.beta.ons.gov.uk/v1/search?q=PIPR%20average%20rent&content_type=timeseries&limit=8',
  ons_ts: 'https://www.ons.gov.uk/economy/inflationandpriceindices/datasets/priceindexofprivaterentsukmonthlypricestatistics',
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
      else if (k === 'ons_ds') { const j = JSON.parse(t); x = (j.items || []).filter((d) => /rent|hous/i.test(d.id + d.title)).map((d) => d.id + ' :: ' + d.title + ' :: ' + (d.links?.latest_version?.href || '')).join(' || '); }
      else if (k === 'ons_pipr') { const j = JSON.parse(t); x = (j.items || []).map((d) => (d.cdid || '') + ' ' + d.title + ' ' + (d.uri || '')).join(' || '); }
      else if (k === 'ons_ts') { x = [...t.matchAll(/href="([^"]+\.(?:xlsx|xls|csv))"/g)].map((m) => m[1]).slice(0, 5).join(' | '); }
      else x = t.slice(0, 600);
      out[k] = `${r.status} ${Date.now() - s}ms :: ${x.slice(0, 900)}`;
    } catch (e) { out[k] = `ERR ${Date.now() - s}ms ${String(e.cause?.code || e.message).slice(0, 120)}`; }
  }));
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
