// The browser loads every /js file into one shared global scope. Compiling them together catches a name
// declared twice across files (which stops every script after it from running).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('front-end scripts compile together without clashing names', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const files = [...html.matchAll(/<script src="\/(js\/[\w-]+\.js)"/g)].map((m) => m[1]);
  assert.ok(files.length >= 8, 'found the script tags');
  const code = files.map((f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8')).join('\n;\n');
  assert.doesNotThrow(() => new vm.Script(code, { filename: 'all.js' }));
});
