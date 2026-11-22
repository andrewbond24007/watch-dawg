import test from 'node:test';
import assert from 'node:assert/strict';
import { appendHistory, mergeHistory, updateStatus } from '../lib/history.mjs';

const doc = (v, date, extra = {}) => ({ sections: [{ id: 'cre', regions: [{ id: 'off_us', metrics: [{ id: 'off_occ', value: v, date, series: [], prev: null, yr: null, ...extra }] }] }] });
test('history gains one point per release and updates a same-day revision', () => {
  const h = {};
  assert.equal(appendHistory(doc(55, '2025-11-10'), h), 1);
  assert.equal(appendHistory(doc(55.5, '2025-11-10'), h), 0);
  assert.equal(appendHistory(doc(56, '2025-11-17'), h), 1);
  assert.deepEqual(h['cre/off_us/off_occ'], [['2025-11-10', 55.5], ['2025-11-17', 56]]);
});
test('older releases never overwrite newer history', () => {
  const h = { 'cre/off_us/off_occ': [['2026-11-09', 56.5]] };
  assert.equal(appendHistory(doc(50, '2026-10-01'), h), 0);
});
test('merge adds a trend line, previous value and a year-ago value', () => {
  const h = { 'cre/off_us/off_occ': [['2025-11-10', 54], ['2026-10-26', 56.2], ['2026-11-02', 56.4], ['2026-11-09', 56.5]] };
  const d = doc(56.5, '2026-11-09');
  mergeHistory(d, h);
  const m = d.sections[0].regions[0].metrics[0];
  assert.equal(m.series.length, 4); assert.equal(m.prev, 56.4); assert.equal(m.yr, 54);
});
test('merge leaves figures that already have their own history alone', () => {
  const d = doc(12.3, '2026-10-01', { series: [['2026-09-01', 12.1], ['2026-10-01', 12.3]], prev: 12.1, yr: 11.8 });
  mergeHistory(d, { 'cre/off_us/off_occ': [['2026-08-01', 1], ['2026-10-01', 2]] });
  const m = d.sections[0].regions[0].metrics[0];
  assert.equal(m.series.length, 2); assert.equal(m.yr, 11.8);
});
test('status remembers when a source started failing and when it last worked', () => {
  let s = updateStatus({}, {}, ['kastle'], '2026-11-20T10:00:00Z');
  s = updateStatus(s, { kastle: 'figure not found' }, ['kastle'], '2026-11-21T10:00:00Z');
  s = updateStatus(s, { kastle: 'figure not found' }, ['kastle'], '2026-11-22T10:00:00Z');
  assert.equal(s.sources.kastle.ok, false); assert.equal(s.sources.kastle.since, '2026-11-21T10:00:00Z'); assert.equal(s.sources.kastle.lastOk, '2026-11-20T10:00:00Z');
  s = updateStatus(s, {}, ['kastle'], '2026-11-23T10:00:00Z');
  assert.equal(s.sources.kastle.ok, true);
});
