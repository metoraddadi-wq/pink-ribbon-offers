/* shared.js — يُستخدم في صفحة العميلات (offers.html) وصفحة الاستقبال (staff.html) */
"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const SS={get(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(m,ms=2600){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t)}t.textContent=m;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),ms)}
function hex2rgb(h){h=(h||'#000').replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255]}
function rgb2hex(r,g,b){return'#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')}
function mix(a,b,t){const A=hex2rgb(a),B=hex2rgb(b);return rgb2hex(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t)}
const hasAr=s=>/[؀-ۿ]/.test(s||'');
function normUrl(u){u=(u||'').trim();if(!u)return'';if(!/^[a-z]+:\/\//i.test(u))u='https://'+u;return u}
function waDigits(n){n=(n||'').replace(/\D/g,'');if(n.startsWith('00'))n=n.slice(2);if(n.startsWith('05'))n='966'+n.slice(1);else if(n.startsWith('5')&&n.length===9)n='966'+n;return n}
function waLink(n,msg){const d=waDigits(n);return d?('https://wa.me/'+d+(msg?('?text='+encodeURIComponent(msg)):'')):''}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){try{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();const ok=document.execCommand('copy');a.remove();return ok}catch(e2){return false}}}
async function sha256(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return'plain:'+s}}
function useCap(name,ms=1200){try{if(!window.claude||!window.claude.use)return Promise.resolve(null);return Promise.race([window.claude.use(name),new Promise(r=>setTimeout(()=>r(null),ms))]).catch(()=>null)}catch(e){return Promise.resolve(null)}}
async function saveFile(name,blob){const dl=await useCap('downloads');if(dl){try{await dl.save({filename:name,data:blob});return}catch(e){if(e&&/declin|cancel|abort/i.test(String(e.code||e.message)))return}}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},3000)}
const canvasBlob=(cv,type='image/png',q)=>new Promise(r=>cv.toBlob(r,type,q));
function rrect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}

/* ---- config ---- */
const DEFAULT_CFG={salonName:'اسم الصالون',headline:'خصمك الخاص بانتظارك',subheadline:'',note:'',campaignId:'c1',theme:{bg:'#24161C',fg:'#FFF0F4',accent:'#FF8DAA'},contacts:{},info:{},offers:[],cardNumber:'optional',analytics:{}};
async function loadConfig(preview){if(preview){const d=LS.get('cs_cfg_draft',null);if(d)return normCfg(d)}
  try{const r=await fetch('config.json?t='+Date.now(),{cache:'no-store'});if(r.ok)return normCfg(await r.json())}catch(e){}return normCfg({})}
function normCfg(j){const c=Object.assign({},DEFAULT_CFG,j);c.theme=Object.assign({},DEFAULT_CFG.theme,j.theme);c.contacts=Object.assign({},j.contacts);c.info=Object.assign({},j.info);c.analytics=Object.assign({},j.analytics);
  let mx=0;(c.offers||[]).forEach(o=>{if(+o.n>mx)mx=+o.n});c.offers=(c.offers||[]).map(o=>{o=Object.assign({},o);if(!o.n)o.n=++mx;return o});return c}
const gF=(cfg,m,f)=>cfg&&cfg.feminine?f:m;

/* ---- expiry ---- */
function endOfDay(d){if(!d)return null;const t=new Date(d+'T23:59:59');return isNaN(t)?null:t}
function offerExpiry(cfg,o){const a=endOfDay(o.expires),b=endOfDay(cfg.expires);return a&&b?(a<b?a:b):(a||b)}
const isExpired=(cfg,o,now=new Date())=>{const e=offerExpiry(cfg,o);return!!(e&&now>e)};
const fmtDate=d=>d.toLocaleDateString('ar-SA-u-ca-gregory',{day:'numeric',month:'long',year:'numeric'});
function leftText(ms){const d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5),m=Math.floor(ms%36e5/6e4);
  if(d>=1)return`${d===1?'يوم':d===2?'يومين':d<=10?d+' أيام':d+' يوم'}${h?` و${h} ساعة`:''}`;if(h>=1)return`${h} ساعة${m?` و${m} دقيقة`:''}`;return`${Math.max(1,m)} دقيقة`}

/* ---- verifiable voucher numbers ----
   الرقم يحمل: رقم العرض + يوم الإصدار + رقم عشوائي + خانة تحقق مرتبطة بالحملة.
   صفحة الاستقبال تتأكد منه بدون إنترنت أو قاعدة بيانات. */
const RA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',EPOCH=Date.UTC(2026,0,1);
function fnv(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h}
function dayNum(d=new Date()){return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-EPOCH)/864e5)}
function makeRef(cfg,n){const day=Math.max(0,Math.min(2047,dayNum())),rnd=Math.floor(Math.random()*512);const p=((n&31)<<20)|(day<<9)|rnd;let body='';for(let i=4;i>=0;i--)body+=RA[(p>>(i*5))&31];
  const chk=RA[fnv(body+'|'+cfg.campaignId+'|pr')%32];return(cfg.refPrefix||'C')+'-'+body+chk}
function parseRef(cfg,raw){let s=String(raw||'').toUpperCase().replace(/[\s_]/g,'');const pre=(cfg.refPrefix||'C').toUpperCase();
  s=s.replace(new RegExp('^'+pre+'-?'),'').replace(/-/g,'');
  if(s.length!==6||[...s].some(ch=>RA.indexOf(ch)<0))return{ok:false,why:'format'};
  const body=s.slice(0,5);if(RA[fnv(body+'|'+cfg.campaignId+'|pr')%32]!==s[5])return{ok:false,why:'check'};
  let p=0;for(const ch of body)p=p*32+RA.indexOf(ch);const n=(p>>20)&31,day=(p>>9)&2047;const issued=new Date(EPOCH+day*864e5);
  return{ok:true,ref:pre+'-'+s,n,issued,offer:(cfg.offers||[]).find(o=>+o.n===n)}}

/* ---- analytics (GoatCounter, اختياري) ---- */
function initAnalytics(cfg,path){const code=(cfg.analytics&&cfg.analytics.goatcounter||'').trim();if(!code)return;
  window.goatcounter={path:()=>path,no_onload:false};const s=document.createElement('script');s.async=true;s.src='https://gc.zgo.at/count.js';s.dataset.goatcounter=`https://${code}.goatcounter.com/count`;document.head.appendChild(s)}
function track(path,title){try{if(window.goatcounter&&window.goatcounter.count)window.goatcounter.count({path,title,event:true})}catch(e){}}

/* ---- UI pieces ---- */
const IC={
 ribbon:'<svg viewBox="0 0 100 150" aria-hidden="true"><defs><linearGradient id="rbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--ac2)"/><stop offset=".55" style="stop-color:var(--cac)"/><stop offset="1" style="stop-color:color-mix(in srgb,var(--cac) 70%,#000)"/></linearGradient></defs><path fill="url(#rbg)" d="M50 6C33 6 22 20 25 37c2 10 7 19 12 27L14 128l17 13 19-48 19 48 17-13-23-64c5-8 10-17 12-27C78 20 67 6 50 6zm0 17c8 0 12 7 10 15-1 6-5 13-10 20-5-7-9-14-10-20-2-8 2-15 10-15z"/></svg>',
 spark:'<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="spg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--ac2)"/><stop offset="1" style="stop-color:var(--cac)"/></linearGradient></defs><path fill="url(#spg)" d="M50 4c4 26 14 38 46 46-32 8-42 20-46 46-4-26-14-38-46-46 32-8 42-20 46-46z"/></svg>',
 gift:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>',
 arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
 tap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V5a2 2 0 0 1 4 0v6"/><path d="M13 10a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3l-3-5a2 2 0 0 1 3-2l2 2"/></svg>',
 copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
 cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4"/></svg>',
 clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
 wa:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.4-.2z"/></svg>',
 ig:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></svg>',
 shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/></svg>',
 chev:'<svg class="ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>'};
function splitVal(v){v=String(v||'').trim();let m=v.match(/^([\d٠-٩.,]+)\s*[%٪]$/);if(m)return{b:m[1]+'%',s:'خصم'};m=v.match(/^([\d٠-٩.,]+)\s*(.+)$/);if(m)return{b:m[1],s:m[2]+' خصم'};return{b:v,s:''}}
function cxMark(cfg){if(cfg.markSvg&&cfg.markSvg.d)return`<svg viewBox="${esc(cfg.markSvg.vb)}" class="wide" aria-label="${esc(cfg.salonName)}"><defs><linearGradient id="mkg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--ac2)"/><stop offset=".55" style="stop-color:var(--cac)"/><stop offset="1" style="stop-color:color-mix(in srgb,var(--cac) 80%,#000)"/></linearGradient></defs><path fill="url(#mkg)" fill-rule="evenodd" d="${cfg.markSvg.d}"/></svg>`;if(cfg.logo)return`<img src="${cfg.logo}" alt="${esc(cfg.salonName)}">`;return cfg.mark==='ribbon'||/وردي|ribbon/i.test((cfg.salonName||'')+(cfg.nameEn||''))?IC.ribbon:IC.spark}
function cxBadges(cfg){const b=Array.isArray(cfg.badges)?cfg.badges:String(cfg.badges||'').split(/[،,]/);return b.map(x=>x.trim()).filter(Boolean)}
function cxFooter(cfg){const C=cfg.contacts||{},I=cfg.info||{};const rows=[];
  if(I.hours)rows.push(`<div class="r">${IC.clock}<span>${esc(I.hours)}</span></div>`);
  if(I.address||C.maps)rows.push(`<a class="r" href="${esc(normUrl(C.maps||''))||'#'}">${IC.pin}<span>${esc(I.address||'موقعنا على الخريطة')}</span>${C.maps?IC.chev:''}</a>`);
  if(false)rows.push(`<a class="r" href="${esc(normUrl(C.website))}">${IC.cal}<span>${gF(cfg,'احجز موعدك أونلاين','احجزي موعدك أونلاين')}</span>${IC.chev}</a>`);
  const soc=[C.whatsapp&&`<a href="${esc(waLink(C.whatsapp))}">${IC.wa}واتساب</a>`,C.instagram&&`<a href="https://instagram.com/${esc(C.instagram.replace(/^@/,''))}">${IC.ig}انستقرام</a>`,C.maps&&`<a href="${esc(normUrl(C.maps))}">${IC.pin}الموقع</a>`].filter(Boolean);
  return`${rows.length?`<div class="cx-info rv" style="--d:.55s">${rows.join('')}</div>`:''}${soc.length?`<div class="cx-soc rv" style="--d:.6s;grid-template-columns:repeat(${soc.length},1fr)">${soc.join('')}</div>`:''}
   ${cfg.note?`<p class="cx-terms rv" style="--d:.65s">${esc(cfg.note)}</p>`:''}<div class="cx-foot">${esc((cfg.nameEn||cfg.salonName||'').toUpperCase())}</div>`}
function cxHero(cfg){const bd=cxBadges(cfg);return`<header class="cx-hero"><div class="cx-mark rv ${cfg.markSvg?'wide':''}">${cxMark(cfg)}</div>
  <h2 class="cx-name rv" style="--d:.1s;${cfg.nameFontAr?`font-family:'${esc(cfg.nameFontAr)}',Tajawal;font-weight:800`:''}">${esc(cfg.salonName)}</h2>${cfg.nameEn?`<div class="${cfg.nameFontEn?'cx-en2':'cx-en'} rv" style="--d:.14s;${cfg.nameFontEn?`font-family:'${esc(cfg.nameFontEn)}',serif`:''}">${esc(cfg.nameEn)}</div>`:''}${bd.length?`<div class="cx-badges rv" style="--d:.18s">${bd.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}</header>`}
function confetti(cfg){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const cv=document.createElement('canvas');cv.id='cxConf';document.body.appendChild(cv);const dpr=Math.min(2,devicePixelRatio||1);
  cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;const x=cv.getContext('2d');x.scale(dpr,dpr);const cols=[cfg.theme.accent,cfg.theme.fg,mix(cfg.theme.accent,'#FFFFFF',.5),'#F4D58D'];
  const P=[...Array(140)].map(()=>({x:innerWidth/2,y:innerHeight*.32,vx:(Math.random()-.5)*13,vy:-Math.random()*13-4,s:Math.random()*7+4,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[Math.floor(Math.random()*cols.length)],sh:Math.random()<.5}));
  const t0=performance.now();(function f(t){const k=(t-t0)/1000;x.clearRect(0,0,innerWidth,innerHeight);P.forEach(p=>{p.vy+=.32;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.globalAlpha=Math.max(0,1-k/2.6);x.fillStyle=p.c;
    if(p.sh)x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);else{x.beginPath();x.arc(0,0,p.s/3,0,7);x.fill()}x.restore()});if(k<2.6)requestAnimationFrame(f);else cv.remove()})(t0)}

async function ticketImage(cfg,o,ref,extra={}){try{await Promise.all([`800 60px "${cfg.nameFontAr||'Almarai'}"`,`600 40px "${cfg.nameFontEn||'Lora'}"`,'800 40px Tajawal','500 30px Tajawal'].map(f=>document.fonts.load(f,'اسم Ab')))}catch(e){}
  const W=1080,H=1350,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');const bg=cfg.theme.bg,fg=cfg.theme.fg,ac=cfg.theme.accent,ac2=mix(ac,'#FFFFFF',.45);
  x.fillStyle=bg;x.fillRect(0,0,W,H);const gl=(cx,cy,r,a)=>{const g=x.createRadialGradient(cx,cy,0,cx,cy,r);const[R,G,B]=hex2rgb(ac);g.addColorStop(0,`rgba(${R},${G},${B},${a})`);g.addColorStop(1,`rgba(${R},${G},${B},0)`);x.fillStyle=g;x.fillRect(0,0,W,H)};
  gl(900,0,700,.38);gl(100,1350,700,.28);
  const grad=()=>{const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,ac2);g.addColorStop(.6,ac);g.addColorStop(1,mix(ac,'#000000',.2));return g};
  let y=90;if(cfg.markSvg&&cfg.markSvg.d){const[,,vw,vh]=cfg.markSvg.vb.split(/\s+/).map(Number);const w=360,k=w/vw;x.save();x.translate(W/2-w/2,y);x.scale(k,k);x.fillStyle=grad();x.fill(new Path2D(cfg.markSvg.d),'evenodd');x.restore();y+=vh*k+70}
  else y+=40;
  x.textAlign='center';x.direction='rtl';x.fillStyle=fg;x.font=`800 64px "${cfg.nameFontAr||'Almarai'}", Tajawal`;x.fillText(cfg.salonName,W/2,y);y+=58;
  if(cfg.nameEn){x.direction='ltr';x.fillStyle=ac2;x.font=`600 38px "${cfg.nameFontEn||'Lora'}", serif`;x.fillText(cfg.nameEn,W/2,y);y+=50}
  // ticket
  const tx=90,tw=W-180,ty=y+20,th=640;x.save();rrect(x,tx,ty,tw,th,44);const tg=x.createLinearGradient(tx,ty,tx+tw,ty+th);tg.addColorStop(0,mix(bg,ac,.32));tg.addColorStop(1,mix(bg,ac,.1));x.fillStyle=tg;x.fill();
  x.strokeStyle=mix(bg,ac,.6);x.lineWidth=3;x.stroke();x.restore();
  x.direction='rtl';x.fillStyle=mix(fg,bg,.3);x.font='500 30px Tajawal';x.fillText('قسيمة خصم لحاملة البطاقة',W/2,ty+78);
  const v=splitVal(o.value);x.direction='ltr';x.fillStyle=grad();x.font='800 150px Tajawal';x.fillText(v.b,W/2,ty+235);
  x.direction='rtl';x.fillStyle=fg;x.font='800 46px Tajawal';x.fillText((v.s?v.s+' — ':'')+o.title,W/2,ty+315,tw-80);
  if(o.desc){x.fillStyle=mix(fg,bg,.25);x.font='500 30px Tajawal';x.fillText(o.desc,W/2,ty+370,tw-80)}
  // perforation
  const py=ty+425;x.save();x.setLineDash([16,14]);x.strokeStyle=mix(fg,bg,.65);x.lineWidth=3;x.beginPath();x.moveTo(tx+40,py);x.lineTo(tx+tw-40,py);x.stroke();x.restore();
  x.fillStyle=bg;for(const cx of[tx,tx+tw]){x.beginPath();x.arc(cx,py,26,0,7);x.fill()}
  x.fillStyle=mix(fg,bg,.35);x.font='500 28px Tajawal';x.fillText('الكود',W/2+tw/4,py+70);x.fillText('رقم القسيمة',W/2-tw/4,py+70);
  x.fillStyle=fg;x.direction='ltr';x.font='800 52px ui-monospace, Menlo, monospace';x.fillText(o.code,W/2+tw/4,py+140);x.fillStyle=ac2;x.fillText(ref,W/2-tw/4,py+140);
  y=ty+th+70;x.direction='rtl';x.textAlign='center';x.fillStyle=fg;x.font='700 34px Tajawal';x.fillText('تُسلَّم البطاقة عند الزيارة لتفعيل الخصم',W/2,y);
  const meta=[extra.card?('رقم البطاقة: '+extra.card):'',extra.exp?('صالحة حتى '+fmtDate(extra.exp)):'','صدرت '+fmtDate(new Date())].filter(Boolean).join('  ·  ');
  x.fillStyle=mix(fg,bg,.4);x.font='500 27px Tajawal';x.fillText(meta,W/2,y+54,W-120);
return cv}
