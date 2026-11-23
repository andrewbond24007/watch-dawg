// WatchDawg news feed.
// 1) Fast "squawk" posts from public Telegram channels (Walter Bloomberg and Watcher
//    Guru mirror their X posts; FinancialJuice and others add macro and crypto flash news).
// 2) Headlines from publishers' public RSS feeds (CNBC, MarketWatch, FT, BBC, Reuters
//    and Bloomberg via Google News, CoinDesk, The Block, HousingWire, Bisnow and more).
// No API keys. Everything is from the last 48 hours, newest first, near-duplicates removed.
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; WatchDawg/1.0)', 'Accept-Language': 'en' };
const get = (u, ms = 9000) => fetch(u, { headers: UA, signal: AbortSignal.timeout(ms) }).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); });

// channel: pages of history to read (each page is about 20 posts), category hint
export const CHANNELS = [
  ['WalterBloomberg', 2], ['WatcherGuru', 2], ['financialjuice', 2],
  ['marketfeed', 1], ['unfolded', 1, 'crypto'], ['bwenews', 1, 'crypto'], ['cointelegraph', 1, 'crypto'],
];
const GN = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:2d')}&hl=en-GB&gl=GB&ceid=GB:en`;
// [source name, url, category hint]
export const FEEDS = [
  ['CNBC', 'https://www.cnbc.com/id/100003114/device/rss/rss.html'],
  ['CNBC', 'https://www.cnbc.com/id/15839069/device/rss/rss.html', 'stocks'],
  ['CNBC', 'https://www.cnbc.com/id/20910258/device/rss/rss.html', 'economy'],
  ['MarketWatch', 'https://feeds.content.dowjones.io/public/rss/mw_topstories'],
  ['Financial Times', 'https://www.ft.com/markets?format=rss'],
  ['BBC', 'https://feeds.bbci.co.uk/news/business/rss.xml'],
  ['Investing.com', 'https://www.investing.com/rss/news.rss'],
  ['Nasdaq', 'https://www.nasdaq.com/feed/rssoutbound?category=Markets', 'stocks'],
  ['Seeking Alpha', 'https://seekingalpha.com/market_currents.xml', 'stocks'],
  ['Business Insider', 'https://markets.businessinsider.com/rss/news'],
  ['ForexLive', 'https://www.forexlive.com/feed/news', 'economy'],
  ['Reuters', GN('site:reuters.com (markets OR stocks OR economy OR Fed OR gold OR bitcoin)')],
  ['Bloomberg', GN('site:bloomberg.com (markets OR stocks OR economy OR Fed OR gold OR bitcoin)')],
  ['Kitco', GN('site:kitco.com gold OR silver'), 'metals'],
  ['CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/', 'crypto'],
  ['The Block', 'https://www.theblock.co/rss.xml', 'crypto'],
  ['Decrypt', 'https://decrypt.co/feed', 'crypto'],
  ['HousingWire', 'https://www.housingwire.com/feed/', 'property'],
  ['Bisnow', 'https://www.bisnow.com/rss', 'property'],
];
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);

export function parseTg(html, ch, cat) {
  return html.split('<div class="tgme_widget_message_wrap').slice(1).map((p) => {
    const post = (p.match(/data-post="([^"]+)"/) || [])[1];
    const time = (p.match(/<time[^>]*datetime="([^"]+)"/) || [])[1];
    const raw = (p.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
    const img = (p.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/) || [])[1] || null;
    const text = decode(raw.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/\n{3,}/g, '\n\n').replace(/\s*(\$[A-Z]+)?\|FJ\s*$/, '').trim();
    if (!post || !time || !text) return null;
    return { id: post, src: ch, kind: 'post', time: new Date(time).toISOString(), text, img, link: 'https://t.me/' + post, ...(cat ? { cats: [cat] } : {}) };
  }).filter(Boolean);
}
export function parseRss(xml, source, cat) {
  const blocks = xml.split(/<item[\s>]|<entry[\s>]/).slice(1);
  return blocks.map((b) => {
    const tag = (t) => { const m = b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? decode(m[1].replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, '').replace(/<[^>]+>/g, '')).trim() : ''; };
    let title = tag('title'), src = source;
    let link = tag('link') || (b.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
    const when = tag('pubDate') || tag('dc:date') || tag('published') || tag('updated');
    const t = Date.parse(when);
    if (!title || !link || !t) return null;
    // Google News appends " - Publisher" and carries a <source> tag
    const gs = tag('source');
    if (gs) { src = gs.replace(/^Reuters.*$/, 'Reuters').replace(/^Bloomberg.*$/, 'Bloomberg'); title = title.replace(/\s+-\s+[^-]+$/, ''); }
    const img = (b.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/) || b.match(/<enclosure[^>]*url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i) || [])[1] || null;
    return { id: 'rss:' + link, src: 'news', kind: 'headline', source: src, time: new Date(t).toISOString(), text: title, img: img ? decode(img) : null, link, ...(cat ? { cats: [cat] } : {}) };
  }).filter(Boolean);
}
const norm = (s) => s.toLowerCase().replace(/^(breaking|just in)[:\s]*/i, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 70);

async function channel([ch, pages, cat]) {
  let out = [], url = 'https://t.me/s/' + ch;
  for (let i = 0; i < pages; i++) {
    const got = parseTg(await get(url), ch, cat);
    if (!got.length) break;
    out = out.concat(got);
    const min = Math.min(...got.map((p) => +p.id.split('/')[1]).filter(Boolean));
    if (!isFinite(min)) break;
    url = `https://t.me/s/${ch}?before=${min}`;
  }
  return out;
}

export default async () => {
  const since = Date.now() - 48 * 3600e3, status = {};
  const jobs = [
    ...CHANNELS.map((c) => channel(c).then((r) => (status[c[0]] = r.length, r)).catch(() => (status[c[0]] = 0, []))),
    ...FEEDS.map(([s, u, cat]) => get(u).then((x) => parseRss(x, s, cat)).then((r) => (status[s] = (status[s] || 0) + r.length, r)).catch(() => (status[s] = status[s] || 0, []))),
  ];
  const all = (await Promise.all(jobs)).flat().filter((p) => Date.parse(p.time) >= since && Date.parse(p.time) <= Date.now() + 300e3);
  // newest first; squawk posts win ties so the fastest version of a story is kept
  all.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  // no single publisher may crowd out the rest: at most 30 headlines each (squawk channels are uncapped)
  const seen = new Map(), items = [], per = {};
  for (const p of all) {
    if (p.kind === 'headline') { per[p.source] = (per[p.source] || 0) + 1; if (per[p.source] > 30) continue; }
    const k = norm(p.text);
    if (seen.has(k)) { const q = seen.get(k); if (p.cats) q.cats = [...new Set([...(q.cats || []), ...p.cats])]; continue; }
    seen.set(k, p); items.push(p);
  }
  const out = items.slice(0, 500);
  return new Response(JSON.stringify({ items: out, sources: status, fetched: new Date().toISOString() }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60', 'netlify-cdn-cache-control': 'public, s-maxage=90, stale-while-revalidate=300', 'cdn-cache-control': 'public, s-maxage=90, stale-while-revalidate=300', 'access-control-allow-origin': '*' },
  });
};
