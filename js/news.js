/* ---------- news + big events (own cards) ---------- */
let NEWS={items:[],at:0,busy:false,err:false},CAL={events:[],at:0,busy:false,err:false},newsMode='calendar';
const SRC={WatcherGuru:{n:'Watcher Guru',c:'#d99a00',i:'WG'},WalterBloomberg:{n:'Walter Bloomberg',c:'#2f6fde',i:'WB'},financialjuice:{n:'FinancialJuice',c:'#e2462f',i:'FJ'},marketfeed:{n:'Market Feed',c:'#15806b',i:'MF'},unfolded:{n:'Unfolded',c:'#8a4fd8',i:'UF'},bwenews:{n:'BWEnews',c:'#c2410c',i:'BW'},cointelegraph:{n:'Cointelegraph',c:'#3d8f3d',i:'CT'}};
const CRYPTO_RX=/\$(BTC|ETH|SOL|XRP|DOGE|BNB|ADA|USDT|USDC|LKY)\b|bitcoin|ethereum|solana|luckycoin|crypto|stablecoin|binance|coinbase|blockchain|memecoin|tokeni[sz]/i;
function timeAgo(t){const s=(Date.now()-new Date(t))/1000;if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}
function richText(t){return esc(t).replace(/(\$[A-Z]{2,6})\b/g,'<b class="cash">$1</b>').replace(/([+\-−]?\d[\d,]*(?:\.\d+)?%)/g,'<b>$1</b>').replace(/\n/g,'<br>');}
// shouty ALL-CAPS posts -> sentence case (acronyms, tickers and well-known names keep their capitals)
const KEEPUP=new Set(['US','UK','EU','AI','VIX','S&P','ETF','ETFS','CPI','GDP','PCE','PPI','ECB','BOE','BOJ','PBOC','RBA','SNB','IPO','CEO','CFO','SEC','IMF','OPEC','OPEC+','NFP','FOMC','NYSE','USD','GBP','EUR','JPY','CNY','BTC','ETH','SOL','NVDA','ANT','TSMC','TSM','AMD','QQQ','SPY','DXY','LKY','XRP','UAE','NATO','IRS','NOC','LNG','WTI','API','EIA','ISM','PMI','ADP','JOLTS','GOP','DOJ','FBI','CFTC','FDIC','UN','WHO','M&A','Q1','Q2','Q3','Q4','YOY','MOM','BPD','BN','TN']);
const NAMES=new Map(['fed','powell','warsh','trump','biden','vance','bessent','lagarde','bailey','xi','putin','zelensky','netanyahu','musk','elon','huang','jensen','alice','altman','buffett','dimon','jerome','christine','andrew','kevin','hassett','waller','bowman','jefferson','williams','goolsbee','miran','kashkari','starmer','reeves','keir','rachel','macron','merz','meloni','modi','erdogan','kim','zuckerberg','bezos','cook','pichai','nadella','dario','amodei','saylor','powell’s','trump’s','china','chinese','japan','japanese','india','iran','iranian','israel','israeli','russia','russian','ukraine','ukrainian','libya','libyan','europe','european','germany','german','france','french','italy','spain','britain','british','canada','canadian','mexico','brazil','taiwan','korea','korean','saudi','arabia','qatar','turkey','gaza','hormuz','benghazi','sharara','washington','london','beijing','tokyo','moscow','brussels','frankfurt','wall','street','treasury','treasuries','congress','senate','house','white','nasdaq','dow','nikkei','ftse','dax','hang','seng','bitcoin','ethereum','solana','tether','coinbase','binance','blackrock','nvidia','apple','tesla','google','alphabet','microsoft','amazon','meta','oracle','intel','netflix','openai','anthropic','goldman','sachs','jpmorgan','morgan','stanley','citi','citigroup','bloomberg','reuters','monday','tuesday','wednesday','thursday','friday','saturday','sunday','january','february','march','april','june','july','august','september','october','november','december','christmas','thanksgiving','republican','republicans','democrat','democrats','dems'].map(w=>[w,w.charAt(0).toUpperCase()+w.slice(1)]));
['iphone:iPhone','openai:OpenAI','jpmorgan:JPMorgan','blackrock:BlackRock','coinbase:Coinbase','s&p:S&P'].forEach(x=>{const[k,v]=x.split(':');NAMES.set(k,v);});
function calm(t){return String(t).split('\n').map(calmLine).join('\n');}
function calmLine(t){const L=t.replace(/[^A-Za-z]/g,''),U=t.replace(/[^A-Z]/g,'');if(L.length<8||U.length/L.length<0.7)return t.replace(/(^|\n)(\s*\*\s*)([a-z])/g,(m,a,b,c)=>a+b+c.toUpperCase());
 let out=t.toLowerCase().replace(/[a-z&$][a-z&'’.$+]*/g,w=>{if(w[0]==='$')return w.toUpperCase();
  const core=w.replace(/[.'’]+$/,''),poss=/['’]s$/.test(core),stem=poss?core.slice(0,-2):core,tail=poss?core.slice(-2):'',U=stem.toUpperCase();
  if(KEEPUP.has(U))return w.replace(core,U+tail);if(NAMES.has(stem))return w.replace(core,NAMES.get(stem)+tail);return w;});
 // capital letter at the start and after full stops, question marks, colons and line breaks
 return out.replace(/(^[^A-Za-z0-9$]*|[.!?:]\s+[*•]?\s*|\n[\s*•\-–—]*)([a-z])/g,(m,p,c)=>p+c.toUpperCase());}
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
/* ---------- story detection ----------
   1) clusters: posts about the same event, matched on weighted key words (rare words count more) and at
      least one shared name, ticker or number, within 18 hours
   2) threads: clusters about the same running story (sharing two distinctive names, e.g. Nvidia + Huang)
      are shown together as one story with its developments */
const JUNK=/^(upcoming dividend run|dividend (champion|aristocrat)s?\b|[A-Z]{1,5} (declares|announces) .*dividend|stock market today:? live)/i;
function storyCluster(items){
 const docs=items.map(p=>{const raw=splitTag(p.text).body,c=calm(raw).replace(/https?:\S+/g,'').split('\n')[0].slice(0,220);
  const words=c.match(/\$?[A-Za-z][A-Za-z0-9&'’.-]*|\d[\d,.]*%?/g)||[];
  const toks=[],ents=new Set();
  words.forEach((w,i)=>{let k=w.toLowerCase().replace(/['’]s$/,'').replace(/[.,]+$/,'');if(!k||STOP.has(k)||(k.length<3&&!/\d/.test(k)))return;
   if(/^\$/.test(k))k=k.slice(1);toks.push(k);
   const prev=c.slice(0,c.indexOf(w)).trim();const sentStart=!prev||/[.!?:\-–—*‼]$/.test(prev);
   if(/^\$/.test(w)||/\d/.test(w)&&w.length>=3||(/^[A-Z]/.test(w)&&!sentStart)||/^[A-Z]{2,}$/.test(w))ents.add(k);});
  return {p,toks,ents,t:Date.parse(p.time)};});
 const df=new Map();docs.forEach(d=>new Set(d.toks).forEach(k=>df.set(k,(df.get(k)||0)+1)));
 const N=docs.length,idf=k=>Math.log((N+1)/((df.get(k)||0)+0.5));
 docs.forEach(d=>{const v=new Map();d.toks.forEach(k=>v.set(k,(v.get(k)||0)+idf(k)));let n=0;v.forEach(x=>n+=x*x);d.v=v;d.n=Math.sqrt(n)||1;});
 const cl=[];
 for(const d of docs){let best=null,bs=0;
  for(const c of cl){if(Math.min(...c.ts.map(t=>Math.abs(t-d.t)))>18*3600e3)continue;
   let dot=0;d.v.forEach((x,k)=>{const y=c.v.get(k);if(y)dot+=x*y;});const s=dot/(d.n*c.n);
   let shared=0;d.ents.forEach(e=>{if(c.ents.has(e)&&idf(e)>1.2)shared++;});
   if(s>bs&&shared>=1){bs=s;best=c;}}
  if(best&&bs>=0.3){best.items.push(d);best.ts.push(d.t);d.v.forEach((x,k)=>best.v.set(k,(best.v.get(k)||0)+x));let n=0;best.v.forEach(x=>n+=x*x);best.n=Math.sqrt(n);d.ents.forEach(e=>best.ents.add(e));}
  else cl.push({items:[d],ts:[d.t],v:new Map(d.v),n:d.n,ents:new Set(d.ents)});}
 return cl.map(c=>c.items.map(d=>d.p));
}

function bestHead(ps){const sc=p=>{const t=splitTag(p.text).body.split('\n')[0],U=t.replace(/[^A-Z]/g,'').length,L=t.replace(/[^A-Za-z]/g,'').length||1;
 return (p.kind==='headline'?2:0)+(U/L<0.5?1:0)+(t.length>=35&&t.length<=120?1:0)-(/^[^A-Za-z0-9$]/.test(t)?.5:0)-(t.length>160?1:0);};
 return ps.slice().sort((a,b)=>sc(b)-sc(a)||Date.parse(a.time)-Date.parse(b.time))[0];}
const catOf=p=>(NCATS.slice(1).find(([c])=>inCat(p,c))||[])[1]||'';
function buildThreads(items){
 const cls=storyCluster(items.filter(p=>!JUNK.test(splitTag(p.text).body))).map(ps=>{const ents=new Map();
  ps.forEach(p=>(calm(splitTag(p.text).body).match(/\$[A-Z]{2,6}|\b[A-Z][a-zA-Z]{2,}\b/g)||[]).forEach((w,i)=>{if(i===0&&!/^\$/.test(w)&&!NAMES.has(w.toLowerCase()))return;const k=w.replace(/^\$/,'').toLowerCase();if(STOP.has(k))return;ents.set(k,(ents.get(k)||0)+1);}));
  const ts=ps.map(p=>Date.parse(p.time));return {ps,head:bestHead(ps),ents,t0:Math.min(...ts),t1:Math.max(...ts),srcs:new Set(ps.map(p=>p.src==='news'?p.source:p.src))};});
 // linking names: people, companies and places that appear in under 12% of posts. Months, days and data
 // terms (CPI, PMI) never link stories on their own.
 const NOLINK=/^(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|breaking|just|live|update|report|exclusive|watch|news|nasdaq|dow|nyse|wall|street|stock|stocks|market|markets|index|futures|shares)$/;
 const idf=new Map();items.forEach(p=>new Set((calm(p.text).match(/\$?[A-Za-z][A-Za-z]{2,}/g)||[]).map(w=>w.replace(/^\$/,'').toLowerCase())).forEach(k=>idf.set(k,(idf.get(k)||0)+1)));
 const rare=c=>new Set([...c.ents.keys()].filter(k=>!NOLINK.test(k)&&!KEEPUP.has(k.toUpperCase())&&(idf.get(k)||0)<items.length*0.25));
 const PLACE=/^(us|uk|eu|china|chinese|japan|japanese|india|iran|israel|russia|ukraine|europe|european|germany|german|france|french|italy|spain|britain|british|canada|mexico|brazil|taiwan|korea|saudi|washington|london|beijing|tokyo|moscow|brussels|asia|america|american)$/;
 const wt=k=>PLACE.test(k)?0.5:1;
 const threads=[];
 cls.sort((a,b)=>b.ps.length-a.ps.length).forEach(c=>{const rc=rare(c);
  const th=threads.find(t=>{if(Math.abs(t.t1-c.t1)>24*3600e3)return false;const sh=[...rc].filter(k=>t.rare.has(k)),sc=sh.reduce((a,k)=>a+wt(k),0);
   // two distinctive names in common, or one of the story's core names within six hours
   return sc>=2||(sc>=1&&Math.abs(t.t1-c.t1)<6*3600e3&&sh.some(k=>wt(k)===1&&t.seed.has(k)));});
  if(th){th.cls.push(c);rc.forEach(k=>th.rare.add(k));th.t1=Math.max(th.t1,c.t1);th.t0=Math.min(th.t0,c.t0);c.srcs.forEach(x=>th.srcs.add(x));}
  else threads.push({cls:[c],rare:rc,t0:c.t0,t1:c.t1,srcs:new Set(c.srcs),seed:new Set([...c.ents].filter(([k,v])=>rc.has(k)&&v>=Math.max(2,c.ps.length*0.4)).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]))});});
 // a cluster spanning several countries (data releases, e.g. flash PMIs) gets a round-up title instead of one country's headline
 const PL={us:'US','u.s':'US',uk:'UK',eurozone:'Eurozone','euro':'Eurozone',germany:'Germany',france:'France',japan:'Japan',china:'China',india:'India',australia:'Australia',australian:'Australia',canada:'Canada',italy:'Italy',spain:'Spain'};
 cls.forEach(c=>{if(c.ps.length<3)return;const pl=[];c.ps.forEach(p=>{const w=(hText(p).toLowerCase().match(/[a-z.]+/g)||[]).find(x=>PL[x.replace(/\.$/,'')]);if(w){const n=PL[w.replace(/\.$/,'')];if(!pl.includes(n))pl.push(n);}});
  if(pl.length<3)return;const hw=(firstLine(hText(c.head)).match(/[A-Za-z&]+/g)||[]),lw=c.ps.map(p=>new Set((hText(p).toLowerCase().match(/[a-z&]+/g)||[])));
  const common=hw.filter(w=>!PL[w.toLowerCase()]&&!STOP.has(w.toLowerCase())&&!/^(vs|expected|actual|forecast|prev|previous|at)$/i.test(w)&&lw.filter(x=>x.has(w.toLowerCase())).length>=c.ps.length*0.6);
  if(common.length)c.title=`${common.join(' ').replace(/^./,x=>x.toUpperCase())} round-up: ${pl.slice(0,5).join(', ')}`;});
 threads.forEach(t=>{t.cls.sort((a,b)=>b.t1-a.t1);t.main=t.cls.slice().sort((a,b)=>b.ps.length-a.ps.length||b.t1-a.t1)[0];t.head=t.main.head;t.title=t.main.title||null;t.all=t.cls.flatMap(c=>c.ps);t.n=t.all.length;
  t.img=(t.all.find(p=>p.img&&p.kind==='headline')||t.all.find(p=>p.img)||{}).img||null;t.cat=catOf(t.head);
  t.brk=t.all.some(p=>/^\s*\W*\s*breaking/i.test(p.text));});
 return threads;
}
/* ---------- news cards ---------- */
const hText=p=>calm(splitTag(p.text).body).replace(/https?:\S+/g,'').trim();
const firstLine=t=>{const l=t.split('\n').map(x=>x.trim()).filter(Boolean);return l[0]||'';};
const srcName=p=>srcOf(p).n;
function hm(t){return new Date(t).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
function avStack(ps,n=4){const seen=new Set(),out=[];for(const p of ps){const o=srcOf(p);if(seen.has(o.n))continue;seen.add(o.n);out.push(`<i style="background:${o.c}" title="${esc(o.n)}">${o.i}</i>`);if(out.length>=n)break;}return `<span class="avs">${out.join('')}</span>`;}
function coverage(t){
 const ps=t.all.slice().sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));
 return `<div class="cov" hidden>${ps.map(p=>{const o=srcOf(p);return `<a href="${esc(p.link)}" target="_blank" rel="noopener"><span class="tt">${hm(p.time)}</span><span class="dt" style="background:${o.c}"></span><span><b>${esc(o.n)}</b> ${esc(firstLine(hText(p)).slice(0,150))}</span></a>`;}).join('')}</div>`;
}
function storyCard(t){
 const h=t.head,o=srcOf(h),txt=t.title||firstLine(hText(h)),ago=timeAgo(t.t1),ns=t.srcs.size;
 const devs=t.cls.length>1?t.cls.filter(c=>c!==t.main).slice(0,3).map(c=>`<li><span class="tt">${hm(c.t1)}</span>${esc(firstLine(hText(c.head)).slice(0,110))}</li>`).join(''):'';
 return `<article class="sc${t.img?' hasimg':''}">
  ${t.img?`<a class="sci" href="${esc(h.link)}" target="_blank" rel="noopener"><img src="${esc(t.img)}" alt="" onerror="this.closest('.sci').remove()"></a>`:''}
  <div class="scb"><div class="scm">${t.brk?'<span class="brk">Breaking</span>':''}${t.cat?`<span class="cat">${esc(t.cat)}</span>`:''}<span>${ago}</span></div>
  <a class="sch" href="${esc(h.link)}" target="_blank" rel="noopener">${richText(txt)}</a>
  ${devs?`<ul class="devs">${devs}</ul>`:''}
  <button class="scf" aria-expanded="false">${avStack(t.all)}<span>${ns>1?`${ns} sources · ${t.n} reports`:esc(o.n)}</span><span class="ch">▾</span></button>
  ${coverage(t)}</div></article>`;
}
function newsRow(t){
 const h=t.head,o=srcOf(h),full=hText(h),txt=t.title||firstLine(full),more=full.split('\n').filter(x=>x.trim()).slice(1).join(' ').slice(0,180),ns=t.srcs.size;
 return `<div class="nr"><a href="${esc(h.link)}" target="_blank" rel="noopener"><span class="nt">${hm(h.time)}</span><span class="nb"><span class="ns"><i style="background:${o.c}"></i>${esc(o.n)}${t.brk?' <em class="brk">Breaking</em>':''}</span><span class="nh">${richText(txt)}</span>${more?`<span class="nm">${esc(more)}</span>`:''}</span>${h.img?`<img src="${esc(h.img)}" alt="" loading="lazy" onerror="this.remove()">`:''}</a>
  ${t.n>1?`<button class="scf mini" aria-expanded="false">${avStack(t.all,3)}<span>${ns>1?`Also ${ns-1} other source${ns>2?'s':''}`:`${t.n} updates`}</span><span class="ch">▾</span></button>${coverage(t)}`:''}</div>`;
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
function renderAllNews(){renderCryptoNews();renderNewsTab();if(activeTab==='park')renderMovers(parkItems());if(chItem)renderSymbolNews(chItem);}
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
  $('newsHint').textContent='The last 48 hours from fast news accounts (Walter Bloomberg, Watcher Guru, FinancialJuice and others, via their public Telegram channels) and headlines from CNBC, Reuters, Bloomberg, the FT, MarketWatch, BBC, CoinDesk, HousingWire and more. Reports on the same story are grouped into one, with the most widely covered at the top; tap a story’s sources to see who reported what, and when. Updates every 2 minutes. Tap one to open it.';
  const items=NEWS.items.filter(p=>inCat(p,newsCat)),label=NCATS.find(c=>c[0]===newsCat)?.[1]||'All';
  if(!NEWS.items.length){box.innerHTML=`<div class="empty">${NEWS.err?'News can’t load in this viewer.':'Loading news…'}</div>`;return;}
  if(!items.length){box.innerHTML=`<div class="empty">No ${esc(label.toLowerCase())} news in the latest posts.</div>`;return;}
  const day=Date.now()-24*3600e3;
  const threads=buildThreads(items),now=Date.now();
  // top stories: most outlets covering it, weighted towards the last few hours
  const score=t=>(t.srcs.size*2+Math.min(t.n,12)+(t.brk?3:0))*Math.exp(-(now-t.t1)/(10*3600e3));
  const top=threads.filter(t=>now-t.t1<24*3600e3&&(t.srcs.size>=3||t.brk&&t.srcs.size>=2)).sort((a,b)=>score(b)-score(a)).slice(0,5),ts=new Set(top);
  const rest=threads.filter(t=>!ts.has(t)).sort((a,b)=>Date.parse(b.head.time)-Date.parse(a.head.time)),shown=rest.slice(0,newsShown),more=rest.length-shown.length;
  const bucket=t=>{const a=now-Date.parse(t.head.time),d=new Date(t.head.time),td=new Date();return a<3600e3?'Last hour':d.toDateString()===td.toDateString()?'Earlier today':d.toDateString()===new Date(now-864e5).toDateString()?'Yesterday':d.toLocaleDateString('en-GB',{weekday:'long'});};
  let html=top.length?`<div class="day">Top stories${newsCat==='all'?'':' · '+esc(label)}</div><div class="scs">${top.map(storyCard).join('')}</div>`:'';
  let cur='';shown.forEach(t=>{const b=bucket(t);if(b!==cur){html+=(cur?'</div>':'')+`<div class="day">${b}</div><div class="nlist">`;cur=b;}html+=newsRow(t);});
  if(cur)html+='</div>';
  if(more>0)html+=`<button class="linkbtn earlier" id="newsMore">Show more (${more} left)</button>`;
  box.innerHTML=html;
  box.querySelectorAll('.scf').forEach(b=>b.onclick=()=>{const l=b.nextElementSibling,o=l.hidden;l.hidden=!o;b.setAttribute('aria-expanded',o);buzz();});
  const nm=$('newsMore');if(nm)nm.onclick=()=>{newsShown+=40;buzz();renderNewsTab();};
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
