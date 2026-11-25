// Scheduled refresh (GitHub Actions, every 30 minutes): builds the Health, map and nowcast data,
// extends the history and records which sources are working. Output goes to the `data` branch,
// which the app reads through /data/... so it opens instantly instead of waiting on live sources.
import fs from 'node:fs';
import path from 'node:path';
import health from '../netlify/functions/health.mjs';
import housemap from '../netlify/functions/housemap.mjs';
import nowcast from '../netlify/functions/nowcast.mjs';
import rates from '../netlify/functions/rates.mjs';
import news, { parseRss } from '../netlify/functions/news.mjs';
import { CDS_NAMES, extractCds, mergeCds } from '../lib/cds.mjs';
import { appendHistory, mergeHistory, updateStatus, keepMissing, SOURCE_NAMES } from '../lib/history.mjs';

const dir = process.argv[2] || 'data-branch';
fs.mkdirSync(dir, { recursive: true });
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return d; } };
const write = (f, o) => fs.writeFileSync(path.join(dir, f), JSON.stringify(o));
// Sources are fetched by the live app on Vercel (some, like Land Registry, refuse GitHub's servers);
// if Vercel can't be reached the same code runs here instead.
const BASE = process.env.APP_URL || 'https://watch-dawg-78h1.vercel.app';
const call = async (fn, url, remotePath) => {
  if (remotePath) {
    try {
      const r = await fetch(`${BASE}${remotePath}${remotePath.includes('?') ? '&' : '?'}t=${Date.now()}`, { signal: AbortSignal.timeout(60000) });
      if (r.ok) return await r.json();
      console.warn(`remote ${remotePath} -> ${r.status}, building here instead`);
    } catch (e) { console.warn(`remote ${remotePath} failed (${e.message}), building here instead`); }
  }
  const r = await fn(new Request(url)); return r.json();
};

const hist = read('history.json', {});
const errors = {};
const t0 = Date.now();

// health: built without history, history extended, then merged back in
try {
  const h = await call(health, 'https://watchdawg.local/?nohist=1', '/.netlify/functions/health?nohist=1');
  if (!Array.isArray(h.sections)) throw new Error('no sections');
  const nErr = Object.keys(h.errors || {}).length;
  if (nErr > 10 && fs.existsSync(path.join(dir, 'health.json'))) { Object.assign(errors, h.errors); throw new Error(`${nErr} sources failed; keeping the last good copy`); }
  const added = appendHistory(h, hist);
  mergeHistory(h, hist);
  h.built = 'scheduled';
  // a figure that a flaky source leaves out this time keeps its last published value (it only changes when
  // the source publishes a new one), so the app doesn't flicker between showing and hiding it
  const kept = keepMissing(h, read('health.json', null));
  if (kept) console.log(`kept ${kept} figure(s) a source left out this time`);
  write('health.json', h);
  Object.assign(errors, h.errors || {});
  console.log(`health ok, ${added} new history points, errors: ${JSON.stringify(h.errors)}`);
} catch (e) { errors.health = String(e.message || e); console.error('health failed', e); }

// maps one at a time (Land Registry rate-limits bursts)
for (const a of ['uk', 'ni', 'us', 'ie', 'med']) {
  try {
    const m = await call(housemap, `https://watchdawg.local/?area=${a}`, `/.netlify/functions/housemap?area=${a}`);
    if (m.error) throw new Error(m.error);
    write(`housemap-${a}.json`, m);
  } catch (e) { errors[`map:${a}`] = String(e.message || e); }
}
try { const n = await call(nowcast, 'https://watchdawg.local/', '/.netlify/functions/nowcast'); if (n.error) throw new Error(n.error); write('nowcast.json', n); }
catch (e) { errors.nowcast = String(e.message || e); }

// rates and money: central banks, Fed futures, yields, mortgages, inflation
try {
  const r = await call(rates, 'https://watchdawg.local/', '/.netlify/functions/rates');
  for (const e of r.errors || []) { const [k, ...m] = String(e).split(': '); errors['rates:' + k] = m.join(': ') || e; }
  if (!r.banks?.length) throw new Error('no central-bank data');
  write('rates.json', r);
} catch (e) { errors['rates:all'] = String(e.message || e); }

// AI credit risk: 5-year CDS levels quoted in the news (app feed + a Google News search per company)
try {
  const found = [], seen = new Set();
  const take = (p, title) => { for (const f of extractCds(title)) { const k = f.id + f.bp + p.time.slice(0, 13); if (seen.has(k)) continue; seen.add(k); found.push({ ...f, date: p.time, title, link: p.link, source: p.source || p.src }); } };
  const feed = await call(news, 'https://watchdawg.local/', '/.netlify/functions/news').catch(() => ({ items: [] }));
  for (const p of feed.items || []) take(p, p.text);
  await Promise.all(CDS_NAMES.map(async ([, label]) => {
    const q = encodeURIComponent(`"${label}" ("credit default swap" OR "credit-default swap" OR CDS) when:14d`);
    try {
      const x = await fetch(`https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) }).then((r) => r.text());
      for (const p of parseRss(x, 'Google News')) take(p, p.text);
    } catch (e) { /* one company's search failing is fine */ }
  }));
  const cds = mergeCds(read('cds.json', null), found);
  write('cds.json', cds);
  console.log(`CDS: ${found.length} quotes found, ${Object.keys(cds.names).length} companies tracked`);
} catch (e) { errors['cds'] = String(e.message || e); }

write('history.json', hist);
// the data branch is only read through raw GitHub links: tell Vercel never to deploy it (each deploy counts
// towards the free plan's 100 a day)
fs.writeFileSync(path.join(dir, 'vercel.json'), JSON.stringify({ git: { deploymentEnabled: false } }));
const status = updateStatus(read('status.json', {}), errors, Object.keys(SOURCE_NAMES));
status.seconds = Math.round((Date.now() - t0) / 1000);
write('status.json', status);
const down = Object.entries(status.sources).filter(([, v]) => !v.ok);
console.log(`done in ${status.seconds}s; ${down.length} source(s) down: ${down.map(([k]) => k).join(', ') || 'none'}`);
