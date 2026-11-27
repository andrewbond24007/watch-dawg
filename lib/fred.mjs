// FRED (St. Louis Fed): official US data series, free key in FRED_KEY. Used as a backup when a source's own
// page or file can't be read, so a site redesign doesn't blank the figure.
export async function fredSeries(id, start = '2017-01-01', key = process.env.FRED_KEY) {
  if (!key) throw new Error('no FRED key');
  const j = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${encodeURIComponent(key)}&file_type=json&observation_start=${start}`, { signal: AbortSignal.timeout(7000) }).then((r) => r.json());
  const s = (j.observations || []).filter((o) => o.value !== '.' && o.value !== '').map((o) => [o.date, +o.value]);
  if (!s.length) throw new Error(`FRED ${id}: ${j.error_message || 'no data'}`);
  return s;
}
// try the source first, FRED if it fails (and there is a key)
export const orFred = async (primary, backup) => { try { return await primary(); } catch (e) { if (!process.env.FRED_KEY) throw e; try { return await backup(); } catch { throw e; } } };
