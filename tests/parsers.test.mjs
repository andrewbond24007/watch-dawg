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

import { parseBeaHome, parseBeaPio } from '../netlify/functions/actuals.mjs';
test('BEA home page: GDP tile and the latest personal income release link', () => {
  const h = '<h3>Gross Domestic Product</h3><div>Q3 2026 (2nd)</div><div>+4.3%</div><a href="/news/2026/personal-income-and-outlays-october-2026">View</a>';
  const r = parseBeaHome(h);
  assert.deepEqual(r.gdp, { p: '2026-Q3', est: '2nd', v: 4.3 });
  assert.equal(r.pioLink, 'https://www.bea.gov/news/2026/personal-income-and-outlays-october-2026');
});
test('BEA personal income release: PCE and core PCE, month and year', () => {
  const h = '<h1>Personal Income and Outlays, October 2026</h1><p>From the preceding month, the PCE price index for October increased 0.3 percent . Excluding food and energy, the PCE price index also increased 0.3 percent. From the same month one year ago, the PCE price index for October increased 3.8 percent . Excluding food and energy, the PCE price index increased 3.3 percent from one year ago.</p><table><tr><td>PCE price index</td><td>0.5</td><td>0.3</td></tr><tr><td>PCE price index excluding food and energy</td><td>0.3</td><td>0.2</td></tr></table>';
  const r = parseBeaPio(h);
  assert.equal(r.p, '2026-10'); assert.equal(r.pceMoM, 0.3); assert.equal(r.corePceMoM, 0.2); assert.equal(r.pceYoY, 3.8); assert.equal(r.corePceYoY, 3.3);
});

import { parsePmmsCsv, parsePmmsPage } from '../lib/freddie.mjs';
test('Freddie Mac: quoted and unquoted history rows, and the survey page', () => {
  const csv = 'date,pmms30,pmms30p,pmms15\n11/3/2022,6.95, ,6.29\n"10/8/2026","7.4","","6.73","","",""\n';
  assert.deepEqual(parsePmmsCsv(csv), [['2022-11-03', 6.95, 6.29], ['2026-10-08', 7.4, 6.73]]);
  const page = '{ "@type": "FinancialProduct", "description": "Average rates as of November 25, 2026", "name": "30 - Year", "category": "Mortgage", "interestRate": "7.21" } { "@type": "FinancialProduct", "description": "Average rates as of November 25, 2026", "name": "15 - Year", "category": "Mortgage", "interestRate": "6.54" }';
  const txt = ' The 30-year fixed-rate mortgage &nbsp;averaged 7.21% as of November 25, 2026, down from last week when it averaged 7.28%. The 15-year fixed-rate mortgage &nbsp;averaged 6.54%, down from last week when it averaged 6.66%.';
  assert.deepEqual(parsePmmsPage(page + txt), { date: '2026-11-25', v30: 7.21, v15: 6.54, prev30: 7.28, prev15: 6.66 });
});
import { beaFromApi } from '../netlify/functions/actuals.mjs';
test('BEA API rows -> GDP and PCE changes', () => {
  const row = (line, t, v) => ({ LineDescription: line, TimePeriod: t, DataValue: String(v) });
  const g = { BEAAPI: { Results: { Data: [row('Gross domestic product', '2026Q2', 3.1), row('Gross domestic product', '2026Q3', 4.3), row('Personal consumption expenditures', '2026Q3', 2.0)] } } };
  const months = Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.UTC(2025, 8 + i, 1)); return `${d.getUTCFullYear()}M${String(d.getUTCMonth() + 1).padStart(2, '0')}`; });
  const p = { BEAAPI: { Results: { Data: months.flatMap((t, i) => [row('Personal consumption expenditures (PCE)', t, 100 * 1.003 ** i), row('PCE excluding food and energy', t, 100 * 1.002 ** i)]) } } };
  const o = beaFromApi(g, p);
  assert.deepEqual(o.gdp, { p: '2026-Q3', v: 4.3 });
  assert.equal(o.pio.p, '2026-10'); assert.equal(o.pio.pceMoM, 0.3); assert.equal(o.pio.corePceMoM, 0.2);
  assert.ok(Math.abs(o.pio.pceYoY - 3.66) < 0.02);
});
import { eiaEvents } from '../netlify/functions/calendar.mjs';
test('EIA weekly crude: last release with change, and the next date', () => {
  const ev = eiaEvents([{ period: '2026-11-20', value: '421500' }, { period: '2026-11-13', value: '424300' }]);
  assert.equal(ev[0].result, '-2.8M barrels'); assert.equal(ev[0].date.slice(0, 10), '2026-11-25'); assert.equal(ev[1].date.slice(0, 10), '2026-12-02');
});
