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
    const h = await fetch('https://www.greenstreet.com/insights/CPPI', { headers: UA, signal: T(10000) }).then((r) => r.text());
    const pdfs = [...new Set([...h.matchAll(/https?:\/\/[^"' ]+\.pdf/g)].map((m) => m[0]))].slice(0, 6); out.gsPdfs = pdfs;
    const u = pdfs.find((p) => /CPPI/i.test(p)) || pdfs[0];
    if (u) { const b = Buffer.from(await fetch(u, { headers: UA, signal: T(12000) }).then((r) => r.arrayBuffer())); const t = pdfText(b); out.gsLen = t.length; out.gsOffice = [...t.matchAll(/.{0,120}Office.{0,160}/g)].slice(0, 6).map((m) => m[0]); out.gsHead = t.slice(0, 600); }
  } catch (e) { out.gs = 'ERR ' + e; }
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
