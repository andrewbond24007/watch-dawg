const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const T = (ms) => AbortSignal.timeout(ms);
const Z = 'https://files.zillowstatic.com/research/public_csvs/';
const zrow = (t) => { const l = t.split('\n'); const h = l[0].split(','); const us = (l.find((x) => /United States/.test(x)) || '').split(','); return `cols ${h.length} last=${h.at(-1)} US: ${us.slice(-3).join(',')}`; };
const P = {
  z_pending: [Z + 'new_pending/Metro_new_pending_uc_sfrcondo_sm_month.csv', zrow],
  z_newlist: [Z + 'new_listings/Metro_new_listings_uc_sfrcondo_sm_month.csv', zrow],
  z_invt: [Z + 'invt_fs/Metro_invt_fs_uc_sfrcondo_sm_month.csv', zrow],
  z_cut: [Z + 'perc_listings_price_cut/Metro_perc_listings_price_cut_uc_sfrcondo_sm_month.csv', zrow],
  z_dtp: [Z + 'mean_doz_pending/Metro_mean_doz_pending_uc_sfrcondo_sm_month.csv', zrow],
  z_sales: [Z + 'sales_count_now/Metro_sales_count_now_uc_sfrcondo_month.csv', zrow],
  redfin_nat: ['https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/us_national_market_tracker.tsv000.gz', (t, r) => `${r.headers.get('content-type')} ${t.length}b`],
  redfin_wk: ['https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_covid19/weekly_housing_market_data_most_recent.tsv000', (t) => t.split('\n')[0].slice(0, 900)],
  hmrc: ['https://www.gov.uk/government/statistics/monthly-property-transactions-completed-in-the-uk-with-value-40000-or-above', (t) => [...new Set([...t.matchAll(/href="([^"]+\.(?:ods|xlsx|csv))"/g)].map((m) => m[1]))].slice(0, 5).join(' | ') + ' || ' + [...new Set([...t.matchAll(/href="(\/government\/statistics\/[^"]*property-transactions[^"]*)"/g)].map((m) => m[1]))].slice(0, 4).join(' | ')],
};
export const GET = async () => {
  const out = {};
  await Promise.all(Object.entries(P).map(async ([k, [u, f]]) => {
    const s = Date.now();
    try { const r = await fetch(u, { headers: UA, signal: T(14000) }); const t = k === 'redfin_nat' ? new Uint8Array(await r.arrayBuffer()) : await r.text(); out[k] = `${r.status} ${Date.now() - s}ms :: ` + (r.ok ? f(t, r) : String(t).slice(0, 120)); }
    catch (e) { out[k] = 'ERR ' + String(e.cause?.code || e.message).slice(0, 140); }
  }));
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
};
