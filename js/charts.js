/* ---------- chart sheet ---------- */
let chItem=null,chIv='60';
function chSym(it){return it.kind==='crypto'?tvCrypto(it):it.sym;}
function openChart(it){
 chItem=it;buzz();
 $('chTitle').textContent=it.kind==='crypto'?`${it.n} (${it.s})`:(it.name||it.n);
 let meta='';
 if(it.kind==='crypto'){const d=cryptoData[it.id];if(d)meta=`<b>${money(d.price)}</b> · ${fmtPct(d.pct)} in 24h`;}
 else{const pc=pctFor(it);if(pc!=null)meta=`${fmtPct(pc)} vs previous close`;const ex=it.kind==='stock'?extFor(it):null;if(ex)meta+=`${meta?' · ':''}${extLabel(ex).toLowerCase()} ${fmtPct(ex.chg)} at ${money(ex.price)}`;if(it.sym.startsWith('FOREXCOM:'))meta+=(meta?' · ':'')+'Chart follows the 24h futures-tracking contract';}
 $('chMeta').innerHTML=meta;$('chMeta').hidden=!meta;
 openSheet('chartSheet');
 $('chNews').innerHTML='';$('chDeep').innerHTML='';setTimeout(()=>{drawChart();renderSymbolNews(it);loadDeep(it);},120);
}
/* ---------- stock deep-dive: company, key stats, analysts, earnings, company news (Finnhub, via the site) ---------- */
const DEEP={};
const deepTicker=it=>it&&it.kind==='stock'&&/^(NASDAQ|NYSE|AMEX):/.test(it.sym||'')?(it.tk||it.sym.split(':')[1]):null;
const bigMoney=m=>m==null?'–':m>=1e6?'$'+(m/1e6).toFixed(2)+'tn':m>=1e3?'$'+(m/1e3).toFixed(1)+'bn':'$'+Math.round(m)+'m';
async function loadDeep(it){
 const tk=deepTicker(it),box=$('chDeep');box.innerHTML='';if(!tk)return;
 let d=DEEP[tk];
 if(!d||Date.now()-d.got>30*60e3){box.innerHTML='<div class="lazy-ph">Loading company details…</div>';
  try{d=await fetch('/.netlify/functions/td?deep='+tk).then(r=>r.json());if(d.error)throw 0;d.got=Date.now();DEEP[tk]=d;}catch(e){if(chItem===it)box.innerHTML='';return;}}
 if(chItem!==it)return;
 // tracked stocks: the earnings saved by the refresh (dates and beats/misses), else Finnhub's
 let next=d.next;try{const ej=window.EARN_CACHE||(window.EARN_CACHE=await fetch('/data/earnings.json?t='+Math.floor(Date.now()/36e5)).then(r=>r.json()));const st=(ej.stocks||[]).find(x=>x.sym===tk);if(st&&st.next&&!next)next={date:st.next,hour:/before/i.test(st.time)?'bmo':'amc',est:st.epsEst,expected:st.estimated};}catch(e){}
 box.innerHTML=deepHtml(it,d,next);
}
// earnings per share in the company's reporting currency (TSMC reports in Taiwan dollars)
const EPS_CUR={TSM:'NT$'};
function deepHtml(it,d,next){
 const S=d.stats||{},P=d.profile,price=priceFor(it),f2=v=>v==null?'–':(+v).toFixed(2),c=EPS_CUR[d.sym]||'$';
 const rng=S.hi52&&S.lo52&&price?Math.max(0,Math.min(100,(price-S.lo52)/(S.hi52-S.lo52)*100)):null;
 const tiles=[['Market value',bigMoney(S.cap??P?.cap)],['P/E',S.pe!=null?S.pe.toFixed(1):'–'],['EPS (12 months)',S.eps!=null?c+f2(S.eps):'–'],['Revenue growth',S.revGrowth!=null?fmtPct(S.revGrowth):'–'],['Profit margin',S.margin!=null?S.margin.toFixed(1)+'%':'–'],['Beta',S.beta!=null?f2(S.beta):'–'],['Dividend',S.div?S.div.toFixed(2)+'%':'None'],['1-year return',S.ret52!=null?fmtPct(S.ret52):'–']];
 let h=`<div class="deep">`;
 if(rng!=null)h+=`<div class="d52"><div class="d52l"><span>52-week low <b class="num">${money(S.lo52)}</b></span><span>high <b class="num">${money(S.hi52)}</b></span></div><div class="d52b"><i style="left:${rng.toFixed(1)}%"></i></div><small>${rng>=85?'Near its 52-week high':rng<=15?'Near its 52-week low':`${Math.round(rng)}% of the way from the year’s low to its high`}</small></div>`;
 h+=`<div class="dstats">${tiles.map(([l,v])=>`<div><small>${l}</small><b class="num">${v}</b></div>`).join('')}</div>`;
 // earnings
 const E=d.earnings||[];
 if(next||E.length){h+=`<h3>Earnings</h3>`;
  if(next){const dt=new Date(next.date+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});h+=`<div class="dnext">Next report <b>${dt}</b>${next.hour==='bmo'?' · before the open':next.hour==='amc'?' · after the close':''}${next.expected?' (expected)':''}${next.est!=null?` · EPS forecast <b>${c}${f2(next.est)}</b>`:''}</div>`;}
  if(E.length){const mx=Math.max(...E.flatMap(e=>[Math.abs(e.act||0),Math.abs(e.est||0)]))||1;
   h+=`<div class="dearn">${E.slice().reverse().map(e=>{const beat=e.act!=null&&e.est!=null?e.act>=e.est:null;return `<div><div class="deb"><i class="est" style="height:${(Math.abs(e.est||0)/mx*100).toFixed(0)}%"></i><i class="act ${beat?'up':'down'}" style="height:${(Math.abs(e.act||0)/mx*100).toFixed(0)}%"></i></div><b class="num ${beat?'up':'down'}">${c}${f2(e.act)}</b><small>${beat==null?'':beat?'Beat':'Miss'}${e.surprise!=null?` ${e.surprise>0?'+':''}${e.surprise.toFixed(0)}%`:''}</small><small>${e.q&&e.y?`FQ${e.q} ’${String(e.y).slice(2)}`:esc(quarterName(e.period))}</small></div>`;}).join('')}</div><div class="hnote">Bars: forecast (faint) vs actual earnings per share for the last four fiscal quarters (FQ = the company’s own financial year).</div>`;}}
 // analysts
 const R=d.recs||[];
 if(R.length){const r=R[0],tot=r.sb+r.b+r.h+r.s+r.ss||1,buy=r.sb+r.b,sell=r.s+r.ss,o=R[R.length-1],ob=(o.sb+o.b)/((o.sb+o.b+o.h+o.s+o.ss)||1);
  const lab=buy/tot>=.7?'Strong buy':buy/tot>=.5?'Buy':sell/tot>=.3?'Sell':'Hold';
  h+=`<h3>Analysts</h3><div class="drec"><div class="drh"><b>${lab}</b><span>${tot} analysts · ${new Date(r.period).toLocaleDateString('en-GB',{month:'long'})}</span></div>
   <div class="odds"><i class="up" style="width:${buy/tot*100}%"></i><i class="hold" style="width:${r.h/tot*100}%"></i><i class="down" style="width:${sell/tot*100}%"></i></div>
   <div class="oddsk"><span><i class="up"></i>Buy ${buy}</span><span><i class="hold"></i>Hold ${r.h}</span><span><i class="down"></i>Sell ${sell}</span></div>
   ${R.length>1?`<div class="hnote">${Math.round(buy/tot*100)}% say buy, ${Math.round(buy/tot*100)>Math.round(ob*100)?'up':Math.round(buy/tot*100)<Math.round(ob*100)?'down':'unchanged'} from ${Math.round(ob*100)}% ${R.length-1} month${R.length>2?'s':''} ago.</div>`:''}</div>`;}
 // about
 if(P)h+=`<h3>About</h3><div class="dabout">${P.logo?`<img src="${esc(P.logo)}" alt="" onerror="this.remove()">`:''}<div><b>${esc(P.name)}</b><span>${esc([P.industry,P.country,P.ipo?'listed '+P.ipo.slice(0,4):''].filter(Boolean).join(' · '))}</span>${P.web?`<a href="${esc(P.web)}" target="_blank" rel="noopener">${esc(P.web.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,''))}</a>`:''}</div></div>`;
 // company news
 if((d.news||[]).length)h+=`<h3>Company news</h3><div class="nlist">${d.news.map(n=>`<div class="nr"><a href="${esc(n.url)}" target="_blank" rel="noopener"><span class="nt">${timeAgo(new Date(n.at).toISOString())}</span><span class="nb"><span class="ns">${esc(n.src)}</span><span class="nh">${esc(calm(n.t))}</span></span></a></div>`).join('')}</div>`;
 return h+`<div class="hnote" style="margin-top:8px">Company data from Finnhub, updated hourly.</div></div>`;
}
function quarterName(p){if(!p)return '';const d=new Date(p+'T12:00:00Z');return 'Q'+(Math.floor(d.getUTCMonth()/3)+1)+' '+String(d.getUTCFullYear()).slice(2);}
function drawChart(){
 if(!chItem)return;if(ownChart(chItem))return drawOwnChart(chItem);const bg=css('--surface');
 tv($('chBody'),'embed-widget-advanced-chart.js',{autosize:true,symbol:chSym(chItem),interval:chIv,timezone:'Europe/London',theme:theme(),style:'1',locale:'en',
  hide_side_toolbar:true,allow_symbol_change:false,save_image:false,calendar:false,hide_volume:chItem.kind==='metal',
  backgroundColor:/^#[0-9a-f]{6}$/i.test(bg)?rgba(bg,1):undefined,gridColor:rgba(colorHex('--rule'),.6),support_host:'https://www.tradingview.com'},
  ()=>{$('chBody').innerHTML='<div class="tvfail">The chart can’t load in this viewer.</div>';});
}
$('ivSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.i===chIv)return;chIv=b.dataset.i;[...$('ivSeg').children].forEach(x=>x.classList.toggle('on',x===b));drawChart();});

/* ---------- own candlestick chart (coins TradingView doesn't carry, e.g. NonKYC) ---------- */
const ownChart=it=>it&&it.kind==='crypto'&&typeof it.chart==='string'&&it.chart.startsWith('nonkyc:');
const OWN_IV={'60':[60,72],'240':[240,90],'D':[1440,120],'W':[1440,500]};
async function drawOwnChart(it){
 const box=$('chBody'),sym=it.chart.slice(7),iv=chIv;
 if(!box.querySelector('.ownchart'))box.innerHTML='<div class="lazy-ph">Loading NonKYC chart…</div>';
 const [res,count]=OWN_IV[iv]||OWN_IV['60'];
 try{
  const j=await fetch(`/.netlify/functions/candles?symbol=${encodeURIComponent(sym)}&res=${res}&count=${count}`).then(r=>r.json());
  if(chItem!==it||chIv!==iv)return;
  let bars=(j.bars||[]).filter(b=>b&&b.c>0);
  if(iv==='W'){const wk={};bars.forEach(b=>{const d=new Date(b.t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));const k=d.getTime();const w=wk[k];
   if(!w)wk[k]={t:k,o:b.o,h:b.h,l:b.l,c:b.c,v:b.v};else{w.h=Math.max(w.h,b.h);w.l=Math.min(w.l,b.l);w.c=b.c;w.v+=b.v;}});bars=Object.values(wk).sort((a,b)=>a.t-b.t);}
  if(bars.length<2){box.innerHTML='<div class="tvfail">No recent trades on NonKYC for this pair.</div>';return;}
  renderCandles(box,bars,j.ticker,sym,res,iv);
 }catch(e){if(chItem===it)box.innerHTML='<div class="tvfail">The NonKYC chart can’t load in this viewer.</div>';}
}
function renderCandles(box,bars,tk,sym,res,iv){
 box.innerHTML=`<div class="ownchart"><div class="och-head"><span><b>NonKYC</b> · ${esc(sym)}</span><span class="och-last num"></span></div><div class="och-info num"></div><svg aria-label="${esc(sym)} price chart"></svg></div>`;
 const wrap=box.querySelector('.ownchart'),svg=wrap.querySelector('svg');
 const W=Math.max(200,svg.getBoundingClientRect().width),H=Math.max(160,svg.getBoundingClientRect().height);
 svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
 const padR=58,padB=22,padT=8,pw=W-padR-6,ph=H-padB-padT;
 let lo=Math.min(...bars.map(b=>b.l)),hi=Math.max(...bars.map(b=>b.h));const pad=(hi-lo||hi*0.02)*0.08;lo-=pad;hi+=pad;
 const n=bars.length,slot=pw/n,bw=Math.max(1,Math.min(14,slot*0.66));
 const X=i=>6+slot*(i+0.5),Y=v=>padT+(hi-v)/(hi-lo)*ph;
 const UP='#0ca30c',DN='#d03b3b',grid=css('--rule'),mut=css('--muted');
 let g='';
 for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4,y=Y(v);g+=`<line x1="6" x2="${6+pw}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${grid}" stroke-width="1"/><text x="${W-padR+6}" y="${(y+4).toFixed(1)}" font-size="11" fill="${mut}">${money(v)}</text>`;}
 const fmtT=t=>{const d=new Date(t);return res<1440?(iv==='60'?d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit'})):d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});};
 [0.08,0.5,0.92].forEach(f=>{const i=Math.min(n-1,Math.round(f*(n-1)));g+=`<text x="${X(i).toFixed(1)}" y="${H-6}" font-size="11" fill="${mut}" text-anchor="middle">${fmtT(bars[i].t)}</text>`;});
 bars.forEach((b,i)=>{const up=b.c>=b.o,col=up?UP:DN,x=X(i),y1=Y(Math.max(b.o,b.c)),y2=Y(Math.min(b.o,b.c));
  g+=`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${Y(b.h).toFixed(1)}" y2="${Y(b.l).toFixed(1)}" stroke="${col}" stroke-width="1.2"/><rect x="${(x-bw/2).toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1,y2-y1).toFixed(1)}" fill="${col}" rx="${bw>4?1:0}"/>`;});
 const last=tk&&tk.last?tk.last:bars[n-1].c,ly=Y(Math.min(hi,Math.max(lo,last)));
 g+=`<line x1="6" x2="${6+pw}" y1="${ly.toFixed(1)}" y2="${ly.toFixed(1)}" stroke="${css('--accent')}" stroke-dasharray="4 4" stroke-width="1"/><rect x="${W-padR+1}" y="${(ly-10).toFixed(1)}" width="${padR-3}" height="20" rx="6" fill="${css('--accent')}"/><text x="${W-padR+6}" y="${(ly+4).toFixed(1)}" font-size="11" font-weight="700" fill="${css('--bg')}">${money(last)}</text>`;
 g+=`<line class="xh" x1="0" x2="0" y1="${padT}" y2="${padT+ph}" stroke="${css('--ink')}" stroke-opacity=".35" stroke-width="1" visibility="hidden"/>`;
 svg.innerHTML=g;
 const ch=tk&&tk.prev?(last/tk.prev-1)*100:null;
 wrap.querySelector('.och-last').innerHTML=`${money(last)}${ch!=null?` <span class="${ch>=0?'up':'down'}">${fmtPct(ch)} 24h</span>`:''}`;
 const info=wrap.querySelector('.och-info'),xh=svg.querySelector('.xh');
 const show=i=>{const b=bars[i];info.innerHTML=`${fmtT(b.t)} · O ${money(b.o)} H ${money(b.h)} L ${money(b.l)} C <b class="${b.c>=b.o?'up':'down'}">${money(b.c)}</b>`;xh.setAttribute('x1',X(i));xh.setAttribute('x2',X(i));xh.setAttribute('visibility','visible');};
 const hide=()=>{info.innerHTML=tk&&tk.high?`24h high ${money(tk.high)} · low ${money(tk.low)}${tk.vol?` · volume $${Math.round(tk.vol).toLocaleString('en-US')}`:''}`:'Tap or drag on the chart for prices';xh.setAttribute('visibility','hidden');};
 const at=e=>{const r=svg.getBoundingClientRect(),x=(e.clientX-r.left)*(W/r.width);return Math.max(0,Math.min(n-1,Math.floor((x-6)/slot)));};
 svg.addEventListener('pointerdown',e=>{svg.setPointerCapture(e.pointerId);show(at(e));});
 svg.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='mouse')show(at(e));});
 svg.addEventListener('pointerup',()=>setTimeout(hide,1500));svg.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')hide();});
 hide();
}

/* ---------- sheets ---------- */
let openSheets=0;
function openSheet(id){const s=$(id);s.hidden=false;openSheets++;document.body.classList.add('locked');requestAnimationFrame(()=>requestAnimationFrame(()=>s.classList.add('open')));const f=s.querySelector('.close');setTimeout(()=>f&&f.focus({preventScroll:true}),300);}
function closeSheet(id){const s=$(id);if(s.hidden)return;s.classList.remove('open');openSheets=Math.max(0,openSheets-1);if(!openSheets)document.body.classList.remove('locked');
 setTimeout(()=>{s.hidden=true;if(id==='chartSheet'){$('chBody').innerHTML='';$('chNews').innerHTML='';$('chDeep').innerHTML='';chItem=null;}},320);}
document.querySelectorAll('.sheet').forEach(s=>s.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeSheet(s.id);}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){['chartSheet','editSheet'].forEach(closeSheet);}});
/* swipe down on the grabber/header to close */
document.querySelectorAll('.panel').forEach(p=>{let y0=null;
 p.addEventListener('touchstart',e=>{if(p.scrollTop<=0&&e.target.closest('.grab,.phead'))y0=e.touches[0].clientY;},{passive:true});
 p.addEventListener('touchmove',e=>{if(y0==null)return;const dy=e.touches[0].clientY-y0;if(dy>0)p.style.transform=`translateY(${dy}px)`;},{passive:true});
 p.addEventListener('touchend',e=>{if(y0==null)return;const dy=e.changedTouches[0].clientY-y0;p.style.transform='';y0=null;if(dy>90)closeSheet(p.closest('.sheet').id);});
});
