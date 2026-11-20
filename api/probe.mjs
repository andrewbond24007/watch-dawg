import { inflateSync } from 'node:zlib';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en' };
const T = (ms) => AbortSignal.timeout(ms);
const txt = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g, ' ');
function pdfText(buf) {
  const s = buf.toString('latin1'); let out = '';
  for (const m of s.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    let d; try { d = inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'); } catch (e) { continue; }
    for (const t of d.matchAll(/\[(.*?)\]\s*TJ|\((.*?)\)\s*Tj/g)) { out += (t[1] ? [...t[1].matchAll(/\((.*?)\)/g)].map((x) => x[1]).join('') : t[2]) + ' '; }
    out += '\n';
  }
  return out.replace(/\\\(/g,'(').replace(/\\\)/g,')');
}
export const GET = async () => {
  const out = {};
  for (const topic of ['cmbs-delinquencies', 'special-servicing']) {
    try {
      const h = await fetch(`https://www.trepp.com/trepptalk/topic/${topic}`, { headers: UA, signal: T(10000) }).then((r) => r.text());
      const links = [...new Set([...h.matchAll(/href="(https:\/\/www\.trepp\.com\/trepptalk\/[a-z0-9-]+)"/g)].map((m) => m[1]))].filter((l) => !/topic|author|page/.test(l)).slice(0, 8);
      out[topic] = links;
      const l = links.find((x) => /delinquen|special-servicing-rate/.test(x));
      if (l) { const t = txt(await fetch(l, { headers: UA, signal: T(10000) }).then((r) => r.text())); out[topic + '_post'] = l; out[topic + '_lines'] = [...t.matchAll(/[^.]{0,180}(office|matured balloon)[^.]{0,200}\./gi)].slice(0, 6).map((m) => m[0].trim()); }
    } catch (e) { out[topic] = 'ERR ' + e; }
  }
  try {
    const h = txt(await fetch('https://www.greenstreet.com/insights/CPPI', { headers: UA, signal: T(10000) }).then((r) => r.text()));
    const m = /Newport Beach, CA, (\w+) (\d+), (\d{4})/.exec(h); out.gsDate = m && m[0];
    const MON = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
    const ds = m ? `${m[3]}${String(MON[m[1]]).padStart(2, '0')}${String(m[2]).padStart(2, '0')}` : '';
    out.gsTry = {};
    for (const u of [`https://insights.greenstreet.com/hubfs/GSCPPI-${ds}.pdf`, `https://insights.greenstreet.com/hubfs/GSCPPI${ds}.pdf`]) {
      const r = await fetch(u, { headers: UA, signal: T(12000) });
      if (r.status !== 200) { out.gsTry[u] = r.status; continue; }
      const t = pdfText(Buffer.from(await r.arrayBuffer())); out.gsTry[u] = 'ok ' + t.length;
      out.gsOffice = [...t.matchAll(/.{0,100}Office.{0,140}/g)].slice(0, 6).map((x) => x[0]); out.gsHead = t.slice(0, 500); break;
    }
  } catch (e) { out.gs = 'ERR ' + e; }
  try {
    const t = txt(await fetch('https://www.trepp.com/trepptalk/cmbs-delinquency-rate-drops-15-basis-points-in-october-2026', { headers: UA, signal: T(10000) }).then((r) => r.text()));
    const i = t.indexOf('delinquency rate'); out.treppBody = t.slice(Math.max(0, t.search(/The Trepp CMBS Delinquency Rate/i)), Math.max(0, t.search(/The Trepp CMBS Delinquency Rate/i)) + 2200);
  } catch (e) { out.trepp = 'ERR ' + e; }
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
