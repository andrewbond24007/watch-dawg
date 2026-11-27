/* ---------- Rates & money tab ----------
   Central-bank rates with live countdowns to each decision, what futures expect from the Fed,
   bond yields, mortgage rates, inflation and currencies. Each figure shows when it next changes.
   Colours: green = rates or inflation falling (cheaper borrowing), red = rising. */
let RATES={data:null,at:0,busy:false,err:false},RLIVE={},rlAt=0;
let RSEEN=store.get('wd.rseen',null);const RFRESH=new Set(),REXP=new Set();
const LIVE_SYMS={us10:'^TNX',us30:'^TYX',gbpusd:'GBPUSD=X',eurusd:'EURUSD=X',eurgbp:'EURGBP=X',dxy:'DX-Y.NYB'};
async function loadRates(force){
 if(RATES.busy)return;if(!force&&RATES.data&&Date.now()-RATES.at<15*60e3){renderRates();return;}
 RATES.busy=true;renderRates();
 // the scheduled refresh pre-builds this every 30 minutes, so it opens instantly; the live source is the fallback
 const take=j=>{if(j&&Array.isArray(j.banks)&&j.banks.length){const us=(j.inflation||[]).filter(i=>i.id.startsWith('us'));if(us.length)store.set('wd.ratesUs',us);RATES.data=j;RATES.at=Date.now();RATES.err=false;store.set('wd.rates',j);return true;}return false;};
 let ok=false;
 if(!force)try{const j=await fetch('/data/rates.json?t='+Math.floor(Date.now()/3e5)).then(r=>r.ok?r.json():null);if(j&&Date.now()-Date.parse(j.fetched)<90*60e3)ok=take(j);}catch(e){}
 if(!ok)try{ok=take(await fetch('/.netlify/functions/rates'+(force?`?b=${Math.floor(Date.now()/12e4)}${usCpiDue()?'':'&nobls=1'}`:'')).then(r=>r.json()));
  // a live copy fetched without BLS keeps the last US inflation figures
  if(ok&&force&&!RATES.data.inflation.some(i=>i.id==='uscpi')){const c=store.get('wd.ratesUs',null);if(c){RATES.data.inflation=[...c,...RATES.data.inflation];}}}catch(e){}
 if(!ok)RATES.err=true;
 RATES.busy=false;if(!RATES.data){const c=store.get('wd.rates',null);if(c)RATES.data=c;}
 rSeenCheck();renderRates();loadRatesLive();
}
// a US CPI release in the last four hours: only then does a live refresh need BLS (its free API allows ~25 calls a day,
// and every device in a 2-minute slot shares one cached answer)
function usCpiDue(){const i=(RATES.data?.inflation||[]).find(x=>x.id==='uscpi');return !i||(i.next&&Date.parse(i.next)<Date.now()&&Date.now()-Date.parse(i.next)<4*3600e3);}
async function loadRatesLive(){
 if(Date.now()-rlAt<90e3)return;rlAt=Date.now();
 try{const j=await fetch('/.netlify/functions/quotes?s='+encodeURIComponent(Object.values(LIVE_SYMS).join(','))).then(r=>r.json());
  for(const k in LIVE_SYMS){const v=j[LIVE_SYMS[k]];if(v&&v.price!=null)RLIVE[k]={price:v.price,prev:v.prev,at:Date.now()};}}catch(e){}
 if(activeTab==='rates')renderRates();
}
/* what's new since you last looked: a new decision, a new inflation or mortgage figure */
function rKeys(d){const k={};(d.banks||[]).forEach(b=>{const l=b.decisions?.at(-1);if(l)k['bank:'+b.id]=l.date;});
 (d.inflation||[]).forEach(i=>k['infl:'+i.id]=i.date);(d.mortgages||[]).forEach(m=>k['mort:'+m.id]=m.date);return k;}
function rUnseen(){const d=RATES.data;if(!d||!RSEEN)return [];const k=rKeys(d);return Object.keys(k).filter(x=>RSEEN[x]&&k[x]>RSEEN[x]);}
/* after a scheduled release time passes, ask the live source every 2 minutes (from any tab) until the new figure
   shows up, then say so with a banner and the dot */
let rDueAt=0;
async function ratesDueCheck(){const d=RATES.data;if(!d||RATES.busy)return;const now=Date.now();
 const due=[...(d.banks||[]),...(d.mortgages||[]),...(d.inflation||[])].some(x=>x.next&&Date.parse(x.next)<now-60e3&&now-Date.parse(x.next)<4*3600e3);
 if(due&&now-rDueAt>110e3){rDueAt=now;await loadRates(true);}}
const RTOLD=new Set();
function rToast(d,keys){const msgs=keys.map(k=>{const[t,id]=k.split(':');
  if(t==='mort'){const m=d.mortgages.find(x=>x.id===id);return m&&`${m.name}: ${rp(m.value)}${m.prev!=null?` (${bps(m.value-m.prev)})`:''}`;}
  if(t==='infl'){const i=d.inflation.find(x=>x.id===id);return i&&`${i.name}: ${rp(i.value,1)}`;}
  if(t==='bank'){const b=d.banks.find(x=>x.id===id),l=b&&b.decisions.at(-1);return l&&`${b.short} ${l.change>0?'raised':'cut'} to ${bankRate(b)}`;}}).filter(Boolean);
 if(msgs.length)toast(msgs[0]+(msgs.length>1?` (+${msgs.length-1} more)`:''));}
function rSeenCheck(){const d=RATES.data;if(!d)return;const k=rKeys(d);
 const fresh=RSEEN?Object.keys(k).filter(x=>RSEEN[x]&&k[x]>RSEEN[x]&&!RTOLD.has(x+k[x])):[];
 if(fresh.length){fresh.forEach(x=>RTOLD.add(x+k[x]));rToast(d,fresh);}
 if(!RSEEN){RSEEN=k;store.set('wd.rseen',RSEEN);}else{let ch=false;for(const x in k)if(!RSEEN[x]){RSEEN[x]=k[x];ch=true;}if(ch)store.set('wd.rseen',RSEEN);}
 if(activeTab==='rates')rMarkSeen();updateRatesDot();}
function rMarkSeen(){const d=RATES.data;if(!d)return;const k=rKeys(d);let ch=false;for(const x in k)if(k[x]>(RSEEN[x]||'')){RFRESH.add(x);RSEEN[x]=k[x];ch=true;}if(ch)store.set('wd.rseen',RSEEN);}
function updateRatesDot(){const n=rUnseen().length,tab=document.querySelector('.tab[data-tab="rates"]');if(!tab)return;let dot=tab.querySelector('.ndot');
 if(n&&!dot){dot=document.createElement('i');dot.className='ndot';tab.appendChild(dot);}else if(!n&&dot)dot.remove();
 tab.setAttribute('aria-label','Macro'+(n?`, ${n} new update${n>1?'s':''}`:''));}

/* formatting */
const rp=(v,d=2)=>v==null||isNaN(v)?'—':(+v).toFixed(d)+'%';
const bps=x=>{const b=Math.round(x*100);return (b>0?'+':b<0?'−':'')+Math.abs(b)+' bp';};
const rcls=x=>x>0.0001?'down':x<-0.0001?'up':''; // rising rates are red, falling green
const rdate=d=>new Date(d.length===10?d+'T12:00:00Z':d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const rmonth=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric'});
const rwhen=iso=>new Date(iso).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
function cd(iso){const s=Math.max(0,(Date.parse(iso)-Date.now())/1000),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),sec=Math.floor(s%60);
 return s<=0?'Due now':d?`${d}d ${h}h ${String(m).padStart(2,'0')}m`:h?`${h}h ${String(m).padStart(2,'0')}m ${String(sec).padStart(2,'0')}s`:`${m}m ${String(sec).padStart(2,'0')}s`;}
const cdEl=(iso,cls='')=>iso?`<span class="rcd ${cls}" data-t="${esc(iso)}">${cd(iso)}</span>`:'';
function tickRates(){if(activeTab!=='rates')return;let due=false;document.querySelectorAll('#v-rates [data-t]').forEach(e=>{const t=cd(e.dataset.t);if(e.textContent!==t)e.textContent=t;if(Date.parse(e.dataset.t)<Date.now()-60e3)due=true;});
 if(due&&Date.now()-RATES.at>5*60e3)loadRates(true);}
function stance(b){const l=b.decisions?.at(-1);if(!l||Date.now()-Date.parse(l.date)>200*864e5)return ['amber','On hold'];return l.change>0?['red','Raising']:['green','Cutting'];}
const bankRate=b=>b.lo!=null?`${b.lo.toFixed(2)}–${b.hi.toFixed(2)}%`:rp(b.value);

/* a step chart of a policy rate, with each decision marked */
function stepChart(b){
 const s=b.series||[];if(s.length<2)return '';
 const t0=Date.parse(s[0][0]),t1=Date.now(),vals=s.map(p=>p[1]),mn=Math.min(0,...vals),mx=Math.max(...vals)*1.08||1;
 const X=t=>((t-t0)/(t1-t0)*300).toFixed(1),Y=v=>(66-(v-mn)/(mx-mn)*60).toFixed(1);
 let d=`M0 ${Y(s[0][1])}`;for(let i=1;i<s.length;i++)d+=` H${X(Date.parse(s[i][0]))} V${Y(s[i][1])}`;d+=` H300`;
 const dots=(b.decisions||[]).filter(x=>Date.parse(x.date)>=t0).map(x=>`<circle cx="${X(Date.parse(x.date))}" cy="${Y(x.value)}" r="2.6" class="${x.change>0?'dn':'up'}"/>`).join('');
 const yrs=[];for(let y=new Date(t0).getUTCFullYear()+1;y<=new Date(t1).getUTCFullYear();y++)yrs.push(y);
 return `<div class="rchart"><svg viewBox="0 0 300 78" preserveAspectRatio="none" aria-hidden="true"><path d="${d} V70 H0Z" class="area"/><path d="${d}" class="line"/>${dots}</svg><div class="rx">${yrs.map(y=>`<span style="left:${X(Date.UTC(y,0,1))/3}%">${y}</span>`).join('')}</div></div>`;
}
function fedOdds(b){
 const p=b.path||[];if(!p.length)return '';const n=p[0],when=new Date(n.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
 const hike=Math.round(n.hike*100),cut=Math.round(n.cut*100);
 const head=hike>=5?`<b class="down">${hike}%</b> chance of a 0.25-pt rise on ${when}`:cut>=5?`<b class="up">${cut}%</b> chance of a 0.25-pt cut on ${when}`:`No change expected on ${when}`;
 const bar=`<div class="odds"><i class="up" style="width:${cut}%"></i><i class="hold" style="width:${Math.max(0,100-cut-hike)}%"></i><i class="down" style="width:${hike}%"></i></div><div class="oddsk"><span>Cut ${cut}%</span><span>Hold ${Math.max(0,100-cut-hike)}%</span><span>Rise ${hike}%</span></div>`;
 const path=p.map(x=>{const mv=x.post-b.effective;return `<span><small>${new Date(x.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</small><b class="num">${x.post.toFixed(2)}%</b><em class="${rcls(mv)}">${Math.abs(mv)<0.005?'no change':bps(mv)}</em></span>`;}).join('');
 return `<div class="mom rodds"><div class="momh"><span>What markets expect</span></div><p class="oddsh">${head}</p>${bar}<div class="rpath">${path}</div><div class="hnote" style="margin-top:6px">From fed funds futures. The rate after each meeting is the market’s best guess, compared with today’s effective rate of ${rp(b.effective)}.</div></div>`;
}
/* Polymarket odds: betting markets on each meeting's outcome */
const pct0=x=>Math.round((x||0)*100)+'%';
const dshort=iso=>new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
function pmLead(p){return p.hike>=Math.max(p.hold,p.cut)?['down',`${pct0(p.hike)} rise`]:p.cut>=p.hold?['up',`${pct0(p.cut)} cut`]:['',`${pct0(p.hold)} hold`];}
function oddsHead(b){const p=(b.poly||[])[0],f=b.id==='fed'?(b.path||[])[0]:null;if(!p&&!f)return '';
 const parts=[];if(p){const[c,t]=pmLead(p);parts.push(`Polymarket <b class="${c}">${t}</b>`);}
 if(f){const h=Math.round(f.hike*100),c=Math.round(f.cut*100);parts.push(`futures <b class="${h>=5?'down':c>=5?'up':''}">${h>=5?h+'% rise':c>=5?c+'% cut':'hold'}</b>`);}
 return `<p class="oddsh" style="margin:10px 2px 0">${dshort((p||f).date)}: ${parts.join(' · ')}</p>`;}
function polyBlock(b){const ps=b.poly||[];if(!ps.length)return '';
 return `<div class="mom rodds"><div class="momh"><span>Polymarket odds</span><a class="pmlink" href="${esc(ps[0].url)}" target="_blank" rel="noopener">Open ↗</a></div>${ps.map(p=>{const tot=p.cut+p.hold+p.hike||1,c=p.cut/tot*100,h=p.hold/tot*100,r=p.hike/tot*100;
  return `<div class="pmm"><div class="pmd"><b>${dshort(p.date)}</b><span>$${(p.vol/1e6>=1?(p.vol/1e6).toFixed(1)+'m':Math.round(p.vol/1e3)+'k')} traded</span></div><div class="odds"><i class="up" style="width:${c}%"></i><i class="hold" style="width:${h}%"></i><i class="down" style="width:${r}%"></i></div><div class="oddsk"><span>Cut ${pct0(p.cut)}</span><span>Hold ${pct0(p.hold)}</span><span>Rise ${pct0(p.hike)}</span></div>
  <div class="pmo">${p.outcomes.filter(o=>o.p>=0.005).sort((x,y)=>y.p-x.p).map(o=>`<span>${esc(o.label)} <b>${pct0(o.p)}</b></span>`).join('')}</div></div>`;}).join('')}<div class="hnote" style="margin-top:6px">People betting real money on the outcome. Odds can move fast; ${b.id==='fed'?'compare with the futures above, which are what professional traders pay.':'there are no free futures prices for this bank.'}</div></div>`;}
function fedHead(b){const n=(b.path||[])[0];if(!n)return '';const when=new Date(n.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}),h=Math.round(n.hike*100),c=Math.round(n.cut*100);
 return `<p class="oddsh" style="margin:10px 2px 0">Markets: ${h>=5?`<b class="down">${h}%</b> chance of a rise on ${when}`:c>=5?`<b class="up">${c}%</b> chance of a cut on ${when}`:`no change expected on ${when}`}</p>`;}
function bankCard(b){
 const [sc,sw]=stance(b),l=b.decisions?.at(-1),key='bank:'+b.id,nw=RFRESH.has(key),open=REXP.has(b.id);
 const last=l?`Last move: <b class="${rcls(l.change/100)}">${l.change>0?'+':'−'}${Math.abs(l.change/100).toFixed(2)} pts</b> on ${rdate(l.date)}`:'No change since 2022';
 const hist=(b.decisions||[]).slice().reverse().map(x=>`<div class="rdec"><span>${rdate(x.date)}</span><b class="${rcls(x.change/100)}">${x.change>0?'Raised':'Cut'} ${Math.abs(x.change/100).toFixed(2)} pts</b><span class="num">to ${b.id==='fed'&&x.lo!=null?x.lo.toFixed(2)+'–'+x.value.toFixed(2)+'%':rp(x.value)}</span></div>`).join('');
 return `<div class="card hreg rbank${nw?' isnew':''}" id="rb-${b.id}"><div class="hh"><span class="fl">${b.flag}</span><h3>${esc(b.name)}</h3><span class="sig ${sc}">${sw}</span></div>
  <div class="rbig"><div><small>${esc(b.what)}${nw?'<span class="newtag">New</span>':''}</small><b class="num">${bankRate(b)}</b></div>${b.real!=null?`<div class="rreal"><small>Real rate</small><b class="num ${b.real>0?'':'up'}">${b.real>0?'+':''}${b.real.toFixed(2)}%</b><span>after inflation</span></div>`:''}</div>
  ${b.next?`<div class="rnext"><div><small>Next decision</small><b>${rwhen(b.next)}</b></div>${cdEl(b.next,'big')}</div>`:''}
  ${!open?oddsHead(b):''}
  <div class="more"${open?'':' hidden'}><div class="why">${last}${b.effective!=null?` · effective rate ${rp(b.effective)}`:''}.</div>
  ${b.id==='fed'?fedOdds(b):''}${polyBlock(b)}${stepChart(b)}
  <div class="subh">Decisions since 2022</div>${hist||'<div class="hnote">No changes.</div>'}<div class="subh">Coming meetings</div><div class="rmeet">${(b.meetings||[]).map(m=>`<span>${new Date(m).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})}</span>`).join('')}</div><div class="hnote">${esc(b.note||'')}</div></div>
  <button class="morebtn" data-rexp="${b.id}" aria-expanded="${open}">${open?'Show less':'Details · market odds, history and dates'}<span class="ch">▾</span></button></div>`;
}
/* rows in the Health style: label, value, change, sparkline; tap for source and next update */
function rRow(o){
 const key=o.key,nw=key&&RFRESH.has(key);
 return `<div class="hm${nw?' isnew':''}"><button class="hmb" aria-expanded="false"><span class="ml">${o.flag?o.flag+' ':''}${esc(o.name)}${nw?'<span class="newtag">New</span>':''}${o.live?'<span class="rlive">Live</span>':''}</span>
  <span class="mvl"><span class="hval num">${o.val}</span>${o.chg?`<span class="hchg">${o.chg}</span>`:''}</span>
  <span class="spk"><svg viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true" data-rsp="${esc(o.id)}" data-v="${o.trend>0?'--down':o.trend<0?'--up':'--muted'}"></svg>${o.next?`<small>Next ${cdEl(o.next)}</small>`:o.sub?`<small>${esc(o.sub)}</small>`:''}</span></button>
  <div class="md" hidden>${o.detail}</div></div>`;
}
const RSER={};
function secCard(id,icon,title,why,items,rowsHtml,extra=''){
 const open=REXP.has(id),nw=items.some(o=>o.key&&RFRESH.has(o.key));
 const tiles=`<div class="rtiles">${items.map(o=>`<button class="rtile${o.key&&RFRESH.has(o.key)?' isnew':''}" data-rexp="${id}"><small>${o.flag?o.flag+' ':''}${esc(o.short||o.name)}</small><b class="num">${o.val}</b><span>${o.chgShort||''}</span>${o.next?`<em>Next in ${cdEl(o.next)}</em>`:''}</button>`).join('')}</div>`;
 return `<div class="card hreg" id="${id}"><div class="hh"><span class="fl">${icon}</span><h3>${esc(title)}</h3>${nw?'<span class="newtag">New</span>':''}${id==='rfx'?'<span class="rlive">Live</span>':''}</div>${why?`<div class="why">${why}</div>`:''}
  ${open?rowsHtml:tiles}${extra}${rowsHtml?`<button class="morebtn" data-rexp="${id}" aria-expanded="${open}">${open?'Show less':'Details · charts and sources'}<span class="ch">▾</span></button>`:''}</div>`;
}
/* recession radar: six FRED warning signals scored 0 (calm) to 100 (recession-like), built by the scheduled refresh */
let RADAR={data:null,at:0};
async function loadRadar(){if(Date.now()-RADAR.at<30*60e3)return;RADAR.at=Date.now();
 try{const j=await fetch('/data/radar.json?t='+Math.floor(Date.now()/9e5)).then(r=>r.ok?r.json():null);if(j&&j.signals){RADAR.data=j;if(activeTab==='rates')renderRates();}}catch(e){RADAR.at=0;}}
const RADC={green:'--up',amber:'--amber',red:'--down'};
function radarVal(x){return x.unit==='%'?x.value.toFixed(2)+'%':x.unit==='k'?Math.round(x.value)+'k':x.unit==='pts'?(x.value>0?'+':'')+x.value.toFixed(2):x.value.toFixed(2);}
function radarCard(){
 const R=RADAR.data;if(!R||R.score==null)return '';
 const lt=R.score<35?'green':R.score<65?'amber':'red',open=REXP.has('rrad'),dir=R.m3!=null?R.score-R.m3:0;
 const items=R.signals.map(x=>{RSER['rad:'+x.id]=x.series;const ch=x.prev!=null?x.score-x.prev:0;
  return {id:'rad:'+x.id,name:x.name,short:x.short,val:radarVal(x),light:x.light,
   chg:`<b class="rl ${x.light}">${x.light==='green'?'Calm':x.light==='amber'?'Watch':'Warning'}</b>`,chgShort:`<i class="rdot ${x.light}"></i>${x.light==='green'?'Calm':x.light==='amber'?'Watch':'Warning'}`,
   trend:ch>5?1:ch<-5?-1:0,sub:`score ${x.score}`,
   detail:`${esc(x.what)}<br><b>Risk score ${x.score}/100</b>${x.prev!=null?` (${x.prev} three months ago)`:''} · latest ${esc(x.date)} · FRED ${esc(x.fred)}`};});
 RSER['rad:all']=R.history;
 const tiles=`<div class="rtiles">${items.map(o=>`<button class="rtile" data-rexp="rrad"><small>${esc(o.short)}</small><b class="num">${o.val}</b><span>${o.chgShort}</span></button>`).join('')}</div>`;
 const rows=items.map(o=>rRow({...o,name:o.name})).join('');
 return `<div class="card hreg" id="rrad"><div class="hh"><span class="fl">🧭</span><h3>Recession radar</h3><span class="sig ${lt}">${R.label} risk</span></div>
  <div class="why">Six US warning signals that have flashed before past recessions, from the St. Louis Fed (FRED). Each is scored from 0 (calm) to 100 (recession-like).</div>
  <div class="radh"><div class="rads"><b class="num" style="color:var(${RADC[lt]})">${R.score}</b><span>/100</span><small>${dir>3?'▲ rising':dir<-3?'▼ easing':'steady'} · 3 months ago ${R.m3??'–'} · a year ago ${R.y1??'–'}</small></div>
  <div class="radc"><svg viewBox="0 0 100 26" preserveAspectRatio="none" aria-label="Radar score over five years" data-rsp="rad:all" data-v="${RADC[lt]}"></svg><small>Last 5 years</small></div></div>
  ${open?rows:tiles}<button class="morebtn" data-rexp="rrad" aria-expanded="${open}">${open?'Show less':'Details · what each signal means'}<span class="ch">▾</span></button></div>`;
}
/* liquidity tracker: Fed balance sheet minus the Treasury's account and reverse repo (FRED), against S&P and bitcoin */
let LIQ={data:null,at:0},liqAsset=store.get('wd.liqa','spx');
async function loadLiq(){if(Date.now()-LIQ.at<30*60e3)return;LIQ.at=Date.now();
 try{const j=await fetch('/data/liquidity.json?t='+Math.floor(Date.now()/9e5)).then(r=>r.ok?r.json():null);if(j&&j.rows){LIQ.data=j;if(activeTab==='rates')renderRates();}}catch(e){LIQ.at=0;}}
const tnbn=v=>v==null?'–':Math.abs(v)>=1000?'$'+(v/1000).toFixed(2)+'tn':'$'+Math.round(v)+'bn';
const sbn=v=>v==null?'–':(v>0?'+':v<0?'−':'')+tnbn(Math.abs(v));
function liqChart(L){
 const rows=L.rows,a=L.assets[liqAsset],W=320,H=150,P=6,n=rows.length;
 const line=(vals,col,w,dash)=>{const v=vals.filter(x=>x!=null);if(v.length<2)return '';const mn=Math.min(...v),mx=Math.max(...v),r=mx-mn||1;
  let d='',pen=false;vals.forEach((x,i)=>{if(x==null){pen=false;return;}const X=P+i/(n-1)*(W-2*P),Y=P+(1-(x-mn)/r)*(H-2*P-14);d+=(pen?'L':'M')+X.toFixed(1)+' '+Y.toFixed(1);pen=true;});
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" ${dash?'stroke-dasharray="4 3"':''} stroke-linejoin="round"/>`;};
 const yrs=[...new Set(rows.map(r=>r[0].slice(0,4)))].map(y=>{const i=rows.findIndex(r=>r[0].startsWith(y));return i>0?`<text x="${(P+i/(n-1)*(W-2*P)).toFixed(1)}" y="${H-2}" class="gt" text-anchor="middle">${y}</text>`:'';}).join('');
 return `<svg class="liqc" viewBox="0 0 ${W} ${H}" aria-label="Net liquidity against ${liqAsset==='btc'?'bitcoin':'the S&P 500'}">${line(rows.map(r=>r[1]),'var(--accent)',2.2)}${a?line(a.px,liqAsset==='btc'?'#f2a900':'var(--muted)',1.6,true):''}${yrs}</svg>`;
}
function liqCard(){
 const L=LIQ.data;if(!L)return '';
 const lt=L.trend==='rising'?'green':L.trend==='falling'?'red':'amber',a=L.assets[liqAsset],open=REXP.has('rliq');
 const cor=a?.corr,corTxt=cor==null?'':Math.abs(cor)<.2?'have barely moved together':cor>0?`have tended to move together (correlation ${cor.toFixed(2)})`:`have tended to move in opposite directions (correlation ${cor.toFixed(2)})`;
 return `<div class="card hreg" id="rliq"><div class="hh"><span class="fl">💧</span><h3>Liquidity</h3><span class="sig ${lt}">${L.trend[0].toUpperCase()+L.trend.slice(1)}</span></div>
  <div class="why">Cash the Fed has put into the financial system and left there: its balance sheet, minus money parked in the Treasury’s account and the Fed’s reverse repo. When it rises, stocks and crypto have tended to do well.</div>
  <div class="radh"><div class="rads"><b class="num" style="color:var(--accent)">${tnbn(L.net)}</b><small>net liquidity · ${rdate(L.date)}</small></div>
   <div class="liqch"><span>4 weeks <b class="num ${L.w4>0?'up':L.w4<0?'down':''}">${sbn(L.w4)}</b></span><span>3 months <b class="num ${L.w13>0?'up':L.w13<0?'down':''}">${sbn(L.w13)}</b></span><span>1 year <b class="num ${L.w52>0?'up':L.w52<0?'down':''}">${sbn(L.w52)}</b></span></div></div>
  <div class="seg liqseg" role="group" aria-label="Compare with"><button data-liqa="spx" class="${liqAsset==='spx'?'on':''}">vs S&amp;P 500</button><button data-liqa="btc" class="${liqAsset==='btc'?'on':''}">vs Bitcoin</button></div>
  ${liqChart(L)}
  <div class="liqk"><span><i style="background:var(--accent)"></i>Net liquidity</span><span><i style="background:${liqAsset==='btc'?'#f2a900':'var(--muted)'}"></i>${liqAsset==='btc'?'Bitcoin':'S&amp;P 500'} (dashed)</span><span>3 years, weekly</span></div>
  ${corTxt?`<div class="hnote">Over three years, 3-month moves in liquidity and ${liqAsset==='btc'?'bitcoin':'the S&amp;P'} ${corTxt}.</div>`:''}
  ${open?`<div class="rtiles" style="margin-top:10px"><div class="rtile"><small>Fed balance sheet</small><b class="num">${tnbn(L.fed)}</b><span>what the Fed holds</span></div><div class="rtile"><small>Treasury account</small><b class="num">${tnbn(L.tga)}</b><span>takes cash out</span></div><div class="rtile"><small>Reverse repo</small><b class="num">${tnbn(L.rrp)}</b><span>takes cash out</span></div></div>
   <div class="hnote">The Fed's holdings shrink while it runs down its bond portfolio ("quantitative tightening"). The Treasury account swings with tax receipts and borrowing; the reverse repo is spare cash money-market funds park at the Fed. Source: FRED (WALCL, WTREGEN, RRPONTSYD), weekly on Wednesdays.</div>`:''}
  <button class="morebtn" data-rexp="rliq" aria-expanded="${open}">${open?'Show less':'Details · what makes it up'}<span class="ch">▾</span></button></div>`;
}
function renderRates(){
 loadRadar();loadLiq();
 if(activeTab!=='rates')return;const d=RATES.data;
 $('ratesStatus').innerHTML=d?`<span>Updated <b>${timeAgo(d.fetched)}</b></span>${RATES.err?'<span class="bad">Couldn’t refresh; showing the last copy</span>':''}${RATES.busy?'<span>Refreshing…</span>':''}${(d.errors||[]).length?`<span class="bad">${d.errors.length} source${d.errors.length>1?'s':''} not answering</span>`:''}`:'';
 if(!d){$('ratesBox').innerHTML=`<div class="empty" style="margin-top:12px">${RATES.err?'Rates can’t load in this viewer.':'Loading rates…'}</div>`;return;}
 const B=d.banks||[],fed=B.find(b=>b.id==='fed');
 // brief
 const moves=B.map(b=>{const[sc,sw]=stance(b);return `${b.short} ${sw==='On hold'?'on hold at':sw==='Raising'?'raising, now':'cutting, now'} ${bankRate(b)}`;});
 const ups=B.filter(b=>stance(b)[1]==='Raising').length,downs=B.filter(b=>stance(b)[1]==='Cutting').length;
 const head=ups>downs?'Interest rates are going up.':downs>ups?'Interest rates are coming down.':'Central banks are mostly holding rates.';
 const fp=fed?.path?.[0],fodd=fp?(fp.hike>=.05?`Markets see a ${Math.round(fp.hike*100)}% chance the Fed raises rates on ${new Date(fp.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`:fp.cut>=.05?`Markets see a ${Math.round(fp.cut*100)}% chance the Fed cuts on ${new Date(fp.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`:'Markets expect the Fed to hold at its next meeting'):'';
 const pmb=B.filter(b=>b.id!=='fed'&&b.poly&&b.poly[0]).map(b=>`${b.short} ${pmLead(b.poly[0])[1]} on ${dshort(b.poly[0].date)}`);
 const us10=d.yields.find(y=>y.id==='us10'),m30=d.mortgages.find(m=>m.id==='us30m'),uk2=d.mortgages.find(m=>m.id==='IUMBV34');
 const bul=[`<li><b>Central banks</b> ${esc(moves.join(', '))}</li>`,(fodd||pmb.length)?`<li><b>Expectations</b> ${esc([fodd,pmb.length?'Polymarket: '+pmb.join(', '):''].filter(Boolean).join('. '))}</li>`:'',
  RADAR.data?.score!=null?`<li><b>Recession risk</b> ${RADAR.data.score}/100 on the radar below (${esc(RADAR.data.label.toLowerCase())}${RADAR.data.signals.filter(x=>x.light==='red').length?`; warning from ${esc(RADAR.data.signals.filter(x=>x.light==='red').map(x=>x.short.toLowerCase()).join(', '))}`:''})</li>`:'',
  LIQ.data?`<li><b>Liquidity</b> ${esc(LIQ.data.trend)}: ${tnbn(LIQ.data.net)} net, ${sbn(LIQ.data.w13)} over 3 months</li>`:'',
  us10?`<li><b>Borrowing costs</b> US 10-year at ${rp(us10.value)} (${bps(us10.value-us10.y1)} on a year)${m30?`, US mortgages ${rp(m30.value)}`:''}${uk2?`, UK 2-year fixes ${rp(uk2.value)}`:''}</li>`:''].join('');
 const ev=[];B.forEach(b=>b.next&&ev.push([b.next,`${b.flag} ${b.short} decision`,'#rb-'+b.id]));
 (d.inflation||[]).filter(i=>i.next&&i.id!=='uscore').forEach(i=>ev.push([i.next,`${i.flag} ${i.id==='uscpi'?'US':i.id==='eahicp'?'Euro':'UK'} inflation`,'#rinfl']));
 const mn=d.mortgages.find(m=>m.next);if(mn)ev.push([mn.next,'🇺🇸 Mortgage rates','#rmort']);
 ev.sort((a,b)=>Date.parse(a[0])-Date.parse(b[0]));
 const brief=`<div class="brief"><div class="bh"><span>🏦 In brief</span><span class="sig ${ups>downs?'red':downs>ups?'green':'amber'}">${ups>downs?'Rising':downs>ups?'Falling':'Holding'}</span></div><p>${esc(head)}</p><ul>${bul}</ul></div>`;
 const next=`<div class="subh" style="margin-top:4px">Next to change</div><div class="rev">${ev.slice(0,6).map(([t,l,j])=>`<button data-jump="${j}"><small>${esc(l)}</small><b>${new Date(t).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</b>${cdEl(t)}</button>`).join('')}</div>`;
 // yields
 const yI=d.yields.map(y=>{const lv=RLIVE[y.id],v=lv&&Date.now()-lv.at<15*60e3?lv.price:y.value,ch=v-(y.w1??v);RSER[y.id]=y.series;
  return {id:y.id,name:y.name,short:y.name.replace(' gilt','').replace('Euro area','Euro'),val:rp(v),chg:`<b class="${rcls(ch)}">${bps(ch)}</b> in a week`,chgShort:`<b class="${rcls(ch)}">${bps(ch)}</b> 1w`,trend:v-(y.m1??v),live:!!lv,sub:y.y1!=null?`${bps(v-y.y1)} on a year`:'',detail:`<b>${esc(y.name)} government bond yield</b><br>${lv?'Live price, with the official close of '+rp(y.value)+' on '+rdate(y.date):'Official close on '+rdate(y.date)} · ${esc(y.src)}<br>A year ago ${rp(y.y1)}, a month ago ${rp(y.m1)}.`};});
 const cv=d.curve?`<div class="rcurve"><span>US 2s10s curve</span><b class="num">${d.curve.us>0?'+':''}${d.curve.us.toFixed(2)} pts</b><em>${d.curve.us<0?'Inverted: often a recession warning':'Normal: long rates above short'}</em></div>`:'';
 // mortgages
 const mI=d.mortgages.map(m=>{const ch=m.prev!=null?m.value-m.prev:0,per=m.freq.startsWith('Weekly')?'w/w':'m/m';RSER[m.id]=m.series;
  return {id:m.id,key:'mort:'+m.id,flag:m.flag,name:m.name.replace(/^(US|UK) /,''),short:m.name.replace(/^(US|UK) /,'').replace(' (75% LTV)',''),val:rp(m.value),chg:m.prev!=null?`<b class="${rcls(ch)}">${bps(ch)}</b> ${per}`:'',chgShort:m.prev!=null?`<b class="${rcls(ch)}">${bps(ch)}</b> ${per}`:'',trend:m.value-(m.y1??m.value),next:m.next,sub:m.freq,
   detail:`<b>${esc(m.name)}</b><br>${m.id.startsWith('IUMBV')?rmonth(m.date):'Week to '+rdate(m.date)} · ${esc(m.src)} · ${esc(m.freq)}${m.next?'<br>Next figure '+rwhen(m.next):''}<br>A year ago ${rp(m.y1)}.`};});
 // inflation
 const iI=(d.inflation||[]).map(i=>{const ch=i.prev!=null?i.value-i.prev:0;RSER[i.id]=i.series;
  const stale=i.est?'<br><i>Estimated: BLS published no yearly rate for this month because no prices were collected a year earlier (2025 shutdown). The year-ago level is taken as the average of the months either side, as BLS suggests.</i>':'';
  const nm=(n=>n.charAt(0).toUpperCase()+n.slice(1))(i.name.replace(/^(US|UK) /,''));
  return {id:i.id,key:'infl:'+i.id,flag:i.flag,name:nm,short:nm.replace(' (CPI)',''),val:(i.est?'≈':'')+rp(i.value,1),chg:i.prev!=null?`<b class="${rcls(ch)}">${ch>0?'+':ch<0?'−':''}${Math.abs(ch).toFixed(1)} pts</b> · target 2%`:'',chgShort:`${rmonth(i.date).split(' ')[0]}`,trend:ch,next:i.next,sub:i.freq||'',
   detail:`<b>${esc(i.name)}</b>, 12-month rate<br>${rmonth(i.date)} · ${esc(i.src)}${i.next?'<br>Next figure '+rwhen(i.next):''}${stale}`};});
 // currencies
 const FX=[['gbpusd','🇬🇧🇺🇸 Pound in dollars','£ in $',4],['eurusd','🇪🇺🇺🇸 Euro in dollars','€ in $',4],['eurgbp','🇪🇺🇬🇧 Euro in pounds','€ in £',4],['dxy','🇺🇸 Dollar index','Dollar index',2]];
 const fI=FX.map(([k,n,sh,dp])=>{const v=RLIVE[k];if(!v)return null;const ch=v.prev?(v.price/v.prev-1)*100:null;return {n,short:sh,val:v.price.toFixed(dp),ch,chgShort:ch==null?'':`<b class="${ch>0?'upt':ch<0?'dnt':''}">${fmtPct(ch)}</b> today`};}).filter(Boolean);
 const fxRows=fI.map(o=>`<div class="rfx"><span>${o.n}</span><b class="num">${o.val}</b><em class="${o.ch>0?'upt':o.ch<0?'dnt':''}">${o.ch==null?'':fmtPct(o.ch)}</em></div>`).join('');
 $('ratesBox').innerHTML=brief+next+B.map(bankCard).join('')+radarCard()+liqCard()
  +secCard('ryld','📈','Bond yields','What governments pay to borrow. Mortgage rates follow these.',yI,yI.map(rRow).join('')+cv,REXP.has('ryld')?'':cv)
  +secCard('rmort','🏠','Mortgage rates','',mI,mI.map(rRow).join(''))
  +secCard('rinfl','🛒','Inflation','Central banks aim for 2%. Above that, rates tend to stay high.',iI,iI.map(rRow).join(''))
  +(fI.length?`<div class="card hreg" id="rfx"><div class="hh"><span class="fl">💱</span><h3>Currencies</h3><span class="rlive">Live</span></div><div class="rtiles">${fI.map(o=>`<div class="rtile"><small>${esc(o.short)}</small><b class="num">${o.val}</b><span>${o.chgShort}</span></div>`).join('')}</div></div>`:'');
 $('ratesBox').querySelectorAll('svg[data-rsp]').forEach(s=>spark(s,(RSER[s.dataset.rsp]||[]).map(p=>p[1]),s.dataset.v));
 updateRatesDot();
}
$('ratesBox').addEventListener('click',e=>{
 const la=e.target.closest('[data-liqa]');if(la){liqAsset=la.dataset.liqa;store.set('wd.liqa',liqAsset);buzz();renderRates();return;}
 const x=e.target.closest('[data-rexp]');if(x){const id=x.dataset.rexp;REXP.has(id)?REXP.delete(id):REXP.add(id);buzz();renderRates();return;}
 const j=e.target.closest('[data-jump]');if(j){const el=document.querySelector(j.dataset.jump);if(el){buzz();el.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1200);}return;}
 const b=e.target.closest('.hmb');if(b){const r=b.parentElement,md=r.querySelector('.md'),o=md.hidden;md.hidden=!o;r.classList.toggle('open',o);b.setAttribute('aria-expanded',o);buzz();}
});
$('ratesRefresh').addEventListener('click',async e=>{const b=e.currentTarget;b.classList.remove('spin');void b.offsetWidth;b.classList.add('spin');buzz();rlAt=0;await loadRates(true);toast('Macro refreshed');});
