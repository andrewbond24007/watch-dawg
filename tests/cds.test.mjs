import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCds, mergeCds } from '../lib/cds.mjs';
test('CDS levels are read from reports, changes are not', () => {
  assert.deepEqual(extractCds("Oracle's five-year credit default swap spread stands at 295 basis points, after briefly hitting 300 bps on Thursday."), [{ id: 'oracle', bp: 295 }]);
  assert.deepEqual(extractCds("Oracle's five-year credit-default-swap spread climbed to about 2.03 percentage points on July 20"), [{ id: 'oracle', bp: 203 }]);
  assert.deepEqual(extractCds('Oracle 5-year CDS widens by approximately 12 basis points.'), []);
  assert.deepEqual(extractCds('Oracle CDS jumps 12 bps to 139 bps'), [{ id: 'oracle', bp: 139 }]);
  assert.deepEqual(extractCds('CoreWeave 5Y CDS hits 720bp as AI trade unwinds'), [{ id: 'coreweave', bp: 720 }]);
  assert.deepEqual(extractCds('Meta and Amazon CDS both widened to 100 bps'), []); // two companies in one sentence
  assert.deepEqual(extractCds('Oracle shares rise 5% after earnings'), []);
});
test('CDS history keeps one point per company per day', () => {
  let h = mergeCds(null, [{ id: 'oracle', bp: 290, date: '2026-11-24T10:00:00Z', title: 'a', link: 'x', source: 'R' }], new Date('2026-11-25'));
  h = mergeCds(h, [{ id: 'oracle', bp: 300, date: '2026-11-24T15:00:00Z', title: 'b', link: 'y', source: 'B' }, { id: 'oracle', bp: 305, date: '2026-11-25T09:00:00Z', title: 'c', link: 'z', source: 'B' }], new Date('2026-11-25'));
  assert.deepEqual(h.names.oracle.points.map((p) => [p.date, p.bp]), [['2026-11-24', 300], ['2026-11-25', 305]]);
});
