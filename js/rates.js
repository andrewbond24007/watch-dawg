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
 try{const j=await fetch('/.netlify/functions/rates'+(force?'?t='+Date.now():'')).then(r=>r.json());if(j&&Array.isArray(j.banks)){RATES.data=j;RATES.at=Date.now();RATES.err=false;store.set('wd.rates',j);}}
 catch(e){RATES.err=true;}
 RATES.busy=false;if(!RATES.data){const c=store.get('wd.rates',null);if(c)RATES.data=c;}
 rSeenCheck();renderRates();loadRatesLive();
}
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
function rSeenCheck(){const d=RATES.data;if(!d)return;const k=rKeys(d);
 if(!RSEEN){RSEEN=k;store.set('wd.rseen',RSEEN);}else{let ch=false;for(const x in k)if(!RSEEN[x]){RSEEN[x]=k[x];ch=true;}if(ch)store.set('wd.rseen',RSEEN);}
 if(activeTab==='rates')rMarkSeen();updateRatesDot();}
function rMarkSeen(){const d=RATES.data;if(!d)return;const k=rKeys(d);let ch=false;for(const x in k)if(k[x]>(RSEEN[x]||'')){RFRESH.add(x);RSEEN[x]=k[x];ch=true;}if(ch)store.set('wd.rseen',RSEEN);}
function updateRatesDot(){const n=rUnseen().length,tab=document.querySelector('.tab[data-tab="rates"]');if(!tab)return;let dot=tab.querySelector('.ndot');
 if(n&&!dot){dot=document.createElement('i');dot.className='ndot';tab.appendChild(dot);}else if(!n&&dot)dot.remove();
 tab.setAttribute('aria-label','Rates'+(n?`, ${n} new update${n>1?'s':''}`:''));}

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
function bankCard(b){
 const [sc,sw]=stance(b),l=b.decisions?.at(-1),key='bank:'+b.id,nw=RFRESH.has(key),open=REXP.has(b.id);
 const last=l?`Last move: <b class="${rcls(l.change/100)}">${l.change>0?'+':'−'}${Math.abs(l.change/100).toFixed(2)} pts</b> on ${rdate(l.date)}`:'No change since 2022';
 const hist=(b.decisions||[]).slice().reverse().map(x=>`<div class="rdec"><span>${rdate(x.date)}</span><b class="${rcls(x.change/100)}">${x.change>0?'Raised':'Cut'} ${Math.abs(x.change/100).toFixed(2)} pts</b><span class="num">to ${b.id==='fed'&&x.lo!=null?x.lo.toFixed(2)+'–'+x.value.toFixed(2)+'%':rp(x.value)}</span></div>`).join('');
 return `<div class="card hreg rbank${nw?' isnew':''}" id="rb-${b.id}"><div class="hh"><span class="fl">${b.flag}</span><h3>${esc(b.name)}</h3><span class="sig ${sc}">${sw}</span></div>
  <div class="rbig"><div><small>${esc(b.what)}${nw?'<span class="newtag">New</span>':''}</small><b class="num">${bankRate(b)}</b></div>${b.real!=null?`<div class="rreal"><small>Real rate</small><b class="num ${b.real>0?'':'up'}">${b.real>0?'+':''}${b.real.toFixed(2)}%</b><span>after inflation</span></div>`:''}</div>
  <div class="why">${last}${b.effective!=null?` · effective rate ${rp(b.effective)}`:''}.</div>
  ${b.next?`<div class="rnext"><div><small>Next decision</small><b>${rwhen(b.next)}</b></div>${cdEl(b.next,'big')}</div>`:''}
  ${b.id==='fed'?fedOdds(b):''}
  ${stepChart(b)}
  <div class="more"${open?'':' hidden'}><div class="subh">Decisions since 2022</div>${hist||'<div class="hnote">No changes.</div>'}<div class="subh">Coming meetings</div><div class="rmeet">${(b.meetings||[]).map(m=>`<span>${new Date(m).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})}</span>`).join('')}</div><div class="hnote">${esc(b.note||'')}</div></div>
  <button class="morebtn" data-rexp="${b.id}" aria-expanded="${open}">${open?'Show less':'Decision history and dates'}<span class="ch">▾</span></button></div>`;
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
function renderRates(){
 if(activeTab!=='rates')return;const d=RATES.data;
 $('ratesStatus').innerHTML=d?`<span>Updated <b>${timeAgo(d.fetched)}</b></span>${RATES.err?'<span class="bad">Couldn’t refresh; showing the last copy</span>':''}${RATES.busy?'<span>Refreshing…</span>':''}${(d.errors||[]).length?`<span class="bad">${d.errors.length} source${d.errors.length>1?'s':''} not answering</span>`:''}`:'';
 if(!d){$('ratesBox').innerHTML=`<div class="empty" style="margin-top:12px">${RATES.err?'Rates can’t load in this viewer.':'Loading rates…'}</div>`;return;}
 const B=d.banks||[],fed=B.find(b=>b.id==='fed');
 // brief
 const moves=B.map(b=>{const[sc,sw]=stance(b);return `${b.short} ${sw==='On hold'?'on hold at':sw==='Raising'?'raising, now':'cutting, now'} ${bankRate(b)}`;});
 const ups=B.filter(b=>stance(b)[1]==='Raising').length,downs=B.filter(b=>stance(b)[1]==='Cutting').length;
 const head=ups>downs?'Interest rates are going up.':downs>ups?'Interest rates are coming down.':'Central banks are mostly holding rates.';
 const fp=fed?.path?.[0],fodd=fp?(fp.hike>=.05?`Markets see a ${Math.round(fp.hike*100)}% chance the Fed raises rates on ${new Date(fp.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`:fp.cut>=.05?`Markets see a ${Math.round(fp.cut*100)}% chance the Fed cuts on ${new Date(fp.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`:'Markets expect the Fed to hold at its next meeting'):'';
 const us10=d.yields.find(y=>y.id==='us10'),m30=d.mortgages.find(m=>m.id==='us30m'),uk2=d.mortgages.find(m=>m.id==='IUMBV34');
 const bul=[`<li><b>Central banks</b> ${esc(moves.join(', '))}</li>`,fodd?`<li><b>Expectations</b> ${esc(fodd)}</li>`:'',
  us10?`<li><b>Borrowing costs</b> US 10-year at ${rp(us10.value)} (${bps(us10.value-us10.y1)} on a year)${m30?`, US mortgages ${rp(m30.value)}`:''}${uk2?`, UK 2-year fixes ${rp(uk2.value)}`:''}</li>`:''].join('');
 const ev=[];B.forEach(b=>b.next&&ev.push([b.next,`${b.flag} ${b.short} decision`,'#rb-'+b.id]));
 (d.inflation||[]).filter(i=>i.next&&i.id!=='uscore').forEach(i=>ev.push([i.next,`${i.flag} ${i.id==='uscpi'?'US':'UK'} inflation`,'#rinfl']));
 const mn=d.mortgages.find(m=>m.next);if(mn)ev.push([mn.next,'🇺🇸 Mortgage rates','#rmort']);
 ev.sort((a,b)=>Date.parse(a[0])-Date.parse(b[0]));
 const brief=`<div class="brief"><div class="bh"><span>🏦 In brief</span><span class="sig ${ups>downs?'red':downs>ups?'green':'amber'}">${ups>downs?'Rising':downs>ups?'Falling':'Holding'}</span></div><p>${esc(head)}</p><ul>${bul}</ul></div>`;
 const next=`<div class="subh" style="margin-top:4px">Next to change</div><div class="rev">${ev.slice(0,6).map(([t,l,j])=>`<button data-jump="${j}"><small>${esc(l)}</small><b>${new Date(t).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</b>${cdEl(t)}</button>`).join('')}</div>`;
 // yields
 const yrows=d.yields.map(y=>{const lv=RLIVE[y.id],v=lv&&Date.now()-lv.at<15*60e3?lv.price:y.value,ch=v-(y.w1??v);RSER[y.id]=y.series;
  return rRow({id:y.id,name:y.name,val:rp(v),chg:`<b class="${rcls(ch)}">${bps(ch)}</b> in a week`,trend:v-(y.m1??v),live:!!lv,sub:y.y1!=null?`${bps(v-y.y1)} on a year`:'',detail:`<b>${esc(y.name)} government bond yield</b><br>${lv?'Live price, with the official close of '+rp(y.value)+' on '+rdate(y.date):'Official close on '+rdate(y.date)} · ${esc(y.src)}<br>A year ago ${rp(y.y1)}, a month ago ${rp(y.m1)}.`});}).join('');
 const cv=d.curve?`<div class="rcurve"><span>US 2s10s curve</span><b class="num">${d.curve.us>0?'+':''}${d.curve.us.toFixed(2)} pts</b><em>${d.curve.us<0?'Inverted: often a recession warning':'Normal: long rates above short'}</em></div>`:'';
 // mortgages
 const mrows=d.mortgages.map(m=>{const ch=m.prev!=null?m.value-m.prev:0;RSER[m.id]=m.series;
  return rRow({id:m.id,key:'mort:'+m.id,flag:m.flag,name:m.name.replace(/^(US|UK) /,''),val:rp(m.value),chg:m.prev!=null?`<b class="${rcls(ch)}">${bps(ch)}</b> ${m.freq.startsWith('Weekly')?'w/w':'m/m'}`:'',trend:m.value-(m.y1??m.value),next:m.next,sub:m.freq,
   detail:`<b>${esc(m.name)}</b><br>${m.id.startsWith('IUMBV')?rmonth(m.date):'Week to '+rdate(m.date)} · ${esc(m.src)} · ${esc(m.freq)}${m.next?'<br>Next figure '+rwhen(m.next):''}<br>A year ago ${rp(m.y1)}.`});}).join('');
 // inflation
 const irows=(d.inflation||[]).map(i=>{const ch=i.prev!=null?i.value-i.prev:0;RSER[i.id]=i.series;
  const stale=i.id.startsWith('us')&&i.date==='2026-09-01'?'<br><i>October’s yearly rate wasn’t published: there is no October 2025 figure to compare with after last year’s shutdown.</i>':'';
  return rRow({id:i.id,key:'infl:'+i.id,flag:i.flag,name:(n=>n.charAt(0).toUpperCase()+n.slice(1))(i.name.replace(/^(US|UK) /,'')),val:rp(i.value,1),chg:i.prev!=null?`<b class="${rcls(ch)}">${ch>0?'+':ch<0?'−':''}${Math.abs(ch).toFixed(1)} pts</b> · target 2%`:'',trend:ch,next:i.next,sub:i.freq||'',
   detail:`<b>${esc(i.name)}</b>, 12-month rate<br>${rmonth(i.date)} · ${esc(i.src)}${i.next?'<br>Next figure '+rwhen(i.next):''}${stale}`});}).join('');
 // currencies
 const FX=[['gbpusd','🇬🇧🇺🇸 Pound in dollars',4],['eurusd','🇪🇺🇺🇸 Euro in dollars',4],['eurgbp','🇪🇺🇬🇧 Euro in pounds',4],['dxy','🇺🇸 Dollar index',2]];
 const fx=FX.map(([k,n,dp])=>{const v=RLIVE[k];if(!v)return '';const ch=v.prev?(v.price/v.prev-1)*100:null;
  return `<div class="rfx"><span>${n}</span><b class="num">${v.price.toFixed(dp)}</b><em class="${ch>0?'upt':ch<0?'dnt':''}">${ch==null?'':fmtPct(ch)}</em></div>`;}).join('');
 $('ratesBox').innerHTML=brief+next+B.map(bankCard).join('')
  +`<div class="card hreg" id="ryld"><div class="hh"><span class="fl">📈</span><h3>Bond yields</h3></div><div class="why">What governments pay to borrow for 2 to 30 years. Mortgage rates follow these.</div>${yrows}${cv}</div>`
  +`<div class="card hreg" id="rmort"><div class="hh"><span class="fl">🏠</span><h3>Mortgage rates</h3></div>${mrows}</div>`
  +`<div class="card hreg" id="rinfl"><div class="hh"><span class="fl">🛒</span><h3>Inflation</h3></div><div class="why">Central banks aim for 2%. Above that, rates tend to stay high.</div>${irows}</div>`
  +(fx?`<div class="card hreg" id="rfx"><div class="hh"><span class="fl">💱</span><h3>Currencies</h3><span class="rlive">Live</span></div><div class="why">Today’s change. Rate decisions and surprises in inflation move these first.</div>${fx}</div>`:'');
 $('ratesBox').querySelectorAll('svg[data-rsp]').forEach(s=>spark(s,(RSER[s.dataset.rsp]||[]).map(p=>p[1]),s.dataset.v));
 updateRatesDot();
}
$('ratesBox').addEventListener('click',e=>{
 const x=e.target.closest('[data-rexp]');if(x){const id=x.dataset.rexp;REXP.has(id)?REXP.delete(id):REXP.add(id);buzz();renderRates();return;}
 const j=e.target.closest('[data-jump]');if(j){const el=document.querySelector(j.dataset.jump);if(el){buzz();el.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1200);}return;}
 const b=e.target.closest('.hmb');if(b){const r=b.parentElement,md=r.querySelector('.md'),o=md.hidden;md.hidden=!o;r.classList.toggle('open',o);b.setAttribute('aria-expanded',o);buzz();}
});
$('ratesRefresh').addEventListener('click',async e=>{const b=e.currentTarget;b.classList.remove('spin');void b.offsetWidth;b.classList.add('spin');buzz();rlAt=0;await loadRates(true);toast('Rates refreshed');});
