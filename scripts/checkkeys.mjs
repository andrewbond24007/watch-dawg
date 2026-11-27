// Checks each optional API key (from the environment) against its service and prints OK or the error, never the key.
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const checks = {
  FINNHUB_KEY: async (k) => { const j = await (await fetch(`https://finnhub.io/api/v1/quote?symbol=NVDA&token=${k}`)).json(); if (!(j.c > 0)) throw new Error(JSON.stringify(j).slice(0, 80)); return `NVDA ${j.c}`; },
  BLS_KEY: async (k) => { const j = await (await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seriesid: ['CUUR0000SA0'], registrationkey: k, startyear: String(new Date().getFullYear()), endyear: String(new Date().getFullYear()) }) })).json(); if (j.status !== 'REQUEST_SUCCEEDED') throw new Error((j.message || []).join(' ').slice(0, 120)); return `CPI ${j.Results.series[0].data[0].year}-${j.Results.series[0].data[0].period} ${(j.message || []).join(' ').slice(0, 60)}`; },
  FRED_KEY: async (k) => { const j = await (await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${k}&file_type=json&observation_start=${day(-30)}`)).json(); if (!j.observations?.length) throw new Error(j.error_message || 'no data'); const o = j.observations.at(-1); return `30y mortgage ${o.value}% (${o.date})`; },
  BEA_KEY: async (k) => { const j = await (await fetch(`https://apps.bea.gov/api/data/?UserID=${k}&method=GetData&datasetname=NIPA&TableName=T10101&Frequency=Q&Year=${new Date().getFullYear()}&ResultFormat=JSON`)).json(); const d = j?.BEAAPI?.Results?.Data; if (!d?.length) throw new Error(JSON.stringify(j?.BEAAPI?.Results?.Error || j?.BEAAPI?.Error || j).slice(0, 140)); const g = d.filter((x) => /^gross domestic product$/i.test(x.LineDescription)).at(-1); return `GDP ${g?.TimePeriod} ${g?.DataValue}%`; },
  EIA_KEY: async (k) => { const j = await (await fetch(`https://api.eia.gov/v2/petroleum/stoc/wstk/data/?api_key=${k}&frequency=weekly&data[0]=value&facets[series][]=WCESTUS1&sort[0][column]=period&sort[0][direction]=desc&length=2`)).json(); const d = j?.response?.data; if (!d?.length) throw new Error(JSON.stringify(j?.error || j).slice(0, 120)); return `crude stocks ${d[0].value} (${d[0].period})`; },
};
for (const [name, fn] of Object.entries(checks)) {
  const k = process.env[name];
  if (!k) { console.log(`${name}: not set`); continue; }
  try { console.log(`${name}: OK (${await fn(k.trim())})`); } catch (e) { console.log(`${name}: FAILED ${e.message}`); }
}
