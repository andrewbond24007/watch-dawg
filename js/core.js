/* ===================================================================
   WatchDawg. Your watchlist is edited inside the app (pencil button)
   and saved on your phone. The lists below are only the starting set.
   =================================================================== */
const DEFAULTS={
 crypto:[
  {id:'bitcoin',n:'Bitcoin',s:'BTC',g:'₿',c:'--btc'},
  {id:'ethereum',n:'Ethereum',s:'ETH',g:'Ξ',c:'--eth'},
  {id:'solana',n:'Solana',s:'SOL',g:'◎',c:'--sol'},
  {id:'luckycoin',n:'Luckycoin',s:'LKY',g:'',c:'#d4a017',chart:'nonkyc:LKY/USDT'}],
 stocks:[
  {sym:'FOREXCOM:SPXUSD',tk:'S&P 500',name:'S&P 500',icon:'bars',c:'--spx',q:'SPY'},
  {sym:'FOREXCOM:NSXUSD',tk:'NDX',name:'Nasdaq 100',icon:'trend',c:'--ndx',q:'QQQ'},
  {sym:'NASDAQ:NVDA',tk:'NVDA',name:'Nvidia',icon:'chip',c:'--nvda',q:'NVDA'},
  {sym:'NASDAQ:ANT',tk:'ANT',name:'Anthropic',icon:'ai',c:'--ant',q:'',y:'ANT'},
  {sym:'NASDAQ:TSLA',tk:'TSLA',name:'Tesla',icon:'car',c:'#e4572e',q:'TSLA',y:'TSLA'},
  {sym:'NASDAQ:AAPL',tk:'AAPL',name:'Apple',icon:'phone',c:'#8e8e93',q:'AAPL',y:'AAPL'},
  {sym:'NASDAQ:GOOGL',tk:'GOOGL',name:'Google',icon:'search',c:'#2e86ab',q:'GOOGL',y:'GOOGL'}],
 metals:[
  {sym:'OANDA:XAUUSD',n:'Gold',c:'--au',q:'XAU/USD',y:'GC=F'},
  {sym:'OANDA:XAGUSD',n:'Silver',c:'--ag',q:'',y:'SI=F'},
  {sym:'OANDA:XPDUSD',n:'Palladium',c:'--pd',q:'',y:'PA=F'}]
};
const DEFAULT_TD_KEY='8832a67956484780a1b390aa395a0eeb';
const METAL_PRESETS=[
 {n:'Platinum',sym:'OANDA:XPTUSD',q:'',y:'PL=F',c:'#9fb3c8'},
 {n:'Copper',sym:'CAPITALCOM:COPPER',q:'',y:'HG=F',c:'#c8743a'}];
const PALETTE=['#e4572e','#17a5a2','#e0a800','#5e9e2f','#2e86ab','#a23b72','#f18f01','#6c5ce7','#d64c9c','#3d9970'];

const ICONS={
 bars:'<path d="M5 20V14M10 20V10M15 20V12M20 20V5"/><path d="M3 20h19"/>',
 trend:'<path d="M3 17l5-5 4 3 8-9"/><path d="M15 6h5v5"/>',
 chip:'<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
 ai:'<circle cx="12" cy="4.5" r="2"/><circle cx="4.5" cy="17" r="2"/><circle cx="19.5" cy="17" r="2"/><circle cx="12" cy="12.5" r="2.4"/><path d="M12 6.5v3.6M6.3 16l3.7-2.3M17.7 16l-3.7-2.3M6.5 17h11"/>',
 bank:'<path d="M3 9l9-5 9 5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
 oil:'<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/>',
 car:'<path d="M3 15l2-6h14l2 6v3H3z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="16.5" cy="18" r="1.5"/>',
 cart:'<path d="M3 4h3l2.5 11h10L21 7H7"/><circle cx="10" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
 phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
 search:'<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l6 6"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>'
};

/* ---------- basics ---------- */
const $=id=>document.getElementById(id);
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const dark=()=>matchMedia('(prefers-color-scheme: dark)').matches;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clone=o=>JSON.parse(JSON.stringify(o));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
const colorVar=c=>c&&c.startsWith('#')?c:`var(${c||'--accent'})`;
const colorHex=c=>{const h=c&&c.startsWith('#')?c:css(c||'--accent');return /^#[0-9a-f]{6}$/i.test(h)?h:'#6a4fd8';};
const rgba=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;};
const fmtPct=c=>(c>0?'+':c<0?'−':'')+Math.abs(c).toFixed(2)+'%';
const money=v=>{const d=v>=1000?0:v>=1?2:v>=0.01?4:6;return '$'+v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});};
const buzz=()=>{try{navigator.vibrate&&navigator.vibrate(8);}catch(e){}};
function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800);}

let W=store.get('wd.watchlist',null);
if(!W||!Array.isArray(W.crypto)||!Array.isArray(W.stocks)||!Array.isArray(W.metals)) W=clone(DEFAULTS);
/* upgrade lists saved by older versions: Yahoo symbols for what Twelve Data's free plan can't cover */
(function migrate(){const YM={'OANDA:XAUUSD':'GC=F','OANDA:XAGUSD':'SI=F','OANDA:XPDUSD':'PA=F','OANDA:XPTUSD':'PL=F','CAPITALCOM:COPPER':'HG=F'};const NOTD=['XAG/USD','XPD/USD','XPT/USD'];
 W.metals.forEach(m=>{if(m.y==null&&YM[m.sym])m.y=YM[m.sym];if(NOTD.includes(m.q))m.q='';});
 W.stocks.forEach(s=>{if(s.y==null){const ex=s.sym.includes(':')?s.sym.split(':')[0]:'';s.y=!ex||['NASDAQ','NYSE','AMEX','ARCA','BATS'].includes(ex)?s.tk:'';if(s.sym.startsWith('FOREXCOM:'))s.y='';}if(s.sym==='NASDAQ:ANT')s.q='';});
 W.crypto.forEach(c=>{if(c.id==='luckycoin'&&!c.chart){delete c.tv;c.chart='nonkyc:LKY/USDT';}});
 /* one-off additions: added once, never re-added if you remove them */
 [{flag:'wd.added.lky',coin:{id:'luckycoin',n:'Luckycoin',s:'LKY',g:'',c:'#d4a017',chart:'nonkyc:LKY/USDT'}},
  ...['TSLA','AAPL','GOOGL'].map(t=>({flag:'wd.added.'+t.toLowerCase(),stock:DEFAULTS.stocks.find(x=>x.tk===t)}))].forEach(a=>{let done=null;try{done=localStorage.getItem(a.flag);}catch(e){}
  if(!done){if(a.coin&&!W.crypto.some(x=>x.id===a.coin.id))W.crypto.push({...a.coin});if(a.stock&&!W.stocks.some(x=>x.tk===a.stock.tk||x.sym===a.stock.sym))W.stocks.push({...a.stock});try{localStorage.setItem(a.flag,'1');}catch(e){}}});
 try{localStorage.setItem('wd.watchlist',JSON.stringify(W));}catch(e){}})();
const saveW=()=>store.set('wd.watchlist',W);
let tdKey=store.get('wd.tdkey',DEFAULT_TD_KEY)||'';
let quotes=store.get('wd.quotes',{}), quotesAt=store.get('wd.quotesAt',0), qStatus='';
let cryptoData={}, lastOk=0, prev={}, range='1D', activeTab='markets';
