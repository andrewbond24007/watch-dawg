const k = process.env.EIA_KEY;
for (const q of ['sort[0][column]=period&sort[0][direction]=desc&length=3', 'start=2026-09-18&sort[0][column]=period&sort[0][direction]=desc&length=20', 'start=2026-09-18&length=20', 'sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5']) {
  const t = Date.now();
  const j = await fetch(`https://api.eia.gov/v2/petroleum/stoc/wstk/data/?api_key=${k}&frequency=weekly&data[0]=value&facets[series][]=WCESTUS1&${q}`).then((r) => r.json()).catch((e) => ({ e: e.message }));
  console.log('EIADBG', q, Date.now() - t, 'ms', JSON.stringify(j?.response?.data?.map((x) => x.period) || j?.error || j).slice(0, 200), j?.response?.total);
}
