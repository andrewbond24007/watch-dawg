import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrepp, parseKastle, parseNumbeo, csv, qDate, yoy } from '../netlify/functions/health.mjs';

test('csv handles quoted fields with commas', () => {
  assert.deepEqual(csv('a,b,c\n1,"x, y",3\n'), [['a', 'b', 'c'], ['1', 'x, y', '3']]);
});
test('quarter labels become the first day of the quarter', () => {
  assert.equal(qDate('2026-Q2'), '2026-04-01');
  assert.equal(qDate('2025-Q4'), '2025-10-01');
});
test('year-on-year change', () => {
  const s = Array.from({ length: 13 }, (_, i) => [`2025-${String(i + 1).padStart(2, '0')}-01`, 100 + i]);
  assert.equal(yoy(s, 12).at(-1)[1], 12);
});

const TREPP = `Nav Multifamily Office Retail ... The Trepp commercial mortgage-backed securities (CMBS) delinquency rate fell 15 basis points to 7.87% in October 2026, down from 8.02% in September.
Office led the month's new delinquencies. The largest was a $310.3 million office loan in Los Angeles. The multifamily rate climbed to 7.21%, followed by office, up 17 basis points to 12.33%.
If loans that are past their maturity date but current on interest were included, the rate would be 9.95%.`;
test('Trepp: overall, office and matured-loan rates from a monthly report', () => {
  assert.deepEqual(parseTrepp(TREPP), { date: '2026-10-01', overall: 7.87, office: 12.33, matured: 9.95 });
});
test('Trepp: page without a report returns nothing', () => {
  assert.equal(parseTrepp('Trepp blog about something else'), null);
});
test('Kastle: weekly national occupancy, weekly change and peak day', () => {
  const k = parseKastle('The Kastle Occupancy Barometer reported a national average occupancy of 56.5%, up 0.1 points from the previous week. Tuesday was the peak day nationally for all building classes, at 66.9%.', new Date('2026-11-18T12:00:00Z'));
  assert.equal(k.value, 56.5); assert.equal(k.prev, 56.4); assert.equal(k.peak, 66.9); assert.equal(k.date, '2026-11-09');
});
test('Kastle: missing figure throws so the app shows the source as down', () => {
  assert.throws(() => parseKastle('redesigned page'));
});
test('Numbeo: gross yields by country and survey period', () => {
  const html = `<title>Property Prices Index by Country 2026 Mid-Year</title><table><tr><td>1</td><td>United Kingdom</td><td>7.7</td><td>5.0</td><td>5.1</td><td>20.0</td><td>19.4</td><td>62.8</td><td>1.6</td></tr></table>`;
  const n = parseNumbeo(html);
  assert.equal(n.period, 'Mid-2026'); assert.equal(n.date, '2026-07-01');
  assert.deepEqual(n.c['United Kingdom'], { centre: 5.0, outside: 5.1 });
});

// news feed parsers
import { parseRss, parseTg } from '../netlify/functions/news.mjs';
test('RSS: Google News item keeps the publisher and drops its suffix', () => {
  const x = `<rss><channel><item><title>Gold hits record as dollar slides - Reuters</title><link>https://news.google.com/x</link><pubDate>Sun, 22 Nov 2026 21:00:00 GMT</pubDate><source url="https://reuters.com">Reuters</source></item></channel></rss>`;
  const [p] = parseRss(x, 'Reuters', 'metals');
  assert.equal(p.text, 'Gold hits record as dollar slides'); assert.equal(p.source, 'Reuters'); assert.deepEqual(p.cats, ['metals']); assert.equal(p.kind, 'headline');
});
test('RSS: CDATA titles and Atom entries', () => {
  const x = `<feed><entry><title><![CDATA[Fed&#8217;s Powell speaks]]></title><link href="https://a.b/c"/><updated>2026-11-22T10:00:00Z</updated></entry></feed>`;
  const [p] = parseRss(x, 'X');
  assert.equal(p.text, 'Fed’s Powell speaks'); assert.equal(p.link, 'https://a.b/c');
});
test('Telegram: post text, time and link', () => {
  const h = `<div class="tgme_widget_message_wrap"><div data-post="financialjuice/123"><div class="tgme_widget_message_text js-message_text">US CPI &amp; core<br/>beat</div><time datetime="2026-11-22T10:00:00+00:00"></time></div></div>`;
  const [p] = parseTg(h, 'financialjuice');
  assert.equal(p.text, 'US CPI & core\nbeat'); assert.equal(p.link, 'https://t.me/financialjuice/123');
});
