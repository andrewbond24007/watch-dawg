import test from 'node:test';
import assert from 'node:assert/strict';
import { quarterly, buildCapex, calQ } from '../lib/capex.mjs';
test('year-to-date cash flow becomes quarters', () => {
  const f = (start, end, val, form = '10-Q', filed = end) => ({ start, end, val, form, filed });
  const q = quarterly([f('2025-07-01', '2025-09-30', 20e9), f('2025-07-01', '2025-12-31', 45e9), f('2025-07-01', '2026-03-31', 72e9), f('2025-07-01', '2026-06-30', 100e9, '10-K'), f('2025-07-01', '2025-12-31', 46e9, '10-Q', '2026-02-01')]);
  assert.deepEqual(q, [['2025-09-30', 20], ['2025-12-31', 26], ['2026-03-31', 26], ['2026-06-30', 28]]);
});
test('calendar quarters, totals and growth', () => {
  assert.equal(calQ('2026-11-30'), '2026-Q4'); assert.equal(calQ('2026-08-31'), '2026-Q3'); assert.equal(calQ('2026-09-30'), '2026-Q3');
  const mk = (base) => ['2025-03-31', '2025-06-30', '2025-09-30', '2025-12-31', '2026-03-31', '2026-06-30', '2026-09-30'].map((d, i) => [d, base + i]);
  const c = buildCapex({ microsoft: mk(20), alphabet: mk(15), amazon: mk(25) }, Date.parse('2026-11-27'));
  assert.equal(c.latest, '2026-Q3'); assert.equal(c.latestTotal, 78); assert.equal(c.yoy, 18);
});
