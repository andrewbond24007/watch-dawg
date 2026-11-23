/* ---------- news + big events (own cards) ---------- */
let NEWS={items:[],at:0,busy:false,err:false},CAL={events:[],at:0,busy:false,err:false},newsMode='calendar';
const SRC={WatcherGuru:{n:'Watcher Guru',c:'#d99a00',i:'WG'},WalterBloomberg:{n:'Walter Bloomberg',c:'#2f6fde',i:'WB'},financialjuice:{n:'FinancialJuice',c:'#e2462f',i:'FJ'},marketfeed:{n:'Market Feed',c:'#15806b',i:'MF'},unfolded:{n:'Unfolded',c:'#8a4fd8',i:'UF'},bwenews:{n:'BWEnews',c:'#c2410c',i:'BW'},cointelegraph:{n:'Cointelegraph',c:'#3d8f3d',i:'CT'}};
const CRYPTO_RX=/\$(BTC|ETH|SOL|XRP|DOGE|BNB|ADA|USDT|USDC|LKY)\b|bitcoin|ethereum|solana|luckycoin|crypto|stablecoin|binance|coinbase|blockchain|memecoin|tokeni[sz]/i;
function timeAgo(t){const s=(Date.now()-new Date(t))/1000;if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}
function richText(t){return esc(t).replace(/(\$[A-Z]{2,6})\b/g,'<b class="cash">$1</b>').replace(/([+\-−]?\d[\d,]*(?:\.\d+)?%)/g,'<b>$1</b>').replace(/\n/g,'<br>');}
// shouty ALL-CAPS posts -> sentence case (acronyms, tickers and well-known names keep their capitals)
const KEEPUP=new Set(['US','UK','EU','AI','VIX','S&P','ETF','ETFS','CPI','GDP','PCE','PPI','ECB','BOE','BOJ','PBOC','RBA','SNB','IPO','CEO','CFO','SEC','IMF','OPEC','OPEC+','NFP','FOMC','NYSE','USD','GBP','EUR','JPY','CNY','BTC','ETH','SOL','NVDA','ANT','TSMC','TSM','AMD','QQQ','SPY','DXY','LKY','XRP','UAE','NATO','IRS','NOC','LNG','WTI','API','EIA','ISM','PMI','ADP','JOLTS','GOP','DOJ','FBI','CFTC','FDIC','UN','WHO','M&A','Q1','Q2','Q3','Q4','YOY','MOM','BPD','BN','TN']);
const PROPER=new Map(['fed','powell','warsh','trump','biden','vance','bessent','lagarde','bailey','xi','putin','zelensky','netanyahu','musk','huang','altman','buffett','dimon','china','chinese','japan','japanese','india','iran','iranian','israel','israeli','russia','russian','ukraine','ukrainian','libya','libyan','europe','european','germany','german','france','french','italy','spain','britain','british','canada','canadian','mexico','brazil','taiwan','korea','korean','saudi','arabia','qatar','turkey','gaza','hormuz','benghazi','sharara','washington','london','beijing','tokyo','moscow','brussels','frankfurt','wall','street','treasury','treasuries','congress','senate','house','white','nasdaq','dow','nikkei','ftse','dax','hang','seng','bitcoin','ethereum','solana','tether','coinbase','binance','blackrock','nvidia','apple','tesla','google','alphabet','microsoft','amazon','meta','oracle','intel','netflix','openai','anthropic','goldman','sachs','jpmorgan','morgan','stanley','citi','citigroup','bloomberg','reuters','monday','tuesday','wednesday','thursday','friday','saturday','sunday','january','february','march','april','june','july','august','september','october','november','december','christmas','thanksgiving','republican','republicans','democrat','democrats','dems'].map(w=>[w,w.charAt(0).toUpperCase()+w.slice(1)]));
['iphone:iPhone','openai:OpenAI','jpmorgan:JPMorgan','blackrock:BlackRock','coinbase:Coinbase','s&p:S&P'].forEach(x=>{const[k,v]=x.split(':');PROPER.set(k,v);});
function calm(t){const L=t.replace(/[^A-Za-z]/g,''),U=t.replace(/[^A-Z]/g,'');if(L.length<8||U.length/L.length<0.7)return t;
 let out=t.toLowerCase().replace(/[a-z&$][a-z&'’.$+]*/g,w=>{if(w[0]==='$')return w.toUpperCase();
  const core=w.replace(/[.'’]+$/,''),poss=/['’]s$/.test(core),stem=poss?core.slice(0,-2):core,tail=poss?core.slice(-2):'',U=stem.toUpperCase();
  if(KEEPUP.has(U))return w.replace(core,U+tail);if(PROPER.has(stem))return w.replace(core,PROPER.get(stem)+tail);return w;});
 // capital letter at the start and after full stops, question marks, colons and line breaks
 return out.replace(/(^\s*|[.!?:]\s+|\n\s*)([a-z])/g,(m,p,c)=>p+c.toUpperCase());}
function splitTag(t){const m=/^\s*(BREAKING|JUST IN)\s*:?\s*/i.exec(t);return m?{tag:m[1].toUpperCase(),body:t.slice(m[0].length)}:{tag:'',body:t};}
const srcOf=p=>SRC[p.src]||{n:p.source||p.src,c:'#7a7396',i:(p.source||'N').replace(/^the /i,'').split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()};
function postCard(p,big,story){
 const s=srcOf(p),h=splitTag(p.text),thumb=!big&&p.img;
 const head=`<div class="ph"><span class="av" style="background:${s.c}">${s.i}</span><b>${esc(s.n)}</b><span class="ago">${timeAgo(p.time)}</span>${h.tag?`<span class="flag${h.tag==='BREAKING'?' brk':''}">${h.tag==='BREAKING'?'Breaking':'Just in'}</span>`:''}</div>`;
 const main=`${head}${p.img&&big?`<img src="${esc(p.img)}" alt="" loading="lazy" onerror="this.remove()">`:''}<div class="pbody"><div class="pt">${richText(calm(h.body))}</div>${thumb?`<img class="th" src="${esc(p.img)}" alt="" loading="lazy" onerror="this.remove()">`:''}</div>`;
 if(!story||story.length<2)return `<a class="post${big?' big':''}" href="${esc(p.link)}" target="_blank" rel="noopener">${main}</a>`;
 const others=story.filter(x=>x!==p),names=[...new Set(others.map(x=>srcOf(x).n))];
 return `<div class="post story${big?' big':''}"><a class="pl" href="${esc(p.link)}" target="_blank" rel="noopener">${main}</a>
  <button class="stb" aria-expanded="false"><span class="avs">${others.slice(0,4).map(x=>{const o=srcOf(x);return `<i style="background:${o.c}">${o.i}</i>`;}).join('')}</span>Also from ${esc(names.slice(0,2).join(', '))}${names.length>2?` and ${names.length-2} more`:''}<span class="ch">▾</span></button>
  <div class="stl" hidden>${story.slice().sort((x,y)=>Date.parse(x.time)-Date.parse(y.time)).map(x=>{const o=srcOf(x);return `<a href="${esc(x.link)}" target="_blank" rel="noopener"><span class="tt">${new Date(x.time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span><span class="dt" style="background:${o.c}"></span><span><b>${esc(o.n)}</b> ${esc(calm(splitTag(x.text).body).slice(0,160))}</span></a>`;}).join('')}</div></div>`;
}
/* same-story grouping: headlines sharing most of their key words within 12 hours become one card */
const STOP=new Set('the a an and or of to in on for at by with from as is are was were be been it its this that after over into amid says said say will would could may new more than about up down out off his her their they we you not but has have had just breaking report reports reportedly per via sources source us'.split(' '));
const toks=t=>new Set(calm(splitTag(t).body).toLowerCase().replace(/https?:\S+/g,'').match(/[a-z0-9$%.]+/g)?.map(w=>w.replace(/\.$/,'')).filter(w=>(w.length>2||/\d/.test(w))&&!STOP.has(w))||[]);
function groupStories(items){
 const groups=[];
 for(const p of items){const tk=toks(p.text),t=Date.parse(p.time);let hit=null;
  if(tk.size>=3)for(const g of groups){if(Math.abs(g.t-t)>12*3600e3)continue;let n=0;for(const w of tk)if(g.tk.has(w))n++;
   if(n>=3&&n/Math.min(tk.size,g.tk.size)>=0.55){hit=g;break;}}
  if(hit)hit.items.push(p);else groups.push({lead:p,items:[p],tk,t});}
 return groups;
}
async function loadNews(force){
 if(NEWS.busy)return;if(!force&&NEWS.at&&Date.now()-NEWS.at<90e3){renderAllNews();return;}
 NEWS.busy=true;
 try{const j=await fetch('/.netlify/functions/news').then(r=>r.json());if(Array.isArray(j.items)){NEWS.items=j.items;NEWS.at=Date.now();NEWS.err=false;}}catch(e){NEWS.err=true;}
 NEWS.busy=false;renderAllNews();
}
async function loadCal(force){
 if(CAL.busy)return;if(!force&&CAL.at&&Date.now()-CAL.at<15*60e3){renderNewsTab();if(activeTab==='health')renderHealthCal();return;}
 CAL.busy=true;
 try{const j=await fetch('/.netlify/functions/calendar').then(r=>r.json());if(Array.isArray(j.events)){CAL.events=j.events;CAL.at=Date.now();CAL.err=false;}}catch(e){CAL.err=true;}
 CAL.busy=false;renderNewsTab();if(activeTab==='health')renderHealthCal();
}
function renderAllNews(){renderCryptoNews();renderNewsTab();marketBrief();if(activeTab==='park')renderMovers(parkItems());if(chItem)renderSymbolNews(chItem);}
function renderCryptoNews(){
 const box=$('cryptoNews');if(!box)return;const items=NEWS.items.filter(p=>CRYPTO_RX.test(p.text)).slice(0,5);
 box.innerHTML=items.length?items.map(p=>postCard(p,false)).join(''):`<div class="empty">${NEWS.err?'Headlines can’t load in this viewer.':NEWS.at?'No crypto headlines in the latest posts.':'Loading headlines…'}</div>`;
}
const HINTS=[[/speaks|testifies|press conference/i,'Speech: watch for hints on interest rates'],[/core pce/i,'The Fed’s preferred inflation gauge'],[/core cpi/i,'Inflation excluding food and energy'],[/\bcpi\b/i,'Consumer price inflation'],[/non-farm/i,'Jobs added last month'],[/unemployment claims/i,'Weekly jobless claims'],[/unemployment rate/i,'Share of people out of work'],[/federal funds|fomc statement/i,'Federal Reserve interest-rate decision'],[/fomc/i,'Federal Reserve'],[/\bppi\b/i,'Producer (wholesale) inflation'],[/gdp/i,'Economic growth'],[/retail sales/i,'Consumer spending'],[/official bank rate|mpc/i,'Bank of England rate decision'],[/main refinancing|ecb/i,'European Central Bank rate decision'],[/boj|policy rate/i,'Bank of Japan decision'],[/ism/i,'Business activity survey'],[/jolts/i,'Job openings']];
const FLAGS={USD:'🇺🇸',GBP:'🇬🇧',EUR:'🇪🇺',JPY:'🇯🇵',CNY:'🇨🇳'};
/* actual figures (BLS) and 30-minute market reaction for released events */
let ACT={data:null,at:0,key:''},REACT=store.get('wd.react',{}),showEarlier=false;
const ACT_MAP=[[/core cpi m\/m/i,['coreCpiMoM']],[/core cpi y\/y/i,['coreCpiYoY']],[/^cpi m\/m/i,['cpiMoM']],[/^cpi y\/y/i,['cpiYoY']],[/^cpi and core cpi/i,['coreCpiMoM','cpiYoY']],
 [/non-farm payrolls and unemployment/i,['nfp','unemp']],[/non-farm employment change/i,['nfp']],[/^unemployment rate/i,['unemp']],[/core ppi m\/m/i,['corePpiMoM']],[/^ppi m\/m|^ppi \(/i,['ppiMoM']]];
const ACT_LABEL={coreCpiMoM:['Core CPI m/m','%','infl'],coreCpiYoY:['Core CPI y/y','%','infl'],cpiMoM:['CPI m/m','%','infl'],cpiYoY:['CPI y/y','%','infl'],nfp:['Jobs added','K','jobs'],unemp:['Unemployment','%','unemp'],ppiMoM:['PPI m/m','%','infl'],corePpiMoM:['Core PPI m/m','%','infl']};
/* Cleveland Fed inflation nowcasts: 2-decimal expectations (and unrounded actuals) for CPI and PCE */
let NOWC={data:null,at:0};
const NOW_MAP=[[/^cpi and core cpi/i,[['CPI','mom','cpi'],['Core','mom','coreCpi'],['CPI y/y','yoy','cpi'],['Core y/y','yoy','coreCpi']]],
 [/core cpi m\/m/i,[['','mom','coreCpi']]],[/core cpi y\/y/i,[['','yoy','coreCpi']]],[/^cpi m\/m/i,[['','mom','cpi']]],[/^cpi y\/y/i,[['','yoy','cpi']]],
 [/core pce price index m\/m/i,[['','mom','corePce']]],[/core pce price index y\/y/i,[['','yoy','corePce']]],[/^core pce price index \(/i,[['Core','mom','corePce'],['Core y/y','yoy','corePce']]],
 [/^pce price index m\/m/i,[['','mom','pce']]],[/^pce price index y\/y/i,[['','yoy','pce']]]];
async function loadNowcast(){if(NOWC.data&&Date.now()-NOWC.at<60*60e3)return;try{let j=await fetch('/data/nowcast.json?t='+Math.floor(Date.now()/3e5)).then(r=>r.ok?r.json():null).catch(()=>null);if(!j||!j.months)j=await fetch('/.netlify/functions/nowcast').then(r=>r.json());if(j&&j.months){NOWC={data:j,at:Date.now()};renderNewsTab();}}catch(e){NOWC.at=Date.now();}}
const prevMonthKey=k=>{const [y,m]=k.split('-').map(Number);const d=new Date(Date.UTC(y,m-2,1));return d.toISOString().slice(0,7);};
function nowcastFor(e){if(e.country!=='USD'||!NOWC.data)return null;const m=NOW_MAP.find(([rx])=>rx.test(e.title));if(!m)return null;
 const k=refMonth(e.date),cur=NOWC.data.months[k],prev=NOWC.data.months[prevMonthKey(k)];
 const items=m[1].map(([lab,kind,id])=>({lab,kind,id,exp:cur?.[kind]?.[id],act:cur?.act?.[kind]?.[id],prev:prev?.act?.[kind]?.[id]}));
 return items.some(x=>x.exp!=null||x.prev!=null||x.act!=null)?items:null;}
function refMonth(d){const x=new Date(d);x.setUTCDate(1);x.setUTCMonth(x.getUTCMonth()-1);return x.getUTCFullYear()+'-'+String(x.getUTCMonth()+1).padStart(2,'0');}
function actualsFor(e){
 if(e.country==='USD'&&/pce price index/i.test(e.title)){const nc=nowcastFor(e);if(!nc)return [];const fs=String(e.forecast||''),f=parseFloat(fs.replace(/[^0-9.\-]/g,'')),dec=(fs.split('.')[1]||'').replace(/[^0-9]/g,'').length;
  return nc.filter(x=>x.act!=null).map((x,i,arr)=>{let tag='';if(arr.length===1&&!isNaN(f)){const d=+(x.act.toFixed(dec))-f;tag=Math.abs(d)<1e-9?'In line':d>0?'Hotter':'Cooler';}return {label:(x.lab||'PCE')+(x.kind==='mom'&&!/m\/m|y\/y/.test(x.lab)?' m/m':''),val:x.act.toFixed(2)+'%',tag,multi:arr.length>1};});}
 if(e.country!=='USD'||!ACT.data)return [];const m=ACT_MAP.find(([rx])=>rx.test(e.title));if(!m)return [];
 const want=refMonth(e.date);
 const NC_ID={cpiMoM:['mom','cpi'],coreCpiMoM:['mom','coreCpi'],cpiYoY:['yoy','cpi'],coreCpiYoY:['yoy','coreCpi']};
 return m[1].map(k=>{let a=ACT.data[k];
  if((!a||a.v==null)&&NC_ID[k]){const v=NOWC.data?.months?.[want]?.act?.[NC_ID[k][0]]?.[NC_ID[k][1]];if(v!=null)a={p:want,v};}
  if(!a||a.v==null||a.p!==want)return null;
  const [label,unit,kind]=ACT_LABEL[k];const fs=String(e.forecast||''),f=m[1].length===1?parseFloat(fs.replace(/[^0-9.\-]/g,'')):NaN;
  const dec=(fs.split('.')[1]||'').replace(/[^0-9]/g,'').length,v=k==='unemp'&&a.v2!=null?a.v2:a.v;
  let tag='';if(!isNaN(f)){const d=+(v.toFixed(dec))-f;tag=Math.abs(d)<1e-9?'In line':kind==='infl'?(d>0?'Hotter':'Cooler'):kind==='jobs'?(d>0?'Stronger':'Weaker'):(d>0?'Weaker':'Stronger');}
  return {label,val:(kind==='jobs'?(v>0?'+':'')+v+'K':v.toFixed(2)+unit),tag,multi:m[1].length>1};}).filter(Boolean);
}
async function loadActuals(){
 loadNowcast();const now=Date.now();
 const rel=CAL.events.filter(e=>e.country==='USD'&&ACT_MAP.some(([rx])=>rx.test(e.title))&&new Date(e.date)<now-3*60e3&&now-new Date(e.date)<12*864e5);
 if(!rel.length)return;
 const key=rel.map(e=>e.date.slice(0,13)).sort().pop();
 if(ACT.key===key&&ACT.data&&!ACT.data.error&&now-ACT.at<60*60e3)return;
 if(ACT.key===key&&now-ACT.at<10*60e3)return;
 try{const j=await fetch('/.netlify/functions/actuals?r='+encodeURIComponent(key)).then(r=>r.json());ACT={data:j,at:Date.now(),key};renderNewsTab();}catch(e){ACT.at=Date.now();ACT.key=key;}
}
async function loadReactions(){
 const now=Date.now();
 const todo=CAL.events.filter(e=>e.key&&new Date(e.date)<now-31*60e3&&now-new Date(e.date)<10*864e5).map(e=>Math.floor(new Date(e.date)/1000)).filter((t,i,a)=>a.indexOf(t)===i&&!(REACT[t]&&REACT[t].done));
 for(const t of todo.slice(0,6)){
  if(REACT[t]&&now-(REACT[t].at||0)<5*60e3)continue;
  try{const j=await fetch('/.netlify/functions/reaction?at='+t).then(r=>r.json());REACT[t]={...j,at:Date.now()};}catch(e){REACT[t]={at:Date.now()};}
 }
 const keep={};Object.entries(REACT).forEach(([t,v])=>{if(now/1000-t<20*86400)keep[t]=v;});REACT=keep;store.set('wd.react',REACT);
 if(todo.length)renderNewsTab();
}
function resultRows(e){
 const acts=actualsFor(e);const r=REACT[Math.floor(new Date(e.date)/1000)];let h='';
 if(acts.length)h+=`<div class="evres">${acts.map(a=>`<span>${a.multi?esc(a.label)+' ':'Actual '}<b>${esc(a.val)}</b>${a.tag?` <i class="tg">${a.tag}</i>`:''}</span>`).join('')}</div>`;
 if(r&&r.done){const parts=[['S&P fut.',r.spx],['Gold',r.gold],['BTC',r.btc]].filter(x=>x[1]!=null);
  if(parts.length)h+=`<div class="evrx">30 min after: ${parts.map(([n,v])=>`${n} <b class="${v>0?'up':v<0?'down':''}">${fmtPct(v)}</b>`).join(' · ')}</div>`;}
 return h;
}
function evCard(e){
 const t=new Date(e.date).getTime(),now=Date.now(),d=t-now;
 const past=d<-15*60e3;let when='';
 if(d<=0&&!past)when='<small class="soon">Out now</small>';else if(past)when='<small>Released</small>';
 else if(d<3600e3)when=`<small class="soon">in ${Math.max(1,Math.round(d/60e3))}m</small>`;else if(d<24*3600e3)when=`<small>in ${Math.round(d/3600e3)}h</small>`;
 const hint=e.hint||(HINTS.find(([rx])=>rx.test(e.title))||[])[1]||'';
 const tm=new Date(e.date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
 const res=past?resultRows(e):'';
 return `<div class="ev${e.key?' key':''}${past?' past':''}${res?' res':''}">
  <div class="evt"><b class="num">${tm}</b>${when}</div>
  <div><div class="evh"><span class="fl">${FLAGS[e.country]||''}</span>${esc(e.country)}${e.key?'<span class="mm">Market mover</span>':''}</div>
  <div class="evn">${esc(e.title)}</div>${hint?`<div class="evhint">${hint}</div>`:''}
  ${(()=>{const nc=past?null:nowcastFor(e),one=nc&&nc.length===1?nc[0]:null;
   const ncTxt=nc?nc.filter(x=>x.exp!=null).map(x=>`<span>${x.lab?esc(x.lab)+' nowcast':'Nowcast'} <b>${x.exp.toFixed(2)}%</b></span>`).join(''):'';
   const prevTxt=one&&one.prev!=null?`<span>Previous <b>${one.prev.toFixed(2)}%</b></span>`:e.previous?`<span>Previous <b>${esc(e.previous)}</b></span>`:'';
   const fc=e.forecast?`<span>Consensus <b>${esc(e.forecast)}</b></span>`:'';
   return ncTxt||fc||prevTxt?`<div class="evx">${ncTxt}${fc}${prevTxt}</div>${ncTxt?'<div class="evsrc">Nowcast: Cleveland Fed model, updated daily</div>':''}`:e.official?'<div class="evx"><span>Official date · forecasts appear in the week of release</span></div>':'';})()}${res}</div></div>`;
}
/* news categories: a post can belong to more than one */
const NCATS=[['all','All'],['crypto','Crypto'],['stocks','Stocks'],['economy','Economy'],['metals','Metals'],['property','Property']];
const NCAT_RX={crypto:CRYPTO_RX,
 stocks:/\b(stocks?|shares|earnings|equit(y|ies)|S&P|Nasdaq|Dow|IPO|market cap|Wall Street|Apple|Tesla|Microsoft|Nvidia|Amazon|Alphabet|Google|Meta|Oracle|Broadcom|AMD|Intel|Netflix|Anthropic|OpenAI|TSMC|Palantir)\b|\$[A-Z]{1,5}\b/i,
 economy:/\b(Fed|FOMC|Powell|Warsh|interest rates?|rate (cut|hike)s?|inflation|CPI|PCE|PPI|jobs|payrolls?|unemployment|jobless|GDP|recession|Treasur(y|ies)|yields?|bond (market|yields?|sell-?off)|bonds\b|gilts?|tariffs?|ECB|Bank of England|BoE|Lagarde|Bailey|dollar|DXY|oil|OPEC|economy|economic|deficit|debt ceiling|shutdown)\b/i,
 metals:/\b(gold|silver|platinum|palladium|copper|bullion|precious metals?|XAU|XAG)\b/i,
 property:/\b(housing|home ?sales|home prices|house prices|homebuilders?|mortgages?|real estate|property|properties|REITs?|rents?|landlords?|office (space|market|buildings?|loans?)|CMBS)\b/i};
let newsCat=store.get('wd.newscat','all');
const inCat=(p,c)=>c==='all'||(p.cats||[]).includes(c)||NCAT_RX[c].test(p.text);
let newsShown=40;
function renderNewsCats(){
 const el=$('newsCats');if(!el)return;el.hidden=newsMode!=='headlines';if(el.hidden)return;
 const day2=Date.now()-48*3600e3,recent=NEWS.items.filter(p=>new Date(p.time)>day2);
 el.innerHTML=NCATS.map(([k,l])=>{const n=k==='all'?recent.length:recent.filter(p=>inCat(p,k)).length;return `<button data-c="${k}" class="${k===newsCat?'on':''}" aria-pressed="${k===newsCat}">${l}${n?` <span>${n}</span>`:''}</button>`;}).join('');
}
$('newsCats').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.c===newsCat)return;newsCat=b.dataset.c;newsShown=40;store.set('wd.newscat',newsCat);buzz();renderNewsTab();});
function renderNewsTab(){
 if(activeTab!=='news')return;const box=$('newsBox');renderNewsCats();
 if(newsMode==='calendar'){
  $('newsHint').textContent='High-impact releases and central-bank decisions in UK time. This week’s come from the Forex Factory calendar with forecasts; later dates come from the official BLS, Fed, BEA, Bank of England and ECB schedules. Highlighted cards are the big market movers.';
  const start=new Date();start.setHours(0,0,0,0);
  const wk=new Date(start);wk.setDate(wk.getDate()-((wk.getDay()+6)%7));
  const earlier=CAL.events.filter(e=>{const d=new Date(e.date);return d>=wk&&d<start;});
  const ev=CAL.events.filter(e=>new Date(e.date)>=(showEarlier?wk:start));
  if(!ev.length){box.innerHTML=`<div class="empty">${CAL.err?'Events can’t load in this viewer.':CAL.at?'No big events left this week.':'Loading events…'}</div>`;return;}
  const today=start.toDateString(),tom=new Date(start.getTime()+864e5).toDateString();
  let html='',cur='';
  ev.forEach(e=>{const d=new Date(e.date),k=d.toDateString();
   if(k!==cur){cur=k;html+=`<div class="day">${k===today?'Today':k===tom?'Tomorrow':d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div>`;}
   html+=evCard(e);});
  if(earlier.length)html+=`<button class="linkbtn earlier" id="earlierBtn">${showEarlier?'Hide earlier releases':'Show earlier releases this week ('+earlier.length+')'}</button>`;
  box.innerHTML=html;
  const eb=$('earlierBtn');if(eb)eb.onclick=()=>{showEarlier=!showEarlier;buzz();renderNewsTab();};
  loadActuals();loadReactions();
 }else{
  $('newsHint').textContent='The last 48 hours from fast news accounts (Walter Bloomberg, Watcher Guru, FinancialJuice and others, via their public Telegram channels) and headlines from CNBC, Reuters, Bloomberg, the FT, MarketWatch, BBC, CoinDesk, HousingWire and more. Repeats of the same story are merged. Updates every 2 minutes. Tap one to open it.';
  const items=NEWS.items.filter(p=>inCat(p,newsCat)),label=NCATS.find(c=>c[0]===newsCat)?.[1]||'All';
  if(!NEWS.items.length){box.innerHTML=`<div class="empty">${NEWS.err?'News can’t load in this viewer.':'Loading news…'}</div>`;return;}
  if(!items.length){box.innerHTML=`<div class="empty">No ${esc(label.toLowerCase())} news in the latest posts.</div>`;return;}
  const day=Date.now()-24*3600e3;
  const groups=groupStories(items),gOf=new Map();groups.forEach(g=>g.items.forEach(p=>gOf.set(p,g)));
  // biggest: breaking posts first, then the stories the most outlets are covering, then posts with pictures
  const fresh=groups.filter(g=>g.t>day);
  let big=fresh.filter(g=>/^\s*breaking/i.test(g.lead.text));
  big=big.concat(fresh.filter(g=>g.items.length>=3&&!big.includes(g)).sort((a,b)=>b.items.length-a.items.length));
  if(big.length<3)big=big.concat(fresh.filter(g=>g.lead.img&&g.lead.kind!=='headline'&&!big.includes(g)).slice(0,3-big.length));
  big=big.slice(0,4);const bs=new Set(big);
  const rest=groups.filter(g=>!bs.has(g)),more=rest.length-newsShown;
  box.innerHTML=(big.length?`<div class="day">Biggest today${newsCat==='all'?'':' in '+esc(label.toLowerCase())}</div><div class="posts">${big.map(g=>postCard(g.lead,true,g.items)).join('')}</div>`:'')+
   `<div class="day">Latest</div><div class="posts">${rest.slice(0,newsShown).map(g=>postCard(g.lead,false,g.items)).join('')}</div>`+(more>0?`<button class="linkbtn earlier" id="newsMore">Show more (${more} left)</button>`:'');
  const nm=$('newsMore');if(nm)nm.onclick=()=>{newsShown+=40;buzz();renderNewsTab();};
  box.querySelectorAll('.stb').forEach(b=>b.onclick=()=>{const l=b.nextElementSibling,o=l.hidden;l.hidden=!o;b.setAttribute('aria-expanded',o);buzz();});
 }
}
$('newsSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.n===newsMode)return;newsMode=b.dataset.n;[...$('newsSeg').children].forEach(x=>x.classList.toggle('on',x===b));buzz();renderNewsTab();window.scrollTo({top:0,behavior:'smooth'});});
$('newsRefresh').addEventListener('click',async e=>{const b=e.currentTarget;b.classList.remove('spin');void b.offsetWidth;b.classList.add('spin');buzz();await Promise.all([loadNews(true),loadCal(true)]);toast('News refreshed');});
/* match breaking posts to an asset: direct words first, then broader market words */
const ALIAS={'S&P 500':['S&P','SPX','SPY','S&P 500','Wall Street','stocks','equities','Dow'],'Nasdaq 100':['Nasdaq','NDX','QQQ','tech stocks'],
 Gold:['gold','XAU','bullion','precious metals'],Silver:['silver','XAG','precious metals'],Palladium:['palladium','PGM'],Platinum:['platinum','PGM'],Copper:['copper'],Bitcoin:['bitcoin','BTC'],Ethereum:['ethereum','ether','ETH'],
 Tesla:['Tesla','TSLA','Cybertruck','robotaxi'],Apple:['Apple','AAPL','iPhone'],Google:['Google','Alphabet','GOOGL','GOOG','Gemini','Waymo'],TSMC:['TSMC','TSM','Taiwan Semiconductor','chipmaker','chipmakers']};
const BROAD={crypto:['crypto','digital assets'],metal:['metals','commodities','dollar','DXY'],stock:['Fed','yields','tariff','Treasury','markets']};
const wordRx=ws=>new RegExp('(^|[^a-z0-9])\\$?('+ws.filter(w=>w&&w.length>1).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![a-z0-9])','i');
let ASSETNEWS={};
const assetKey=it=>it.kind+':'+(it.id||it.sym);
function assetTerms(it){
 const name=it.kind==='crypto'?it.n:it.kind==='stock'?it.name:it.n;
 const extra={Bitcoin:['BTC'],Ethereum:['ETH'],Solana:['SOL'],Gold:['XAU'],Silver:['XAG'],Palladium:['palladium price'],'S&P 500':['Wall Street'],'Nasdaq 100':['Nasdaq']}[name]||[];
 const tk=it.kind==='crypto'?it.s:it.kind==='stock'?it.tk:'';
 return [...new Set([name,...extra,tk&&tk!==name?'$'+tk.replace(/^\$/,''):''].filter(Boolean))].slice(0,4);
}
/* Google News query tuned to market stories (avoids "Silver Springs", sports teams, etc.) */
function gQuery(it){
 const q=x=>'"'+x+'"';
 if(it.kind==='metal')return [q(it.n+' price'),q(it.n+' prices'),q(it.n+' futures'),q('spot '+it.n.toLowerCase())].join(' OR ');
 if(it.kind==='crypto')return [q(it.n+' price'),q(it.n+' crypto'),q(it.s+' price')].join(' OR ');
 if(it.name==='S&P 500')return [q('S&P 500'),q('stock market'),q('Wall Street')].join(' OR ');
 if(it.name==='Nasdaq 100')return [q('Nasdaq'),q('tech stocks')].join(' OR ');
 return [q(it.name+' stock'),q(it.name+' shares'),q(it.tk+' stock')].join(' OR ');
}
const isPost=p=>p.src!=='news';
function pickReason(list){const day=Date.now()-24*3600e3;return list.find(p=>isPost(p)&&new Date(p.time)>day)||list[0]||null;}
async function loadAssetNews(it,force){
 const k=assetKey(it),c=ASSETNEWS[k];
 if(c&&(c.busy||(!force&&Date.now()-c.at<8*60e3)))return c.items;
 ASSETNEWS[k]={...(c||{items:[]}),busy:true,at:c?c.at:0};
 try{const j=await fetch('/.netlify/functions/asset-news?hours=48&q='+encodeURIComponent(assetTerms(it).join(','))+'&g='+encodeURIComponent(gQuery(it))).then(r=>r.json());
  ASSETNEWS[k]={items:Array.isArray(j.items)?j.items:[],at:Date.now(),busy:false};}
 catch(e){ASSETNEWS[k]={items:(c&&c.items)||[],at:Date.now(),busy:false,err:true};}
 return ASSETNEWS[k].items;
}
function whyFor(it,hours=24){
 const name=it.kind==='crypto'?it.n:it.kind==='stock'?it.name:it.n;
 const direct=[...new Set([...(it.kind==='crypto'?[it.s,it.n]:it.kind==='stock'?[it.tk,it.name]:[it.n]),...(ALIAS[name]||[])])];
 const since=Date.now()-hours*3600e3,recent=NEWS.items.filter(p=>new Date(p.time)>since);
 const extra=(ASSETNEWS[assetKey(it)]?.items||[]).filter(p=>new Date(p.time)>since);
 const seen=new Set(),d=[...recent.filter(p=>wordRx(direct).test(p.text)),...extra]
  .sort((a,b)=>new Date(b.time)-new Date(a.time)).filter(p=>{const k=p.text.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,60);if(seen.has(k))return false;seen.add(k);return true;});
 return {direct:d,broad:d.length?[]:recent.filter(p=>wordRx(BROAD[it.kind]||[]).test(p.text))};
}
function renderSymbolNews(it,fetched){
 const w=whyFor(it,48),items=[...w.direct.filter(isPost).slice(0,6),...w.direct.filter(p=>!isPost(p))].slice(0,10);
 const pc=it.kind==='crypto'?cryptoData[it.id]?.pct:pctFor(it);
 $('chNewsH').textContent=items.length&&pc!=null&&Math.abs(pc)>=1.5?'Why it’s moving':'Latest news';
 const box=$('chNews');
 if(items.length)box.innerHTML=`<div class="posts">${items.map(p=>postCard(p,false)).join('')}</div><p class="hint" style="margin-top:8px">From the last 48 hours: Walter Bloomberg and Watcher Guru posts, plus news headlines.</p>`;
 else box.innerHTML=`<div class="empty">${fetched?'No news about '+esc(it.n||it.name)+' in the last 48 hours.':'Finding the latest news…'}</div>`;
 if(!fetched)loadAssetNews(it).then(()=>{if(chItem&&assetKey(chItem)===assetKey(it))renderSymbolNews(it,true);});
}
