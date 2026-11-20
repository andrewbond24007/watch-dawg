// WatchDawg asset news: the freshest posts about one asset, from
// (1) searches inside the Telegram channels that mirror the X accounts and
// (2) Google News headlines from the last couple of days.
// e.g. ?q=Silver,XAG&hours=48
const CHANNELS = ['WalterBloomberg', 'WatcherGuru'];
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const H = { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)', 'Accept-Language': 'en' } };
function parseTg(html, ch) {
  return html.split('<div class="tgme_widget_message_wrap').slice(1).map((p) => {
    const post = (p.match(/data-post="([^"]+)"/) || [])[1];
    const time = (p.match(/<time[^>]*datetime="([^"]+)"/) || [])[1];
    const raw = (p.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
    const img = (p.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/) || [])[1] || null;
    const text = decode(raw.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/\n{3,}/g, '\n\n').trim();
    if (!post || !time || !text) return null;
    return { id: post, src: ch, time, text, img, link: 'https://t.me/' + post };
  }).filter(Boolean);
}
function parseRss(xml) {
  return xml.split('<item>').slice(1).map((it) => {
    const g = (tag) => decode((it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1] || '').trim();
    const source = g('source');
    let title = g('title');
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    const time = new Date(g('pubDate')).toISOString();
    return title ? { id: 'gn:' + g('link'), src: 'news', source: source || 'News', time, text: title, img: null, link: g('link') } : null;
  }).filter(Boolean);
}
export default async (req) => {
  const u = new URL(req.url);
  const terms = (u.searchParams.get('q') || '').split(',').map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 40).slice(0, 4);
  const hours = Math.min(96, Math.max(6, +u.searchParams.get('hours') || 48));
  if (!terms.length) return new Response(JSON.stringify({ items: [] }), { headers: { 'content-type': 'application/json' } });
  const tgTerms = terms.slice(0, 2);
  const gnTerms = terms.filter((t) => t.length >= 4 || /\s/.test(t));
  const gParam = (u.searchParams.get('g') || '').slice(0, 200);
  const gq = gParam || (gnTerms.length ? gnTerms : terms.slice(0, 1)).map((t) => `"${t}"`).join(' OR ');
  const jobs = [];
  for (const ch of CHANNELS) for (const t of tgTerms) jobs.push(fetch(`https://t.me/s/${ch}?q=${encodeURIComponent(t)}`, H).then((r) => r.text()).then((h) => parseTg(h, ch)).catch(() => []));
  jobs.push(fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(`(${gq}) when:${Math.ceil(hours / 24)}d`)}&hl=en-GB&gl=GB&ceid=GB:en`, H).then((r) => r.text()).then(parseRss).catch(() => []));
  const since = Date.now() - hours * 3600e3, seen = new Set();
  const all = (await Promise.all(jobs)).flat()
    .filter((p) => new Date(p.time).getTime() >= since)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .filter((p) => { const k = p.text.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60); if (seen.has(k) || seen.has(p.id)) return false; seen.add(k); seen.add(p.id); return true; });
  // keep every recent X-mirror post, then fill with the newest headlines
  const posts = all.filter((p) => p.src !== 'news').slice(0, 15);
  const items = [...posts, ...all.filter((p) => p.src === 'news').slice(0, 25 - posts.length)].sort((a, b) => new Date(b.time) - new Date(a.time));
  return new Response(JSON.stringify({ terms, hours, items }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=180', 'netlify-cdn-cache-control': 'public, s-maxage=300, stale-while-revalidate=600', 'netlify-vary': 'query', 'access-control-allow-origin': '*' } });
};
