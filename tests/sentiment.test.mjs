import test from 'node:test';
import assert from 'node:assert/strict';
import { itemScore, dayMood, updateMood, moodLabel } from '../lib/sentiment.mjs';
test('market words read the right way', () => {
  assert.ok(itemScore('Stocks surge to record high as Fed signals rate cut') > 0);
  assert.ok(itemScore('Bitcoin plunges 8% as liquidations pile up') < 0);
  assert.ok(itemScore('Treasury yields rise after hot inflation data') < 0, 'yields rising is bearish');
  assert.ok(itemScore('Inflation cools in October') > 0);
  assert.ok(itemScore('South Korea central bank hikes policy rate to 3.25%') < 0);
  assert.equal(itemScore('Uber names new head of India operations'), 0);
});
test('day score: bullish share, pulled towards 50 when thin', () => {
  const d = dayMood([{ text: 'Stocks surge' }, { text: 'Nasdaq rallies to record high' }, { text: 'Oil jumps on war fears' }]);
  assert.ok(d.s > 50 && d.s < 80, String(d.s));
  assert.equal(dayMood([]).s, 50);
  assert.equal(moodLabel(20), 'Very bearish'); assert.equal(moodLabel(50), 'Neutral'); assert.equal(moodLabel(80), 'Very bullish');
});
test('today is live; past search backfill gets replaced by the full feed', () => {
  const now = Date.parse('2026-11-26T12:00:00Z');
  const m = updateMood({ days: { '2026-11-25': { s: 40, n: 5, src: 'search' } } }, [{ time: '2026-11-25T10:00:00Z', text: 'Stocks surge' }, { time: '2026-11-26T10:00:00Z', text: 'Stocks plunge' }], now);
  assert.equal(m.days['2026-11-25'].src, 'feed'); assert.ok(m.days['2026-11-26'].live);
});
