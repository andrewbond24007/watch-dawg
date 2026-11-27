import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStables } from '../lib/stables.mjs';
test('stablecoin supply: total, changes, trend, coins', () => {
  const t0 = Date.parse('2026-01-01') / 1000;
  const chart = Array.from({ length: 330 }, (_, i) => ({ date: String(t0 + i * 86400), totalCirculatingUSD: { peggedUSD: (300 - (i > 300 ? (i - 300) : 0)) * 1e9 } }));
  const list = [{ symbol: 'USDT', name: 'Tether', pegType: 'peggedUSD', circulating: { peggedUSD: 173.5e9 }, circulatingPrevMonth: { peggedUSD: 181.8e9 } }, { symbol: 'TINY', pegType: 'peggedUSD', circulating: { peggedUSD: 5e6 } }];
  const s = buildStables(chart, list, [], Date.parse('2026-11-27'));
  assert.equal(s.total, 271); assert.equal(s.d30, -29); assert.equal(s.trend, 'falling');
  assert.deepEqual(s.coins.map((c) => c.sym), ['USDT']); assert.equal(s.coins[0].d30, -8.3);
});
