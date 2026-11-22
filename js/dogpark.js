/* ---------- dog park (top-down Dobermans in a paddock) ---------- */
function dobie(kind,level){
 const evil=kind==='evil',good=kind==='good',sleep=kind==='sleep';
 const fur=sleep?'#34303f':'#0d0b14',tan=sleep?'#8a6a55':'#c46d2c';
 const eye=evil?'#ff2b2b':'#20d36a';
 let s='<svg viewBox="-12 -16 84 122" aria-hidden="true">';
 if(good&&level>=2)s+=`<ellipse cx="30" cy="42" rx="${level>=3?40:33}" ry="${level>=3?56:49}" fill="#b8ff9f" opacity="${level>=3?.3:.16}" stroke="#eaffd9" stroke-width="2" stroke-opacity=".8"/>`;
 if(evil&&level>=2)s+=`<ellipse cx="30" cy="42" rx="${level>=3?40:33}" ry="${level>=3?56:49}" fill="#ff1f3d" fill-opacity="${level>=3?.28:.16}" stroke="#ff3b3b" stroke-width="2.2" stroke-dasharray="${level>=3?'0':'5 4'}"/>`;
 s+='<ellipse cx="33" cy="58" rx="17" ry="31" fill="#000" opacity=".18"/>';
 s+=`<g class="legA"><rect x="10.5" y="27" width="7" height="14" rx="3.5" fill="${tan}"/><rect x="42.5" y="66" width="7" height="14" rx="3.5" fill="${tan}"/></g>`;
 s+=`<g class="legB"><rect x="42.5" y="27" width="7" height="14" rx="3.5" fill="${tan}"/><rect x="10.5" y="66" width="7" height="14" rx="3.5" fill="${tan}"/></g>`;
 s+=`<g class="tail"><rect x="27.5" y="77" width="5" height="12" rx="2.5" fill="${fur}"/></g>`;
 s+=`<ellipse cx="30" cy="55" rx="14.5" ry="26" fill="${fur}"/>`;
 s+='<path d="M30 34 L30 76" stroke="#fff" stroke-opacity=".08" stroke-width="2.4" stroke-linecap="round"/>';
 s+='<path d="M19.5 33 Q30 38.5 40.5 33 L40.5 38 Q30 43.5 19.5 38 Z" fill="var(--ring)"/>';
 if(evil&&level>=2)s+='<path d="M19.5 35.5 l-5 -1.8 l5 -1.8z M40.5 35.5 l5 -1.8 l-5 -1.8z M24.5 40 l-1.5 4.5 l3.8 -3.6z M35.5 40 l1.5 4.5 l-3.8 -3.6z M30 41.3 l-1.4 4.6 l2.8 0z" fill="#d6dbe3"/>';
 if(good&&level>=2)s+='<circle cx="30" cy="41.5" r="2.6" fill="#ffd84a" stroke="#c99a10" stroke-width=".8"/>';
 s+=`<path d="M23 27 L11.5 7 L26.5 19 Z" fill="${fur}"/><path d="M37 27 L48.5 7 L33.5 19 Z" fill="${fur}"/>`;
 s+='<path d="M22.6 23.5 L15.4 11 L25.4 19.4 Z" fill="#43263a"/><path d="M37.4 23.5 L44.6 11 L34.6 19.4 Z" fill="#43263a"/>';
 s+=`<path d="M21 33 L22.8 19 L27.4 2.5 L32.6 2.5 L37.2 19 L39 33 Q30 37.5 21 33 Z" fill="${fur}"/>`;
 s+=`<path d="M27.5 4.5 L32.5 4.5 L34 13 L26 13 Z" fill="${tan}"/><circle cx="25.4" cy="23.4" r="1.7" fill="${tan}"/><circle cx="34.6" cy="23.4" r="1.7" fill="${tan}"/>`;
 if(good&&level>=2)s+='<path d="M28.2 4 Q30 -6.5 31.8 4 Z" fill="#ff6f8f"/>';
 s+='<ellipse cx="30" cy="3.4" rx="2.9" ry="2.1" fill="#000"/>';
 if(sleep)s+='<path d="M22.8 19.6 L26 20.4 M37.2 19.6 L34 20.4" stroke="#8e88a6" stroke-width="1.4" stroke-linecap="round"/>';
 else{
  if(evil)s+=`<circle cx="24.6" cy="19.3" r="${level>=2?4:3}" fill="#ff2b2b" opacity="${level>=2?.5:.3}"/><circle cx="35.4" cy="19.3" r="${level>=2?4:3}" fill="#ff2b2b" opacity="${level>=2?.5:.3}"/>`;
  s+=`<path d="M22.4 17.8 L26.6 19.6 L23.2 20.8 Z" fill="${eye}"/><path d="M37.6 17.8 L33.4 19.6 L36.8 20.8 Z" fill="${eye}"/>`;
 }
 if(evil&&level>=3)s+='<path d="M24.5 22 Q15 18 15.5 8.5 Q20.5 16 27 17.5 Z" fill="#c4122f"/><path d="M35.5 22 Q45 18 44.5 8.5 Q39.5 16 33 17.5 Z" fill="#c4122f"/>';
 if(good&&level>=3)s+='<circle cx="30" cy="19" r="15" fill="none" stroke="#ffd84a" stroke-width="2.8" opacity=".95"/><path class="spark" d="M4 2 l1.6 -4 l1.6 4 l4 1.6 l-4 1.6 l-1.6 4 l-1.6 -4 l-4 -1.6z" fill="#fff6b0"/><path class="spark s2" d="M52 30 l1.3 -3.2 l1.3 3.2 l3.2 1.3 l-3.2 1.3 l-1.3 3.2 l-1.3 -3.2 l-3.2 -1.3z" fill="#fff6b0"/>';
 return s+'</svg>';
}
let park={nodes:[],raf:0,w:0,h:0,last:0};
const FENCE=18;
function parkItems(){
 const o=[];
 W.crypto.forEach(c=>{const d=cryptoData[c.id];o.push({key:'c:'+c.id,label:c.s,name:c.n,pct:d?d.pct:null,c:c.c,item:{kind:'crypto',...c}});});
 W.stocks.forEach(s=>{o.push({key:'s:'+s.sym,label:s.tk,name:s.name,pct:pctFor(s),c:s.c,item:{kind:'stock',...s}});});
 W.metals.forEach(m=>{o.push({key:'m:'+m.sym,label:m.n,name:m.n,pct:pctFor(m),c:m.c,item:{kind:'metal',...m}});});
 return o;
}
function drawPaddock(){
 const box=$('park');let svg=box.querySelector('.fence');
 if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','fence');svg.setAttribute('aria-hidden','true');box.appendChild(svg);}
 const w=park.w,h=park.h,i1=7,i2=13;let posts='';
 const along=(x1,y1,x2,y2)=>{const len=Math.hypot(x2-x1,y2-y1),n=Math.max(2,Math.round(len/46));for(let k=0;k<=n;k++){const x=x1+(x2-x1)*k/n,y=y1+(y2-y1)*k/n;posts+=`<rect x="${(x-3.5).toFixed(1)}" y="${(y-3.5).toFixed(1)}" width="7" height="7" rx="1.5"/>`;}};
 along(10,10,w-10,10);along(w-10,10,w-10,h-10);along(w-10,h-10,10,h-10);along(10,h-10,10,10);
 svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
 svg.innerHTML=`
  <g class="deco"><g transform="translate(${w-52} ${h-50})"><ellipse cx="0" cy="3" rx="17" ry="11" fill="#000" opacity=".15"/><ellipse cx="0" cy="0" rx="16" ry="10.5" fill="#9aa3ad"/><ellipse cx="0" cy="-1" rx="11.5" ry="7" fill="#5fb3e8"/><ellipse cx="-3" cy="-3" rx="4" ry="1.6" fill="#fff" opacity=".6"/></g>
  <g transform="translate(46 ${h-44}) rotate(-24)"><path d="M-12 -2.2 h24 v4.4 h-24z M-14 -5 a3.2 3.2 0 1 0 0.01 0 M-14 1 a3.2 3.2 0 1 0 0.01 0 M14 -5 a3.2 3.2 0 1 0 0.01 0 M14 1 a3.2 3.2 0 1 0 0.01 0" fill="#f3ead8"/></g>
  <g transform="translate(${w*0.28} 46)" fill="#3f8a33" opacity=".55"><path d="M0 0 l-3 -9 l3 4 l1 -10 l2 10 l3 -5 l-2 10z"/></g><g transform="translate(${w*0.74} ${h*0.55})" fill="#3f8a33" opacity=".55"><path d="M0 0 l-3 -9 l3 4 l1 -10 l2 10 l3 -5 l-2 10z"/></g>
  <g transform="translate(${w*0.15} ${h*0.4})"><circle r="2.6" fill="#fff"/><circle r="1.1" fill="#ffd84a"/></g><g transform="translate(${w*0.62} ${h*0.2})"><circle r="2.6" fill="#fff"/><circle r="1.1" fill="#ffd84a"/></g><g transform="translate(${w*0.45} ${h*0.86})"><circle r="2.6" fill="#fff"/><circle r="1.1" fill="#ffd84a"/></g></g>
  <g fill="none" stroke="var(--fence)" stroke-width="3"><rect x="${i1}" y="${i1}" width="${w-2*i1}" height="${h-2*i1}" rx="14"/><rect x="${i2}" y="${i2}" width="${w-2*i2}" height="${h-2*i2}" rx="10"/></g>
  <g fill="var(--fence)" stroke="rgba(0,0,0,.18)" stroke-width="1">${posts}</g>`;
}
function syncPark(){
 const box=$('park');const rect=box.getBoundingClientRect();if(!rect.width)return;
 const resized=rect.width!==park.w||rect.height!==park.h;
 park.w=rect.width;park.h=rect.height;
 if(resized||!box.querySelector('.fence'))drawPaddock();
 const items=parkItems();
 const maxAbs=Math.max(1,...items.map(i=>Math.abs(i.pct??0)));
 items.forEach(i=>i.wt=i.pct==null?0.55:0.6+0.9*Math.sqrt(Math.abs(i.pct)/maxAbs));
 const sum=items.reduce((a,i)=>a+i.wt*i.wt,0)||1;
 const k=Math.sqrt((park.w-2*FENCE)*(park.h-2*FENCE)*0.34/(0.69*sum));
 const keep=new Map(park.nodes.map(n=>[n.key,n]));
 park.nodes=items.map(i=>{
  let n=keep.get(i.key);
  if(!n){n={key:i.key,x:FENCE+40+Math.random()*(park.w-2*FENCE-80),y:FENCE+40+Math.random()*(park.h-2*FENCE-80),ang:Math.random()*6.283,L:10,pause:0,tt:0,el:document.createElement('button')};
   n.el.className='dog';n.el.innerHTML='<span class="spr"></span><span class="say"></span><span class="tag num"></span>';box.appendChild(n.el);
   n.el.addEventListener('pointerdown',()=>{n.pause=performance.now()/1000+1.4;});
   n.el.addEventListener('click',()=>openChart(n.item));}
  keep.delete(i.key);
  n.tL=Math.max(58,Math.min(i.wt*k,Math.min(park.w,park.h)*0.4));
  const flat=i.pct!=null&&Math.abs(i.pct)<0.05;
  n.kind=i.pct==null||flat?'sleep':i.pct>0?'good':'evil';
  const mag=i.pct==null?0:Math.abs(i.pct);n.level=mag>=3?3:mag>=1?2:1;
  n.sp=n.kind==='sleep'?0:(n.kind==='good'?55+n.level*18:40+n.level*22);
  n.item=i.item;n.pct=i.pct;
  const sig=n.kind+n.level+i.label+(i.pct==null?'':i.pct.toFixed(2))+i.c;
  if(n.sig!==sig){n.sig=sig;
   n.el.className=`dog ${n.kind} lv${n.level}`;n.mode='wander';
   n.el.style.setProperty('--ring',colorVar(i.c));
   n.el.setAttribute('aria-label',`${i.name}: ${i.pct==null?'no data':fmtPct(i.pct)}. Open chart`);
   n.el.querySelector('.spr').innerHTML=dobie(n.kind,n.level);
   const ex=i.item.kind==='stock'?extFor(i.item):null;
   n.el.querySelector('.tag').innerHTML=`${esc(i.label)}<span>${i.pct==null?'zzz':fmtPct(i.pct)}</span>${ex?`<small class="ah">${ex.session==='pre'?'PM':'AH'} ${fmtPct(ex.chg)}</small>`:''}`;
  }
  return n;
 });
 keep.forEach(n=>n.el.remove());
 renderMovers(items);renderParkStatus();
 const need=!tdKey||(!Object.keys(quotes).length&&(W.stocks.length||W.metals.length));
 $('parkNotice').innerHTML=need?`<div class="notice">${tdKey?'Stocks and metals are still loading, or your data key isn’t returning prices.':'Stocks and metals are asleep because there’s no data key.'}<br><button id="toKey">Check data key</button></div>`:'';
 const tk=$('toKey');if(tk)tk.onclick=()=>{openEditor();setTimeout(()=>$('tdKey').scrollIntoView({behavior:'smooth',block:'center'}),350);};
 if(!park.raf){park.last=performance.now();park.raf=requestAnimationFrame(tick);}
}
function angDiff(a,b){let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;}
/* ---- dog behaviour: wander, sniff, play, chase, fight, flee ---- */
function say(n,txt,ms=1200){const s=n.el.querySelector('.say');if(!s)return;s.textContent=txt;s.classList.remove('on');void s.offsetWidth;s.classList.add('on');clearTimeout(n.sayT);n.sayT=setTimeout(()=>s.classList.remove('on'),ms);}
function fx(kind,x,y,ms=1800){const e=document.createElement('div');e.className='fx '+kind;e.style.left=x+'px';e.style.top=y+'px';
 e.innerHTML=kind==='brawl'?'<i></i><i></i><i></i><i></i><b>✶</b><b>✶</b><b>✶</b>':'<span>♥</span><span>♥</span><span>♥</span>';$('park').appendChild(e);setTimeout(()=>e.remove(),ms);}
function resolveFight(a,b,t){
 const evil=a.kind==='evil'?a:b,good=evil===a?b:a;
 const evilWins=Math.abs(evil.pct||0)>Math.abs(good.pct||0)||(Math.abs(evil.pct||0)===Math.abs(good.pct||0)&&Math.random()<.5);
 const win=evilWins?evil:good,lose=evilWins?good:evil;
 win.mode='win';win.until=t+1.3;win.foe=null;win.cool=t+(win.kind==='evil'?16:9)+Math.random()*8;
 lose.mode='flee';lose.until=t+1.7;lose.foe=win;lose.cool=t+7+Math.random()*4;
 say(win,evilWins?'GRRR!':'WOOF!');say(lose,evilWins?'yelp!':'whimper');
}
function tick(now){
 const dt=Math.min(0.05,(now-park.last)/1000);park.last=now;const t=now/1000;
 const N=park.nodes,minX=FENCE,minY=FENCE,maxX=park.w-FENCE,maxY=park.h-FENCE;
 const awake=N.filter(n=>n.kind!=='sleep');
 // state changes and new social events
 for(const n of awake){
  if(!n.mode)n.mode='wander';
  if(n.mode!=='wander'&&t>n.until){
   if(n.mode==='fight'&&n.foe&&n.foe.mode==='fight')resolveFight(n,n.foe,t);
   else if(n.mode!=='fight'||!n.foe||n.foe.mode!=='fight'){if(n.mode==='chase')n.cool=t+10;n.mode='wander';n.tt=0;if(n.mode!=='flee')n.mate=null;}
  }
  if(n.mode==='wander'&&t>(n.cool||0)){
   if(n.kind==='evil'&&Math.random()<dt*(0.012+0.008*n.level)){
    const prey=awake.filter(o=>o.kind==='good'&&o.mode==='wander'&&t>(o.cool||0)).sort((x,y)=>Math.hypot(x.x-n.x,x.y-n.y)-Math.hypot(y.x-n.x,y.y-n.y))[0];
    if(prey){n.mode='chase';n.until=t+6;n.foe=prey;say(n,'GRRR');}
   }else if(Math.random()<dt*0.08){n.mode='sniff';n.until=t+0.8+Math.random()*1.5;}
  }
 }
 for(const n of N){
  n.L+=(n.tL-n.L)*0.08;const r=n.L*0.36;
  if(n.kind==='sleep'){n.v=0;continue;}
  let tx=null,ty=null,spd=n.sp,turnRate=n.kind==='good'?3.4:2.6;
  if(n.mode==='chase'&&n.foe&&N.includes(n.foe)&&n.foe.kind==='good'){
   const f=n.foe,d=Math.hypot(f.x-n.x,f.y-n.y);tx=f.x;ty=f.y;spd=n.sp*1.9;turnRate=5;
   if(d<(n.L+f.L)*0.8&&f.mode==='wander'){f.mode='alert';f.until=t+0.7;f.foe=n;say(f,'!?',800);}
   if(d<(n.L+f.L)*0.42&&f.mode!=='fight'&&f.mode!=='flee'){
    const cx=(n.x+f.x)/2,cy=(n.y+f.y)/2;[n,f].forEach(x=>{x.mode='fight';x.until=t+1.9;x.cx=cx;x.cy=cy;});n.foe=f;f.foe=n;fx('brawl',cx,cy,2000);buzz();
   }
  }else if(n.mode==='chase'){n.mode='wander';}
  if(n.mode==='fight'){
   const a=t*13+(n.kind==='evil'?0:Math.PI);n.x=n.cx+Math.cos(a)*n.L*0.2+(Math.random()-.5)*5;n.y=n.cy+Math.sin(a)*n.L*0.2+(Math.random()-.5)*5;
   n.ang+=dt*(n.kind==='evil'?10:-10);n.v=n.sp*2.2;continue;
  }
  if(n.mode==='alert'&&n.foe){n.ang+=Math.max(-7*dt,Math.min(7*dt,angDiff(n.ang,Math.atan2(n.foe.y-n.y,n.foe.x-n.x))));n.v=0;continue;}
  if(n.mode==='sniff'||n.mode==='win'){n.v=0;n.ang+=Math.sin(t*6+n.L)*dt*0.9;continue;}
  if(n.mode==='flee'&&n.foe){tx=n.x+(n.x-n.foe.x)*2;ty=n.y+(n.y-n.foe.y)*2;spd=n.sp*2.3;turnRate=7;}
  if(n.mode==='play'&&n.mate){n.pa+=dt*3.4;const R=(n.L+n.mate.L)*0.3;tx=n.pcx+Math.cos(n.pa+n.pside)*R;ty=n.pcy+Math.sin(n.pa+n.pside)*R;spd=n.sp*1.5;turnRate=8;}
  if(tx==null){
   if(!n.tx||t>n.tt||Math.hypot(n.tx-n.x,n.ty-n.y)<n.L*0.5){n.tx=minX+r+Math.random()*(maxX-minX-2*r);n.ty=minY+r+Math.random()*(maxY-minY-2*r);n.tt=t+2.5+Math.random()*4;}
   tx=n.tx;ty=n.ty;
  }
  let dx=tx-n.x,dy=ty-n.y;const dl=Math.hypot(dx,dy)||1;dx=dx/dl*120;dy=dy/dl*120;
  // walk around other dogs: push away and sidestep so they pass each other
  for(const o of N){if(o===n||(n.mode==='chase'&&o===n.foe)||o===n.mate)continue;
   const ex=n.x-o.x,ey=n.y-o.y,d=Math.hypot(ex,ey)||1,near=(n.L+o.L)*0.7;
   if(d<near){const f=(near-d)/near*200;dx+=ex/d*f-ey/d*f*0.7;dy+=ey/d*f+ex/d*f*0.7;}}
  const edge=n.L*0.7;
  if(n.x-minX<edge)dx+=(edge-(n.x-minX))*6;if(maxX-n.x<edge)dx-=(edge-(maxX-n.x))*6;
  if(n.y-minY<edge)dy+=(edge-(n.y-minY))*6;if(maxY-n.y<edge)dy-=(edge-(maxY-n.y))*6;
  const want=Math.atan2(dy,dx),turn=turnRate*dt;
  n.ang+=Math.max(-turn,Math.min(turn,angDiff(n.ang,want)));
  const bob=n.kind==='good'?1+0.2*Math.sin(t*6+n.L):1;
  n.v=t<n.pause?0:spd*bob*(0.55+0.45*Math.max(0,Math.cos(angDiff(n.ang,want))));
  n.x+=Math.cos(n.ang)*n.v*dt;n.y+=Math.sin(n.ang)*n.v*dt;
 }
 // good dogs that bump into each other play for a moment
 for(let i=0;i<awake.length;i++)for(let j=i+1;j<awake.length;j++){const a=awake[i],b=awake[j];
  if(a.kind==='good'&&b.kind==='good'&&a.mode==='wander'&&b.mode==='wander'&&t>(a.cool||0)&&t>(b.cool||0)&&Math.hypot(a.x-b.x,a.y-b.y)<(a.L+b.L)*0.65){
   const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;[a,b].forEach((x,k)=>{x.mode='play';x.until=t+2.4;x.mate=k?a:b;x.pcx=cx;x.pcy=cy;x.pa=Math.atan2(x.y-cy,x.x-cx)-k*Math.PI;x.pside=k*Math.PI;x.cool=t+10+Math.random()*5;});
   fx('hearts',cx,cy-12,1900);say(a,'yip!',900);
  }}
 // keep dogs from overlapping (except a fighting pair)
 for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++){const a=N[i],b=N[j];if(a.mode==='fight'&&a.foe===b)continue;
  let ex=b.x-a.x,ey=b.y-a.y,d=Math.hypot(ex,ey)||0.01;const m=(a.L+b.L)*0.4;
  if(d<m){const p=(m-d)/d*0.5;ex*=p;ey*=p;if(a.kind!=='sleep'){a.x-=ex;a.y-=ey;}if(b.kind!=='sleep'){b.x+=ex;b.y+=ey;}}}
 for(const n of N){
  const r=n.L*0.36;n.x=Math.max(minX+r,Math.min(maxX-r,n.x));n.y=Math.max(minY+r,Math.min(maxY-r,n.y));
  const L=n.L,W2=L*84/122;
  n.el.style.width=L+'px';n.el.style.height=L+'px';
  n.el.style.transform=`translate(${(n.x-L/2).toFixed(1)}px,${(n.y-L/2).toFixed(1)}px)`;
  n.el.style.zIndex=n.mode==='fight'?5:2;
  const spr=n.el.firstChild;spr.style.width=W2+'px';spr.style.left=((L-W2)/2)+'px';
  spr.style.transform=`rotate(${(n.ang*180/Math.PI+90).toFixed(1)}deg)`;
  const g=n.v>1?Math.max(0.12,Math.min(0.45,14/n.v)):0;
  n.el.style.setProperty('--gait',g?g.toFixed(2)+'s':'0s');n.el.classList.toggle('still',!g);
  n.el.classList.toggle('fighting',n.mode==='fight');n.el.classList.toggle('won',n.mode==='win');n.el.classList.toggle('sniffing',n.mode==='sniff');
  const tg=n.el.lastChild;tg.style.fontSize=Math.max(9,Math.min(14,L*0.15))+'px';
 }
 park.raf=activeTab==='park'?requestAnimationFrame(tick):0;
}

function renderRecap(){
 const el=$('recap');if(!el)return;
 const big=parkItems().filter(i=>i.pct!=null&&Math.abs(i.pct)>=2).sort((a,b)=>Math.abs(b.pct)-Math.abs(a.pct)).slice(0,3);
 if(!big.length){el.hidden=true;return;}
 el.hidden=false;
 const p1=v=>(v>0?'+':'−')+Math.abs(v).toFixed(1)+'%';
 el.innerHTML=`<span class="rl">Big moves</span><span class="rcs">${big.map(i=>`<span class="rc">${esc(i.label)} <b class="${i.pct>0?'up':'down'}">${p1(i.pct)}</b></span>`).join(' ')}</span><span class="rw">Why ›</span>`;
}
let moverFetch=0;
function renderMovers(items){
 const known=items.filter(i=>i.pct!=null).sort((a,b)=>b.pct-a.pct);
 const box=$('movers');
 if(!known.length){box.hidden=true;return;}box.hidden=false;
 box.innerHTML=known.map((i,ix)=>{const top=Math.abs(i.pct)>=1.5?pickReason(whyFor(i.item).direct):null;return `<button class="mv" data-ix="${ix}" style="--c:${colorVar(i.c)}"><i></i><span class="mvn"><b>${esc(i.name)}</b>${i.label!==i.name?`<small>${esc(i.label)}</small>`:''}${(ex=>ex?`<em class="why ahl">${extLabel(ex)} <b class="${ex.chg>0?'up':ex.chg<0?'down':''}">${fmtPct(ex.chg)}</b> · ${money(ex.price)}</em>`:'')(i.item.kind==='stock'?extFor(i.item):null)}${top?`<em class="why">${esc(splitTag(top.text).body.split('\n')[0])}</em>`:''}</span><span class="p num ${i.pct>0?'up':i.pct<0?'down':''}">${fmtPct(i.pct)}</span></button>`;}).join('');
 box.querySelectorAll('.mv').forEach(b=>b.addEventListener('click',()=>openChart(known[+b.dataset.ix].item)));
 const need=known.filter(i=>Math.abs(i.pct)>=1.5).map(i=>i.item).filter(it=>{const c=ASSETNEWS[assetKey(it)];return !c||(!c.busy&&Date.now()-c.at>8*60e3);}).slice(0,6);
 if(need.length&&Date.now()-moverFetch>20e3){moverFetch=Date.now();Promise.all(need.map(it=>loadAssetNews(it))).then(()=>{if(activeTab==='park')renderMovers(parkItems());});}
}
addEventListener('resize',()=>{if(activeTab==='park')syncPark();});
