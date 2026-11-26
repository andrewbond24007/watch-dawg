/* ---------- market health ---------- */
const HEALTH_V=3; // bump when the health data changes shape, so phones skip older cached copies
let HEALTH={data:store.get('wd.health',null),at:0,busy:false,err:false},hSec=store.get('wd.hsec','housing'),HNEWS={},hMore=false;
const SIG_WORD={green:'Healthy',amber:'Mixed',red:'Under strain',none:'No data'};
const H_NEWS={
 housing:{q:['house prices','mortgage rates'],g:'"house prices" OR "housing market" OR "mortgage rates" OR "home sales"',cal:e=>e.cat==='housing',calH:'Housing data coming up'},
 cre:{q:['office delinquency','office market'],g:'"office market" OR "office vacancy" OR "office loans" OR "office building" OR "commercial real estate" OR "CMBS"',cal:e=>/rate decision|fomc|federal funds|official bank rate|main refinancing/i.test(e.title),calH:'Rate decisions ahead'},
 ai:{q:['AI bubble','Nvidia'],g:'"AI bubble" OR "AI stocks" OR "Nvidia" OR "AI spending" OR "data centers"',cal:e=>/rate decision|fomc|federal funds|cpi/i.test(e.title)&&e.country==='USD',calH:'Big US events ahead'},
};
function hDate(m){if(m.freq==='D')return 'Live';if(m.when)return m.when;const d=new Date(m.date);if(m.freq==='Q')return 'Q'+(Math.floor(d.getUTCMonth()/3)+1)+' '+d.getUTCFullYear();
 if(m.freq==='W')return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});return d.toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'});}
const hVal=(v,u)=>v==null?'—':u==='days'?Math.round(v)+' days':u==='%'?(Math.abs(v)<10?v.toFixed(2):v.toFixed(1))+'%':u==='k'?v.toFixed(1)+'k':String(v);
const hSigned=(v,u)=>v==null?'—':(v>0?'+':v<0?'−':'')+hVal(Math.abs(v),u);
const pc1=(v,d=1)=>v==null?'—':(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(d)+'%';
const tcls=t=>t>0?'up':t<0?'down':'';
function overallSig(sec){const r=sec.regions.filter(x=>x.signal&&x.signal!=='none');if(!r.length)return 'none';
 const s=r.reduce((a,x)=>a+(x.signal==='green'?1:x.signal==='red'?-1:0),0)/r.length;return s>=.34?'green':s<=-.34?'red':'amber';}
/* "new since you last looked": remembers each official figure's release, logs what changed */
let HSEEN=store.get('wd.hseen',null),HVAL=store.get('wd.hval',{}),HLOG=store.get('wd.hlog',[]),hUpdOpen=false;const HFRESH=new Set();
function hIndex(d){const out={};d.sections.forEach(s=>s.regions.forEach(r=>{
 (r.metrics||[]).forEach(m=>{if(m.hidden||m.live)return;out[s.id+'/'+r.id+'/'+m.id]={sec:s.id,icon:s.icon,region:r.name,label:m.label,sig:m.id==='off_occ'?m.value+'|'+m.prev:m.date,val:m.kind==='growth'?hSigned(m.value,m.unit):hVal(m.value,m.unit),when:hDate(m)};});
 (r.table||[]).forEach(t=>{out[s.id+'/'+r.id+'/'+t.cc]={sec:s.id,icon:s.icon,region:t.name,label:'mortgage rate and house prices',sig:(t.rateDate||'')+'|'+(t.pxDate||''),val:`${t.rate==null?'—':t.rate.toFixed(2)+'%'} rate, ${t.px==null?'—':hSigned(t.px,'%')} prices`,when:''};
  if(t.yldDate)out[s.id+'/'+r.id+'/'+t.cc+'_yld']={sec:s.id,icon:s.icon,region:t.name,label:'rental yield',sig:t.yldDate,val:t.yld.toFixed(1)+'% gross yield',when:''};
  if(t.rentDate)out[s.id+'/'+r.id+'/'+t.cc+'_rent']={sec:s.id,icon:s.icon,region:t.name,label:'rents, year on year',sig:t.rentDate,val:hSigned(t.rent,'%'),when:''};});}));return out;}
function hKeys(d){const i=hIndex(d),o={};for(const k in i)o[k]=i[k].sig;return o;}
function hUnseen(){const d=HEALTH.data,by={};if(!d)return by;const idx=hIndex(d);
 if(!HSEEN){HSEEN={};HVAL={};for(const k in idx){HSEEN[k]=idx[k].sig;HVAL[k]=idx[k].val;}store.set('wd.hseen',HSEEN);store.set('wd.hval',HVAL);return by;}
 let logged=false;
 let base=false;
 const isDate=v=>/^\d{4}-\d{2}-\d{2}/.test(v||'');
 for(const [k,x] of Object.entries(idx)){if(HSEEN[k]===undefined){HSEEN[k]=x.sig;HVAL[k]=x.val;base=true;continue;}if(HSEEN[k]===x.sig)continue;
  // only a newer release counts as new; an older one coming back (e.g. a source hiccup) is ignored
  if(isDate(x.sig)&&isDate(HSEEN[k])&&x.sig<HSEEN[k])continue;(by[x.sec]||=[]).push(k);
  if(!HLOG.some(e=>e.k===k&&e.sig===x.sig)){HLOG.unshift({k,sig:x.sig,sec:x.sec,icon:x.icon,region:x.region,label:x.label,from:HVAL[k]&&HVAL[k]!==x.val?HVAL[k]:null,to:x.val,when:x.when,at:Date.now()});HVAL[k]=x.val;logged=true;}}
 if(base){store.set('wd.hseen',HSEEN);store.set('wd.hval',HVAL);}
 if(logged){HLOG=HLOG.slice(0,30);store.set('wd.hlog',HLOG);store.set('wd.hval',HVAL);}
 return by;}
function hMarkSeen(sec){const d=HEALTH.data;if(!d||!HSEEN)return;const k=hKeys(d);let ch=false;
 const isDate=v=>/^\d{4}-\d{2}-\d{2}/.test(v||'');
 Object.entries(k).forEach(([key,sig])=>{if(key.startsWith(sec+'/')&&HSEEN[key]!==sig&&!(isDate(sig)&&isDate(HSEEN[key])&&sig<HSEEN[key])){HFRESH.add(key);HSEEN[key]=sig;ch=true;}});if(ch)store.set('wd.hseen',HSEEN);}
function updateHealthDot(){const u=hUnseen(),n=Object.values(u).reduce((a,x)=>a+x.length,0),tab=document.querySelector('.tab[data-tab="health"]');let dot=tab.querySelector('.ndot');
 if(n&&!dot){dot=document.createElement('i');dot.className='ndot';tab.appendChild(dot);}else if(!n&&dot)dot.remove();
 tab.setAttribute('aria-label','Health'+(n?`, ${n} new update${n>1?'s':''}`:''));return u;}
function renderUpdates(unseen){
 const unseenKeys=new Set(Object.values(unseen).flat()),isNew=e=>unseenKeys.has(e.k)||HFRESH.has(e.k),nNew=HLOG.filter(isNew).length;
 const btn=HLOG.length?`<button class="upbtn${nNew?'':' quiet'}" id="upBtn" aria-expanded="${hUpdOpen}" aria-controls="healthUpd">${nNew?'<i class="d"></i>':''}${nNew?`${nNew} new update${nNew>1?'s':''}`:'Recent updates'} <span class="ch">▾</span></button>`:'';
 $('healthStatus').insertAdjacentHTML('beforeend',btn);
 const box=$('healthUpd');box.hidden=!hUpdOpen||!HLOG.length;if(box.hidden)return;
 box.innerHTML=`<div class="uh"><span>Latest official releases, newest first</span>${HLOG.length?'<button class="linkbtn" id="upClear" style="font-size:12px">Clear list</button>':''}</div>`+HLOG.slice(0,15).map((e,i)=>`<button class="upi${isNew(e)?'':' seen'}" data-i="${i}">
  <span class="ic">${e.icon}${isNew(e)?'<i class="ndot"></i>':''}</span>
  <span class="t">${esc(e.region)} <small>${esc(e.label.charAt(0).toLowerCase()+e.label.slice(1))}</small></span>
  <span class="v">${e.from?`${esc(e.from)} → `:''}<b>${esc(e.to)}</b>${e.when?' · '+esc(e.when)+' release':''} · ${timeAgo(e.at)}</span><span class="go">›</span></button>`).join('');
}
function goToUpdate(e){
 hUpdOpen=false;if(e.sec!==hSec){HFRESH.clear();hSec=e.sec;store.set('wd.hsec',hSec);hMore=false;loadHealthNews();}
 HFRESH.add(e.k);HEXP.add(e.k.split('/').slice(0,2).join('/'));renderHealth();buzz();
 const el=document.querySelector(`#healthBox [data-k="${CSS.escape(e.k)}"]`)||document.querySelector(`#healthBox [data-k="${CSS.escape(e.k.replace(/_(yld|rent)$/,''))}"]`);
 if(el){el.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');}
}
$('healthStatus').addEventListener('click',e=>{if(!e.target.closest('#upBtn'))return;hUpdOpen=!hUpdOpen;buzz();renderHealth();});
$('healthUpd').addEventListener('click',e=>{if(e.target.closest('#upClear')){HLOG=[];store.set('wd.hlog',HLOG);hUpdOpen=false;renderHealth();return;}
 const b=e.target.closest('.upi');if(b)goToUpdate(HLOG[+b.dataset.i]);});
function chipRow(st){return st&&st.length?`<div class="chips">${st.map(x=>`<span class="chip">${esc(x.name)} <b class="${tcls(x.m3)}">${x.m3==null?'—':fmtPct(x.m3)}</b></span>`).join('')}</div><div class="hnote" style="margin-top:6px">Share prices over the last 3 months.</div>`:'';}
/* ---------- health cards (v2 layout) ---------- */
// short labels for the compact rows; the full label, source and notes show when a row is tapped
const SL={us_dq:'Mortgage arrears',us_rate:'30-year mortgage rate',us_yield:'Rental yield',us_rent:'Rents',us_hpi:'House prices',us_pend:'Pending sales',us_sales:'Completed sales',us_cut:'Listings cut in price',us_dtp:'Days to sell',us_inv:'Homes for sale',
 uk_2y:'2-year fixed rate',uk_appr:'Mortgage approvals',uk_yield:'UK rental yield',uk_rent:'UK rents',ni_yield:'NI rental yield',ni_rent:'NI rents',uk_hpi:'House prices',uk_tx:'UK sales',ni_tx:'NI sales (3 months)',
 ie_rate:'Mortgage rate',ie_yield:'Rental yield',ie_rent:'Rents',ie_hpi:'House prices',ie_tx:'Sales (3 months)',ea_rate:'Euro-area mortgage rate',
 off_dq:'Office loan arrears',off_dy:'Dividend yield',off_occ:'Office attendance',offeu_dy:'London dividend yield',us_cre_dq:'Bank arrears, all types',us_cre_px:'Prices, all types',reit_dy:'REIT dividend yield',ukc_dy:'Dividend yield',cmbs_mat:'Loans past maturity'};
const KTL={us_rate:'Mortgage rate',us_dq:'Arrears',uk_2y:'2-year fix',uk_yield:'Rent yield',ie_rate:'Mortgage rate',ie_yield:'Rent yield',ea_rate:'Mortgage rate',off_dq:'Loan arrears',off_occ:'Attendance',off_dy:'Div. yield',us_cre_dq:'Bank arrears',us_cre_px:'Prices',reit_dy:'REIT yield'};
const TL={us_pend:'Pending sales',us_sales:'Sales',us_cut:'Price cuts',us_dtp:'Days to sell',us_inv:'For sale',uk_tx:'UK sales',uk_appr:'Approvals',ni_tx:'NI sales',ie_tx:'Sales'};
const KEYS={'housing/us':['us_hpi','us_rate','us_dq'],'housing/uk':['uk_hpi','uk_2y','uk_yield'],'housing/ie':['ie_hpi','ie_rate','ie_yield'],'housing/med':['ea_rate'],
 'cre/off_us':['off_dq','off_occ','off_dy'],'cre/us':['us_cre_dq','us_cre_px','reit_dy']};
const TILES={'housing/us':['us_pend','us_sales','us_cut'],'housing/uk':['uk_tx','ni_tx','uk_appr']};
const HEXP=new Set();
const perWord=m=>m.yr!=null?'y/y':m.freq==='W'?'w/w':m.freq==='Q'?'q/q':m.freq==='D'?'':'m/m';
function mChange(m){const ref=m.yr??m.prev;if(ref==null||m.vs0)return '';const ch=m.value-ref,pts=m.kind==='growth'||m.kind==='change'||m.unit==='%';
 return `<b class="${tcls(m.trend||0)}">${pts?hSigned(ch,'%').replace('%',' pts'):hSigned(ch,m.unit)}</b> ${perWord(m)}`;}
const mVal=m=>m.kind==='growth'||m.kind==='change'?(m.value>0?'+':m.value<0?'−':'')+Math.abs(m.value).toFixed(1)+'%':hVal(m.value,m.unit);
function mRange(m){const v=(m.series||[]).map(p=>p[1]).filter(x=>x!=null);if(v.length<4)return '';const lo=Math.min(...v),hi=Math.max(...v);
 const f=x=>m.unit==='days'?Math.round(x):m.unit==='k'?x.toFixed(0)+'k':m.kind==='growth'||m.kind==='change'?(x>0?'+':'')+x.toFixed(Math.abs(x)<10?1:0)+'%':m.unit==='%'?x.toFixed(1)+'%':x.toFixed(1);
 return `${f(lo)} to ${f(hi)}`;}
function metricRow(m,key){
 const isNew=key&&HFRESH.has(key),t=m.trend||0,ch=mChange(m),rng=mRange(m);
 return `<div class="hm${isNew?' isnew':''}" data-k="${esc(key||'')}"><button class="hmb" aria-expanded="false">
  <span class="ml">${esc(SL[m.id]||m.short||m.label)}${isNew?'<span class="newtag">New</span>':''}</span>
  <span class="mvl"><span class="hval num">${mVal(m)}</span>${ch?`<span class="hchg">${ch}</span>`:''}</span>
  <span class="spk"><svg viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true" data-sp="${esc(m.id)}" data-v="${t>0?'--up':t<0?'--down':'--muted'}"></svg>${rng?`<small>${rng}</small>`:''}</span></button>
  <div class="md" hidden><b>${esc(m.label)}</b><br>${hDate(m)} · ${esc(m.src||'')}${m.extra?`<br>${esc(m.extra)}`:''}${m.noscore?'<br><i>Shown for context; doesn’t count towards the rating.</i>':''}</div></div>`;
}
function momStrip(r,ms,key){
 const mm=ms.filter(m=>m.grp==='mom');if(!mm.length)return '';
 const order=TILES[key]||[],tiles=[...order.map(id=>mm.find(m=>m.id===id)).filter(Boolean),...mm.filter(m=>!order.includes(m.id))].slice(0,3);
 const MW={up:['↗','Picking up','green'],flat:['→','Steady','amber'],down:['↘','Slowing','red']},w=MW[r.momentum]||null;
 return `<div class="mom"><div class="momh"><span>Momentum</span>${w?`<span class="sig ${w[2]}">${w[0]} ${w[1]}</span>`:''}</div><div class="mtiles" style="--n:${tiles.length}">${tiles.map(m=>{const k=key+'/'+m.id,nw=HFRESH.has(k);
  return `<button class="mtile${nw?' isnew':''}" data-jump="${esc(k)}"><small>${esc(TL[m.id]||SL[m.id]||m.short)}${nw?' <span class="newtag">New</span>':''}</small><b class="num">${mVal(m)}</b><span>${mChange(m)||esc(hDate(m))}</span></button>`;}).join('')}</div></div>`;
}
function medTable(rows,pre){
 const cell=(lab,v,cls)=>`<span><small>${lab}</small><b class="${cls||''}">${v}</b></span>`;
 return `<div class="mrows">${rows.map(r=>{const rt=r.rate!=null&&r.rateYr!=null?(r.rate<r.rateYr-.1?'up':r.rate>r.rateYr+.1?'down':''):'';const nw=HFRESH.has(pre+r.cc)||HFRESH.has(pre+r.cc+'_yld')||HFRESH.has(pre+r.cc+'_rent');
  return `<div class="mr" data-k="${esc(pre+r.cc)}"><div class="mrn">${r.flag} ${esc(r.name)}${nw?' <span class="newtag">New</span>':''}</div><div class="mrs">${cell('Prices',r.px==null?'—':pc1(r.px),r.px>0?'up':r.px<0?'down':'')}${cell('Mortgage',r.rate==null?'—':r.rate.toFixed(2)+'%',rt)}${cell('Rent yield',r.yld==null?'—':r.yld.toFixed(1)+'%')}${cell('Rents',r.rent==null?'—':pc1(r.rent),r.rent>0?'up':r.rent<0?'down':'')}</div></div>`;}).join('')}</div><div class="hnote">Prices and rents are year on year; mortgage colour compares with a year ago (green = lower).</div>`;
}
function regionCard(r){
 const key=hSec+'/'+r.id,ms=(r.metrics||[]).filter(m=>!m.hidden);
 const kids=KEYS[key]||ms.filter(m=>m.grp!=='mom'&&!m.noscore).slice(0,3).map(m=>m.id);
 const keyM=kids.map(id=>ms.find(m=>m.id===id)).filter(Boolean);
 const rest=ms.filter(m=>!keyM.includes(m));
 const groups=[['Momentum',rest.filter(m=>m.grp==='mom')],['Rents and yields',rest.filter(m=>m.grp!=='mom'&&m.noscore)],['More figures',rest.filter(m=>m.grp!=='mom'&&!m.noscore)]].filter(g=>g[1].length);
 const hasDd=r.dd&&r.stocks&&r.stocks.length,moreN=rest.length+(hasDd?r.stocks.length:0);
 const open=HEXP.has(key)||rest.some(m=>HFRESH.has(key+'/'+m.id));
 const kt=keyM.length?`<div class="ktiles mtiles" style="--n:${keyM.length}"${open?' hidden':''}>${keyM.map(m=>{const k=key+'/'+m.id,nw=HFRESH.has(k),t=m.trend||0;return `<button class="mtile${nw?' isnew':''}" data-jump="${esc(k)}"><small>${esc(KTL[m.id]||SL[m.id]||m.short||m.label)}${nw?' <span class="newtag">New</span>':''}</small><b class="num">${mVal(m)}</b><span>${mChange(m)||esc(hDate(m))}</span></button>`;}).join('')}</div>`:'';
 const mapA=hSec==='housing'?{us:'us',uk:'uk',ie:'ie',med:'med'}[r.id]:null;
 const more=moreN||keyM.length?`<div class="more"${open?'':' hidden'}>${keyM.length?`<div class="subh">Key figures</div>${keyM.map(m=>metricRow(m,key+'/'+m.id)).join('')}`:''}${groups.map(([h,list])=>`<div class="subh">${h}</div>${list.map(m=>metricRow(m,key+'/'+m.id)).join('')}`).join('')}${hasDd?`<div class="subh">Each landlord</div>${ddList(r.stocks)}`:''}${r.note?`<div class="hnote">${esc(r.note)}</div>`:''}</div>
  <button class="morebtn" data-exp="${esc(key)}" aria-expanded="${open}">${open?'Show less':`Details · all ${moreN+keyM.length} figures`}<span class="ch">▾</span></button>`:r.note?`<div class="hnote">${esc(r.note)}</div>`:'';
 return `<div class="card hreg" data-card="${esc(key)}"><div class="hh"><span class="fl">${r.flag}</span><h3>${esc(r.name)}</h3><span class="sig ${r.signal}">${SIG_WORD[r.signal]||''}</span>${mapA?`<button class="mapbtn" data-map="${mapA}" aria-label="Map of ${esc(r.name)} house prices">Map</button>`:''}</div>
  ${r.why?`<div class="why">${esc((w=>w.charAt(0).toUpperCase()+w.slice(1))(lowWhy(r.why)))}.</div>`:''}
  ${kt}${momStrip(r,ms,key)}${r.table?medTable(r.table,key+'/'):''}${hasDd?`<div class="subh">Office landlord shares</div>${avgBoxes(r.avg)}`:chipRow(r.stocks)}${more}</div>`;
}
/* section briefing: one plain-English line plus a reason per area */
const RNAME={us:'US',uk:'UK and NI',ie:'Ireland',med:'Mediterranean',off_us:'US offices',off_eu:'UK and Europe offices'};
const listJoin=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a.at(-1);
const PROPER=/^(Spain|Portugal|Italy|Greece|NI|UK|US|Ireland|London|Europe|AI|CRE|REIT)/;
const lowWhy=w=>w.split(', ').map(x=>PROPER.test(x)?x:x.charAt(0).toLowerCase()+x.slice(1)).join(', ');
const sigLow=s=>({green:'healthy',amber:'mixed',red:'under strain',none:'unclear'})[s];
function sectionBrief(sec){
 const R=sec.regions,bul=R.filter(r=>r.why).slice(0,4).map(r=>`<li><b>${esc(sec.id==='housing'?RNAME[r.id]||r.name:r.name)}</b> ${esc(lowWhy(r.why))}</li>`);let head='';
 const THE={us:'the US',uk:'the UK',ie:'Ireland',med:'the Mediterranean'};
 if(sec.id==='housing'){const dn=R.filter(r=>r.momentum==='down').map(r=>THE[r.id]),up=R.filter(r=>r.momentum==='up').map(r=>THE[r.id]);
  const px=R.map(r=>{const m=(r.metrics||[]).find(x=>/_hpi$/.test(x.id)&&!x.hidden);return m?[THE[r.id],m.value]:r.table?[THE[r.id],r.table.filter(t=>t.px!=null).reduce((a,t,_,arr)=>a+t.px/arr.length,0)]:null;}).filter(Boolean);
  const fall=px.filter(p=>p[1]<0).map(p=>p[0]);
  const sales=dn.length?`Sales are slowing in ${listJoin(dn)}`:up.length?`Sales are picking up in ${listJoin(up)}`:'Sales are holding steady';
  head=sales+(fall.length?`${dn.length?' and':', but'} prices are falling in ${listJoin(fall)}.`:`${dn.length?', but':' and'} prices are still rising everywhere tracked.`);}
 else if(sec.id==='cre'){const o=R.find(r=>r.id==='off_us'),e=R.find(r=>r.id==='off_eu'),oth=R.filter(r=>r.group!=='Offices'),os=overallSig({regions:oth});
  const dq=o?.metrics?.find(m=>m.id==='off_dq');
  head=`US offices are ${sigLow(o?.signal||'none')}${dq?` (${dq.value.toFixed(1)}% of office loans in arrears)`:''}, London and European offices are ${sigLow(e?.signal||'none')}, and other commercial property is ${sigLow(os)}.`;}
 else if(sec.id==='ai'){const r=R[0],a=r.avg||{},st=(r.stocks||[]).filter(x=>x.offHigh!=null).sort((x,y)=>x.offHigh-y.offHigh);
  head=`AI shares are on average ${Math.abs(a.offHigh||0).toFixed(0)}% below their 12-month highs${a.m3!=null?` and ${a.m3<0?'down':'up'} ${Math.abs(a.m3).toFixed(0)}% over 3 months`:''}.`;
  bul.length=0;if(st.length)bul.push(`<li><b>Hardest hit</b> ${st.slice(0,3).map(x=>`${esc(x.name)} ${pc1(x.offHigh,0)}`).join(', ')}</li>`,`<li><b>Holding up best</b> ${st.slice(-3).reverse().map(x=>`${esc(x.name)} ${pc1(x.offHigh,0)}`).join(', ')}</li>`);}
 return `<div class="brief"><div class="bh"><span>${sec.icon} In brief</span><span class="sig ${overallSig(sec)}">${SIG_WORD[overallSig(sec)]}</span></div><p>${esc(head)}</p>${bul.length?`<ul>${bul.join('')}</ul>`:''}</div>`;
}
function ddList(st){
 return st.slice().sort((x,y)=>(x.offHigh??0)-(y.offHigh??0)).map(x=>{const off=Math.min(100,Math.abs(x.offHigh??0));const c=off>=30?'var(--down)':off>=12?'#d99a00':'var(--up)';
  return `<div class="dd"><div class="nm">${esc(x.name)}<small>${esc(x.sym)}${x.dy>0?' · '+x.dy.toFixed(1)+'% yield':''}</small></div><div class="r"><b class="${tcls(x.m3)}">${pc1(x.m3)}</b> 3m · <b class="down">${pc1(x.offHigh,0)}</b> off high</div><div class="bar" style="--c:${c}"><i style="width:${off}%"></i></div></div>`;}).join('');
}
function avgBoxes(a){return a?`<div class="aiavg"><div><b class="num">${pc1(a.offHigh,0)}</b><small>vs 12-month high</small></div><div><b class="num" style="color:var(--${a.m3>0?'upink':a.m3<0?'downink':'ink'})">${pc1(a.m3,0)}</b><small>3 months</small></div><div><b class="num" style="color:var(--${a.y1>0?'upink':a.y1<0?'downink':'ink'})">${pc1(a.y1,0)}</b><small>1 year</small></div></div>`:'';}
/* AI credit risk: 5-year CDS levels from DTCC trades (news quotes as a fallback), built by the scheduled refresh */
let CDS={data:null,at:0},CDSX=false;
async function loadCds(){if(CDS.data&&Date.now()-CDS.at<15*60e3)return;try{const j=await fetch('/data/cds.json?t='+Math.floor(Date.now()/3e5)).then(r=>r.ok?r.json():null);if(j&&j.names){CDS={data:j,at:Date.now()};if(activeTab==='health'&&hSec==='ai')renderHealth();}}catch(e){}}
const CDSC={oracle:'#8b93a3',coreweave:'#e4572e',meta:'#2f6fde',amazon:'#f59e0b',microsoft:'#10b981',alphabet:'#ef4444',broadcom:'#14b8a6',spacex:'#d946ef',nvidia:'#eab308',amd:'#64748b'};
/* one chart with every company's reported levels over the past year, like the Bloomberg chart */
function cdsChart(rows){
 const rs=rows.filter(r=>r.p.length>=1);if(!rs.length)return '';
 // log scale, so CoreWeave's four-figure spread and Microsoft's ~50 bp both stay readable
 const first=Math.min(...rs.map(r=>Date.parse(r.p[0].date))),t1=Date.now(),t0=Math.max(t1-365*864e5,first-7*864e5),all=rs.flatMap(r=>r.p.filter(x=>Date.parse(x.date)>=t0).map(x=>x.bp)),lo=Math.max(10,Math.min(...all)*0.85),hi=Math.max(lo*2,Math.max(...all)*1.15);
 const W=320,H=190,L=4,R=34,T=8,B=20,X=t=>L+(Math.max(t0,t)-t0)/(t1-t0)*(W-L-R),Y=v=>T+(1-Math.log(v/lo)/Math.log(hi/lo))*(H-T-B);
 let g='';
 for(const v of [25,50,100,200,500,1000,2000,5000])if(v>=lo&&v<=hi)g+=`<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="gl"/><text x="${W-R+4}" y="${(Y(v)+3.5).toFixed(1)}" class="gt">${v}</text>`;
 const span=(t1-t0)/864e5,stepM=span>200?3:1;
 for(let i=0;i<12;i+=stepM){const d=new Date(t1);d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-i);if(d.getTime()<t0)break;g+=`<text x="${X(d.getTime())}" y="${H-5}" class="gt" text-anchor="middle">${d.toLocaleDateString('en-GB',{month:'short'})}</text>`;}
 const ln=rs.map(r=>{const pts=r.p.filter(x=>Date.parse(x.date)>=t0&&x.bp>0).map(x=>[X(Date.parse(x.date+'T12:00:00Z')),Y(x.bp)]);if(!pts.length)return '';const c=CDSC[r.id]||'var(--accent)';
  return (pts.length>1?`<polyline points="${pts.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${pts.length>20?1.5:2}" stroke-linejoin="round"/>`:'')+(pts.length>20?pts.slice(-1):pts).map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" fill="${c}"/>`).join('');}).join('');
 const leg=rs.map(r=>`<span><i style="background:${CDSC[r.id]||'var(--accent)'}"></i>${esc(r.n.label)}</span>`).join('');
 return `<div class="cdsch"><svg viewBox="0 0 ${W} ${H}" aria-label="Five-year CDS levels over the past year, log scale">${g}${ln}</svg><div class="cdsleg">${leg}</div></div>`;
}
function cdsSpark(r){const p=r.p;if(p.length<2)return '';const t0=Date.parse(p[0].date),t1=Math.max(t0+864e5,Date.parse(p.at(-1).date)),mx=Math.max(...p.map(x=>x.bp))*1.05,mn=Math.min(...p.map(x=>x.bp))*0.9;
 const pts=p.map(x=>[(Date.parse(x.date)-t0)/(t1-t0)*100,24-(x.bp-mn)/((mx-mn)||1)*22]);const c=CDSC[r.id]||'var(--accent)';
 return `<svg class="cdssp" viewBox="0 0 100 26" preserveAspectRatio="none"><polyline points="${pts.map(q=>q.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>`;}
function cdsCard(){
 const d=CDS.data;if(!d)return '';
 // traded levels (DTCC swap tape) when the company has them, else the levels quoted in the news
 const rows=Object.entries(d.names).map(([id,n])=>{const tr=(n.daily||[]).map(([date,bp,k])=>({date,bp,k,source:`${k} trade${k===1?'':'s'}`})),p=tr.length?tr:(n.points||[]),l=p.at(-1);if(!l)return null;
  const m1=p.slice().reverse().find(x=>Date.parse(l.date)-Date.parse(x.date)>=25*864e5),ch=m1?l.bp-m1.bp:null;return {id,n,p,l,ch};}).filter(Boolean)
  .sort((a,b)=>b.l.bp-a.l.bp);
 if(!rows.length)return `<div class="card hreg"><div class="hh"><span class="fl">🛡️</span><h3>Credit default swaps</h3></div><div class="why">Collecting: levels appear here as the news reports them.</div></div>`;
 const mx=Math.max(350,...rows.map(r=>r.l.bp));
 const col=bp=>bp>=200?'var(--down)':bp>=100?'#d99a00':'var(--up)';
 const sig=rows[0].l.bp>=200?'red':rows[0].l.bp>=100?'amber':'green';
 const list=rows.map(r=>{const old=Date.now()-Date.parse(r.l.date)>14*864e5;
  return `<div class="cdsr${old?' old':''}"><div class="nm">${esc(r.n.label)}<small>${new Date(r.l.date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short'})} · ${esc(r.l.source||'')}</small></div>
   <div class="r"><i class="cdsdot" style="background:${CDSC[r.id]||'var(--accent)'}"></i><b class="num">${Math.round(r.l.bp)} bp</b>${r.ch!=null?` <em class="${r.ch>0?'down':r.ch<0?'up':''}">${r.ch>0?'+':r.ch<0?'−':''}${Math.abs(Math.round(r.ch))} in a month</em>`:''}</div>
   ${cdsSpark(r)}<div class="bar" style="--c:${col(r.l.bp)}"><i style="width:${Math.min(100,r.l.bp/mx*100)}%"></i></div>
   ${CDSX&&(r.n.points||[]).length?`<div class="cdsp">${r.n.points.slice(-8).reverse().map(x=>`<a href="${esc(x.link)}" target="_blank" rel="noopener"><span>${x.date.slice(5)}</span><b>${Math.round(x.bp)}</b> ${esc(x.title.slice(0,110))}</a>`).join('')}</div>`:''}</div>`;}).join('');
 return `<div class="card hreg" id="cdsCard"><div class="hh"><span class="fl">🛡️</span><h3>Credit default swaps</h3><span class="sig ${sig}">${SIG_WORD[sig]||''}</span></div>
  <div class="why">What it costs each year to insure $10m of a company's debt for 5 years, in basis points ($10,000 per 100 bp). Rising = lenders more worried about AI debt.</div>
  ${cdsChart(rows)}${list}
  <button class="morebtn" id="cdsMore" aria-expanded="${CDSX}">${CDSX?'Hide the news reports':'Show news reports on each'}<span class="ch">▾</span></button>
  <div class="hnote">Levels come from actual trades: DTCC's public swap tape, which shows every reported single-name CDS trade (the daily median of five-year trades, with upfront prices converted to a spread). Companies that rarely trade fall back to levels quoted in news reports. Greyed figures are over two weeks old. Green under 100 bp, amber to 200, red beyond. DTCC data is for personal use.</div></div>`;
}
function aiCard(r){
 const a=r.avg||{},st=(r.stocks||[]).slice().sort((x,y)=>(x.offHigh??0)-(y.offHigh??0));
 return `<div class="card hreg"><div class="hh"><span class="fl">🤖</span><h3>AI shares</h3><span class="sig ${r.signal}">${SIG_WORD[r.signal]||''}</span></div>
  ${r.why?`<div class="why">${esc(r.why)}.</div>`:''}
  ${avgBoxes(a)}${ddList(st)}
  <div class="hnote">The bar shows how far each share is below its 12-month high. Green under 12%, amber to 30%, red beyond. Signal is based on the average drop.</div></div>`;
}
function renderHealth(){
 if(activeTab!=='health')return;const d=HEALTH.data;if(hSec==='ai')loadCds();
 $('healthStatus').innerHTML=d?`<span>Updated <b>${timeAgo(d.fetched)}</b></span>${HEALTH.err?'<span class="bad">Couldn’t refresh; showing the last copy</span>':''}${HEALTH.busy?'<span>Refreshing…</span>':''}`:'';
 if(!d){$('healthBox').innerHTML=`<div class="empty" style="margin-top:12px">${HEALTH.err?'Market health can’t load in this viewer.':'Loading market health…'}</div>`;$('healthOv').innerHTML='';}
 else{
  if(!d.sections.some(s=>s.id===hSec))hSec=d.sections[0].id;
  const unseenAll=hUnseen();hMarkSeen(hSec);const unseen=updateHealthDot();renderUpdates(unseenAll);
  $('healthOv').innerHTML=d.sections.map(s=>{const g=overallSig(s);return `<button role="tab" aria-selected="${s.id===hSec}" class="${s.id===hSec?'on':''}" data-s="${s.id}">${unseen[s.id]?'<i class="ndot" aria-label="New updates"></i>':''}<span class="ic">${s.icon}</span><b>${esc(s.id==='cre'?'Commercial property':s.id==='ai'?'AI bubble':s.title)}</b><span class="sig ${g}">${SIG_WORD[g]}</span></button>`;}).join('');
  const sec=d.sections.find(s=>s.id===hSec);
  let grp='';
  $('healthBox').innerHTML=sectionBrief(sec)+(sec.id==='ai'?sec.regions.map(aiCard).join('')+cdsCard():sec.regions.map(r=>{const h=r.group&&r.group!==grp?`<div class="hgroup">${esc(r.group)}</div>`:'';grp=r.group||grp;return h+regionCard(r);}).join(''));
  const all=Object.fromEntries(sec.regions.flatMap(r=>r.metrics||[]).map(m=>[m.id,m]));
  $('healthBox').querySelectorAll('svg[data-sp]').forEach(s=>{const m=all[s.dataset.sp];spark(s,(m?.series||[]).map(p=>p[1]),s.dataset.v);});
 }
 renderHealthCal();renderHealthNews();renderSources();
 $('healthHint').textContent='Each area is rated from its key figures compared with a year ago: rising arrears, mortgage rates and price cuts count against it; rising prices, sales, approvals and share prices count for it. Arrears and pending sales count double as early warnings. Rents and yields are shown for context only. Tap any figure for its source and date. Official figures are monthly or quarterly; share prices update through the day.';
}
/* data source monitor: written by the scheduled refresh */
let DSRC={data:null,at:0},srcOpen=false;
async function loadSourceStatus(){if(DSRC.data&&Date.now()-DSRC.at<10*60e3)return;try{const j=await fetch('/data/status.json?t='+Math.floor(Date.now()/3e5)).then(r=>r.ok?r.json():null);if(j&&j.sources){DSRC={data:j,at:Date.now()};renderSources();}}catch(e){}}
const SRCN={'rates:fed':'New York Fed policy rate','rates:boe':'Bank of England Bank Rate','rates:ecb':'ECB deposit rate','rates:treasury':'US Treasury yields','rates:freddie':'Freddie Mac (Rates tab)','rates:boe_mortgage':'BoE quoted mortgage rates','rates:gilts':'UK gilt yields','rates:ecb_yield':'Euro-area yields','rates:ecb_hicp':'Euro-area inflation','cds:dtcc':'DTCC swap trades',cds:'CDS news quotes','rates:bls':'BLS inflation','rates:ons':'ONS inflation','rates:futures':'Fed funds futures','rates:polymarket_fed':'Polymarket (Fed)','rates:polymarket_boe':'Polymarket (BoE)','rates:polymarket_ecb':'Polymarket (ECB)','rates:all':'Rates tab',bis:'BIS house prices',bis_cre:'BIS commercial property prices',fed:'Federal Reserve arrears',freddie:'Freddie Mac mortgage rates',fhfa:'FHFA house prices',boe:'Bank of England',ecb:'ECB mortgage rates',trepp:'Trepp office arrears',kastle:'Kastle office attendance',zillow:'Zillow rents and values',oecd:'OECD rents',treasury:'US 10-year Treasury',ons:'ONS rents',landreg:'Land Registry UK prices',landreg_ni:'Land Registry NI prices',numbeo:'Numbeo rental yields',zillow_momentum:'Zillow sales momentum',hmrc:'HMRC home sales',cso_sales:'CSO Irish sales',cso_prices:'CSO Irish house prices',nowcast:'Cleveland Fed nowcast','map:us':'US price map','map:uk':'UK price map','map:ni':'NI price map','map:ie':'Ireland price map','map:med':'Mediterranean price map',health:'Health data build'};
function renderSources(){
 const d=DSRC.data;if(!d)return;const all=Object.entries(d.sources);
 // a source only counts as down after a full day of failing: one slow or refused check usually clears on the next
 // refresh, and the last good figures stay on screen meanwhile
 const longFail=v=>!v.ok&&Date.now()-Date.parse(v.since||d.updated)>24*3600e3,down=all.filter(([,v])=>longFail(v));
 const st=$('healthStatus');st.querySelector('.srcchip')?.remove();
 if(down.length)st.insertAdjacentHTML('beforeend',`<button class="srcchip" aria-expanded="${srcOpen}">⚠ ${down.length} source${down.length>1?'s':''} down</button>`);
 const box=$('srcList');if(!box)return;
 box.innerHTML=`<div class="subh" style="margin-top:12px">Data sources · checked ${timeAgo(d.updated)}</div>`+all.sort((a,b)=>(a[1].ok-b[1].ok)||(SRCN[a[0]]||a[0]).localeCompare(SRCN[b[0]]||b[0])).map(([k,v])=>`<div class="src ${v.ok?'ok':longFail(v)?'bad':'slow'}"><span>${v.ok?'✓':longFail(v)?'✕':'↻'}</span><span>${esc(SRCN[k]||k)}${v.ok?'':`<small>Down since ${timeAgo(v.since)}${v.lastOk?' · last worked '+timeAgo(v.lastOk):''} · ${esc(v.error||'')}</small>`}</span></div>`).join('');
}
$('healthStatus').addEventListener('click',e=>{if(!e.target.closest('.srcchip'))return;const h=document.querySelector('details.how');h.open=true;buzz();$('srcList').scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});});
function renderHealthCal(){
 const cfg=H_NEWS[hSec],now=Date.now();$('healthCalH').textContent=cfg.calH;
 const ev=CAL.events.filter(e=>cfg.cal(e)&&new Date(e.date)>now-15*60e3).slice(0,4);
 $('healthCal').innerHTML=ev.length?ev.map(e=>{const d=new Date(e.date);const lab=d.toDateString()===new Date().toDateString()?'Today':d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
  return evCard({...e,hint:(e.hint||'')+(e.expected?' · expected date':'')}).replace('<div class="evt">',`<div class="evt"><small style="margin:0 0 2px">${lab}</small>`);}).join('')
  :`<div class="empty">${CAL.at?'Nothing scheduled in the next few weeks.':CAL.err?'Dates can’t load in this viewer.':'Loading dates…'}</div>`;
}
async function loadHealthNews(force){
 const k=hSec,c=HNEWS[k];if(c&&(c.busy||(!force&&Date.now()-c.at<10*60e3))){renderHealthNews();return;}
 HNEWS[k]={...(c||{items:[]}),busy:true};renderHealthNews();
 try{const cfg=H_NEWS[k];const j=await fetch('/.netlify/functions/asset-news?hours=72&q='+encodeURIComponent(cfg.q.join(','))+'&g='+encodeURIComponent(cfg.g)).then(r=>r.json());
  HNEWS[k]={items:Array.isArray(j.items)?j.items:[],at:Date.now(),busy:false};}
 catch(e){HNEWS[k]={items:(c&&c.items)||[],at:Date.now(),busy:false,err:true};}
 if(hSec===k)renderHealthNews();
}
function renderHealthNews(){
 if(activeTab!=='health')return;const c=HNEWS[hSec],items=c?.items||[],n=hMore?14:5;
 $('healthNews').innerHTML=items.length?items.slice(0,n).map((p,i)=>postCard(p,i===0&&!!p.img)).join(''):`<div class="empty">${c&&!c.busy?(c.err?'Headlines can’t load in this viewer.':'No fresh headlines on this right now.'):'Loading headlines…'}</div>`;
 const b=$('healthMore');b.hidden=items.length<=5;b.textContent=hMore?'Show fewer':'Show more';
}
async function loadHealth(force){
 if(HEALTH.busy)return;if(!force&&HEALTH.at&&Date.now()-HEALTH.at<20*60e3){renderHealth();return;}
 HEALTH.busy=true;renderHealth();
 try{let j=null;if(!force){j=await fetch('/data/health.json?t='+Math.floor(Date.now()/3e5)).then(r=>r.ok?r.json():null).catch(()=>null);if(!j||!Array.isArray(j.sections)||Date.now()-Date.parse(j.fetched)>90*60e3)j=null;}
  if(!j)j=await fetch('/.netlify/functions/health?v='+HEALTH_V+(force?'&fresh='+Date.now():'')).then(r=>r.json());loadSourceStatus();if(Array.isArray(j.sections)){HEALTH.data=j;HEALTH.at=Date.now();HEALTH.err=false;store.set('wd.health',j);}else HEALTH.err=true;}catch(e){HEALTH.err=true;}
 HEALTH.busy=false;renderHealth();updateHealthDot();
}
$('healthBox').addEventListener('click',e=>{
 const hb=e.target.closest('.hmb');if(hb){const md=hb.nextElementSibling;md.hidden=!md.hidden;hb.setAttribute('aria-expanded',!md.hidden);hb.parentNode.classList.toggle('open',!md.hidden);buzz();return;}
 const mb=e.target.closest('.morebtn');if(mb){const k=mb.dataset.exp;HEXP.has(k)?HEXP.delete(k):HEXP.add(k);buzz();renderHealth();if(!HEXP.has(k))document.querySelector(`[data-card="${CSS.escape(k)}"]`)?.scrollIntoView({block:'nearest',behavior:reduce?'auto':'smooth'});return;}
 const mt=e.target.closest('.mtile[data-jump]');if(mt){const k=mt.dataset.jump,card=k.split('/').slice(0,2).join('/');HEXP.add(card);buzz();renderHealth();const el=document.querySelector(`#healthBox [data-k="${CSS.escape(k)}"]`);if(el){el.scrollIntoView({block:'center',behavior:reduce?'auto':'smooth'});el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');}}
});
$('healthOv').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.s===hSec)return;HFRESH.clear();HEXP.clear();hSec=b.dataset.s;store.set('wd.hsec',hSec);hMore=false;buzz();renderHealth();loadHealthNews();});
$('healthMore').addEventListener('click',()=>{hMore=!hMore;buzz();renderHealthNews();});
$('healthRefresh').addEventListener('click',async e=>{const b=e.currentTarget;b.classList.remove('spin');void b.offsetWidth;b.classList.add('spin');buzz();await Promise.all([loadHealth(true),loadHealthNews(true),loadCal(true)]);toast('Market health refreshed');});

/* ---------- house price maps ---------- */
const MAPS={us:{title:'US house prices by state'},uk:{title:'UK house prices by region',seg:[['uk','UK regions'],['ni','Northern Ireland']]},ni:{title:'NI house prices by council',seg:[['uk','UK regions'],['ni','Northern Ireland']]},ie:{title:'Ireland house prices by region'},med:{title:'Mediterranean house prices by country'}};
const US_ABBR={'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','District of Columbia':'DC','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY'};
const MAPCACHE={};let mapArea='uk',mapSel=null;
/* graded scale: deeper green the faster prices are rising, deeper red the faster they're falling */
const MBINS=[{max:-5,c:'#7f1d1d',ink:'#fff',w:'Sharp decline',lab:'≤−5'},{max:-2,c:'#dc2626',ink:'#fff',w:'Decline',lab:'−5 to −2'},{max:0,c:'#fca5a5',ink:'#3b0d0d',w:'Slight decline',lab:'−2 to 0'},
 {max:2,c:'#bbf7d0',ink:'#0b3d1c',w:'Little change',lab:'0 to 2'},{max:4,c:'#4ade80',ink:'#0b3d1c',w:'Moderate growth',lab:'2 to 4'},{max:7,c:'#16a34a',ink:'#fff',w:'Growth',lab:'4 to 7'},{max:Infinity,c:'#14532d',ink:'#fff',w:'Strong growth',lab:'7+'}];
const mBin=y=>y==null?null:MBINS.find(b=>y<b.max)||MBINS.at(-1);
const mColor=y=>mBin(y)?.c||'var(--shut)';
const mWord=y=>mBin(y)?.w||'No data';
const fmtY=y=>(y>0?'+':y<0?'−':'')+Math.abs(y).toFixed(1)+'%';
async function mapData(a){if(MAPCACHE[a]&&Date.now()-MAPCACHE[a].at<30*60e3)return MAPCACHE[a];
 const pre=()=>fetch('/data/housemap-'+a+'.json?t='+Math.floor(Date.now()/3e5)).then(r=>r.ok?r.json():null).then(j=>j&&!j.error&&Date.now()-Date.parse(j.fetched)<12*36e5?j:null).catch(()=>null);
 const [shape,data]=await Promise.all([fetch('/maps/'+a+'.json').then(r=>r.json()),pre().then(j=>j||fetch('/.netlify/functions/housemap?area='+a).then(r=>r.json()))]);
 return MAPCACHE[a]={shape,data,at:Date.now()};}
function fmtMoney(v,c){return v==null?'':c+(v>=1e6?(v/1e6).toFixed(2)+'m':v>=1e3?Math.round(v/1e3)+'k':v);}
function fmtPeriod(s){if(!s)return '';if(/^\d{4}-\d{2}$/.test(s))return new Date(s+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});if(/^\d{4}-Q\d$/.test(s))return s.replace(/(\d{4})-(Q\d)/,'$2 $1');return s;}
async function openMap(a){mapArea=a;mapSel=null;openSheet('mapSheet');await renderMap();}
async function renderMap(){
 const cfg=MAPS[mapArea];$('mapTitle').textContent=cfg.title;const zb=$('mapZoom');zb.hidden=mapArea!=='us';if(mapArea!=='us')$('mapBox').classList.remove('zoom');zb.textContent=$('mapBox').classList.contains('zoom')?'Zoom out':'Zoom in';
 const seg=$('mapSeg');seg.hidden=!cfg.seg;seg.style.display=cfg.seg?'inline-flex':'none';if(cfg.seg)seg.innerHTML=cfg.seg.map(([k,l])=>`<button data-a="${k}" class="${k===mapArea?'on':''}">${l}</button>`).join('');
 if(!MAPCACHE[mapArea]){$('mapBox').innerHTML='<div class="empty">Loading map…</div>';$('mapInfo').innerHTML='';$('mapList').innerHTML='';$('mapSrc').textContent='';}
 $('mapLegend').querySelector('.mk-row').innerHTML=MBINS.map(b=>`<i style="--c:${b.c}"></i>`).join('')+'<i style="--c:var(--shut)"></i>';
 $('mapLegend').querySelector('.mk-lab').innerHTML=MBINS.map(b=>`<span>${b.lab}</span>`).join('')+'<span>No data</span>';
 let m;try{m=await mapData(mapArea);}catch(e){$('mapBox').innerHTML='<div class="empty">Couldn’t load this map. Try again shortly.</div>';return;}
 if(m.data.error){delete MAPCACHE[mapArea];$('mapBox').innerHTML=`<div class="empty">The price data didn’t load (${esc(m.data.error)}). Try again shortly.</div>`;return;}
 const by=Object.fromEntries(m.data.areas.map(x=>[x.id,x]));
 const W=m.shape.w,H=m.shape.h,fs=Math.max(9,9.5*W/330),inside=[],out=[];
 m.shape.areas.forEach(s=>{const x=by[s.id];if(x?.yoy==null)return;const L=Math.sqrt(s.a||0)/3.3;(L>=fs*0.7?inside:out).push({s,x,f:Math.min(fs*1.15,L)});});
 out.sort((a,b)=>a.s.cy-b.s.cy);let yPos=-Infinity;out.forEach(o=>{yPos=Math.max(o.s.cy,yPos+fs*1.25);o.y=yPos;});
 const short=n=>US_ABBR[n]||n.replace(/ and .*/,'').replace(/^(North|South|East|West) /,'$1 ').slice(0,14);
 const over=out.length?Math.max(0,(out.at(-1)?.y||0)+fs-H):0,extra=out.length?fs*(Math.max(...out.map(o=>short(o.s.name).length))*0.55+3.8)+14:0;
 const lab=(t,x,y,f,fill,stroke)=>`<text x="${x}" y="${y}" font-size="${f.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${(f/5).toFixed(1)}" text-anchor="middle" dominant-baseline="central">${t}</text>`;
 $('mapBox').innerHTML=`<svg viewBox="0 0 ${(W+extra).toFixed(0)} ${(H+over).toFixed(0)}" role="img" aria-label="${esc(cfg.title)}">${m.shape.areas.map(s=>{const x=by[s.id];return `<path d="${s.d}" data-id="${esc(s.id)}" fill="${mColor(x?.yoy)}" class="${s.id===mapSel?'sel':''}"><title>${esc(s.name)}${x?.yoy!=null?`: ${fmtY(x.yoy)} on a year ago`:''}</title></path>`;}).join('')}
  ${inside.map(o=>{const b=mBin(o.x.yoy);return lab(fmtY(o.x.yoy),o.s.cx,o.s.cy,o.f,b.ink,b.c);}).join('')}
  ${out.map(o=>`<line x1="${o.s.cx}" y1="${o.s.cy}" x2="${W+4}" y2="${o.y}"/>`+`<text x="${W+8}" y="${o.y}" font-size="${(fs*0.95).toFixed(1)}" fill="var(--ink)" stroke="var(--surface)" stroke-width="${(fs/6).toFixed(1)}" dominant-baseline="central">${esc(short(o.s.name))} ${fmtY(o.x.yoy)}</text>`).join('')}</svg>`;
 const sp=$('mapBox').querySelector('path.sel');if(sp)sp.parentNode.appendChild(sp);
 const list=m.data.areas.slice().sort((a,b)=>(b.yoy??-999)-(a.yoy??-999));
 $('mapList').innerHTML=`<div class="hgroup" style="margin-top:4px">Change on a year ago${m.data.noPrice?'':', with average price'}</div>`+list.map(x=>`<button class="mrow${x.id===mapSel?' sel':''}" data-id="${esc(x.id)}"><i style="--c:${mColor(x.yoy)}"></i><span>${esc(x.name)}</span><span class="p">${fmtMoney(x.price,m.data.cur)}</span><b style="color:${x.yoy==null?'var(--muted)':x.yoy>=0?'var(--upink)':'var(--downink)'}">${x.yoy==null?'—':fmtY(x.yoy)}</b></button>`).join('');
 const sel=mapSel&&by[mapSel];
 $('mapInfo').innerHTML=sel?`<b>${esc(sel.name)}</b> · ${mWord(sel.yoy)}<small>${sel.price!=null?'Average price '+fmtMoney(sel.price,m.data.cur)+' · ':''}${sel.yoy!=null?fmtY(sel.yoy)+' on a year ago':'No recent figure'}</small>`:'<small>Tap an area to see its average price and change on a year ago.</small>';
 $('mapSrc').textContent=`${m.data.src}, ${fmtPeriod(m.data.date)}.${m.data.noPrice?' Average prices aren’t published for these areas, so the map shows growth only.':''} Colours show the change in average price on a year ago: deeper green for faster rises, deeper red for faster falls. Small areas are labelled at the side.`;
}
$('mapZoom').addEventListener('click',()=>{const b=$('mapBox'),on=b.classList.toggle('zoom');$('mapZoom').textContent=on?'Zoom out':'Zoom in';if(on)requestAnimationFrame(()=>{b.scrollLeft=b.scrollWidth*0.55;});buzz();});
$('mapSheet').addEventListener('click',e=>{const p=e.target.closest('[data-id]');if(p&&$('mapSheet').contains(p)){mapSel=p.dataset.id===mapSel?null:p.dataset.id;buzz();renderMap();return;}
 const b=e.target.closest('#mapSeg button');if(b&&b.dataset.a!==mapArea){mapArea=b.dataset.a;mapSel=null;buzz();renderMap();}});
$('healthBox').addEventListener('click',e=>{const b=e.target.closest('[data-map]');if(b){buzz();openMap(b.dataset.map);}});
$('healthBox').addEventListener('click',e=>{if(e.target.closest('#cdsMore')){CDSX=!CDSX;buzz();renderHealth();}});
