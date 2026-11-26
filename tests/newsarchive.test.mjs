import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeArchive } from '../lib/newsarchive.mjs';
const now = Date.parse('2026-11-26T02:00:00Z');
const p = (id, h, text = id) => ({ id, time: new Date(now - h * 3600e3).toISOString(), text });
test('archive keeps a week, drops duplicates and older stories', () => {
  const a = mergeArchive({ items: [p('a', 1), p('old', 200), p('b', 50)] }, [p('a', 1), p('c', 0.5)], now);
  assert.deepEqual(a.items.map((x) => x.id), ['c', 'a', 'b']);
});
test('long posts are trimmed', () => {
  const a = mergeArchive(null, [p('x', 1, 'y'.repeat(2000))], now);
  assert.equal(a.items[0].text.length, 600);
});
