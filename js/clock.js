/* ---------- market clock ---------- */
function etParts(d){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'numeric',minute:'numeric',second:'numeric',hour12:false}).formatToParts(d).map(x=>[x.type,x.value]));
 return {wd:p.weekday,ymd:`${p.year}-${p.month}-${p.day}`,mins:(+p.hour%24)*60+ +p.minute+ +p.second/60};}
/* NYSE / Nasdaq holidays and 1pm ET early closes (source: NYSE holiday calendar 2026–2028) */
const US_HOLIDAYS={'2026-01-01':'New Year’s Day','2026-01-19':'Martin Luther King Jr. Day','2026-02-16':'Presidents’ Day','2026-04-03':'Good Friday','2026-05-25':'Memorial Day','2026-06-19':'Juneteenth','2026-07-03':'Independence Day','2026-09-07':'Labor Day','2026-11-26':'Thanksgiving','2026-12-25':'Christmas',
 '2027-01-01':'New Year’s Day','2027-01-18':'Martin Luther King Jr. Day','2027-02-15':'Presidents’ Day','2027-03-26':'Good Friday','2027-05-31':'Memorial Day','2027-06-18':'Juneteenth','2027-07-05':'Independence Day','2027-09-06':'Labor Day','2027-11-25':'Thanksgiving','2027-12-24':'Christmas',
 '2028-01-17':'Martin Luther King Jr. Day','2028-02-21':'Presidents’ Day','2028-04-14':'Good Friday','2028-05-29':'Memorial Day','2028-06-19':'Juneteenth','2028-07-04':'Independence Day','2028-09-04':'Labor Day','2028-11-23':'Thanksgiving','2028-12-25':'Christmas'};
const US_EARLY={'2026-11-27':1,'2026-12-24':1,'2027-11-26':1,'2028-07-03':1,'2028-11-24':1};
const ymdAdd=(ymd,n)=>{const [y,m,d]=ymd.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10);};
const ymdDow=ymd=>{const [y,m,d]=ymd.split('-').map(Number);return new Date(Date.UTC(y,m-1,d)).getUTCDay();};
const isTradingDay=ymd=>{const w=ymdDow(ymd);return w!==0&&w!==6&&!US_HOLIDAYS[ymd];};
const closeMin=ymd=>US_EARLY[ymd]?780:960;
const sessionsFor=ymd=>{if(!isTradingDay(ymd))return [];const c=closeMin(ymd);return [[240,570,'--pre'],[570,c,'--reg'],[c,c===960?1200:1020,'--post']];};
/* other US sessions, in New York minutes relative to a given day */
const DOW=ymd=>ymdDow(ymd);
function overnightFor(ymd){const w=DOW(ymd);return w>=0&&w<=4&&isTradingDay(ymdAdd(ymd,1))?[[1200,1440+240]]:[];}  // 8pm–4am ET, Sun–Thu nights before a trading day
// CME equity futures: Sun 6pm ET to Fri 5pm ET with a daily 5–6pm pause; shut all day on Christmas, New Year's Day and Good Friday,
// shortened (to 1pm ET) on other US market holidays and to 1:15pm ET on early-close days
const futShut=ymd=>/Christmas|New Year|Good Friday/.test(US_HOLIDAYS[ymd]||'');
function futuresFor(ymd){const w=DOW(ymd),nxt=ymdAdd(ymd,1),out=[];
 if(w>=1&&w<=5&&!futShut(ymd))out.push([0,US_HOLIDAYS[ymd]?780:US_EARLY[ymd]?795:1020]);
 if(w!==5&&w!==6&&!futShut(nxt)&&!futShut(ymd))out.push([1080,1440]);
 if(futShut(ymd)&&w>=0&&w<=4&&!futShut(nxt)&&DOW(nxt)!==6)out.push([1080,1440]);
 return out;}
function sessionStatus(fn,ymd,mins){const iv=[];for(let d=-1;d<=7;d++)fn(ymdAdd(ymd,d)).forEach(([a,b])=>iv.push([a+d*1440,b+d*1440]));iv.sort((x,y)=>x[0]-y[0]);
 const merged=[];iv.forEach(x=>{const l=merged.at(-1);if(l&&x[0]<=l[1])l[1]=Math.max(l[1],x[1]);else merged.push([...x]);});
 const cur=merged.find(([a,b])=>mins>=a&&mins<b);if(cur)return {open:true,until:cur[1]-mins};const nx=merged.find(([a])=>a>mins);return {open:false,opensIn:nx?nx[0]-mins:null};}
function fmtDur(m){m=Math.max(0,Math.floor(m));const h=Math.floor(m/60),mm=m%60;return h?`${h}h ${String(mm).padStart(2,'0')}m`:`${mm}m`;}
function localAt(etMin,nowEt){return new Date(Date.now()+(etMin-nowEt)*60000).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
function whenLocal(addMin){const t=new Date(Date.now()+addMin*60000),today=new Date(),tmw=new Date(Date.now()+864e5);
 const day=t.toDateString()===today.toDateString()?'':t.toDateString()===tmw.toDateString()?'tomorrow ':t.toLocaleDateString('en-GB',{weekday:'short'})+' ';
 return day+t.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
function nextOpen(ymd,mins){if(isTradingDay(ymd)&&mins<570)return {add:570-mins,ymd};for(let n=1;n<=10;n++){const k=ymdAdd(ymd,n);if(isTradingDay(k))return {add:n*1440-mins+570,ymd:k};}return null;}
// shrink the big countdown line until it fits its card (e.g. "Opens tomorrow 14:30" on a narrow phone)
function fitCountdown(el){if(!el||!el.style)return;el.style.fontSize='';const max=parseFloat(getComputedStyle(el).fontSize)||40;let f=max;
 while(f>18&&el.scrollWidth>el.clientWidth+1){f-=1;el.style.fontSize=f+'px';}}
let fitTimer=null;if(typeof window!=='undefined')window.addEventListener('resize',()=>{clearTimeout(fitTimer);fitTimer=setTimeout(()=>fitCountdown(document.getElementById('countdown')),150);});
function clock(){
 const now=new Date(),{ymd,mins}=etParts(now),trading=isTradingDay(ymd),close=closeMin(ymd),early=!!US_EARLY[ymd];
 const lm=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;let off=lm-mins;if(off>720)off-=1440;if(off<-720)off+=1440;
 const band=$('band');band.innerHTML='';
 // draw each New York day's own sessions (none on weekends and holidays) across your local day
 [-1,0,1].forEach(dd=>sessionsFor(ymdAdd(ymd,dd)).forEach(([a,b,v])=>{const s=Math.max(0,a+off+dd*1440),e=Math.min(1440,b+off+dd*1440);
  if(e>s){const i=document.createElement('i');i.style.left=(s/14.4)+'%';i.style.width=((e-s)/14.4)+'%';i.style.background=`var(${v})`;band.appendChild(i);}}));
 const paint=(el,dd,segs,v)=>segs.forEach(([a,b])=>{const s=Math.max(0,a+off+dd*1440),e=Math.min(1440,b+off+dd*1440);if(e>s){const i=document.createElement('i');i.style.left=(s/14.4)+'%';i.style.width=((e-s)/14.4)+'%';i.style.background=`var(${v})`;el.appendChild(i);}});
 const fb=$('fband');fb.innerHTML='';
 [-2,-1,0,1].forEach(dd=>{const k=ymdAdd(ymd,dd);paint(band,dd,overnightFor(k),'--night');paint(fb,dd,futuresFor(k),'--fut');});
 const n=document.createElement('div');n.className='now';n.style.left=(lm/14.4)+'%';band.appendChild(n);
 const fut=sessionStatus(futuresFor,ymd,mins),ovn=sessionStatus(overnightFor,ymd,mins);
 const nx=nextOpen(ymd,mins),dow=ymdDow(ymd),postEnd=close===960?1200:1020,over=trading&&mins>=postEnd;
 const weekendAhead=nx&&[...Array(Math.max(0,Math.round((Date.parse(nx.ymd)-Date.parse(ymd))/864e5)-1))].some((_,i)=>[0,6].includes(ymdDow(ymdAdd(ymd,i+1))));
 const why=US_HOLIDAYS[ymd]?`Closed for ${US_HOLIDAYS[ymd]}`:(dow===0||dow===6||(over&&weekendAhead))?'Closed for the weekend':over?'Closed for the day':'';
 let state,cd,open=false;
 if(trading&&mins>=570&&mins<close){open=true;state=early?'Wall Street is open · closes early today':'Wall Street is open';cd=`Closes in ${fmtDur(close-mins)}`;}
 else{
  state=trading&&mins>=240&&mins<570?'Pre-market':trading&&mins>=close&&mins<postEnd?'After hours':why?`Wall Street is ${why.charAt(0).toLowerCase()+why.slice(1)}`:'Wall Street is closed';
  if(nx&&nx.ymd!==ymd)for(let k=ymdAdd(ymd,1);k<nx.ymd;k=ymdAdd(k,1))if(US_HOLIDAYS[k]){state+=` · closed ${new Date(k+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'short',timeZone:'UTC'})} for ${US_HOLIDAYS[k]}`;break;}
  cd=!nx?'':nx.add<=720?`Opens in ${fmtDur(nx.add)}`:`Opens ${whenLocal(nx.add)}`;}
 if(open&&US_HOLIDAYS[ymdAdd(ymd,1)])state+=` · closed tomorrow for ${US_HOLIDAYS[ymdAdd(ymd,1)]}`;
 $('state').innerHTML=`<b>${state}</b>`;$('lamp').className='lamp'+(open?' open':'');
 $('countdown').textContent=cd;
 // times printed on the bar where each session starts and ends (your local time); the live time sits on the 'now' line
 const pts=[];const addPts=(dd,segs)=>segs.forEach(([a,b])=>[a,b].forEach(x=>{const p=x+off+dd*1440;if(p>20&&p<1420)pts.push(p);}));
 [-1,0,1].forEach(dd=>addPts(dd,sessionsFor(ymdAdd(ymd,dd)).map(([a,b])=>[a,b])));
 [-2,-1,0,1].forEach(dd=>{const k=ymdAdd(ymd,dd);addPts(dd,overnightFor(k));addPts(dd,futuresFor(k));});
 const hm=m=>{m=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
 const shown=[lm];let tk=`<span class="nowt" style="left:${Math.min(96,Math.max(4,lm/14.4))}%">Now</span>`;
 [...new Set(pts.map(Math.round))].sort((x,y)=>x-y).forEach(p=>{if(shown.some(q=>Math.abs(q-p)<130))return;shown.push(p);tk+=`<span style="left:${Math.min(95,Math.max(5,p/14.4))}%">${hm(p)}</span>`;});
 $('ticks').innerHTML=tk;
 $('ctime').textContent=now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
 const liveK={pre:trading&&mins>=240&&mins<570,reg:open,post:trading&&mins>=close&&mins<postEnd,night:ovn.open,fut:fut.open};
 if(document.querySelectorAll)document.querySelectorAll('#legend span').forEach(e=>e.classList.toggle('live',!!liveK[e.dataset.k]));
 $('futs').textContent=open?'':fut.open?(fut.until<=720?'Futures pause in '+fmtDur(fut.until):'Futures trading'):fut.opensIn==null?'Futures shut':fut.opensIn<=720?'Futures open in '+fmtDur(fut.opensIn):'Futures open '+whenLocal(fut.opensIn);
}
