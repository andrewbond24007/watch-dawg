/* ---------- crypto ---------- */
function coinMark(c){if(c.img)return `<img src="${esc(c.img)}" alt="">`;const g=esc(c.g||(c.s||'?')[0]);
 // a minted coin: rim, raised face, embossed symbol and a shine
 return `<svg viewBox="0 0 44 44" class="coinart"><circle cx="22" cy="23" r="20.5" fill="rgba(0,0,0,.22)"/><circle cx="22" cy="21.5" r="20.5" fill="var(--c)"/><circle cx="22" cy="21.5" r="16" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="1.6"/><circle cx="22" cy="21.5" r="17.6" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.2"/><path d="M9 15 A14 14 0 0 1 22 6.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.4" stroke-linecap="round"/><text x="22" y="23" text-anchor="middle" dominant-baseline="central" class="cg" fill="rgba(0,0,0,.25)">${g}</text><text x="22" y="21.8" text-anchor="middle" dominant-baseline="central" class="cg" fill="#fff">${g}</text></svg>`;}
function buildCrypto(){
 const box=$('crypto');box.innerHTML='';
 if(!W.crypto.length){box.innerHTML='<div class="hint">No coins yet. Tap the pencil to add some.</div>';return;}
 W.crypto.forEach(c=>{
  const d=document.createElement('button');d.className='coin';d.id='c-'+c.id;d.style.setProperty('--c',colorVar(c.c));
  d.setAttribute('aria-label',`${c.n}: open chart`);
  d.innerHTML=`<div class="mark" aria-hidden="true">${coinMark(c)}</div>
   <div><span class="nm">${esc(c.n)}</span><span class="tk">${esc(c.s)}</span></div>
   <div class="px num">—</div>
   <svg class="spk" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true"></svg>
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
 if(sp)spark(t.querySelector('svg.spk'),sp,sp[sp.length-1]>=sp[0]?'--up':'--down');
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
  const v=+d[0].value, cls=d[0].value_classification, y=d[1]?+d[1].value:null, w=d[7]?+d[7].value:null;fngNow={v,cls};
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
// time slot shared by every device: a 5-minute slot while Wall Street is open, otherwise the last session's close
function lastSessionYmd(){const {ymd,mins}=etParts(new Date());if(isTradingDay(ymd)&&mins>=closeMin(ymd))return ymd;for(let n=1;n<=10;n++){const k=ymdAdd(ymd,-n);if(isTradingDay(k))return k;}return ymd;}
function quoteBucket(){return usOpen()?'o'+Math.floor(Date.now()/300e3):'c'+lastSessionYmd();}
let qBucket=store.get('wd.qbucket','');
// a Twelve Data price is stale when Wall Street is open and it's more than 12 minutes old; Yahoo stands in
const tdStale=q=>{const v=quotes[q];return !v||(usOpen()&&Date.now()-(v.at||quotesAt)>12*60e3);};
async function loadQuotes(force){
 const now=Date.now(),b=quoteBucket();
 if(qBusy||now<qRetryAt)return;
 const syms=[...new Set([...W.stocks,...W.metals].map(x=>x.q).filter(Boolean))].sort();
 if(!syms.length)return;
 if(b===qBucket&&syms.every(k=>quotes[k])){renderKeyStatus();return;}
 qBusy=true;
 try{
  const k=tdKey&&tdKey!==DEFAULT_TD_KEY?'&k='+encodeURIComponent(tdKey):'';
  const j=await fetch(`/.netlify/functions/td?s=${encodeURIComponent(syms.join(','))}&b=${b}${k}`).then(r=>r.json());
  if(j.error){qRetryAt=j.retryAt||Date.now()+65e3;qStatus=j.daily?'Twelve Data’s daily allowance is used up until midnight UTC, so prices come from Yahoo until then':j.code===429?'Twelve Data’s per-minute limit was hit, using Yahoo prices for now':j.error;}
  else{let ok=0,miss=[],lim=false;
   syms.forEach(s=>{const v=j.quotes[s];if(v&&!v.error){quotes[s]={...v,at:j.at};ok++;}else{miss.push(s);if(v&&v.code===429)lim=true;}});
   quotesAt=Date.now();store.set('wd.quotes',quotes);store.set('wd.quotesAt',quotesAt);
   if(!lim){qBucket=b;store.set('wd.qbucket',b);}else qRetryAt=Date.now()+65e3;
   qStatus=lim?'Twelve Data’s limit was hit, using Yahoo prices for now':!ok?'No prices came back. Check the key':miss.length?'Not covered on the free plan: '+miss.join(', '):'';}
 }catch(e){qStatus='Couldn’t reach Twelve Data. Using Yahoo prices';qRetryAt=Date.now()+65e3;}
 qBusy=false;
 renderKeyStatus();updateMetalsLive();renderRecap();if(activeTab==='park')syncPark();
 if(syms.some(tdStale))loadYahoo();
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
function pctFor(it){const q=it.q,l=liveMetal[q];if(q&&l&&l.pct!=null&&Date.now()-l.at<10*60e3)return l.pct;const y=yq[it.y];if(q&&quotes[q]&&!tdStale(q))return quotes[q].pct;if(y&&y.pct!=null)return y.pct;return q&&quotes[q]?quotes[q].pct:null;}
/* Yahoo prices via the site's own helper (/.netlify/functions/quotes) */
let yq=store.get('wd.yq',{}),yAt=0;
async function loadYahoo(){
 const syms=[...new Set([...W.stocks,...W.metals].filter(x=>x.y&&!(x.q&&!tdStale(x.q))).map(x=>x.y))];
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
/* illustrated stock tiles, drawn in the same style as the metal ingots: filled shapes in the asset's colour,
   a soft dark outline and white highlights */
const OL='stroke="rgba(0,0,0,.35)" stroke-width="1.2" stroke-linejoin="round"',HI='fill="#fff" opacity=".4"';
const ART={
 bars:()=>`<path d="M4 41h54" stroke="rgba(0,0,0,.35)" stroke-width="1.6" stroke-linecap="round"/>${[[7,26],[24,17],[41,6]].map(([x,y])=>`<rect x="${x}" y="${y}" width="13" height="${41-y}" rx="2" fill="var(--c)" ${OL}/><rect x="${x+2}" y="${y+2}" width="3" height="${37-y}" rx="1.5" ${HI}/>`).join('')}`,
 trend:()=>`<rect x="5" y="5" width="52" height="36" rx="6" fill="#fff" fill-opacity=".85" ${OL}/><path d="M11 34 L22 25 L30 29 L44 14 V34Z" fill="var(--c)" opacity=".28"/><path d="M11 34 L22 25 L30 29 L44 14" fill="none" stroke="var(--c)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M38 13 L46 12 L45 20" fill="none" stroke="var(--c)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
 chip:()=>`${[13,19,25,31].map(v=>`<rect x="${v+6}" y="3" width="3" height="6" rx="1" fill="#a9afb8" ${OL}/><rect x="${v+6}" y="37" width="3" height="6" rx="1" fill="#a9afb8" ${OL}/><rect x="10" y="${v-4}" width="6" height="3" rx="1" fill="#a9afb8" ${OL}/><rect x="46" y="${v-4}" width="6" height="3" rx="1" fill="#a9afb8" ${OL}/>`).join('')}<rect x="15" y="8" width="32" height="30" rx="4" fill="var(--c)" ${OL}/><rect x="22" y="14" width="18" height="18" rx="2" fill="#fff" opacity=".85"/><rect x="25" y="17" width="12" height="12" rx="1.5" fill="var(--c)" opacity=".55"/><path d="M18 11h8" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>`,
 ai:()=>`<path d="M31 23 L13 11 M31 23 L49 11 M31 23 L31 41 M13 11 L13 33 M49 11 L49 33 M13 33 L31 41 L49 33" stroke="var(--c)" stroke-width="2.6" stroke-linecap="round" opacity=".7"/>${[[13,11,5],[49,11,5],[13,33,5],[49,33,5],[31,41,4.5]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="var(--c)" ${OL}/>`).join('')}<circle cx="31" cy="23" r="9" fill="var(--c)" ${OL}/><circle cx="28" cy="20" r="3" ${HI}/>`,
 car:()=>`<path d="M4 31 Q4 25 10 24 L17 23 L24 15 Q26 13 29 13 L41 13 Q44 13 46 15 L52 22 Q58 23 58 28 L58 32 Q58 34 56 34 L6 34 Q4 34 4 31Z" fill="var(--c)" ${OL}/><path d="M26 16 L30 15.5 L30 22 L21 22.5Z" fill="#fff" opacity=".75"/><path d="M33 15.5 L41 15.5 Q43 15.5 44.5 17 L48 22 L33 22Z" fill="#fff" opacity=".75"/><path d="M34 25 L30 30 L33 30 L30 34 L36 28 L33 28 L35 25Z" fill="#fff" opacity=".9"/><path d="M8 27h6" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>${[16,46].map(x=>`<circle cx="${x}" cy="34" r="6.5" fill="#2c2433" ${OL}/><circle cx="${x}" cy="34" r="2.6" fill="#c9cdd3"/>`).join('')}`,
 phone:()=>`<rect x="18" y="2" width="26" height="42" rx="6" fill="var(--c)" ${OL}/><rect x="21" y="6" width="20" height="34" rx="3.5" fill="#fff" opacity=".88"/><rect x="27" y="7.5" width="8" height="2.6" rx="1.3" fill="var(--c)"/>${[[24,15],[31,15],[24,22],[31,22]].map(([x,y])=>`<rect x="${x}" y="${y}" width="5" height="5" rx="1.4" fill="var(--c)" opacity=".55"/>`).join('')}<path d="M22 37 L40 11" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>`,
 search:()=>`<path d="M37 30 L52 43" stroke="rgba(0,0,0,.35)" stroke-width="9" stroke-linecap="round"/><path d="M37 30 L52 43" stroke="var(--c)" stroke-width="7" stroke-linecap="round"/><circle cx="26" cy="20" r="15" fill="var(--c)" ${OL}/><circle cx="26" cy="20" r="10.5" fill="#fff" opacity=".9"/><path d="M19 16 Q21 12 26 11.5" fill="none" stroke="var(--c)" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>`,
 wafer:()=>`<defs><clipPath id="wfc"><circle cx="31" cy="23" r="17"/></clipPath></defs><circle cx="31" cy="23" r="19" fill="var(--c)" ${OL}/><g clip-path="url(#wfc)">${[...Array(36)].map((_,i)=>`<rect x="${11+(i%6)*7}" y="${3+Math.floor(i/6)*7}" width="5.4" height="5.4" rx=".8" fill="#fff" opacity="${.3+((i*7)%5)*.08}"/>`).join('')}</g><path d="M25 41.6 Q31 42.6 37 41.6" stroke="#fff" stroke-width="2" opacity=".7"/><path d="M17 12 Q22 6 30 5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>`,
 bank:()=>`<path d="M6 16 L31 4 L56 16Z" fill="var(--c)" ${OL}/><rect x="7" y="16" width="48" height="4" rx="1" fill="var(--c)" ${OL}/>${[11,22,33,44].map(x=>`<rect x="${x}" y="21" width="7" height="15" rx="1" fill="#fff" opacity=".85" ${OL}/>`).join('')}<rect x="4" y="36" width="54" height="6" rx="1.5" fill="var(--c)" ${OL}/><circle cx="31" cy="11.5" r="2.5" ${HI}/>`,
 oil:()=>`<path d="M31 3 C37 12 46 20 46 29 A15 15 0 0 1 16 29 C16 20 25 12 31 3Z" fill="var(--c)" ${OL}/><path d="M23 28 A8 8 0 0 0 28 36" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.6" stroke-linecap="round"/>`,
 cart:()=>`<path d="M4 7h7l5 22h30l5-17H14" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 7h7l5 22h30l5-17H14" fill="none" stroke="var(--c)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 13h35l-4 13H18Z" fill="var(--c)" opacity=".3"/>${[20,42].map(x=>`<circle cx="${x}" cy="37" r="4.5" fill="#2c2433" ${OL}/>`).join('')}`,
 globe:()=>`<circle cx="31" cy="23" r="19" fill="var(--c)" ${OL}/><ellipse cx="31" cy="23" rx="8" ry="19" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6"/><path d="M12 23h38M15 13h32M15 33h32" stroke="#fff" stroke-opacity=".55" stroke-width="1.6"/><path d="M18 12 Q23 6 30 5" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round"/>`,
 candles:()=>`${[[10,14,30,20,8,36],[27,8,22,4,16,30],[44,18,32,12,6,38]].map(([x,a,b,w1,w2,w3],i)=>`<path d="M${x+5} ${w2} V${w3}" stroke="rgba(0,0,0,.45)" stroke-width="1.6"/><rect x="${x}" y="${Math.min(a,b)}" width="10" height="${Math.abs(b-a)}" rx="1.5" fill="${i===1?'#fff':'var(--c)'}" ${OL}/>`).join('')}`
};
const shortName=s=>{const n=s.name||s.tk||'';return n.length<=10?n:(s.tk||n.slice(0,9));};
function stockBadge(s){const art=ART[s.icon]||ART.candles;return `<div class="metal stock"><svg viewBox="0 0 62 46" aria-hidden="true">${art()}</svg><b>${esc(shortName(s))}</b></div>`;}
function rowFor(item,kind,left){
 const r=document.createElement('div');r.className='row';r.style.setProperty('--c',colorVar(item.c));
 r.innerHTML=`${left}<div class="w"></div><button class="tap" aria-label="${esc(item.name||item.n)}: open chart"></button>`;
 r.querySelector('.tap').addEventListener('click',()=>openChart({kind,...item}));
 mini(r.querySelector('.w'),item.sym,item.c,item.name||item.n);
 return r;
}
/* compact list view: one line per asset, tap for the full TradingView chart */
let mview=store.get('wd.mview','charts');
function priceFor(it){const q=it.q,l=liveMetal[q];if(q&&l&&l.price!=null&&Date.now()-l.at<10*60e3)return l.price;if(q&&quotes[q]&&!tdStale(q))return quotes[q].price;const y=yq[it.y];if(y&&y.price!=null)return y.price;return q&&quotes[q]?quotes[q].price:null;}
const isIndex=s=>/^FOREXCOM:/.test(s.sym);
function crowVals(it,kind){const p=isIndex(it)?null:priceFor(it),pct=pctFor(it);
 return {p:p==null?(isIndex(it)?'Index':'—'):'$'+(+p).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),pct,cls:pct>0?'up':pct<0?'down':''};}
function crow(it,kind,badge){
 const r=document.createElement('button');r.className='crow';r.style.setProperty('--c',colorVar(it.c));r.dataset.key=kind+':'+(it.sym||it.n);
 r.setAttribute('aria-label',(it.name||it.n)+': open chart');
 r.innerHTML=`${badge}<span class="cn"><b>${esc(kind==='metal'?it.n:it.name)}</b><small>${esc(kind==='metal'?'per troy ounce':it.tk||'')}</small></span><span class="cp"><b class="num"></b><em class="chg"></em></span>${kind==='stock'&&!isIndex(it)?`<span class="cx" data-ext="${esc(it.sym)}"></span>`:''}`;
 r.addEventListener('click',()=>{buzz();openChart({kind,...it});});return r;}
function renderCompact(){if(mview!=='compact')return;
 [['stocks',W.stocks,'stock'],['metals',W.metals,'metal']].forEach(([id,list,kind])=>{const rows=$(id).querySelectorAll('.crow');list.forEach((it,i)=>{const r=rows[i];if(!r)return;const v=crowVals(it,kind);
  r.querySelector('.cp b').textContent=v.p;const e=r.querySelector('.cp em');e.textContent=v.pct==null?'—':(v.pct>0?'+':v.pct<0?'−':'')+Math.abs(v.pct).toFixed(2)+'%';e.className='chg '+v.cls;
  const x=r.querySelector('.cx');if(x){const t=extFor(it);x.innerHTML=t?`${esc(extLabel(t))} <b class="${t.chg>0?'up':t.chg<0?'down':''}">${t.chg>0?'+':t.chg<0?'−':''}${Math.abs(t.chg).toFixed(2)}%</b> $${(+t.price).toFixed(2)}`:'';x.hidden=!t;}});});}
function setMview(v){mview=v;store.set('wd.mview',v);document.body.classList.toggle('compact',v==='compact');const b=$('mview');b.setAttribute('aria-pressed',v==='compact');b.setAttribute('aria-label',v==='compact'?'Switch to charts':'Switch to compact list');buildStocks();buildMetals();}
$('mview').addEventListener('click',()=>{buzz();setMview(mview==='compact'?'charts':'compact');toast(mview==='compact'?'Compact list':'Charts');});
document.body.classList.toggle('compact',mview==='compact');
function buildStocks(){if(mview==='compact'){const b=$('stocks');b.innerHTML='';W.stocks.forEach(s=>b.appendChild(crow(s,'stock',stockBadge(s))));renderCompact();return;}const b=$('stocks');b.innerHTML='';if(!W.stocks.length)b.innerHTML='<div class="hint">No stocks yet. Tap the pencil to add some.</div>';W.stocks.forEach(s=>{const r=rowFor(s,'stock',stockBadge(s));if(!s.sym.startsWith('FOREXCOM:'))r.insertAdjacentHTML('beforeend',`<div class="ext" data-ext="${esc(s.sym)}" hidden></div>`);b.appendChild(r);});renderExt();}
function buildMetals(){if(mview==='compact'){const b=$('metals');b.innerHTML='';W.metals.forEach(m=>b.appendChild(crow(m,'metal',`<div class="metal">${ingots()}<b>${esc(m.n)}</b></div>`)));renderCompact();return;}const b=$('metals');b.innerHTML='';if(!W.metals.length)b.innerHTML='<div class="hint">No metals yet. Tap the pencil to add some.</div>';W.metals.forEach(m=>b.appendChild(rowFor(m,'metal',`<div class="metal">${ingots()}<b>${esc(m.n)}</b></div>`)));}
const tvCrypto=c=>c.tv||('BINANCE:'+c.s.toUpperCase()+'USDT');
/* the scrolling ticker under the clock: built from the app's own prices, so it shows instantly with no
   blank gap while a third-party widget loads. Tap an item for its chart. */
function tapePrice(o){if(o.item.kind==='crypto'){const d=cryptoData[o.item.id];return d&&d.price!=null?money(d.price):'';}
 if(o.item.kind==='stock'){const q=o.item.q&&quotes[o.item.q],y=yq[o.item.y];const p=q&&!tdStale(o.item.q)?q.price:y?.price??q?.price;return p!=null&&!/^(S&P|NDX)/.test(o.label)?'$'+(+p).toFixed(2):'';}
 return '';}
function tapeItems(){return parkItems().map(o=>`<button class="tk" data-k="${esc(o.key)}"><b>${esc(o.label)}</b><span class="tp num">${tapePrice(o)}</span><em class="${o.pct>0?'upt':o.pct<0?'dnt':''}">${o.pct==null?'—':(o.pct>0?'▲':o.pct<0?'▼':'')+Math.abs(o.pct).toFixed(2)+'%'}</em></button>`).join('');}
function buildTape(){const t=$('tape');const html=tapeItems();t.innerHTML=`<div class="track" style="--dur:${Math.max(24,parkItems().length*4.5)}s"><div class="run">${html}</div><div class="run" aria-hidden="true">${html}</div></div>`;}
function renderTape(){const t=$('tape');if(!t.querySelector('.track')){buildTape();return;}const m=Object.fromEntries(parkItems().map(o=>[o.key,o]));
 t.querySelectorAll('.tk').forEach(b=>{const o=m[b.dataset.k];if(!o)return;const em=b.querySelector('em'),tp=b.querySelector('.tp');const txt=o.pct==null?'—':(o.pct>0?'▲':o.pct<0?'▼':'')+Math.abs(o.pct).toFixed(2)+'%',cls=o.pct>0?'upt':o.pct<0?'dnt':'';if(em.textContent!==txt)em.textContent=txt;em.className=cls;const pr=tapePrice(o);if(tp.textContent!==pr)tp.textContent=pr;});}
$('tape').addEventListener('click',e=>{const b=e.target.closest('.tk');if(!b)return;const o=parkItems().find(x=>x.key===b.dataset.k);if(o){buzz();openChart(o.item);}});
$('range').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.r===range)return;
 range=b.dataset.r;[...$('range').children].forEach(x=>x.classList.toggle('on',x===b));buildStocks();buildMetals();});

/* ---------- Markets: today in brief ---------- */
let fngNow=null;
function marketBrief(){
 const el=$('mBrief');if(!el||typeof parkItems!=='function')return;
 const items=parkItems().filter(i=>i.pct!=null);if(!items.length){el.hidden=true;return;}
 const find=n=>items.find(i=>i.name===n||i.label===n);
 const spx=find('S&P 500'),ndx=find('Nasdaq 100'),btc=find('Bitcoin'),gold=find('Gold');
 const p1=v=>(v>0?'+':'−')+Math.abs(v).toFixed(1)+'%',dir=(v,u,d)=>v>=0.3?u:v<=-0.3?d:'flat';
 const parts=[];
 if(spx)parts.push(`stocks ${dir(spx.pct,'rose','fell')}${usOpen()?'':' in the last session'} (S&P 500 ${p1(spx.pct)}${ndx?`, Nasdaq ${p1(ndx.pct)}`:''})`);
 if(btc)parts.push(`crypto ${dir(btc.pct,'is up','is down')} (Bitcoin ${p1(btc.pct)})`);
 if(gold)parts.push(`gold ${p1(gold.pct)}`);
 const head=parts.length?parts.join(', ').replace(/^./,c=>c.toUpperCase())+'.':'';
 const sorted=items.slice().sort((a,b)=>b.pct-a.pct),best=sorted[0],worst=sorted.at(-1),bul=[];
 const reason=i=>{const r=pickReason(whyFor(i.item).direct);if(!r)return '';const b=calm(splitTag(r.text).body.split('\n')[0]);return ': '+(b.length>90?b.slice(0,87)+'…':b);};
 if(worst&&worst.pct<=-1)bul.push(`<li><b>Biggest faller</b> ${esc(worst.label)} ${p1(worst.pct)}${esc(reason(worst))}</li>`);
 if(best&&best.pct>=1&&best!==worst)bul.push(`<li><b>Biggest riser</b> ${esc(best.label)} ${p1(best.pct)}${esc(reason(best))}</li>`);
 const ah=W.stocks.map(s=>[s,extFor(s)]).filter(([,e])=>e&&Math.abs(e.chg)>=0.5);
 if(ah.length)bul.push(`<li><b>${extLabel(ah[0][1])}</b> ${ah.map(([s,e])=>`${esc(s.tk)} ${p1(e.chg)}`).join(', ')}</li>`);
 if(fngNow)bul.push(`<li><b>Crypto mood</b> ${esc(fngNow.cls)} (${fngNow.v}/100)</li>`);
 const mood=spx?spx.pct:btc?btc.pct:0,sig=mood>=0.3?'green':mood<=-0.3?'red':'amber';
 el.hidden=false;el.innerHTML=`<div class="bh"><span>📈 Today in brief</span><span class="sig ${sig}">${sig==='green'?'Risk on':sig==='red'?'Risk off':'Mixed'}</span></div>${head?`<p>${head}</p>`:''}${bul.length?`<ul>${bul.join('')}</ul>`:''}`;
}
