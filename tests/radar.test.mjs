import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRadar, radarLabel, light } from '../lib/radar.mjs';
const days = (n, f, step = 1) => { const out = [], t0 = Date.parse('2026-11-26') - n * 864e5; for (let i = 0; i <= n; i += step) out.push([new Date(t0 + i * 864e5).toISOString().slice(0, 10), f(i, n)]); return out; };
test('calm economy scores low, stressed scores high', () => {
  const calm = { curve: days(2000, () => 1.2), sahm: days(2000, () => 0.05, 30), hy: days(2000, () => 3.2), claims: days(2000, () => 220000, 7), nfci: days(2000, () => -0.5, 7), prob: days(2000, () => 1, 30) };
  const r = buildRadar(calm, Date.parse('2026-11-26'));
  assert.ok(r.score < 15, String(r.score)); assert.equal(r.label, 'Low'); assert.equal(r.signals.length, 6);
  const hot = { curve: days(2000, (i, n) => (i > n - 60 ? 0.3 : -0.8)), sahm: days(2000, () => 0.6, 30), hy: days(2000, (i, n) => (i > n - 30 ? 7.5 : 4)), claims: days(2000, (i, n) => (i > n - 30 ? 320000 : 210000), 7), nfci: days(2000, () => 0.6, 7), prob: days(2000, () => 60, 30) };
  const h = buildRadar(hot, Date.parse('2026-11-26'));
  assert.ok(h.score > 80, String(h.score)); assert.equal(h.signals.find((s) => s.id === 'curve').score >= 60, true, 'un-inverting curve flagged');
  assert.ok(h.history.length > 200);
});
test('labels and lights', () => { assert.equal(radarLabel(30), 'Moderate'); assert.equal(light(70), 'red'); });
