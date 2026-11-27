import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTd } from '../lib/earnings.mjs';
test('next report and past results from Twelve Data', () => {
  const j = { earnings: [{ date: '2027-02-25', time: 'After Hours', eps_estimate: '1.50', eps_actual: null }, { date: '2026-11-19', time: 'After Hours', eps_estimate: '1.25', eps_actual: '1.30' }] };
  const p = parseTd('NVDA', j, Date.parse('2026-11-27'));
  assert.equal(p.next, '2027-02-25'); assert.equal(p.epsEst, 1.5); assert.equal(p.past[0].surprise, 4);
});
test('unscheduled next report is estimated ~13 weeks on', () => {
  const p = parseTd('AAPL', { earnings: [{ date: '2026-11-02', eps_estimate: '1.98', eps_actual: '2.10' }] }, Date.parse('2026-11-27'));
  assert.equal(p.next, '2027-02-01'); assert.ok(p.estimated);
});
import { parseFinnhub } from '../lib/earnings.mjs';
test('Finnhub calendar maps to the same shape', () => {
  const p = parseFinnhub('NVDA', { earningsCalendar: [{ date: '2027-02-24', hour: 'amc', epsEstimate: 1.6, epsActual: null }, { date: '2026-11-18', hour: 'amc', epsEstimate: 1.25, epsActual: 1.31 }] }, Date.parse('2026-11-27'));
  assert.equal(p.next, '2027-02-24'); assert.equal(p.time, 'After Hours'); assert.equal(p.past[0].act, 1.31);
});
