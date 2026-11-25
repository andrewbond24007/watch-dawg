import test from 'node:test';
import assert from 'node:assert/strict';
import { fedPath, nextFreddie, FOMC, MPC, ECBM } from '../netlify/functions/rates.mjs';
test('Freddie Mac moves to Wednesday in Thanksgiving week', () => {
  assert.equal(nextFreddie(Date.parse('2026-11-23T11:00:00Z')), '2026-11-25T12:00:00-05:00');
  assert.equal(nextFreddie(Date.parse('2026-11-26T20:00:00Z')), '2026-12-03T12:00:00-05:00');
});
test('Fed path: a December futures average below the current rate reads as a partly priced cut', () => {
  const [p] = fedPath(3.88, { '2026-12': 3.80 }, ['2026-12-09T14:00:00-05:00']);
  assert.ok(p.cut > 0.4 && p.cut < 0.5, String(p.cut)); assert.equal(p.hike, 0);
});
test('Fed path: a late-month meeting uses the next month contract when it has no meeting', () => {
  const p = fedPath(3.88, { '2027-01': 3.86, '2027-02': 3.63 }, ['2027-01-27T14:00:00-05:00']);
  assert.equal(p[0].post, 3.63); assert.equal(p[0].cut, 1);
});
test('Meeting lists are in order and in the future-facing schedule', () => {
  for (const l of [FOMC, MPC, ECBM]) for (let i = 1; i < l.length; i++) assert.ok(Date.parse(l[i]) > Date.parse(l[i - 1]));
  assert.ok(!FOMC.some((d) => d.startsWith('2027-10-27')), 'October 2027 is strategy only');
});
import { readPoly } from '../netlify/functions/rates.mjs';
test('Polymarket: outcome odds summed into cut / hold / rise', () => {
  const ev = { slug: 'fed-decision-in-december-x', title: 'Fed Decision in December?', volume: 5e7, markets: [
    { groupItemTitle: '25 bps decrease', outcomePrices: '["0.0025","0.9975"]' }, { groupItemTitle: 'No change', outcomePrices: '["0.044","0.956"]' },
    { groupItemTitle: '25 bps increase', outcomePrices: '["0.935","0.065"]' }, { groupItemTitle: '50+ bps increase', outcomePrices: '["0.0225","0.9775"]' }] };
  const r = readPoly(ev);
  assert.equal(r.hike, 0.958); assert.equal(r.hold, 0.044); assert.equal(r.cut, 0.003); assert.equal(r.url, 'https://polymarket.com/event/fed-decision-in-december-x');
});
