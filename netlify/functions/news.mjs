// WatchDawg news: latest posts from public Telegram channels that mirror the
// accounts' X posts (Watcher Guru, Walter Bloomberg). No API key needed.
const CHANNELS = ['WatcherGuru', 'WalterBloomberg'];
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
function parse(html, ch) {
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
export default async () => {
  const lists = await Promise.all(CHANNELS.map(async (ch) => {
    try {
      const r = await fetch('https://t.me/s/' + ch, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)', 'Accept-Language': 'en' } });
      return parse(await r.text(), ch);
    } catch (e) { return []; }
  }));
  const seen = new Set();
  const items = lists.flat()
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .filter((p) => { const k = p.text.slice(0, 80).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 60);
  return new Response(JSON.stringify({ items, sources: CHANNELS, fetched: new Date().toISOString() }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60', 'netlify-cdn-cache-control': 'public, s-maxage=60, stale-while-revalidate=120', 'access-control-allow-origin': '*' },
  });
};
