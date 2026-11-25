/* ---------- tabs ---------- */
$('recap').addEventListener('click',()=>{store.set('wd.gate',gateDay());switchTab('park');setTimeout(()=>$('movers').scrollIntoView({behavior:'smooth',block:'start'}),350);});
document.querySelector('.tabbar').addEventListener('click',e=>{const b=e.target.closest('.tab');if(b)switchTab(b.dataset.tab);});
function switchTab(name){
 if(name===activeTab)return window.scrollTo({top:0,behavior:'smooth'});
 if(activeTab==='health')HFRESH.clear();
 if(activeTab==='rates')RFRESH.clear();
 if(activeTab==='news')ACTFRESH.clear();
 activeTab=name;buzz();
 document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected',t.dataset.tab===name));
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='v-'+name));
 window.scrollTo(0,0);
 if(name==='news'){renderNewsTab();loadCal();loadNews();clearNewsDot();}
 if(name==='park'){maybeGate();requestAnimationFrame(syncPark);loadQuotes();}
 else{const g=$('pgate');if(g&&!g.hidden&&!g.classList.contains('open')){g.hidden=true;document.body.style.overflow='';}}
 if(name==='rates'){rMarkSeen();renderRates();loadRates();loadRatesLive();}
 if(name==='health'){renderHealth();loadHealth();loadCal();loadHealthNews();}
}

/* ---------- editor ---------- */
let edKind='crypto',edIcon='',searchT=0;
$('editBtn').addEventListener('click',openEditor);
function openEditor(){buzz();$('tdKey').value=tdKey;renderKeyStatus();renderEditor();openSheet('editSheet');}
$('edSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;edKind=b.dataset.k;[...$('edSeg').children].forEach(x=>x.classList.toggle('on',x===b));renderEditor();});
function edLabel(kind,x){
 if(kind==='crypto')return `<span class="dot" style="--c:${colorVar(x.c)}">${x.g?esc(x.g):x.img?`<img src="${esc(x.img)}" alt="">`:esc(x.s[0])}</span><span class="nm">${esc(x.n)}<small>${esc(x.s)}</small></span>`;
 if(kind==='stocks')return `<span class="dot" style="--c:${colorVar(x.c)}">${ICONS[x.icon]?`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[x.icon]}</svg>`:esc(x.tk[0])}</span><span class="nm">${esc(x.name)}<small>${esc(x.sym)}</small></span>`;
 return `<span class="dot" style="--c:${colorVar(x.c)}"></span><span class="nm">${esc(x.n)}<small>${esc(x.sym)}</small></span>`;
}
function renderEditor(){
 const arr=W[edKind],list=$('edList');
 list.innerHTML=arr.length?arr.map((x,i)=>`<div class="ed-row">${edLabel(edKind,x)}
   <button class="mini" data-a="up" data-i="${i}" ${i?'':'disabled'} aria-label="Move up">↑</button>
   <button class="mini" data-a="down" data-i="${i}" ${i<arr.length-1?'':'disabled'} aria-label="Move down">↓</button>
   <button class="mini del" data-a="del" data-i="${i}" aria-label="Remove">✕</button></div>`).join(''):'<div class="ed-row hint">Nothing here yet. Add one below.</div>';
 const add=$('edAdd');
 if(edKind==='crypto'){
  add.innerHTML=`<h3>Add a coin</h3><div class="field"><input id="cSearch" placeholder="Search, e.g. Dogecoin or XRP" autocomplete="off" autocapitalize="off" spellcheck="false"></div><div class="card" id="cResults" style="margin-top:8px" hidden></div>`;
  $('cSearch').addEventListener('input',e=>{clearTimeout(searchT);const q=e.target.value.trim();if(q.length<2){$('cResults').hidden=true;return;}searchT=setTimeout(()=>searchCoins(q),350);});
 }else if(edKind==='stocks'){
  add.innerHTML=`<h3>Add a stock or index</h3><div class="field">
   <input id="sTicker" placeholder="Ticker, e.g. AAPL, TSLA or LSE:BARC" autocomplete="off" autocapitalize="characters" spellcheck="false">
   <input id="sName" placeholder="Name (optional), e.g. Apple">
   <div class="hint">Badge icon</div>
   <div class="chips" id="sIcons">${['',...Object.keys(ICONS)].map(k=>`<button class="chip ${k===edIcon?'on':''}" data-ic="${k}">${k?`<svg viewBox="0 0 24 24">${ICONS[k]}</svg>`:''}${k?k:'Ticker only'}</button>`).join('')}</div>
   <button class="btn" id="sAdd">Add to watchlist</button></div>`;
  $('sIcons').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;edIcon=b.dataset.ic;[...$('sIcons').children].forEach(x=>x.classList.toggle('on',x===b));});
  $('sAdd').addEventListener('click',addStock);
 }else{
  add.innerHTML=`<h3>Add a metal</h3><div class="chips">${METAL_PRESETS.map((m,i)=>`<button class="chip" data-p="${i}">+ ${esc(m.n)}</button>`).join('')}</div>
   <div class="field"><input id="mSym" placeholder="Or a TradingView symbol, e.g. OANDA:XPTUSD" autocomplete="off" autocapitalize="characters" spellcheck="false"><input id="mName" placeholder="Name"><button class="btn" id="mAdd">Add to watchlist</button></div>`;
  add.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click',()=>{const p=METAL_PRESETS[+b.dataset.p];if(W.metals.some(x=>x.sym===p.sym))return toast(p.n+' is already on your list');W.metals.push({...p});changed('metals',p.n+' added');}));
  $('mAdd').addEventListener('click',()=>{const sym=$('mSym').value.trim().toUpperCase(),n=$('mName').value.trim()||sym.split(':').pop();if(!sym)return toast('Enter a symbol first');
   W.metals.push({sym,n,c:PALETTE[W.metals.length%PALETTE.length],q:'',y:''});changed('metals',n+' added');});
 }
}
$('edList').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const i=+b.dataset.i,arr=W[edKind];
 if(b.dataset.a==='del'){const [x]=arr.splice(i,1);changed(edKind,(x.n||x.name)+' removed');return;}
 const j=b.dataset.a==='up'?i-1:i+1;if(j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];changed(edKind);});
async function searchCoins(q){
 const box=$('cResults');box.hidden=false;box.innerHTML='<div class="ed-row hint">Searching…</div>';
 try{const j=await fetch('https://api.coingecko.com/api/v3/search?query='+encodeURIComponent(q)).then(r=>r.json());
  const coins=(j.coins||[]).slice(0,8);
  if(!coins.length){box.innerHTML='<div class="ed-row hint">No coins found.</div>';return;}
  box.innerHTML=coins.map((c,i)=>`<button class="result" data-i="${i}">${c.thumb?`<img src="${esc(c.thumb)}" alt="">`:''}<span class="nm">${esc(c.name)} <small>${esc(c.symbol)}</small></span><span class="add">Add</span></button>`).join('');
  box.querySelectorAll('.result').forEach(b=>b.addEventListener('click',()=>{const c=coins[+b.dataset.i];
   if(W.crypto.some(x=>x.id===c.id))return toast(c.name+' is already on your list');
   W.crypto.push({id:c.id,n:c.name,s:(c.symbol||'').toUpperCase(),img:c.large||c.thumb,c:PALETTE[W.crypto.length%PALETTE.length]});
   $('cSearch').value='';box.hidden=true;changed('crypto',c.name+' added');}));
 }catch(e){box.innerHTML='<div class="ed-row hint">Search isn’t available right now.</div>';}
}
function addStock(){
 let sym=$('sTicker').value.trim().toUpperCase().replace(/\s+/g,'');if(!sym)return toast('Enter a ticker first');
 sym=sym.replace('-',':');const tk=sym.split(':').pop();const name=$('sName').value.trim()||tk;
 if(W.stocks.some(x=>x.sym===sym))return toast(tk+' is already on your list');
 const exch=sym.includes(':')?sym.split(':')[0]:'';
 const us=!exch||['NASDAQ','NYSE','AMEX','ARCA','BATS'].includes(exch);W.stocks.push({sym,tk,name,icon:edIcon,c:PALETTE[W.stocks.length%PALETTE.length],q:us?tk:'',y:us?tk:''});
 changed('stocks',name+' added');
}
function changed(kind,msg){
 saveW();buzz();renderEditor();if(msg)toast(msg);
 if(kind==='crypto'){buildCrypto();loadCrypto();}
 if(kind==='stocks')buildStocks();
 if(kind==='metals')buildMetals();
 clearTimeout(changed.t);changed.t=setTimeout(()=>{buildTape();if(kind!=='crypto'){loadQuotes(true);loadYahoo();}},800);
 if(activeTab==='park')syncPark();
}
$('tdSave').addEventListener('click',()=>{tdKey=$('tdKey').value.trim();store.set('wd.tdkey',tdKey);quotesAt=0;toast(tdKey?'Key saved':'Key removed');loadQuotes(true);});
$('resetBtn').addEventListener('click',()=>{if(!confirm('Reset your watchlist to the original list?'))return;W=clone(DEFAULTS);saveW();renderEditor();buildCrypto();buildStocks();buildMetals();buildTape();loadCrypto();loadQuotes(true);toast('Watchlist reset');});
