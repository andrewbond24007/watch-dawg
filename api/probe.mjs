import * as XLSX from 'xlsx';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en' };
const T = (ms) => AbortSignal.timeout(ms);
export const GET = async () => {
  const out = {};
  try {
    const page = await fetch('https://www.ons.gov.uk/economy/inflationandpriceindices/datasets/priceindexofprivaterentsukmonthlypricestatistics', { headers: UA, signal: T(10000) }).then((r) => r.text());
    const href = page.match(/href="(\/file\?uri=[^"]+\.xlsx)"/)[1];
    out.file = href;
    const buf = await fetch('https://www.ons.gov.uk' + href, { headers: UA, signal: T(15000) }).then((r) => r.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'array' });
    out.sheets = wb.SheetNames;
    for (const n of wb.SheetNames.slice(0, 6)) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, blankrows: false });
      out[n] = { n: rows.length, head: rows.slice(0, 5).map((r) => r.slice(0, 9).join(' ¦ ')), uk: rows.filter((r) => /United Kingdom|Northern Ireland/.test(r.join(' '))).slice(-3).map((r) => r.slice(0, 9).join(' ¦ ')) };
    }
  } catch (e) { out.err = String(e.message || e); }
  for (const u of ['https://landregistry.data.gov.uk/data/ukhpi/region/united-kingdom.json?_pageSize=5&_sort=-refMonth', 'https://landregistry.data.gov.uk/data/ukhpi/region/northern-ireland/month/2026-07.json']) {
    try { const t = await fetch(u, { headers: UA, signal: T(10000) }).then((r) => r.status + ' ' + r.text().then ? r : r); const r2 = await fetch(u, { headers: UA, signal: T(10000) }); const tx = await r2.text(); out[u] = r2.status + ' ' + [...tx.matchAll(/"(refMonth|averagePrice)"\s*:\s*("?[^,}]+)/g)].slice(0, 8).map((m) => m[1] + '=' + m[2]).join(' ') + ' ' + tx.slice(0, 120); } catch (e) { out[u] = 'ERR ' + e.message; }
  }
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
