import * as XLSX from 'xlsx';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const T = (ms) => AbortSignal.timeout(ms);
export const GET = async () => {
  const out = {};
  try {
    const page = await fetch('https://www.gov.uk/government/statistics/monthly-property-transactions-completed-in-the-uk-with-value-40000-or-above', { headers: UA, signal: T(10000) }).then((r) => r.text());
    const u = page.match(/href="(https:\/\/assets\.publishing\.service\.gov\.uk\/[^"]+\.ods)"/)[1];
    const wb = XLSX.read(await fetch(u, { headers: UA, signal: T(15000) }).then((r) => r.arrayBuffer()), { type: 'array' });
    out.sheets = wb.SheetNames;
    for (const n of wb.SheetNames.slice(0, 8)) { const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, blankrows: false }); out[n] = { n: rows.length, head: rows.slice(0, 7).map((r) => r.slice(0, 8).join(' ¦ ').slice(0, 220)), tail: rows.slice(-2).map((r) => r.slice(0, 8).join(' ¦ ').slice(0, 220)) }; }
  } catch (e) { out.hmrcErr = String(e.message); }
  try {
    const m = await fetch('https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadMetadata/HPM04/JSON-stat/2.0/en', { headers: UA, signal: T(12000) }).then((r) => r.json());
    out.cso_meta = Object.fromEntries(Object.entries(m.dimension).map(([k, d]) => [k, Object.entries(d.category.label).slice(0, 6).map(([c, l]) => c + '=' + l).join(' | ')]));
  } catch (e) { out.csoErr = String(e.message); }
  try {
    const q = { jsonrpc: '2.0', method: 'PxStat.Data.Cube_API.ReadDataset', params: { class: 'query', id: ['STATISTIC', 'C03349V04063', 'C03346V04033', 'C03341V04028', 'C03344V04031'], dimension: { STATISTIC: { category: { index: ['HPM04C01'] } }, C03349V04063: { category: { index: ['-'] } }, C03346V04033: { category: { index: ['-'] } }, C03341V04028: { category: { index: ['2'] } }, C03344V04031: { category: { index: ['-'] } } }, extension: { pivot: null, codes: false, language: { code: 'en' }, format: { type: 'JSON-stat', version: '2.0' }, matrix: 'HPM04' }, version: '2.0' } };
    const r = await fetch('https://ws.cso.ie/public/api.jsonrpc?data=' + encodeURIComponent(JSON.stringify(q)), { headers: UA, signal: T(12000) });
    const t = await r.text(); out.cso_q = r.status + ' ' + t.length + 'b ' + t.slice(0, 400);
  } catch (e) { out.csoQErr = String(e.message); }
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
