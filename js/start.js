/* ---------- start ---------- */
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{buildTape();buildStocks();buildMetals();if(chItem){drawChart();}});
clock();buildCrypto();buildStocks();buildMetals();buildTape();
loadCrypto();loadFng();loadQuotes();
setInterval(loadCrypto,30000);
setInterval(()=>{loadQuotes();loadFng();},60000);
setInterval(loadMetalsLive,30000);loadMetalsLive();
setInterval(loadYahoo,120000);loadYahoo();
loadNews();setInterval(()=>loadNews(),120000);setInterval(()=>{if(activeTab==='news'){loadCal();renderNewsTab();}},30000);
setInterval(()=>{if(activeTab==='park')renderParkStatus();},15000);
setInterval(()=>{if(activeTab==='health'){loadHealth();loadHealthNews();}},5*60e3);
setInterval(()=>{if(activeTab!=='health')loadHealth();},30*60e3);setTimeout(()=>{updateHealthDot();loadHealth();},4000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadHealth();});
$('parkRefresh').addEventListener('click',async e=>{const b=e.currentTarget;b.classList.remove('spin');void b.offsetWidth;b.classList.add('spin');buzz();await Promise.all([loadCrypto(),loadMetalsLive(),loadQuotes(true),loadYahoo()]);syncPark();toast('Prices refreshed');});
setInterval(()=>{clock();fresh();},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){loadCrypto();loadQuotes();loadFng();loadMetalsLive();loadYahoo();}});
