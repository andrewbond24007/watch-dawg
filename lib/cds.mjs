// Credit default swaps (5-year) on AI hyperscalers and chipmakers. There is no free live CDS feed (the market
// data comes from ICE, S&P and Bloomberg terminals), so levels are taken from news reports that quote them:
// the app's own news feed plus a Google News search per company. Each refresh adds what it finds to a history.
export const CDS_NAMES = [
  ['oracle', 'Oracle', /\boracle\b/i], ['coreweave', 'CoreWeave', /\bcoreweave\b/i], ['meta', 'Meta', /\bmeta\b(?! ?data)/i],
  ['amazon', 'Amazon', /\bamazon\b/i], ['microsoft', 'Microsoft', /\bmicrosoft\b/i], ['alphabet', 'Alphabet', /\b(alphabet|google)\b/i],
  ['broadcom', 'Broadcom', /\bbroadcom\b/i], ['spacex', 'SpaceX', /\b(spacex|xai)\b/i], ['nvidia', 'Nvidia', /\bnvidia\b/i], ['amd', 'AMD', /\bamd\b/i],
];
const CDS_RX = /\b(cds|credit[- ]default[- ]swaps?|default swaps?|default protection)\b/i;
// pull "<company> ... CDS ... 295 basis points" (or 295bp / 2.95 percentage points) out of a headline or post
export function extractCds(text) {
  if (!text || !CDS_RX.test(text)) return [];
  const t = text.replace(/\s+/g, ' ');
  const out = [];
  // split into sentences so a number is tied to the company in the same sentence
  for (const s of t.split(/(?<=[.!?;])\s+|\n/)) {
    if (!CDS_RX.test(s)) continue;
    const names = CDS_NAMES.filter(([, , rx]) => rx.test(s));
    if (names.length !== 1) continue; // ambiguous sentences (several companies) are skipped
    // every "N bp" in the sentence, judged by the words just before it: a level ("to 139 bps", "at 295 basis
    // points", "hits 720bp") or a change ("by 12 bps", "jumps 12 bps")
    const LEVEL = /\b(to|at|of|reach\w*|hit\w*|above|over|exceed\w*|near\w*|is|was|around|record)\s+(about |around |roughly |approximately |nearly |almost |~)?$/i;
    const CHANGE = /(\bby|\bjump\w*|\bwiden\w*|\brose|\brise\w*|\bfell|\btighten\w*|\bup|\bdown|\badded|\bgain\w*|\+|−|-)\s*(as much as |about |approximately |nearly |roughly |~)?$/i;
    const c = [];
    for (const m of s.matchAll(/(\d{2,4}(?:\.\d+)?)\s*(?:bps?|basis[- ]points?)\b/gi)) c.push({ v: +m[1], pre: s.slice(Math.max(0, m.index - 40), m.index) });
    for (const m of s.matchAll(/(\d(?:\.\d+)?)\s*percentage[- ]points?/gi)) c.push({ v: Math.round(+m[1] * 100), pre: s.slice(Math.max(0, m.index - 40), m.index) });
    let bp = (c.find((x) => LEVEL.test(x.pre)) || {}).v ?? null;
    if (bp == null && c.length === 1 && !CHANGE.test(c[0].pre)) bp = c[0].v;
    if (bp == null || bp < 5 || bp > 2000) continue;
    out.push({ id: names[0][0], bp });
  }
  return out;
}
// merge new observations into the history: one point per company per day (the latest report that day)
export function mergeCds(prev, found, now = new Date()) {
  const h = prev && prev.names ? prev : { names: {} };
  for (const f of found) {
    const n = (h.names[f.id] ||= { label: CDS_NAMES.find((x) => x[0] === f.id)?.[1] || f.id, points: [] });
    const day = f.date.slice(0, 10), i = n.points.findIndex((p) => p.date === day);
    const pt = { date: day, bp: f.bp, title: f.title.slice(0, 200), link: f.link, source: f.source };
    if (i >= 0) { if (f.date >= (n.points[i].at || '')) n.points[i] = { ...pt, at: f.date }; } else n.points.push({ ...pt, at: f.date });
    n.points.sort((a, b) => (a.date < b.date ? -1 : 1));
    const cut = new Date(now.getTime() - 400 * 864e5).toISOString().slice(0, 10);
    n.points = n.points.filter((p) => p.date >= cut);
  }
  h.updated = now.toISOString();
  return h;
}
