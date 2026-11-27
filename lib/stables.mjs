// Stablecoin supply (DefiLlama, no key): the dollars sitting inside crypto, ready to buy coins. New stablecoins are
// minted when money comes in and redeemed when it leaves, so the total works as crypto's own liquidity gauge.
const ymd = (t) => new Date(t).toISOString().slice(0, 10);
const asOf = (s, d) => { let r = null; for (const p of s) { if (p[0] <= d) r = p; else break; } return r; };
export function corr(a, b) {
  const n = Math.min(a.length, b.length); if (n < 10) return null;
  const mx = a.reduce((s, v) => s + v, 0) / n, my = b.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++) { sxy += (a[i] - mx) * (b[i] - my); sx += (a[i] - mx) ** 2; sy += (b[i] - my) ** 2; }
  return sx && sy ? +(sxy / Math.sqrt(sx * sy)).toFixed(2) : null;
}
// total circulating history [{date (unix s), totalCirculatingUSD:{peggedUSD}}] + coin list -> summary
export function buildStables(chart, list, btc = [], now = Date.now()) {
  const all = (chart || []).map((p) => [ymd(+p.date * 1000), (p.totalCirculatingUSD?.peggedUSD ?? p.totalCirculating?.peggedUSD ?? 0) / 1e9]).filter((p) => p[1] > 0).sort((a, b) => a[0].localeCompare(b[0]));
  if (all.length < 60) throw new Error('not enough stablecoin history');
  const last = all.at(-1), at = (days) => asOf(all, ymd(Date.parse(last[0]) - days * 864e5))?.[1] ?? null;
  const ch = (days) => { const v = at(days); return v ? +(last[1] - v).toFixed(1) : null; };
  const d30 = ch(30), trend = d30 == null ? 'steady' : d30 / last[1] > 0.02 ? 'rising' : d30 / last[1] < -0.02 ? 'falling' : 'steady';
  // weekly points over 3 years for the chart, bitcoin on the same days
  const start = ymd(now - 3 * 365 * 864e5), weekly = all.filter((p, i) => p[0] >= start && (i === all.length - 1 || new Date(p[0]).getUTCDay() === 3));
  const px = weekly.map((p) => asOf(btc, p[0])?.[1] ?? null);
  const d4 = weekly.map((p, i) => (i >= 4 ? p[1] - weekly[i - 4][1] : null)), b4 = px.map((p, i) => (i >= 4 && p && px[i - 4] ? (p / px[i - 4] - 1) * 100 : null));
  const pairs = d4.map((v, i) => [v, b4[i]]).filter(([a, b]) => a != null && b != null);
  const coins = (list || []).filter((c) => c.pegType === 'peggedUSD' && c.circulating?.peggedUSD > 1e9).map((c) => {
    const n = c.circulating.peggedUSD / 1e9, m = (c.circulatingPrevMonth?.peggedUSD || 0) / 1e9;
    return { sym: c.symbol, name: c.name, bn: +n.toFixed(1), d30: m ? +(n - m).toFixed(1) : null };
  }).sort((a, b) => b.bn - a.bn).slice(0, 6);
  return { updated: new Date(now).toISOString(), date: last[0], total: +last[1].toFixed(1), d7: ch(7), d30, d90: ch(90), d365: ch(365), trend,
    rows: weekly.map((p) => [p[0], +p[1].toFixed(1)]), btc: px.map((p) => (p == null ? null : Math.round(p))), corr: corr(pairs.map((p) => p[0]), pairs.map((p) => p[1])), coins };
}
export async function fetchStables(btc) {
  const get = (u) => fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (WatchDawg)' }, signal: AbortSignal.timeout(20000) }).then((r) => { if (!r.ok) throw new Error('DefiLlama ' + r.status); return r.json(); });
  const [chart, list] = await Promise.all([get('https://stablecoins.llama.fi/stablecoincharts/all'), get('https://stablecoins.llama.fi/stablecoins?includePrices=false')]);
  return buildStables(chart, list.peggedAssets, btc);
}
