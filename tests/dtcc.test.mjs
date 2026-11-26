import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCsv, printsFrom, levelOf, buildDaily, upfrontToSpread, dtccUrl } from '../lib/dtcc.mjs';

const rows = parseCsv(fs.readFileSync(new URL('./fixtures/dtcc-sample.csv', import.meta.url), 'utf8'));

test('url for a day', () => assert.match(dtccUrl('2026-11-24'), /SEC_CUMULATIVE_CREDITS_2026_11_24\.zip$/));
test('upfront converts to a spread', () => {
  assert.equal(Math.round(upfrontToSpread(0, 0.01, 5) * 1e4), 100);
  const s = upfrontToSpread(0.1, 0.01, 5) * 1e4; assert.ok(s > 320 && s < 380, String(s));
});
test('prints: tracked names only, five-year, loan swaps and terminations dropped', () => {
  const p = printsFrom(rows);
  assert.ok(p.oracle && p.nvidia && p.alphabet && p.amazon);
  assert.ok(!p.broadcom.q.some((v) => v < 5), 'mis-keyed 1 bp quote dropped');
});
test('levels match the quoted prints and known levels', () => {
  const d = buildDaily({ '2026-11-24': printsFrom(rows) }, { broadcom: [{ date: '2026-08-21', bp: 122 }] });
  const lv = (id) => d[id][0][1];
  assert.ok(Math.abs(lv('nvidia') - 143) < 3, String(lv('nvidia')));
  assert.ok(Math.abs(lv('alphabet') - 97) < 3);
  assert.ok(Math.abs(lv('amazon') - 99) < 3);
  assert.ok(lv('oracle') > 330 && lv('oracle') < 390, String(lv('oracle')));
  assert.ok(lv('broadcom') > 150, String(lv('broadcom')));
});
test('sign follows the previous level', () => {
  assert.equal(levelOf({ q: [], c: [[190, 20]] }, 30)[0], 20);
  assert.equal(levelOf({ q: [], c: [[190, 20]] }, 150)[0], 190);
});
test('a lone off-scale print is skipped and does not flip the next day', () => {
  const d = buildDaily({ '2026-11-17': { x: { q: [49], c: [] } }, '2026-11-18': { x: { q: [], c: [[13075, 13000]] } }, '2026-11-19': { x: { q: [], c: [[166, 52]] } } });
  assert.deepEqual(d.x.map((r) => r[1]), [49, 52]);
});
