// Scheduled refresh (GitHub Actions, every 30 minutes): builds the Health, map and nowcast data,
// extends the history and records which sources are working. Output goes to the `data` branch,
// which the app reads through /data/... so it opens instantly instead of waiting on live sources.
import fs from 'node:fs';
import path from 'node:path';
import health from '../netlify/functions/health.mjs';
import housemap from '../netlify/functions/housemap.mjs';
import nowcast from '../netlify/functions/nowcast.mjs';
import rates, { FOMC, MPC, ECBM, US_CPI, EA_HICP } from '../netlify/functions/rates.mjs';
import { SCHEDULE, HEALTH } from '../netlify/functions/calendar.mjs';
import news, { parseRss } from '../netlify/functions/news.mjs';
import { CDS_NAMES, extractCds, mergeCds } from '../lib/cds.mjs';
import { mergeArchive } from '../lib/newsarchive.mjs';
import { earnings } from '../lib/earnings.mjs';
import { updateMood, dayMood, londonDay } from '../lib/sentiment.mjs';
// daily % change of the S&P 500 (by New York trading day) and bitcoin (by UTC day), keyed by date
async function marketMoves() {
  const out = {};
  for (const [k, sym] of [['spx', '^GSPC'], ['btc', 'BTC-USD']]) {
    const j = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=6mo&interval=1d`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) }).then((r) => r.json());
    const r = j.chart.result[0], ts = r.timestamp, c = r.indicators.quote[0].close, tz = k === 'spx' ? 'America/New_York' : 'UTC';
    let prev = null;
    ts.forEach((t, i) => { if (c[i] == null) return; const d = new Date(t * 1000).toLocaleDateString('en-CA', { timeZone: tz }); if (prev != null) (out[d] ||= {})[k] = +((c[i] / prev - 1) * 100).toFixed(2); prev = c[i]; });
  }
  return out;
}
// days before the archive began: score each from that day's market headlines on Google News (a few days per run)
async function backfillMood(mood) {
  const todo = [];
  for (let i = 1; i <= 120 && todo.length < 40; i++) { const d = londonDay(new Date(Date.now() - i * 864e5).toISOString()); if (!mood.days[d]) todo.push(d); }
  for (const d of todo) {
    const next = new Date(Date.parse(d + 'T12:00:00Z') + 864e5).toISOString().slice(0, 10), items = [];
    for (const q of ['stocks OR "stock market" OR "Wall Street"', 'bitcoin OR crypto OR markets OR Fed']) {
      try {
        const x = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(`${q} after:${d} before:${next}`)}&hl=en-US&gl=US&ceid=US:en`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) }).then((r) => r.text());
        for (const p of parseRss(x, 'Google News')) if (londonDay(p.time) === d) items.push(p);
      } catch (e) { /* try again next run */ }
      await new Promise((r) => setTimeout(r, 300));
    }
    if (items.length >= 15) mood.days[d] = { ...dayMood(items), src: 'search' };
  }
}
import { DTCC_NAMES, dtccUrl, parseCsv, printsFrom, buildDaily } from '../lib/dtcc.mjs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
// one day's DTCC credit trades, only the rows naming a tracked company (the files hold every credit swap)
const DTCC_RX = /oracle|coreweave|meta platforms|amazon|microsoft|alphabet|google|broadcom|nvidia|advanced micro|space exploration|6EC42L|239FAV|0C27GT|1C248K|6D76CM|0C5448/i;
async function dtccDay(ymd) {
  const r = await fetch(dtccUrl(ymd), { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60000) });
  if (r.status === 404 || r.status === 400) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.slice(0, 2).toString() !== 'PK') return null;
  const f = path.join(os.tmpdir(), `dtcc-${ymd}.zip`); fs.writeFileSync(f, buf);
  try {
    const text = execFileSync('unzip', ['-p', f], { maxBuffer: 1 << 30 }).toString();
    const lines = text.split('\n'); const keep = [lines[0], ...lines.slice(1).filter((l) => DTCC_RX.test(l))];
    return parseCsv(keep.join('\n'));
  } finally { fs.rmSync(f, { force: true }); }
}
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
      // news is shared through the edge cache (it calls Google, which throttles repeat callers); the rest are fetched fresh
      const bust = /functions\/news/.test(remotePath) ? '' : `${remotePath.includes('?') ? '&' : '?'}t=${Date.now()}`;
      const r = await fetch(`${BASE}${remotePath}${bust}`, { signal: AbortSignal.timeout(60000) });
      if (r.ok) return await r.json();
      console.warn(`remote ${remotePath} -> ${r.status}, building here instead`);
    } catch (e) { console.warn(`remote ${remotePath} failed (${e.message}), building here instead`); }
  }
  const r = await fn(new Request(url)); return r.json();
};

// FAST=1: the quick pass run between full refreshes (rates, odds and today's CDS trades only)
const FAST = process.env.FAST === '1';
const hist = read('history.json', {});
const newsKeys = [];
const errors = {};
const t0 = Date.now();

if (!FAST) {
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

}

// rates and money: central banks, Fed futures, yields, mortgages, inflation
try {
  // US CPI (BLS) only when a release is due or the copy is over 8 hours old: its keyless API allows ~25 calls a day
  const prevR = read('rates.json', null), pUs = (prevR?.inflation || []).filter((i) => i.id === 'uscpi' || i.id === 'uscore');
  const blsDue = !pUs.length || !prevR.blsAt || Date.now() - Date.parse(prevR.blsAt) > 8 * 3600e3 || pUs.some((i) => i.next && Date.parse(i.next) < Date.now());
  const q = blsDue ? '' : '?nobls=1';
  const r = await call(rates, 'https://watchdawg.local/' + q, '/.netlify/functions/rates' + q);
  if (!r.inflation?.some((i) => i.id === 'uscpi') && pUs.length) {
    r.inflation = [...pUs, ...(r.inflation || [])]; r.blsAt = prevR.blsAt;
    const fed = r.banks?.find((b) => b.id === 'fed'), c = pUs.find((i) => i.id === 'uscpi');
    if (fed && c) fed.real = +((fed.effective ?? fed.value) - c.value).toFixed(2);
  }
  for (const e of r.errors || []) { const [k, ...m] = String(e).split(': '); errors['rates:' + k] = m.join(': ') || e; }
  if (!r.banks?.length) throw new Error('no central-bank data');
  write('rates.json', r);
} catch (e) { errors['rates:all'] = String(e.message || e); }

// AI credit risk: 5-year CDS levels quoted in the news (app feed + a Google News search per company)
try {
  const found = [], seen = new Set();
  const take = (p, title) => { for (const f of extractCds(title)) { const k = f.id + f.bp + p.time.slice(0, 13); if (seen.has(k)) continue; seen.add(k); found.push({ ...f, date: p.time, title, link: p.link, source: p.source || p.src }); } };
  const feed = await call(news, 'https://watchdawg.local/', '/.netlify/functions/news').catch(() => ({ items: [] }));
  // a week of stories for the News tab (every pass, so fast Telegram channels don't slip past between runs)
  if (feed.items?.length) {
    const a = mergeArchive(read('news-archive.json', null), feed.items); write('news-archive.json', a);
    // daily news mood (bullish/bearish, 0-100) for the News tab calendar
    const mood = updateMood(read('news-mood.json', null), a.items);
    if (!FAST) await backfillMood(mood);
    // what markets actually did each day, to set beside the score
    try { const mv = await marketMoves(); for (const [d, m] of Object.entries(mv)) if (mood.days[d]) mood.days[d].mkt = m; } catch (e) { console.warn('market moves:', e.message); }
    write('news-mood.json', mood);
    console.log(`news archive: ${a.items.length} stories; mood today ${mood.days[londonDay(new Date().toISOString())]?.s ?? '-'}, ${Object.keys(mood.days).length} days`);
  }
  for (const p of FAST ? [] : feed.items || []) take(p, p.text);
  // news feeds that returned nothing (blocked, renamed or closed) show up in the source checks
  if (!FAST) for (const [k, n] of Object.entries(feed.sources || {})) { newsKeys.push('news:' + k); if (!n) errors['news:' + k] = 'no posts returned'; }
  if (!FAST) await Promise.all(CDS_NAMES.map(async ([, label]) => {
    // two searches per company over the last month; headlines and the related-coverage snippets are both read
    for (const q0 of [`"${label}" ("credit default swap" OR "credit-default swap" OR "default swaps") when:30d`, `"${label}" CDS (bps OR "basis points") when:30d`]) {
      try {
        const x = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q0)}&hl=en-US&gl=US&ceid=US:en`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) }).then((r) => r.text());
        for (const p of parseRss(x, 'Google News')) take(p, p.text);
        for (const it of x.split('<item>').slice(1)) {
          const when = (it.match(/<pubDate>([^<]+)/) || [])[1], link = (it.match(/<link>([^<]+)/) || [])[1];
          const desc = ((it.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
          if (!when || !desc) continue;
          for (const a of desc.split(/<li>/)) { const tt = a.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); if (tt) take({ time: new Date(when).toISOString(), link, source: 'Google News' }, tt); }
        }
      } catch (e) { /* one search failing is fine */ }
    }
  }));
  // first time only: fill in the past year from monthly Google News searches, so the charts have history
  const prevCds = read('cds.json', null);
  if (!FAST && !prevCds?.backfilled) {
    const months = []; for (let i = 13; i >= 1; i--) { const a = new Date(); a.setUTCDate(1); a.setUTCMonth(a.getUTCMonth() - i); const b = new Date(a); b.setUTCMonth(b.getUTCMonth() + 1); months.push([a.toISOString().slice(0, 10), b.toISOString().slice(0, 10)]); }
    for (const [, label] of CDS_NAMES) {
      for (const [a, b] of months) {
        const q = encodeURIComponent(`"${label}" ("credit default swap" OR "credit-default swap" OR CDS) (bps OR "basis points" OR "percentage points") after:${a} before:${b}`);
        try {
          const x = await fetch(`https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) }).then((r) => r.text());
          for (const p of parseRss(x, 'Google News')) take(p, p.text);
        } catch (e) { /* skip a month */ }
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  }
  const cds = mergeCds(prevCds, found);
  if (!prevCds?.backfilled) cds.backfilled = new Date().toISOString();
  // traded levels from DTCC's public swap tape: one file per day; the last few days are re-read each run (late
  // reports), and the past year is filled in a chunk per run so no single run takes long
  try {
    const days = read('cds-trades.json', {}); // raw daily prints, kept apart so the app's file stays small
    const want = [];
    for (let i = 0; i < 380; i++) { const d = new Date(Date.now() - i * 864e5); if (d.getUTCDay() % 6 === 0) continue; const ymd = d.toISOString().slice(0, 10); if (i < 4 || !(ymd in days)) want.push(ymd); }
    const todo = want.slice(0, FAST ? 2 : 30);
    let got = 0;
    for (let i = 0; i < todo.length; i += 5) {
      await Promise.all(todo.slice(i, i + 5).map(async (ymd) => {
        try {
          const rows = await dtccDay(ymd);
          if (rows) { days[ymd] = printsFrom(rows); got++; } else if (Date.now() - Date.parse(ymd) > 4 * 864e5) days[ymd] = {}; // holiday: no file
        } catch (e) { console.warn(`DTCC ${ymd}: ${e.message}`); }
      }));
    }
    write('cds-trades.json', days);
    const anchors = Object.fromEntries(Object.entries(cds.names).map(([id, v]) => [id, v.points || []]));
    const daily = buildDaily(days, anchors);
    for (const [id, s] of Object.entries(daily)) { const label = (DTCC_NAMES.find((x) => x[0] === id) || [])[1]; (cds.names[id] ||= { label, points: [] }).daily = s; }
    cds.dtccAt = new Date().toISOString();
    console.log(`CDS: DTCC ${got}/${todo.length} days read, ${Object.keys(days).length} stored, ${Object.keys(daily).length} companies with traded levels`);
  } catch (e) { errors['cds:dtcc'] = String(e.message || e); }
  write('cds.json', cds);
  console.log(`CDS: ${found.length} quotes found, ${Object.keys(cds.names).length} companies tracked`);
} catch (e) { errors['cds'] = String(e.message || e); }

// earnings dates and results for the tracked stocks (Yahoo), once per full refresh
if (!FAST) {
  try {
    const prev = read('earnings.json', { stocks: [], reports: {} }), now = Date.now(), list = await earnings(), reports = prev.reports || {};
    for (const p of list) {
      const was = (prev.stocks || []).find((x) => x.sym === p.sym), rs = (reports[p.sym] ||= []);
      // a report date that has passed becomes a result, filled in once Yahoo has the quarter's actual EPS
      for (const d of [was?.next, p.next]) if (d && Date.parse(d) < now && !rs.some((r) => Math.abs(Date.parse(r.date) - Date.parse(d)) < 5 * 864e5)) rs.push({ date: d, est: d === was?.next ? was.epsEst : p.epsEst });
      for (const r of rs) if (r.act == null) { const h = p.past.filter((x) => Date.parse(x.q) < Date.parse(r.date) && Date.parse(r.date) - Date.parse(x.q) < 120 * 864e5).at(-1); if (h) Object.assign(r, { act: h.act, est: h.est ?? r.est, surprise: h.surprise, period: h.period }); }
      reports[p.sym] = rs.filter((r) => now - Date.parse(r.date) < 400 * 864e5);
    }
    write('earnings.json', { updated: new Date().toISOString(), stocks: list, reports });
    console.log('earnings:', list.map((p) => `${p.sym} ${p.next?.slice(0, 10) || '?'}`).join(', '));
  } catch (e) { errors.earnings = String(e.message || e); console.warn('earnings:', e.message); }
}
if (!FAST) write('history.json', hist);
// release dates that are typed in by hand: warn (through the source checks) when a list is about to run out
const schedKeys = [];
for (const [k, list] of Object.entries({ 'schedule:us_releases': SCHEDULE.map((e) => e.date), 'schedule:health': HEALTH.map((e) => e.date), 'schedule:fomc': FOMC, 'schedule:mpc': MPC, 'schedule:ecb': ECBM, 'schedule:us_cpi': US_CPI, 'schedule:ea_hicp': EA_HICP })) {
  schedKeys.push(k);
  const last = Math.max(...list.map((d) => Date.parse(d)));
  if (last - Date.now() < 40 * 864e5) errors[k] = `dates run out on ${new Date(last).toISOString().slice(0, 10)}: add the next ones`;
}
// the data branch is only read through raw GitHub links: tell Vercel never to deploy it (each deploy counts
// towards the free plan's 100 a day)
fs.writeFileSync(path.join(dir, 'vercel.json'), JSON.stringify({ git: { deploymentEnabled: false } }));
const status = updateStatus(read('status.json', {}), errors, [...Object.keys(SOURCE_NAMES), ...newsKeys, ...schedKeys].filter((k) => !FAST || /^(rates:|cds)/.test(k)));
status.seconds = Math.round((Date.now() - t0) / 1000);
write('status.json', status);
const down = Object.entries(status.sources).filter(([, v]) => !v.ok);
console.log(`done in ${status.seconds}s; ${down.length} source(s) down: ${down.map(([k]) => k).join(', ') || 'none'}`);
