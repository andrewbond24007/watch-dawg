// Freddie Mac's weekly mortgage survey (PMMS). The history file can lag the release by weeks and has switched
// to quoted values, so the newest week is also read from the survey page itself, which updates at release time.
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
export function parsePmmsCsv(text, since = '2022-01-01') {
  return text.trim().split(/\r?\n/).slice(1).map((l) => l.split(',').map((c) => c.replace(/^\s*"|"\s*$/g, '').trim())).map(([d, v30, , v15]) => {
    const m = /(\d+)\/(\d+)\/(\d{4})/.exec(d || '');
    return m && v30 && !isNaN(+v30) ? [`${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`, +v30, v15 && !isNaN(+v15) ? +v15 : null] : null;
  }).filter((p) => p && p[0] >= since).sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
// the page carries schema.org data: "Average rates as of November 25, 2026", "30 - Year", "interestRate": "7.21"
export function parsePmmsPage(html) {
  const blocks = [...html.matchAll(/"description":\s*"Average rates as of ([A-Za-z]+) (\d{1,2}), (\d{4})",\s*"name":\s*"(\d+)\s*-\s*Year"[^}]*?"interestRate":\s*"([\d.]+)"/g)];
  if (!blocks.length) return null;
  const out = {};
  for (const b of blocks) {
    const mi = MONTHS.indexOf(b[1].toLowerCase()); if (mi < 0) continue;
    out.date = `${b[3]}-${String(mi + 1).padStart(2, '0')}-${b[2].padStart(2, '0')}`;
    if (b[4] === '30') out.v30 = +b[5]; if (b[4] === '15') out.v15 = +b[5];
  }
  // last week's figures, from the release wording ("... down from last week when it averaged 7.28%")
  const t = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const lw = (n) => { const m = new RegExp(`${n}-year fixed-rate mortgage\\s+averaged [\\d.]+%[^.]*?last week when it averaged ([\\d.]+)%`, 'i').exec(t); return m ? +m[1] : null; };
  out.prev30 = lw(30); out.prev15 = lw(15);
  return out.date && out.v30 ? out : null;
}
export async function freddieSeries(since = '2022-01-01', ms = 10000) {
  const [csv, page] = await Promise.all([
    fetch('https://www.freddiemac.com/pmms/docs/PMMS_history.csv', { headers: UA, signal: AbortSignal.timeout(ms) }).then((r) => r.ok ? r.text() : '').catch(() => ''),
    fetch('https://www.freddiemac.com/pmms', { headers: UA, signal: AbortSignal.timeout(ms) }).then((r) => r.ok ? r.text() : '').catch(() => ''),
  ]);
  const rows = parsePmmsCsv(csv, since), cur = parsePmmsPage(page);
  if (cur && (!rows.length || cur.date > rows.at(-1)[0])) {
    // when the history file is behind, fill last week from the release itself so week-on-week changes are right
    const prevDate = new Date(Date.parse(cur.date + 'T12:00:00Z') - 7 * 864e5).toISOString().slice(0, 10);
    if (cur.prev30 != null && !rows.some((r) => Math.abs(Date.parse(r[0]) - Date.parse(prevDate)) < 3 * 864e5)) rows.push([prevDate, cur.prev30, cur.prev15 ?? null]);
    rows.push([cur.date, cur.v30, cur.v15 ?? null]);
  }
  if (!rows.length) throw new Error('Freddie Mac unavailable');
  return rows;
}
