import test from 'node:test';
import assert from 'node:assert/strict';
import { netLiquidity, buildLiquidity, corr } from '../lib/liquidity.mjs';
const weeks = (n, f) => Array.from({ length: n }, (_, i) => [new Date(Date.parse('2026-11-25') - (n - 1 - i) * 7 * 864e5).toISOString().slice(0, 10), f(i)]);
test('net liquidity = Fed balance sheet - TGA - reverse repo, in $bn', () => {
  const r = netLiquidity({ walcl: [['2026-11-25', 6600000]], tga: [['2026-11-25', 850000]], rrp: [['2026-11-24', 150]] });
  assert.deepEqual(r[0], { d: '2026-11-25', fed: 6600, tga: 850, rrp: 150, net: 5600 });
});
test('trend, changes and asset tracking', () => {
  const src = { walcl: weeks(120, (i) => 6500000 + i * 5000), tga: weeks(120, () => 800000), rrp: weeks(120, () => 100) };
  const L = buildLiquidity(src, { spx: weeks(120, (i) => 5000 + i * 4) }, Date.parse('2026-11-26'));
  assert.equal(L.w13, 65); assert.equal(L.trend, 'steady'); assert.equal(L.assets.spx.px.length, L.rows.length);
  assert.equal(corr([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]), 1);
});
