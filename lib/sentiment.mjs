// News mood: how bullish or bearish a day's market news was, 0 (very bearish) to 100 (very bullish).
// Each headline or post is read for market words: moves ("surges", "plunges"), outcomes ("beats", "misses",
// "record high", "bankruptcy") and policy ("rate cut", "hike", "tariffs"). A rise in something bad for markets
// (inflation, yields, unemployment, oil...) counts as bearish. The day's score is the bullish share of all those
// signals, pulled gently towards 50 when there are few of them.
const UP = /\b(surg(e|es|ed|ing)|soar(s|ed|ing)?|rall(y|ies|ied|ying)|jump(s|ed|ing)?|climb(s|ed|ing)?|gain(s|ed|ing)?|ris(e|es|ing)|rose|rebound(s|ed|ing)?|spik(e|es|ed|ing)|advanc(e|es|ed|ing)|higher|up \d|boost(s|ed)?|skyrocket(s|ed)?|rocket(s|ed)?|pump(s|ed)?|recover(s|ed|ing|y)?|green)\b/i;
const DOWN = /\b(plung(e|es|ed|ing)|tumbl(e|es|ed|ing)|slump(s|ed|ing)?|sink(s|ing)?|sank|fall(s|ing)?|fell|drop(s|ped|ping)?|slid(e|es|ing)?|declin(e|es|ed|ing)|lower|down \d|crash(es|ed|ing)?|dump(s|ed|ing)?|slip(s|ped|ping)?|tank(s|ed|ing)?|sell-?off|selloff|rout|retreat(s|ed|ing)?|red)\b/i;
// things that are bad for markets when they go up (so "yields rise" is bearish)
const BAD_UP = /\b(inflation|cpi|pce|prices? paid|yields?|treasury yields|unemployment|jobless|claims|layoffs?|job cuts|oil|crude|vix|volatility|spreads?|cds|default swaps|delinquenc(y|ies)|foreclosures?|bankruptc(y|ies)|debt|deficit|tariffs?|mortgage rates|dollar index|short interest|liquidations?|outflows?)\b/i;
const BULL = [
  [/\b(record high|all-time high|ath|new high|best (day|week|month))\b/i, 2], [/\b(beats?|beat estimates|tops? estimates|better than expected|above expectations|blowout)\b/i, 2],
  [/\b(rate cuts?|cuts? (\w+ ){0,2}rates?|lowers? (\w+ ){0,2}(interest )?rates?|dovish|easing|stimulus|qe)\b/i, 2], [/\b(upgrades?d?|raises? (guidance|forecast|outlook|target)|buyback)\b/i, 1.5],
  [/\b(ceasefire|peace (deal|talks)|trade deal|agreement reached|truce)\b/i, 1.5], [/\b(approv(al|es|ed)|etf inflows|inflows)\b/i, 1],
  [/\b(bullish|optimis(m|tic)|strong demand|soft landing|cool(s|ed|ing)? inflation|inflation (eases|cools|slows))\b/i, 1.5],
];
const BEAR = [
  [/\b(crash(es|ed)?|plunge|rout|bloodbath|capitulation|meltdown|panic)\b/i, 2], [/\b(miss(es|ed)? (estimates|expectations)|worse than expected|below expectations|profit warning|warns?)\b/i, 2],
  [/\b(rate hikes?|hikes? (\w+ ){0,2}rates?|raises? (\w+ ){0,2}(interest )?rates?|hawkish|tightening)\b/i, 2], [/\b(downgrades?d?|cuts? (guidance|forecast|outlook)|lowers? (guidance|forecast|target))\b/i, 1.5],
  [/\b(recession|stagflation|default(s|ed)?|bankrupt(cy|cies)?|insolven(t|cy)|bailout|contagion|bank run)\b/i, 2],
  [/\b(war|invasion|missile|strikes? on|attack(s|ed)?|sanctions?|escalat(es|ed|ion))\b/i, 1.5], [/\b(tariffs?|trade war|export (ban|controls))\b/i, 1.5],
  [/\b(layoffs?|job cuts|fraud|probe|lawsuit|sues|hack(ed)?|exploit(ed)?|liquidat(ed|ions?)|outflows|bearish|fears?|worries|concerns?|turmoil|bubble)\b/i, 1],
];
// one item -> signed score (positive = bullish), capped at ±3
export function itemScore(text) {
  const t = String(text || '').replace(/\s+/g, ' ');
  let s = 0;
  for (const [rx, w] of BULL) if (rx.test(t)) s += w;
  for (const [rx, w] of BEAR) if (rx.test(t)) s -= w;
  const mu = UP.exec(t), md = DOWN.exec(t);
  if (!!mu !== !!md) {
    // the thing that moved is the subject just before the move word ("yields rise", "bitcoin plunges")
    const m = mu || md, before = t.slice(Math.max(0, m.index - 40), m.index), bad = BAD_UP.test(before);
    s += (mu ? 1 : -1) * (bad ? -1 : 1);
  }
  return Math.max(-3, Math.min(3, s));
}
const norm = (t) => String(t || '').toLowerCase().replace(/https?:\S+/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
export const londonDay = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
export const moodLabel = (s) => (s < 25 ? 'Very bearish' : s < 45 ? 'Bearish' : s <= 55 ? 'Neutral' : s <= 75 ? 'Bullish' : 'Very bullish');
// how much one item counts: wire services and fast market squawks more, stories about markets, central banks
// and the assets the app tracks more, clickbait ("if the market crashes...", "stocks to buy") hardly at all
const SRC_W = { Reuters: 1.5, Bloomberg: 1.5, 'Financial Times': 1.4, CNBC: 1.3, MarketWatch: 1.2, financialjuice: 1.3, marketfeed: 1.2, WatcherGuru: 1.1, ForexLive: 1.2 };
const RELEVANT = /\b(stocks?|shares|markets?|wall street|s&p|nasdaq|dow|ftse|nikkei|bitcoin|btc|crypto|ether(eum)?|gold|silver|oil|crude|treasur(y|ies)|yields?|bonds?|dollar|fed|fomc|ecb|bank of england|rates?|inflation|cpi|jobs|payrolls|gdp|recession|tariffs?|earnings|nvidia|tesla|apple|alphabet|google|tsmc|oracle|coreweave|broadcom|amd|microsoft|amazon|meta)\b/i;
const CLICKBAIT = /\b(if the (stock )?market crash(es)?|stocks? to buy|should you buy|prediction:|hand over fist|i think it'?s a buy|dividend stocks|what history (says|reveals)|millionaire|retire|(director|ceo|cfo|officer|vp) (buys|sells))\b/i;
export function itemWeight(p, text) {
  const src = p.src && p.src !== 'news' ? p.src : p.source;
  let w = SRC_W[src] || 1;
  if (RELEVANT.test(text)) w *= 1.4;
  if (CLICKBAIT.test(text)) w *= 0.2;
  return w;
}
// items of one day -> {s, n, b, r, up:[top bullish], dn:[top bearish]}
export function dayMood(items) {
  const seen = new Set(), scored = [];
  for (const p of items) {
    const first = String(p.text || '').split('\n')[0], k = norm(first);
    if (!k || seen.has(k)) continue; seen.add(k);
    const raw = itemScore(first);
    if (raw) scored.push({ v: raw * itemWeight(p, first), raw, t: first.slice(0, 160), l: p.link || '' });
  }
  const b = scored.filter((x) => x.v > 0).reduce((a, x) => a + x.v, 0), r = -scored.filter((x) => x.v < 0).reduce((a, x) => a + x.v, 0);
  const s = Math.round((100 * (b + 6)) / (b + r + 12));
  const top = (arr) => arr.slice(0, 3).map(({ t, l }) => ({ t, l }));
  return { s, n: seen.size, k: scored.length, b: +b.toFixed(1), r: +r.toFixed(1),
    up: top(scored.filter((x) => x.v > 0).sort((a, c) => c.v - a.v)), dn: top(scored.filter((x) => x.v < 0).sort((a, c) => a.v - c.v)) };
}
// archive -> mood per day; past days keep the score they had once complete, today is live
export const MOOD_VERSION = 2;
export function updateMood(prev, archiveItems, now = Date.now()) {
  // a new scoring method rescores everything: search-based days are fetched again by the backfill
  const days = prev?.v === MOOD_VERSION ? { ...(prev?.days || {}) } : Object.fromEntries(Object.entries(prev?.days || {}).filter(([, m]) => m.src !== 'search').map(([d, m]) => [d, { ...m, n: 0 }])), by = {};
  for (const p of archiveItems || []) (by[londonDay(p.time)] ||= []).push(p);
  const today = londonDay(new Date(now).toISOString());
  for (const [d, items] of Object.entries(by)) {
    const m = dayMood(items), old = days[d];
    // a past day from the full feed replaces a search-based backfill, and only grows
    if (!old || d === today || old.src === 'search' || m.n >= old.n) days[d] = { ...m, src: 'feed', ...(old?.mkt ? { mkt: old.mkt } : {}), ...(d === today ? { live: true } : {}) };
  }
  for (const d of Object.keys(days)) { if (d !== today) delete days[d].live; }
  const cut = londonDay(new Date(now - 400 * 864e5).toISOString());
  for (const d of Object.keys(days)) if (d < cut) delete days[d];
  return { v: MOOD_VERSION, updated: new Date(now).toISOString(), days };
}
