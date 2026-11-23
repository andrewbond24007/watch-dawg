// market clock rules from js/clock.js, run against fixed dates (UK time)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const code = fs.readFileSync(new URL('../js/clock.js', import.meta.url), 'utf8');
function clockAt(iso) {
  process.env.TZ = 'Europe/London';
  const Real = Date, fixed = new Real(iso).getTime();
  class D extends Real { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } }
  const els = {}; const $ = (id) => (els[id] ||= { innerHTML: '', textContent: '', className: '', appendChild() {}, querySelector() { return null; } });
  const doc = { createElement: () => ({ style: {} }), getElementById: () => null };
  return new Function('Date', '$', 'document', 'getComputedStyle', 'window', `${code}; clock(); return {
    state: $('state').innerHTML.replace(/<[^>]+>/g, ''), countdown: $('countdown').textContent, open: $('lamp').className.includes('open'),
    sess: $('futs').textContent };`)(D, $, doc);
}
test('Sunday afternoon: closed for the weekend, opens tomorrow, futures open tonight', () => {
  const c = clockAt('2026-11-22T16:41:00Z');
  assert.equal(c.state, 'Wall Street is closed for the weekend'); assert.equal(c.countdown, 'Opens tomorrow 14:30'); assert.equal(c.open, false);
  assert.match(c.sess, /Futures open in 6h 19m/);
});
test('Monday during the session: open, closes in the evening', () => {
  const c = clockAt('2026-11-23T15:00:00Z');
  assert.equal(c.open, true); assert.match(c.countdown, /^Closes in 6h 00m$/);
});
test('Wednesday before Thanksgiving: warns that tomorrow is closed', () => {
  assert.match(clockAt('2026-11-25T15:00:00Z').state, /closed tomorrow for Thanksgiving/);
});
test('Thanksgiving: closed for the holiday, futures trade until 1pm New York', () => {
  const c = clockAt('2026-11-26T15:00:00Z');
  assert.equal(c.state, 'Wall Street is closed for Thanksgiving'); assert.equal(c.open, false);
  assert.match(c.sess, /Futures pause in 3h 00m/);
});
test('Day after Thanksgiving: early close at 1pm New York (18:00 UK)', () => {
  const c = clockAt('2026-11-27T15:00:00Z');
  assert.match(c.state, /closes early today/); assert.equal(c.countdown, 'Closes in 3h 00m');
});
test('Christmas Day: futures shut all day', () => {
  assert.doesNotMatch(clockAt('2026-12-25T15:00:00Z').sess, /Futures (trading|pause)/);
});
test('Just after UK midnight on Sunday night: bar still shows Monday sessions', () => {
  // band children are created via document.createElement; count them through a stub
  process.env.TZ = 'Europe/London';
  const code2 = fs.readFileSync(new URL('../js/clock.js', import.meta.url), 'utf8');
  const Real = Date, fixed = new Real('2026-11-23T00:31:00Z').getTime();
  class D extends Real { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } }
  const kids = []; const els = {}; const $ = (id) => (els[id] ||= { innerHTML: '', textContent: '', className: '', appendChild(c) { if (id === 'band') kids.push(c); }, querySelector() { return null; } });
  new Function('Date', '$', 'document', 'getComputedStyle', 'window', `${code2}; clock();`)(D, $, { createElement: () => ({ style: {} }), getElementById: () => null });
  const open = kids.find((k) => k.style.background === 'var(--reg)');
  assert.ok(open, 'regular session drawn'); assert.equal(open.style.left, (870 / 14.4) + '%'); // 14:30 UK
});
