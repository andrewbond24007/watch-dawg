const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en' };
const T = (ms) => AbortSignal.timeout(ms);
const txt = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g, ' ');
export const GET = async () => {
  const out = {};
  const rss = await fetch('https://www.trepp.com/trepptalk/rss.xml', { headers: UA, signal: T(10000) }).then((r) => r.text());
  const items = rss.split('<item>').slice(1);
  out.titles = items.map((i) => (i.match(/<title>([\s\S]*?)<\/title>/) || [])[1] + ' | ' + (i.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]).slice(0, 25);
  const del = items.find((i) => /delinquency/i.test((i.match(/<title>([\s\S]*?)<\/title>/) || [])[1]));
  if (del) { const t = txt(del); out.delLen = t.length; out.delOffice = [...t.matchAll(/[^.]{0,200}(office|matured balloon|special servicing)[^.]{0,200}\./gi)].slice(0, 8).map((m) => m[0].trim()); out.delLink = (del.match(/<link>([\s\S]*?)<\/link>/) || [])[1]; }
  const tr = await fetch('https://www.trepp.com/trepptalk/topic/cmbs-delinquencies', { headers: UA, signal: T(10000) }).then((r) => r.status + ' ' + txt(r.status === 200 ? '' : '')).catch((e) => 'ERR');
  out.topic = tr;
  for (const [k, u] of [['kastle', 'https://www.kastle.com/safety-wellness/getting-america-back-to-work/'], ['gs', 'https://www.greenstreet.com/insights/CPPI'], ['gsnews', 'https://www.greenstreet.com/news']]) {
    try { const t = txt(await fetch(u, { headers: UA, signal: T(10000) }).then((r) => r.text())); out[k] = [...t.matchAll(/[^.]{0,160}\d+(\.\d+)?%[^.]{0,160}/g)].slice(0, 8).map((m) => m[0].trim()); } catch (e) { out[k] = 'ERR ' + e; }
  }
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
