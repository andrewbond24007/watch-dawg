/* ---------- crypto ---------- */
function coinMark(c){return c.g?esc(c.g):c.img?`<img src="${esc(c.img)}" alt="">`:esc((c.s||'?')[0]);}
function buildCrypto(){
 const box=$('crypto');box.innerHTML='';
 if(!W.crypto.length){box.innerHTML='<div class="hint">No coins yet. Tap the pencil to add some.</div>';return;}
 W.crypto.forEach(c=>{
  const d=document.createElement('button');d.className='coin';d.id='c-'+c.id;d.style.setProperty('--c',colorVar(c.c));
  d.setAttribute('aria-label',`${c.n}: open chart`);
  d.innerHTML=`<div class="mark" aria-hidden="true">${coinMark(c)}</div>
   <div><span class="nm">${esc(c.n)}</span><span class="tk">${esc(c.s)}</span></div>
   <div class="px num">—</div>
   <svg viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true"></svg>
   <div class="pill num">…</div>`;
  d.addEventListener('click',()=>openChart({kind:'crypto',...c}));
  box.appendChild(d);
  const cd=cryptoData[c.id]; if(cd) paint(c.id,cd.price,cd.pct,cd.spark);
 });
}
function spark(svg,arr,v){
 if(!arr||arr.length<2){svg.innerHTML='';return;}
 const step=Math.max(1,Math.floor(arr.length/70));const p=arr.filter((_,i)=>i%step===0);
 const mn=Math.min(...p),mx=Math.max(...p),r=mx-mn||1;
 const line=p.map((x,i)=>(i/(p.length-1)*100).toFixed(2)+','+(24-(x-mn)/r*22).toFixed(2)).join(' ');
 svg.innerHTML=`<polygon points="0,26 ${line} 100,26" fill="var(${v})" opacity=".14"/><polyline points="${line}" fill="none" stroke="var(${v})" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
}
function paint(id,price,ch,sp){
 const t=$('c-'+id);if(!t||price==null)return;
 t.className='coin '+(ch>0?'t-up':ch<0?'t-down':'');
 const px=t.querySelector('.px');
 if(prev[id]!==undefined&&price!==prev[id]&&!reduce){
  px.classList.remove('flash-up','flash-down');void px.offsetWidth;
  px.classList.add(price>prev[id]?'flash-up':'flash-down');
  setTimeout(()=>px.classList.remove('flash-up','flash-down'),1200);
 }
 prev[id]=price;px.textContent=money(price);
 t.querySelector('.pill').textContent=(ch>0?'▲ ':ch<0?'▼ ':'')+fmtPct(ch);
 if(sp)spark(t.querySelector('svg'),sp,sp[sp.length-1]>=sp[0]?'--up':'--down');
}
async function fromCoinGecko(ids){
 const r=await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids.join(','))}&sparkline=true&price_change_percentage=24h`);
 if(!r.ok)throw new Error('cg '+r.status);
 const mk=await r.json();if(!Array.isArray(mk)||!mk.length)throw new Error('cg empty');
 mk.forEach(m=>{cryptoData[m.id]={price:m.current_price,pct:m.price_change_percentage_24h??0,spark:m.sparkline_in_7d?.price,img:m.image};
  const c=W.crypto.find(x=>x.id===m.id);if(c&&!c.g&&!c.img&&m.image){c.img=m.image;saveW();buildCrypto();}
  paint(m.id,m.current_price,m.price_change_percentage_24h??0,m.sparkline_in_7d?.price);});
}
async function fromBinance(){
 const out=await Promise.all(W.crypto.map(async c=>{try{const r=await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol='+c.s.toUpperCase()+'USDT');if(!r.ok)return 0;const x=await r.json();
  cryptoData[c.id]={...(cryptoData[c.id]||{}),price:+x.lastPrice,pct:+x.priceChangePercent};paint(c.id,+x.lastPrice,+x.priceChangePercent,null);return 1;}catch(e){return 0;}}));
 if(!out.some(Boolean))throw new Error('bn');
}
async function loadCrypto(){
 const ids=W.crypto.map(c=>c.id);if(!ids.length)return;
 try{await fromCoinGecko(ids);}
 catch(e){try{await fromBinance();}catch(e2){$('updated').textContent='Feed unreachable';$('pulse').classList.add('stale');$('blocked').hidden=false;return;}}
 $('blocked').hidden=true;lastOk=Date.now();fresh();renderRecap();
 if(activeTab==='park')syncPark();
}
function fresh(){
 if(!lastOk)return;const s=Math.round((Date.now()-lastOk)/1000);
 $('updated').textContent=s<5?'Live':'Updated '+(s<60?s+'s':Math.floor(s/60)+'m')+' ago';
 $('pulse').classList.toggle('stale',s>120);
}

/* ---------- fear & greed ---------- */
let fngAt=0;
async function loadFng(){
 if(Date.now()-fngAt<30*60e3)return;
 try{
  const j=await fetch('https://api.alternative.me/fng/?limit=8').then(r=>r.json());
  const d=j.data;if(!d||!d.length)return;fngAt=Date.now();
  const v=+d[0].value, cls=d[0].value_classification, y=d[1]?+d[1].value:null, w=d[7]?+d[7].value:null;
  const cols=['#d03b3b','#ef7d32','#e8c22c','#8bc34a','#0ca30c'];
  const cx=74,cy=76,R=62;
  const pt=a=>[cx+R*Math.cos(a),cy-R*Math.sin(a)];
  let arcs='';for(let i=0;i<5;i++){const a1=Math.PI-i*Math.PI/5-0.03,a2=Math.PI-(i+1)*Math.PI/5+0.03;const[p1,q1]=pt(a1),[p2,q2]=pt(a2);
   arcs+=`<path d="M${p1.toFixed(1)} ${q1.toFixed(1)} A${R} ${R} 0 0 1 ${p2.toFixed(1)} ${q2.toFixed(1)}" stroke="${cols[i]}" stroke-width="13" fill="none" stroke-linecap="round"/>`;}
  const col=cols[Math.min(4,Math.floor(v/20))];
  const el=$('fng');el.hidden=false;
  el.innerHTML=`<svg viewBox="0 0 148 86" aria-hidden="true">${arcs}<g class="needle" style="transform:rotate(-90deg)"><path d="M${cx-4} ${cy} L${cx} ${cy-52} L${cx+4} ${cy} Z" fill="var(--ink)"/><circle cx="${cx}" cy="${cy}" r="6" fill="var(--ink)"/></g></svg>
   <div><div class="hint">Crypto Fear &amp; Greed</div><div class="val num" style="color:${col}">${v}</div><div class="cls">${esc(cls)}</div>
   <div class="hist num">${y!=null?`Yesterday ${y}`:''}${w!=null?` · Last week ${w}`:''}</div></div>`;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{const n=el.querySelector('.needle');if(n)n.style.transform=`rotate(${-90+v*1.8}deg)`;}));
 }catch(e){}
}

/* ---------- Twelve Data quotes (dog park) ---------- */
let qBusy=false,qRetryAt=0,liveMetal={},metalAt=0;
function usOpen(){const {ymd,mins}=etParts(new Date());return isTradingDay(ymd)&&mins>=570&&mins<closeMin(ymd);}
function quoteEvery(){const n=[...W.stocks,...W.metals].filter(x=>x.q).length;return usOpen()?(n<=8?5:10)*60e3:60*60e3;}
async function loadQuotes(force){
 if(!tdKey){qStatus='';renderKeyStatus();return;}
 const now=Date.now();
 if(qBusy||now<qRetryAt)return;
 if(!force&&now-quotesAt<quoteEvery()){renderKeyStatus();return;}
 if(force&&now-quotesAt<60e3)return;
 const syms=[...new Set([...W.stocks,...W.metals].map(x=>x.q).filter(Boolean))];
 if(!syms.length)return;
 qBusy=true;
 try{
  const j=await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(syms.join(','))}&apikey=${encodeURIComponent(tdKey)}`).then(r=>r.json());
  const top=j&&j.status==='error'&&!j[syms[0]];
  if(top){
   if(j.code===429){qRetryAt=Date.now()+65e3;qStatus='Twelve Data’s per-minute limit was hit, retrying in a minute';}
   else qStatus=j.message||'The data key was rejected';
  }else{
   const map=syms.length===1?{[syms[0]]:j}:j;let ok=0,miss=[];
   syms.forEach(k=>{const v=map[k];
    if(v&&v.status!=='error'&&v.percent_change!=null&&!isNaN(+v.percent_change)){quotes[k]={pct:+v.percent_change,price:+v.close,prev:+v.previous_close||null,open:!!v.is_market_open};ok++;}
    else if(v&&v.code===429){qRetryAt=Date.now()+65e3;miss.push(k);}
    else miss.push(k);});
   quotesAt=Date.now();store.set('wd.quotes',quotes);store.set('wd.quotesAt',quotesAt);
   qStatus=!ok?'No prices came back. Check the key':miss.length?'Not covered on the free plan: '+miss.join(', '):'';
  }
 }catch(e){qStatus='Couldn’t reach Twelve Data. Will retry';}
 qBusy=false;
 renderKeyStatus();updateMetalsLive();renderRecap();if(activeTab==='park')syncPark();
}
/* extended hours (pre-market / after hours) for US stocks, from Yahoo via the site's quotes helper.
   Twelve Data's free plan only gives regular-session prices. */
let extQ=store.get('wd.ext',{}),extAt=0;
const extSyms=()=>[...new Set(W.stocks.filter(s=>s.y&&!s.sym.startsWith('FOREXCOM:')).map(s=>s.y))];
function extSession(){const {ymd,mins}=etParts(new Date());if(!isTradingDay(ymd))return null;const c=closeMin(ymd);return mins>=240&&mins<570?'pre':mins>=c&&mins<(c===960?1200:1020)?'post':null;}
async function loadExtended(force){
 const syms=extSyms();if(!syms.length||location.protocol==='file:'){renderExt();return;}
 const every=usOpen()?30*60e3:extSession()?3*60e3:30*60e3;
 if(!force&&Date.now()-extAt<every){renderExt();return;}
 extAt=Date.now();
 try{const j=await fetch('/.netlify/functions/quotes?s='+encodeURIComponent(syms.join(','))).then(r=>r.json());
  for(const k of syms){const v=j[k];if(!v||v.error)continue;if(v.ext)extQ[k]={...v.ext,close:v.price};else delete extQ[k];}
  store.set('wd.ext',extQ);
 }catch(e){}
 renderExt();if(activeTab==='park')syncPark();
}
// shown only while the regular session is shut, and only for trades in the last 4 days
function extFor(it){if(!it||usOpen())return null;const e=extQ[it.y];if(!e||e.chg==null||Date.now()/1000-e.time>4*86400)return null;return e;}
const extLabel=e=>e.session==='pre'?'Pre-market':'After hours';
function renderExt(){document.querySelectorAll('[data-ext]').forEach(el=>{const s=W.stocks.find(x=>x.sym===el.dataset.ext),e=extFor(s);el.hidden=!e;
 if(e)el.innerHTML=`${extLabel(e)} <b class="${e.chg>0?'up':e.chg<0?'down':''}">${fmtPct(e.chg)}</b> <span>${money(e.price)}</span>`;});}
/* live metals: free gold-api.com spot price vs Twelve Data's previous close */
const metalCode=q=>{const m=/^(XAU|XAG|XPD|XPT)\/USD$/.exec(q||'');return m?m[1]:null;};
async function loadMetalsLive(){
 const list=W.metals.filter(m=>metalCode(m.q));if(!list.length)return;
 const res=await Promise.all(list.map(async m=>{try{const j=await fetch('https://api.gold-api.com/price/'+metalCode(m.q)).then(r=>r.json());return [m.q,+j.price];}catch(e){return [m.q,null];}}));
 let any=false;res.forEach(([q,price])=>{if(price){liveMetal[q]={...(liveMetal[q]||{}),price,at:Date.now()};any=true;}});
 if(any){metalAt=Date.now();updateMetalsLive();renderRecap();if(activeTab==='park')syncPark();}
}
function updateMetalsLive(){for(const q in liveMetal){const p=quotes[q]?.prev;liveMetal[q].pct=p&&liveMetal[q].price?(liveMetal[q].price/p-1)*100:null;}}
function pctFor(it){const q=it.q,l=liveMetal[q];if(q&&l&&l.pct!=null&&Date.now()-l.at<10*60e3)return l.pct;if(q&&quotes[q])return quotes[q].pct;const y=yq[it.y];return y&&y.pct!=null?y.pct:null;}
/* Yahoo prices via the site's own helper (/.netlify/functions/quotes) */
let yq=store.get('wd.yq',{}),yAt=0;
async function loadYahoo(){
 const syms=[...new Set([...W.stocks,...W.metals].filter(x=>x.y&&!(x.q&&quotes[x.q])).map(x=>x.y))];
 if(!syms.length||location.protocol==='file:')return;
 try{const j=await fetch('/.netlify/functions/quotes?s='+encodeURIComponent(syms.join(','))).then(r=>r.json());
  let any=false;for(const k in j){if(j[k]&&j[k].pct!=null){yq[k]=j[k];any=true;}}
  if(any){yAt=Date.now();store.set('wd.yq',yq);renderRecap();if(activeTab==='park')syncPark();}
 }catch(e){}
}
function ago(t){if(!t)return 'not yet';const m=Math.round((Date.now()-t)/60000);return m<1?'just now':m<60?m+' min ago':Math.round(m/60)+'h ago';}
function renderParkStatus(){
 const el=$('parkStatus');if(!el)return;
 const open=usOpen();
 const parts=[`<span><b>Crypto</b> live, ${ago(lastOk)}</span>`];
 if(W.metals.length)parts.push(`<span><b>Metals</b> ${metalAt&&Object.values(liveMetal).some(x=>x.pct!=null)?'gold live, '+ago(metalAt)+'; others every 2 min':'every 2 min, '+ago(yAt||quotesAt)}</span>`);
 if(W.stocks.length)parts.push(`<span><b>Stocks</b> ${!tdKey?'need a data key':open?'market open, '+ago(quotesAt)+', every 5 min':'Wall Street closed, showing the last session’s move ('+ago(quotesAt)+')'}</span>`);
 if(qStatus)parts.push(`<span class="bad">${esc(qStatus)}</span>`);
 el.innerHTML=parts.join('');
}
function renderKeyStatus(){
 const el=$('tdStatus');if(!el)return;
 if(!tdKey){el.className='status';el.textContent='No key saved. Stocks and metals show as sleeping dogs in the Dog park.';return;}
 const ago=quotesAt?Math.round((Date.now()-quotesAt)/60000):null;
 el.className='status'+(qStatus&&!quotesAt?' bad':'');
 el.textContent=(qStatus?qStatus+'. ':'')+(ago!=null?`Updated ${ago<1?'just now':ago+' min ago'}.`:'Not loaded yet.');
}

/* ---------- TradingView ---------- */
function tv(target,file,cfg,onfail){
 const c=document.createElement('div');c.className='tradingview-widget-container';
 const w=document.createElement('div');w.className='tradingview-widget-container__widget';c.appendChild(w);
 const s=document.createElement('script');s.type='text/javascript';s.async=true;
 s.src='https://s3.tradingview.com/external-embedding/'+file;s.textContent=JSON.stringify(cfg);
 s.onerror=()=>{onfail&&onfail();$('blocked').hidden=false;};
 c.appendChild(s);target.innerHTML='';target.appendChild(c);
}
const theme=()=>dark()?'dark':'light';
function mini(target,sym,c,name){
 const col=colorHex(c);
 tv(target,'embed-widget-mini-symbol-overview.js',{symbol:sym,width:'100%',height:'100%',locale:'en',dateRange:range,colorTheme:theme(),isTransparent:true,autosize:true,largeChartUrl:'',chartOnly:false,noTimeScale:true,trendLineColor:col,underLineColor:rgba(col,.18),underLineBottomColor:rgba(col,0)},
  ()=>{target.innerHTML=`<div class="tvfail">${esc(name)} chart can’t load in this viewer</div>`;});
}
function ingots(){
 const bar=(x,y)=>`<path d="M${x} ${y+14} L${x+28} ${y+14} L${x+24} ${y+4} L${x+4} ${y+4} Z" fill="var(--c)" stroke="rgba(0,0,0,.35)" stroke-width="1.2" stroke-linejoin="round"/><path d="M${x+4} ${y+4} L${x+24} ${y+4} L${x+21} ${y} L${x+7} ${y} Z" fill="var(--c)" stroke="rgba(0,0,0,.35)" stroke-width="1.2" stroke-linejoin="round"/><path d="M${x+4} ${y+4} L${x+24} ${y+4} L${x+21} ${y} L${x+7} ${y} Z" fill="#fff" opacity=".38"/><path d="M${x+7} ${y+7} L${x+18} ${y+7}" stroke="#fff" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round"/>`;
 return `<svg viewBox="0 0 62 46" aria-hidden="true">${bar(2,30)}${bar(32,30)}${bar(17,15)}</svg>`;
}
function stockBadge(s){return `<div class="badge">${ICONS[s.icon]?`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[s.icon]}</svg>`:''}<b>${esc(s.tk)}</b></div>`;}
function rowFor(item,kind,left){
 const r=document.createElement('div');r.className='row';r.style.setProperty('--c',colorVar(item.c));
 r.innerHTML=`${left}<div class="w"></div><button class="tap" aria-label="${esc(item.name||item.n)}: open chart"></button>`;
 r.querySelector('.tap').addEventListener('click',()=>openChart({kind,...item}));
 mini(r.querySelector('.w'),item.sym,item.c,item.name||item.n);
 return r;
}
function buildStocks(){const b=$('stocks');b.innerHTML='';if(!W.stocks.length)b.innerHTML='<div class="hint">No stocks yet. Tap the pencil to add some.</div>';W.stocks.forEach(s=>{const r=rowFor(s,'stock',stockBadge(s));if(!s.sym.startsWith('FOREXCOM:'))r.insertAdjacentHTML('beforeend',`<div class="ext" data-ext="${esc(s.sym)}" hidden></div>`);b.appendChild(r);});renderExt();}
function buildMetals(){const b=$('metals');b.innerHTML='';if(!W.metals.length)b.innerHTML='<div class="hint">No metals yet. Tap the pencil to add some.</div>';W.metals.forEach(m=>b.appendChild(rowFor(m,'metal',`<div class="metal">${ingots()}<b>${esc(m.n)}</b></div>`)));}
const tvCrypto=c=>c.tv||('BINANCE:'+c.s.toUpperCase()+'USDT');
function buildTape(){
 const all=[...W.stocks.map(s=>({proName:s.sym,title:s.name})),...W.crypto.filter(c=>!c.chart).map(c=>({proName:tvCrypto(c),title:c.n})),...W.metals.map(m=>({proName:m.sym,title:m.n}))];
 tv($('tape'),'embed-widget-ticker-tape.js',{symbols:all,showSymbolLogo:true,isTransparent:true,displayMode:'adaptive',colorTheme:theme(),locale:'en'});
}
$('range').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.r===range)return;
 range=b.dataset.r;[...$('range').children].forEach(x=>x.classList.toggle('on',x===b));buildStocks();buildMetals();});
