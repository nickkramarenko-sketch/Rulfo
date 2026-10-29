/* ================= Engine (stream A): shared constants, helpers and actions =================
   The contract is PLAN.md section 2. This file is spliced into the bundle's `var a=...,b=...` chain,
   so it is a list of `Name=value,` entries only (no statements). Helpers are pure and never write.
   Actions live in ZZacts, which patch A09 spreads into the actions object; each saves in one write.
   Private helpers start with ZZa_. Never run code at load time that uses a later bundle name. */
/* feature switches: false = the old screen (XQ kiosk, old wrap-up). Read them at render time, never cache them at load.
   Tests only (window.__ZZTEST set by the harness) may override them with window.__ZZFLAGS, so regression can still
   drive the old fallback screens. On the real page the values below are what runs. */
ZZFLAGS=(()=>{let f={kiosk2:!0,secureStep:!0};try{let o=window.__ZZTEST&&window.__ZZFLAGS;if(o&&typeof o==="object")Object.keys(f).forEach(k=>{typeof o[k]==="boolean"&&(f[k]=o[k])})}catch{}return f})(),
ZZPUBLIC_URL="https://claude.ai/artifact/97haWKtJGFGXW8PjdM9XWv",
ZZLANGS=[{k:"en",name:"English"},{k:"es",name:"Español"},{k:"ru",name:"Русский"},{k:"uk",name:"Українська"},{k:"pa",name:"ਪੰਜਾਬੀ"},{k:"hi",name:"हिन्दी"}],
ZZEVENTS=[{k:"booked",label:"Booking confirmed"},{k:"eta",label:"ETA changed"},{k:"arrived",label:"Truck checked in"},{k:"waiting",label:"Waiting too long for a door"},{k:"started",label:"Unloading or loading started"},{k:"damage",label:"Damage found"},{k:"done",label:"Done, with photos"},{k:"secured",label:"Loaded and secured"},{k:"friday",label:"Friday summary"}],
/* default alert choices for a new contact: {<event>:{text, email}} */
ZZALERTS={booked:{text:!1,email:!0},eta:{text:!1,email:!1},arrived:{text:!0,email:!1},waiting:{text:!0,email:!1},started:{text:!1,email:!1},damage:{text:!0,email:!0},done:{text:!1,email:!0},secured:{text:!1,email:!0},friday:{text:!1,email:!0}},
ZZGEAR=[{k:"plywood",label:"Plywood sheets",hint:"Usually 5 to 6"},{k:"bars",label:"Load bars",hint:"Usually 2"},{k:"straps",label:"Straps",hint:"Usually 4"},{k:"airbags",label:"Airbags",hint:"Only for gaps"}],
ZZSECSLOTS=[{k:"nose",label:"Nose",hint:"Front of trailer"},{k:"middle",label:"Middle",hint:"Middle of the load"},{k:"tail",label:"Tail",hint:"At the doors"},{k:"closeup",label:"Close-up",hint:"Bars or straps"},{k:"seal",label:"Seal",hint:"Number showing"}],
ZZDMGKINDS=["Crushed","Torn wrap","Leaning","Wet","Broken pallet","Missing boxes","Other"],

/* ---------- small private helpers ---------- */
ZZa_ms=v=>v==null||v===""?NaN:typeof v==="number"?v:v instanceof Date?v.getTime():Date.parse(v),
ZZa_nowMs=n=>n==null?Date.now():+n,
ZZa_fmtP=null,ZZa_fmtT=null,ZZa_fmtD=null,
ZZa_parts=ms=>{try{ZZa_fmtP=ZZa_fmtP||new Intl.DateTimeFormat("en-US",{timeZone:lQ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",weekday:"short",hourCycle:"h23"});let p={};ZZa_fmtP.formatToParts(new Date(ms)).forEach(x=>{p[x.type]=x.value});return{y:+p.year,mo:+p.month,d:+p.day,h:+p.hour%24,mi:+p.minute,s:+p.second,wd:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(p.weekday)}}catch{let x=new Date(ms);return{y:x.getFullYear(),mo:x.getMonth()+1,d:x.getDate(),h:x.getHours(),mi:x.getMinutes(),s:x.getSeconds(),wd:x.getDay()}}},
/* "2:40 PM" in dock time */
ZZa_hm=v=>{let ms=ZZa_ms(v);if(!isFinite(ms))return"";try{ZZa_fmtT=ZZa_fmtT||new Intl.DateTimeFormat("en-US",{timeZone:lQ,hour:"numeric",minute:"2-digit"});return ZZa_fmtT.format(new Date(ms))}catch{return at(ms)}},
/* "Mon, Oct 27" in dock time */
ZZa_day=v=>{let ms=ZZa_ms(v);if(!isFinite(ms))return"";try{ZZa_fmtD=ZZa_fmtD||new Intl.DateTimeFormat("en-US",{timeZone:lQ,weekday:"short",month:"short",day:"numeric"});return ZZa_fmtD.format(new Date(ms))}catch{return Dt(ms)}},
ZZa_when=v=>{let d=ZZa_day(v);return d?`${d}, ${ZZa_hm(v)}`:""},
ZZa_hist=(t,by,text,at)=>[...((t&&t.history)||[]),{id:Ce(),at:at||ye(Date.now()),by:by||"",text:String(text||"")}].slice(-100),
ZZa_srcName={driver:"driver",client:"customer",office:"office",samsara:"Samsara",gps:"GPS"},
ZZa_trName={link:"driver link",samsara:"Samsara",gps:"GPS link",self:"customer updates it",none:"no updates"},
ZZa_money=n=>Number.isInteger(+n)?Fe(n):je(n),
ZZa_plural=(n,w)=>`${n} ${w}${n===1?"":"s"}`,
ZZa_promiseName=min=>min%60===0?`${min/60}-hour`:`${min}-minute`,
ZZa_lines=ls=>(ls||[]).filter(l=>l&&l.on!==!1&&String(l.label||"").trim()).map(l=>({id:l.id||Ce(),label:String(l.label).trim(),qty:ie(l.qty,1),unit:ie(l.unit)})),
ZZa_hm2min=s=>{let x=/^(\d{1,2}):(\d{2})/.exec(String(s||""));return x?+x[1]*60+ +x[2]:null},

/* ---------- settings, codes and links ---------- */
ZZS=doc=>{let s=(doc&&doc.settings)||{},o={promiseMin:120,promiseText:"Unloaded within 2 hours of check-in",waitGoalMin:30,...s,gearPlan:{price:2000,months:6,...(s.gearPlan||{})}};
  o.promiseMin=ie(o.promiseMin,0)>0?+o.promiseMin:120;o.waitGoalMin=ie(o.waitGoalMin,0)>0?+o.waitGoalMin:30;
  if(typeof o.promiseText!=="string"||!o.promiseText.trim())o.promiseText="Unloaded within 2 hours of check-in";return o},
ZZactive=t=>!!t&&t.stage!=="departed"&&t.stage!=="cancelled",
/* t.code, or a stable 4-digit code worked out from t.id (older trucks; nothing is written) */
ZZcode=t=>{if(!t)return"";let c=String(t.code??"");if(/^\d{4}$/.test(c))return c;let s=String(t.id||""),h=7;for(let k=0;k<s.length;k++)h=(h*31+s.charCodeAt(k))>>>0;return String(1e3+h%9e3)},
ZZa_usedCodes=doc=>{let u=new Set;((doc&&doc.trailers)||[]).forEach(t=>{ZZactive(t)&&u.add(ZZcode(t))});
  /* a check-in code goes to drivers, so it is never anyone's PIN (customer portal, office or crew login) */
  let st=(doc&&doc.settings)||{};[...((doc&&doc.customers)||[]),...(st.admins||[]),...(st.crewMembers||[])].forEach(p=>{p&&p.pin!=null&&u.add(String(p.pin))});return u},
ZZnewCode=doc=>{let u=ZZa_usedCodes(doc);for(let k=0;k<400;k++){let c=String(1e3+Math.floor(Math.random()*9e3));if(!u.has(c))return c}for(let k=1e3;k<1e4;k++)if(!u.has(String(k)))return String(k);return String(1e3+Math.floor(Math.random()*9e3))},
ZZokCode=(doc,c)=>{c=String(c??"").trim();return /^\d{4}$/.test(c)&&!ZZa_usedCodes(doc).has(c)?c:ZZnewCode(doc)},
ZZbyCode=(doc,code)=>{let c=String(code??"").trim();if(!/^\d{4}$/.test(c))return null;let L=((doc&&doc.trailers)||[]).filter(t=>ZZactive(t)&&ZZcode(t)===c);return L.find(t=>String(t.code??"")===c)||L[0]||null},
ZZetaLink=t=>ZZPUBLIC_URL+"#eta"+ZZcode(t),
ZZsafeUrl=u=>{let s=String(u??"").trim();if(!s||s.length>500||/\s/.test(s)||!/^https:\/\//i.test(s))return"";try{let p=new URL(s);return p.protocol==="https:"&&p.hostname?s:""}catch{return""}},
/* ISO time for a wall-clock time in dock time (America/Los_Angeles) */
ZZzonedIso=(ymd,hhmm)=>{let a=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd||"")),b=/^(\d{1,2}):(\d{2})$/.exec(String(hhmm==null?"00:00":hhmm).trim());if(!a||!b)return null;
  /* a real calendar day and a real clock time only (no Feb 30, no 24:00 or 9:75) */
  if(+b[1]>23||+b[2]>59||new Date(Date.UTC(+a[1],+a[2]-1,+a[3])).toISOString().slice(0,10)!==`${a[1]}-${a[2]}-${a[3]}`)return null;
  let want=Date.UTC(+a[1],+a[2]-1,+a[3],+b[1],+b[2]),g=want;for(let k=0;k<3;k++){let p=ZZa_parts(g),got=Date.UTC(p.y,p.mo-1,p.d,p.h,p.mi);if(got===want)break;g+=want-got}return isFinite(g)?new Date(g).toISOString():null},
ZZdockParts=iso=>{let ms=ZZa_ms(iso);if(!isFinite(ms))return{ymd:"",hhmm:""};let p=ZZa_parts(ms),z=n=>String(n).padStart(2,"0");return{ymd:`${p.y}-${z(p.mo)}-${z(p.d)}`,hhmm:`${z(p.h)}:${z(p.mi)}`}},

/* ---------- yard, clocks and promise ---------- */
ZZyardQ=doc=>((doc&&doc.trailers)||[]).filter(t=>t.arrivedAt&&(!t.dock||t.dock===Ee)&&t.stage==="arrived").sort((a,b)=>ZZa_ms(a.arrivedAt)-ZZa_ms(b.arrivedAt)),
ZZplace=(doc,tid)=>{let k=ZZyardQ(doc).findIndex(t=>t.id===tid);return k<0?null:k+1},
ZZwaitMs=(t,now)=>{if(!t||!t.arrivedAt)return null;let a=ZZa_ms(t.arrivedAt);if(!isFinite(a))return null;let e=t.workStartedAt?ZZa_ms(t.workStartedAt):ZZa_nowMs(now);return isFinite(e)?Math.max(0,e-a):null},
ZZtone=(ms,doc)=>{if(ms==null||!isFinite(ms))return"neutral";let g=ZZS(doc).waitGoalMin*6e4;return ms>=g?"bad":ms>=.75*g?"warn":"good"},
ZZtoneColor=tone=>tone==="good"?m.green:tone==="warn"?m.amber:tone==="bad"?m.red:m.mut,
/* minutes until a door opens (at least 5), or null; same method as the prototype's estWaitMin */
ZZestWait=(doc,tid,now)=>{let pos=ZZplace(doc,tid);if(!pos)return null;now=ZZa_nowMs(now);let L=(doc&&doc.trailers)||[],day=ZZdockParts(now).ymd,
  done=L.filter(t=>t.workStartedAt&&t.workDoneAt&&ZZdockParts(t.workDoneAt).ymd===day),
  avg=done.length?done.reduce((s,t)=>s+Math.max(0,ZZa_ms(t.workDoneAt)-ZZa_ms(t.workStartedAt)),0)/done.length/6e4:35,
  doors=Gi.length,busy=new Set(L.filter(t=>ZZactive(t)&&t.dock&&Gi.includes(t.dock)).map(t=>t.dock)).size,free=Math.max(0,doors-busy);
  return pos<=free?5:Math.max(5,Math.round((pos-free)*avg/Math.max(1,Math.min(doors,3))))},
/* {limitMin, deadline (ms), elapsedMin, leftMin (negative = over), doneMin, kept (null until done)} */
ZZpromise=(doc,t,now)=>{let lim=ZZS(doc).promiseMin,o={limitMin:lim,deadline:null,elapsedMin:null,leftMin:null,doneMin:null,kept:null};if(!t||!t.arrivedAt)return o;
  let a=ZZa_ms(t.arrivedAt);if(!isFinite(a))return o;let dn=t.workDoneAt?ZZa_ms(t.workDoneAt):NaN,end=isFinite(dn)?dn:ZZa_nowMs(now);
  o.deadline=a+lim*6e4;o.elapsedMin=Math.max(0,Math.floor((end-a)/6e4));o.leftMin=lim-o.elapsedMin;
  if(isFinite(dn)){o.doneMin=Math.max(0,Math.round((dn-a)/6e4));o.kept=o.doneMin<=lim}return o},
/* progress steps [{k,label,state:'done'|'now'|'todo',at}] (waiting also carries ms) */
ZZtruckSteps=(t,now)=>{if(!t)return[];now=ZZa_nowMs(now);let out=t.direction==="outbound",door=t.dock&&Gi.includes(t.dock)?t.dock:null,
  fin=t.stage==="done"||t.stage==="departed"||!!t.workDoneAt,wm=ZZwaitMs(t,now),
  cur=t.stage==="cancelled"?"cancelled":fin?null:t.workStartedAt||t.stage==="working"?"working":t.arrivedAt&&door?"door":t.arrivedAt?"waiting":t.eta&&t.eta.at?"eta":"booked",
  S=[["booked","Booked",t.confirmedAt||t.createdAt||null],["eta","On the way",(t.eta&&t.eta.at)||null],["arrived","Checked in",t.arrivedAt||null],
    ["waiting",t.arrivedAt?`Waiting ${ot(wm||0)}`:"Waiting",t.arrivedAt||null],["door",door?`At door ${door}`:"At a door",t.dockedAt||null],
    ["working",out?"Loading":"Unloading",t.workStartedAt||null],["done","Done",t.workDoneAt||t.departedAt||null]],
  ci=cur===null?S.length:cur==="cancelled"?1:S.findIndex(s=>s[0]===cur);
  return S.map(([k,label,at2],j)=>({k,label,at:at2,state:cur==="cancelled"?(j===0?"done":"todo"):j<ci?"done":j===ci?"now":"todo",...(k==="waiting"?{ms:wm}:{})}))},

/* ---------- day load and crew ---------- */
ZZa_blockLabel=h=>{let f=x=>({n:x%12||12,ap:x<12||x===24?"AM":"PM"}),a=f(h),b=f(h+2);return a.ap===b.ap?`${a.n}–${b.n} ${b.ap}`:`${a.n} ${a.ap}–${b.n} ${b.ap}`},
/* crew members whose shift covers that moment (dock time), as copies without `pin`. If nobody has a shift set,
   settings.crew (default 3) placeholder entries {placeholder:true}; use .length for the count. */
ZZcrewOnShift=(doc,ms)=>{let st=(doc&&doc.settings)||{},cm=(st.crewMembers||[]).filter(Boolean),withS=cm.filter(c=>c.shift&&ZZa_hm2min(c.shift.start)!=null&&ZZa_hm2min(c.shift.end)!=null);
  if(!withS.length){let n=Math.max(0,Math.round(ie(st.crew,3)));return Array.from({length:n},(_,k)=>({id:"crew"+(k+1),name:"Crew",placeholder:!0}))}
  let p=ZZa_parts(ZZa_nowMs(ms)),mn=p.h*60+p.mi;
  /* copies without the sign-in PIN: this list can reach customer screens */
  return withS.filter(c=>{let a=ZZa_hm2min(c.shift.start),b=ZZa_hm2min(c.shift.end),days=Array.isArray(c.shift.days)&&c.shift.days.length?c.shift.days.map(Number):[0,1,2,3,4,5,6];
    if(a===b)return days.includes(p.wd);if(a<b)return days.includes(p.wd)&&mn>=a&&mn<b;return days.includes(p.wd)&&mn>=a||days.includes((p.wd+6)%7)&&mn<b}).map(({pin:_p,...c})=>c)},
ZZa_crewDay=(doc,ymd)=>{let st=(doc&&doc.settings)||{},withS=(st.crewMembers||[]).filter(c=>c&&c.shift&&ZZa_hm2min(c.shift.start)!=null&&ZZa_hm2min(c.shift.end)!=null);
  if(!withS.length)return Math.max(0,Math.round(ie(st.crew,3)));let noon=ZZzonedIso(ymd,"12:00"),wd=noon?ZZa_parts(ZZa_ms(noon)).wd:-1;
  return withS.filter(c=>!Array.isArray(c.shift.days)||!c.shift.days.length||c.shift.days.map(Number).includes(wd)).length},
/* {blocks:[{from (hour), to, label:'8–10 AM', trucks, level}], total, outside, level, crew, doors}. Counts only: no names, no ids. */
ZZdayLoad=(doc,ymd,excludeTid)=>{let blocks=[];for(let h=6;h<22;h+=2)blocks.push({from:h,to:h+2,label:ZZa_blockLabel(h),trucks:0,level:"Light"});let total=0,outside=0;
  ((doc&&doc.trailers)||[]).forEach(t=>{if(!t||t.stage==="cancelled"||(excludeTid&&t.id===excludeTid))return;let w=t.scheduledAt||t.arrivedAt;if(!w)return;let p=ZZdockParts(w);if(p.ymd!==ymd)return;
    total++;let h=+p.hhmm.slice(0,2),b=blocks.find(x=>h>=x.from&&h<x.to);b?b.trucks++:outside++});
  let crew=ZZa_crewDay(doc,ymd),doors=Gi.length,cap=Math.max(2,Math.min(doors,Math.max(1,crew))*2),lv=n=>n/cap>=.85?"Busy":n/cap>=.5?"Steady":"Light";
  blocks.forEach(b=>{b.level=lv(b.trucks)});return{blocks,total,outside,level:lv(Math.max(0,...blocks.map(b=>b.trucks))),crew,doors}},

/* ---------- gear and damage ---------- */
ZZgearOut=(doc,cid)=>{let o={plywood:0,bars:0,straps:0,airbags:0,tags:[]};
  [...((doc&&doc.zzGear)||[])].filter(g=>g&&(!cid||g.customerId===cid)).sort((a,b)=>(ZZa_ms(a.at)||0)-(ZZa_ms(b.at)||0)).forEach(g=>{let sg=g.dir==="back"?-1:1;
    if(["plywood","bars","straps","airbags"].includes(g.type))o[g.type]+=sg*ie(g.qty);
    (g.tags||[]).forEach(tg=>{tg=String(tg);if(sg>0){o.tags.includes(tg)||o.tags.push(tg)}else o.tags=o.tags.filter(x=>x!==tg)})});
  ["plywood","bars","straps","airbags"].forEach(k=>{o[k]=Math.max(0,o[k])});return o},
/* suggested fix lines. The labor line is "Labor hours" (0.5 = half an hour), not Nick's quick line "Labor, 1 hour",
   so a customer never reads "Labor, 1 hour" next to half the hourly price */
ZZdmgLines=(doc,s,pallets)=>{let r=Ln(doc,s&&s.customerId),p=Math.max(0,ie(pallets,1));
  return[{k:"rewrap",label:"Rewrap pallet",qty:p,unit:ie(r.rewrap,15),on:!0},{k:"labor",label:"Labor hours",qty:.5,unit:ie(r.laborHour,120),on:!0},{k:"pallet",label:"Replacement pallet",qty:1,unit:ie(r.newPallet,20)||20,on:!1}]},
/* true when rewrap is already on the bill through an approved damage estimate ("Damage: Rewrap pallet" adjustment):
   then Im does not bill rewrapPallets again for the same pallets (patch A38) */
ZZrewrapBilled=s=>((s&&s.adjustments)||[]).some(a=>a&&/^Damage: /.test(String(a.label||""))&&/rewrap/i.test(String(a.label||""))),
ZZestTotal=lines=>(lines||[]).filter(l=>l&&l.on!==!1).reduce((a,l)=>a+ie(l.qty,1)*ie(l.unit),0),
ZZautoLimit=c=>{let v=c&&c.autoApproveUnder;if(v==null||v==="")return null;let n=+v;return Number.isFinite(n)&&n>0?n:null},
/* [{month:'2026-10', reports, pallets, approved, declined, open, items:[{s,x}]}] newest first, Damage only
   (a damage snap still waiting for its details, draft:true, is not a report yet and is left out) */
ZZdmgMonths=(doc,cid)=>{let g0={};((doc&&doc.shipments)||[]).forEach(s=>{if(cid&&s.customerId!==cid)return;(s.exceptions||[]).forEach(x=>{if(!x||x.kind!=="Damage"||x.draft)return;
    let mo=(ZZdockParts(x.at).ymd||"").slice(0,7)||"unknown",g=g0[mo]||(g0[mo]={month:mo,reports:0,pallets:0,approved:0,declined:0,open:0,items:[]}),st=x.answer&&x.answer.status;
    g.reports++;g.pallets+=ie(x.pallets);st==="accepted"?g.approved++:st==="declined"?g.declined++:x.resolved||g.open++;g.items.push({s,x})})});
  return Object.values(g0).sort((a,b)=>a.month<b.month?1:a.month>b.month?-1:0).map(g=>(g.items.sort((a,b)=>(ZZa_ms(b.x.at)||0)-(ZZa_ms(a.x.at)||0)),g))},

/* ---------- crew truck jobs: unpack / unload / pack / delivery / pickup, load badges, stops, damage snaps, manifest ----------
   Badge colours are fixed (the same on every device and look): each is a solid fill with its own text colour, mid-light
   so it reads on the light 24 HR theme and on the dark Clean / Hi-vis themes (about 3:1 or better against every page,
   panel and raised colour). Never show a colour alone: the number (and the PRO) always goes with it. Load 11 starts the colours again. */
ZZBADGE=[{color:"#2F6FED",fg:"#FFFFFF",name:"Blue"},{color:"#1F8F4E",fg:"#FFFFFF",name:"Green"},{color:"#D9480F",fg:"#FFFFFF",name:"Orange"},{color:"#8556E0",fg:"#FFFFFF",name:"Purple"},{color:"#B8860B",fg:"#111111",name:"Gold"},
  {color:"#CF2D66",fg:"#FFFFFF",name:"Pink"},{color:"#0B8A8A",fg:"#FFFFFF",name:"Teal"},{color:"#A05A2C",fg:"#FFFFFF",name:"Brown"},{color:"#687587",fg:"#FFFFFF",name:"Gray"},{color:"#4D7C0F",fg:"#FFFFFF",name:"Olive"}],
/* where a load goes in the trailer on a multi-stop truck, in loading order (nose loads first) */
ZZPOS=[{k:"nose",label:"Nose",hint:"Front of the trailer, loads first"},{k:"middle",label:"Middle",hint:"Middle of the trailer"},{k:"tail",label:"Tail",hint:"By the doors, loads last"}],
/* the loading jobs a truck can be (ZZloadJob) */
ZZJOBS={unpack:{word:"UNPACK",label:"Consolidated trailer (inbound)"},unload:{word:"UNLOAD",label:"Pickup trailer"},pack:{word:"PACK",label:"Consolidated trailer"},delivery:{word:"DELIVERY",label:"Delivery"},pickup:{word:"PICKUP",label:"Customer's carrier"}},
/* photo owners kept past 30 days (proof photos), and the bigger per-owner cap for nonstop unloading / loading photos */
ZZa_KEEP=/^(dmg|sec|unload|after|strap|bol|ship|insp):/,
ZZPHOTO_BIG=30,
ZZa_circ=n=>n>=1&&n<=20?String.fromCharCode(9311+n):`(${n})`,
ZZa_tr=(doc,t)=>typeof t==="string"?((doc&&doc.trailers)||[]).find(k=>k&&k.id===t)||null:t||null,
ZZa_stop=v=>{if(v==null||v==="")return null;let n=Math.round(+v);return Number.isFinite(n)&&n>=1&&n<=99?n:null},
ZZa_pos=v=>v==="nose"||v==="middle"||v==="tail"?v:null,
ZZa_bySeq=L=>L.map((s,i)=>({s,i})).sort((a,b)=>ie(a.s.seq??a.i,a.i)-ie(b.s.seq??b.i,b.i)).map(r=>r.s),
/* the loads on a truck, in order: the loads that came in on it (seq order), then the loads going out on it (seq order) */
ZZa_truckLoads=(doc,t)=>{if(!t)return[];let SH=((doc&&doc.shipments)||[]).filter(Boolean),inb=ZZa_bySeq(SH.filter(s=>s.trailerInId===t.id)),ids=new Set(inb.map(s=>s.id));
  return[...inb,...ZZa_bySeq(SH.filter(s=>s.trailerOutId===t.id&&!ids.has(s.id)))]},
/* what job a truck is: inbound 'unpack' (consolidated trailer: East Coast origin, consolidate / reload job, or loads that
   reload) or 'unload' (pickup trailer); outbound: the office's choice (trailer.loadJob), else 'pack' (loads from 2+ inbound
   trucks or 2+ customers, or job type "Consolidate & reload"), 'delivery' (a delivery request covers its loads, or the job
   type says delivery), else 'pickup' (the customer's carrier picks up). The reload part of an inbound truck is always packed. */
ZZloadJob=(doc,t)=>{t=ZZa_tr(doc,t);if(!t)return null;let SH=((doc&&doc.shipments)||[]).filter(Boolean),jt=String(t.jobType||"");
  if(t.direction!=="outbound"){let L=SH.filter(s=>s.trailerInId===t.id),W=/,\s*(CA|NV|OR|WA|AZ|UT|ID)\b/i;
    return L.some(s=>s.origin&&!W.test(s.origin))||/consolid|reload/i.test(jt)||L.some(s=>be(s)==="sac")?"unpack":"unload"}
  if(t.loadJob==="pack"||t.loadJob==="delivery"||t.loadJob==="pickup")return t.loadJob;
  let L=SH.filter(s=>s.trailerOutId===t.id),ins=new Set(L.map(s=>s.trailerInId).filter(Boolean)),cus=new Set(L.map(s=>s.customerId).filter(Boolean));
  if(ins.size>=2||cus.size>=2||/consolid|reload/i.test(jt))return"pack";
  let ids=new Set(L.map(s=>s.id)),rq=((doc&&doc.zzRequests)||[]).some(r=>r&&r.type==="delivery"&&r.status!=="cancelled"&&(r.loads||[]).some(id=>ids.has(id)));
  return rq||/deliver/i.test(jt)?"delivery":"pickup"},
/* {sid: {n, color, fg, label:'① 118882', mark:'①', name:'Blue', ref, sid, dir:'in'|'out'}} for the loads on that truck,
   numbered in seq order (the loads that came in on it, then the loads going out on it). The same load keeps the same
   badge on every staff screen. With cid (a customer screen) only that customer's loads are numbered (1..k), so the
   numbers never show how many other companies' loads share the truck. */
ZZloadBadges=(doc,t,cid)=>{t=ZZa_tr(doc,t);let o={};if(!t)return o;
  ZZa_truckLoads(doc,t).filter(s=>!cid||s.customerId===cid).forEach((s,k)=>{let n=k+1,b=ZZBADGE[k%ZZBADGE.length],mk=ZZa_circ(n);
    o[s.id]={n,color:b.color,fg:b.fg,label:`${mk} ${s.ref||""}`.trim(),mark:mk,name:b.name,ref:s.ref||"",sid:s.id,dir:s.trailerInId===t.id?"in":"out"}});return o},
/* suggested trailer positions: last stop -> 'nose', first stop -> 'tail', the stops between -> 'middle'; one stop -> null.
   ZZposSuggest([1,3,2,3]) -> ['tail','nose','middle','nose'] (one per load; null for a load with no stop);
   ZZposSuggest(3) -> {1:'tail', 2:'middle', 3:'nose'} */
ZZposSuggest=stops=>{if(Array.isArray(stops)){let ns=stops.map(ZZa_stop),u=[...new Set(ns.filter(v=>v!=null))].sort((a,b)=>a-b);
    return ns.map(v=>v==null||u.length<2?null:v===u[u.length-1]?"nose":v===u[0]?"tail":"middle")}
  let N=ZZa_stop(stops),o={};if(!N)return o;for(let k=1;k<=N;k++)o[k]=N<2?null:k===N?"nose":k===1?"tail":"middle";return o},
/* the loads going out on a truck in LOADING order: nose first, then middle (and loads with no position), then tail;
   inside a position the later stop first, then badge order. [{s, sid, badge, stop, pos}]. An inbound truck lists its
   reload part (its loads that go back out) and any load set to go out on it. */
ZZloadOrder=(doc,t)=>{t=ZZa_tr(doc,t);if(!t)return[];let bd=ZZloadBadges(doc,t),rk={nose:0,middle:1,tail:2},
  L=ZZa_truckLoads(doc,t).filter(s=>t.direction==="outbound"?s.trailerOutId===t.id:s.trailerOutId===t.id||s.trailerInId===t.id&&be(s)==="sac");
  return L.map(s=>({s,sid:s.id,badge:bd[s.id]||null,stop:ZZa_stop(s.stop),pos:ZZa_pos(s.pos)})).sort((a,b)=>(rk[a.pos]??1)-(rk[b.pos]??1)||(b.stop??0)-(a.stop??0)||((a.badge&&a.badge.n)||0)-((b.badge&&b.badge.n)||0))},
/* every damage snap still waiting for its details (staff only): on a truck (tid) or on every truck (tid null).
   [{id, sid|null, ref|null, customerId|null, tid, photoOwner, photoCount, at, by, note, where:'load'|'truck'}], oldest first.
   A snap on a load belongs to the truck it was taken on (x.trailerId), else to the load's trucks. */
ZZdmgDrafts=(doc,tid)=>{let out=[];
  ((doc&&doc.shipments)||[]).forEach(s=>{if(!s)return;(s.exceptions||[]).forEach(x=>{if(!x||!x.draft||x.resolved)return;
    if(tid&&!(x.trailerId?x.trailerId===tid:s.trailerInId===tid||s.trailerOutId===tid))return;
    out.push({id:x.id,sid:s.id,ref:s.ref||"",customerId:s.customerId||null,tid:x.trailerId||s.trailerOutId||s.trailerInId||null,photoOwner:x.photoOwner||"dmg:"+x.id,photoCount:ie(x.photoCount),at:x.at||null,by:x.openedBy||"",note:x.snapNote||"",where:"load"})})});
  ((doc&&doc.trailers)||[]).forEach(t=>{if(!t||tid&&t.id!==tid)return;(t.dmgDrafts||[]).forEach(d=>{d&&d.id&&out.push({id:d.id,sid:null,ref:null,customerId:null,tid:t.id,photoOwner:d.photoOwner||"dmg:"+d.id,photoCount:ie(d.photoCount),at:d.at||null,by:d.by||"",note:d.note||"",where:"truck"})})});
  return out.sort((a,b)=>(ZZa_ms(a.at)||0)-(ZZa_ms(b.at)||0))},
/* the manifest of what went in: staff (cid null) get every line; a customer gets only the lines of its own loads (null
   when it has none). {lines, total (pallets loaded), planned, signature, signedBy, signedAt, all} or null */
ZZmanifestFor=(doc,t,cid)=>{t=ZZa_tr(doc,t);let mf=t&&t.manifest;if(!mf||!Array.isArray(mf.lines))return null;let lines=mf.lines.filter(l=>l&&(!cid||l.customerId===cid));
  if(cid&&!lines.length)return null;return{lines,total:lines.reduce((a,l)=>a+ie(l.loaded),0),planned:lines.reduce((a,l)=>a+ie(l.planned),0),signature:mf.signature||"",signedBy:mf.signedBy||"",signedAt:mf.signedAt||null,all:!cid}},
/* photos one owner keeps: 30 for nonstop unloading / loading photos (unload:<tid>, after:<tid>), else Nick's 12 (xA) */
ZZphotoCap=owner=>/^(unload|after):/.test(String(owner||""))?ZZPHOTO_BIG:xA,
/* local mode only: a photo list longer than Nick's 12 is saved only while this browser keeps room for the dock data
   afterwards (a test write of the new photo's size plus ~400k characters), so extra photos never make the next save fail */
ZZa_ROOM=4e5,
ZZa_photoRoom=(owner,list)=>{if(!list||list.length<=xA||typeof ZZsync==="undefined"||ZZsync.mode!=="local")return;let k="cdweb:cd6:photos:"+owner,probe="cdweb:cd6:zzroom",old=0;
  try{old=(localStorage.getItem(k)||"").length}catch{return}let grow=JSON.stringify(list).length-old;if(grow<=0)return;let need=grow+ZZa_ROOM;
  try{localStorage.setItem(probe,"x".repeat(need))}catch(e){try{localStorage.removeItem(probe)}catch{}
    throw{name:"QuotaExceededError",zzKind:"photo",zzText:"Photo NOT saved: this device is almost full. Delete old photos or use another device, and tell the office."}}
  try{localStorage.removeItem(probe)}catch{}},
/* a load without its damage snaps (drafts); the same object when it has none */
ZZnoDrafts=s=>!s||!(s.exceptions||[]).some(x=>x&&x.draft)?s:{...s,exceptions:s.exceptions.filter(x=>!(x&&x.draft))},
/* what a customer screen may see (patches A44 / A45): no damage snaps waiting for details, no truck-level snaps, and only
   that customer's manifest lines (cid null, the public "track a shipment" page: no manifest). The same doc object when
   there is nothing to hide, and the same view object for the same doc (no extra renders). Never written back. */
ZZa_cv={d:null,c:null,v:null},
ZZa_mfView=(mf,cid)=>{if(!mf||!cid||!Array.isArray(mf.lines))return null;let lines=mf.lines.filter(l=>l&&l.customerId===cid);return lines.length?{...mf,lines,total:lines.reduce((a,l)=>a+ie(l.loaded),0)}:null},
ZZcustView=(doc,cid)=>{if(!doc||typeof doc!=="object")return doc;cid=cid||null;if(ZZa_cv.d===doc&&ZZa_cv.c===cid)return ZZa_cv.v;
  let SH=Array.isArray(doc.shipments)?doc.shipments:[],TR=Array.isArray(doc.trailers)?doc.trailers:[],hid=t=>!!t&&((t.dmgDrafts||[]).length>0||!!t.manifest),
    sh=SH.some(s=>s&&(s.exceptions||[]).some(x=>x&&x.draft)),tr=TR.some(hid),v=doc;
  if(sh||tr)v={...doc,...(sh?{shipments:SH.map(ZZnoDrafts)}:{}),...(tr?{trailers:TR.map(t=>hid(t)?{...t,dmgDrafts:[],manifest:ZZa_mfView(t.manifest,cid)}:t)}:{})};
  ZZa_cv={d:doc,c:cid,v};return v},

/* ---------- week, trail and messages ---------- */
ZZweekKey=now=>{let p=ZZa_parts(ZZa_nowMs(now)),d=new Date(Date.UTC(p.y,p.mo-1,p.d));d.setUTCDate(d.getUTCDate()-((p.wd+6)%7));return d.toISOString().slice(0,10)},
ZZweek=(doc,cid,now)=>{now=ZZa_nowMs(now);let from=ZZzonedIso(ZZweekKey(now),"00:00"),f=ZZa_ms(from),inR=v=>{let x=ZZa_ms(v);return isFinite(x)&&x>=f&&x<=now},
  T=((doc&&doc.trailers)||[]).filter(t=>!cid||t.customerId===cid),Sh=((doc&&doc.shipments)||[]).filter(s=>!cid||s.customerId===cid),
  trucks=T.filter(t=>t.stage!=="cancelled"&&(inR(t.arrivedAt)||inR(t.scheduledAt))),done=T.filter(t=>inR(t.workDoneAt)),
  waits=T.filter(t=>inR(t.arrivedAt)&&t.workStartedAt).map(t=>ZZwaitMs(t,now)/6e4),doorT=done.filter(t=>t.workStartedAt).map(t=>(ZZa_ms(t.workDoneAt)-ZZa_ms(t.workStartedAt))/6e4),
  pr=done.map(t=>ZZpromise(doc,t,now)).filter(p=>p.kept!=null),avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null,dmg=[];
  Sh.forEach(s=>(s.exceptions||[]).forEach(x=>{x&&x.kind==="Damage"&&!x.draft&&inR(x.at)&&dmg.push(x)}));
  return{from,trucks:trucks.length,done:done.length,palletsIn:Sh.filter(s=>inR(s.receivedAt)).reduce((a,s)=>a+fe(s),0),palletsOut:Sh.filter(s=>inR(s.shippedAt)).reduce((a,s)=>a+fe(s),0),
    avgWaitMin:avg(waits),avgDoorMin:avg(doorT),promiseKeptPct:pr.length?Math.round(100*pr.filter(p=>p.kept).length/pr.length):null,
    damageReports:dmg.length,damageApproved:dmg.filter(x=>x.answer&&x.answer.status==="accepted").length,gearOut:ZZgearOut(doc,cid)}},
/* the time a truck was first booked for, as "Mon, Oct 27, 10:00 AM": t.bookedFor (zzLog keeps it at the first time change),
   else the "(was ...)" of the oldest "Time changed to ..." history line, else the current scheduledAt */
ZZa_bookedFor=t=>{if(!t)return"";if(t.bookedFor&&isFinite(ZZa_ms(t.bookedFor)))return ZZa_when(t.bookedFor);
  let h=(t.history||[]).map(x=>x&&/^Time changed to .+ \(was (.+)\)$/.exec(String(x.text||""))).find(Boolean);
  if(h)return h[1]==="no time"?"":h[1];return t.scheduledAt?ZZa_when(t.scheduledAt):""},
/* [{at, by, text, sid?}] oldest first. Safe for customers: never reads doc.activity. With sid, only that load's lines.
   Damage snaps still waiting for their details are left out unless opts.staff (office and crew screens pass {staff:true}). */
ZZtrail=(doc,tid,sid,opts)=>{let staff=!!(opts&&opts.staff),T=((doc&&doc.trailers)||[]).find(t=>t.id===tid)||null,syn=[],ev=[],add=(arr,at2,by,text,s2)=>{if(!at2||!isFinite(ZZa_ms(at2)))return;let x={at:at2,by:by||"",text};if(s2)x.sid=s2;arr.push(x)};
  if(T&&!sid){let t=T,out=t.direction==="outbound";
    t.createdAt&&add(syn,t.createdAt,t.bookedBy||(t.bookedVia==="client"?"Customer":t.bookedVia==="office"?"Office":""),`Booked${(w0=>w0?" for "+w0:"")(ZZa_bookedFor(t))}`);
    t.confirmedAt&&add(syn,t.confirmedAt,t.confirmedBy,"Time confirmed");
    t.eta&&t.eta.updatedAt&&add(syn,t.eta.updatedAt,t.eta.by,`ETA ${ZZa_hm(t.eta.at)} (${ZZa_srcName[t.eta.source]||t.eta.source||""})`);
    t.arrivedAt&&add(syn,t.arrivedAt,t.driver,t.checkedInBy==="kiosk"?"Checked in at the kiosk":t.checkedInBy==="office"?"Checked in by the office":"Checked in");
    t.dockedAt&&add(syn,t.dockedAt,"",t.dock&&Gi.includes(t.dock)?`At door ${t.dock}`:"At a door");
    t.workStartedAt&&add(syn,t.workStartedAt,t.workStartedBy,out?"Loading started":"Unloading started");
    t.workDoneAt&&add(syn,t.workDoneAt,t.workDoneBy,t.workStartedAt?`Done (${out?"loaded":"unloaded"} in ${ot(ZZa_ms(t.workDoneAt)-ZZa_ms(t.workStartedAt))})`:"Done");
    t.secure&&t.secure.signedAt&&add(syn,t.secure.signedAt,t.secure.signedBy,`Load secured: ${t.secure.confidence}/5${t.secure.seal?", seal "+t.secure.seal:""}`);
    t.departedAt&&add(syn,t.departedAt,"","Released, truck left");
    t.cancelledAt&&add(syn,t.cancelledAt,t.cancelledBy,"Cancelled");
    staff&&(t.dmgDrafts||[]).forEach(d=>{d&&add(ev,d.at,d.by,"Damage photo taken (load not picked yet, details to come)")});
    let hs=new Set;(t.history||[]).forEach(h=>{if(!h)return;add(ev,h.at,h.by,h.text);hs.add(h.at)});
    syn.forEach(x=>{hs.has(x.at)||ev.push(x)})}
  /* a truck's trail lists only its loads of the truck's own customer (another company's load on it stays private) */
  let lab={...fQ,damage:fQ.damage||"Reported damage",secure:fQ.secure||"Secured the load"},
    L=((doc&&doc.shipments)||[]).filter(s=>sid?s.id===sid:(s.trailerInId===tid||s.trailerOutId===tid)&&(!T||!T.customerId||!s.customerId||s.customerId===T.customerId));
  L.forEach(s=>{s.receivedAt&&add(ev,s.receivedAt,s.receivedBy,`Received ${s.ref}: ${s.qc&&s.qc.counted!=null?`counted ${s.qc.counted} of ${fe(s)} on the BOL`:$e(s)}`,s.id);
    (s.touches||[]).forEach(tc=>{tc&&tc.what!=="receive"&&add(ev,tc.at,tc.who,`${lab[tc.what]||tc.what}: ${s.ref}`,s.id)});
    (s.corrections||[]).forEach(c=>{c&&add(ev,c.at,c.by,`Corrected ${s.ref} ${c.field||""}: ${c.from??""} → ${c.to??""}`,s.id)});
    (s.exceptions||[]).forEach(x=>{if(!x||x.kind!=="Damage")return;let pl=ie(x.pallets);
      /* a snap: the photo first (while unloading or loading), the details later; only staff see it before the details */
      if(x.draft){staff&&add(ev,x.at,x.openedBy,`Damage photo taken on ${s.ref} (details to come)`,s.id);return}
      x.finishedAt&&add(ev,x.at,x.openedBy,`Damage photo taken on ${s.ref}`,s.id);
      add(ev,x.finishedAt||x.at,x.finishedBy||x.openedBy,`Damage reported on ${s.ref}${pl?`: ${ZZa_plural(pl,"pallet")}`:""}${(x.kinds||[]).length?` (${x.kinds.join(", ")})`:""}`,s.id);
      let a=x.answer;a&&add(ev,a.at,a.by,a.status==="accepted"?`${a.auto?"Damage fix auto-approved":"Damage fix approved"} (${je(a.total)})`:a.status==="declined"?"Damage fix declined":"Customer asked for a call about the damage",s.id)});
    s.shippedAt&&add(ev,s.shippedAt,"",`Shipped ${s.ref}${s.dest?" to "+s.dest:""}`,s.id);
    if(s.invoiceId){let inv=((doc&&doc.invoices)||[]).find(v=>v.id===s.invoiceId);inv&&add(ev,inv.issuedAt,"",`Invoiced ${s.ref} on ${inv.number}`,s.id)}});
  return ev.sort((a,b)=>ZZa_ms(a.at)-ZZa_ms(b.at))},
/* who gets an alert: [{name, phone, email, channels:['sms'|'email'], idx}] from customer.contacts;
   with no contacts, email to customer.contact for booked, damage, done, secured and friday */
ZZrecips=(c,ev)=>{if(!c)return[];let cs=Array.isArray(c.contacts)?c.contacts:[];
  if(cs.filter(Boolean).length)return cs.map((p,k)=>{if(!p)return null;let a=(p.alerts||{})[ev]||{},ch=[];a.text&&ch.push("sms");a.email&&ch.push("email");return{name:p.name||"",phone:p.phone||"",email:p.email||"",channels:ch,idx:k}}).filter(r=>r&&r.channels.length);
  return["booked","damage","done","secured","friday"].includes(ev)?[{name:c.person||c.name||"",phone:"",email:c.contact||"",channels:["email"],idx:0}]:[]},
/* worked-out alert messages (never stored): outbox shape, last 14 days, newest first.
   id = `<event>:<record id>:<contact index>:<channel>` */
ZZmsgs=(doc,now)=>{now=ZZa_nowMs(now);let out=[];try{let T=(doc&&doc.trailers)||[],SH=(doc&&doc.shipments)||[],CU=(doc&&doc.customers)||[],cm=new Map(CU.map(c=>[c.id,c])),cu=id=>cm.get(id),since=now-14*864e5,st=ZZS(doc),
  byT=new Map,ld=t=>byT.get(t.id)||[];SH.forEach(s=>{let a=s.trailerInId,b=s.trailerOutId;a&&(byT.get(a)||byT.set(a,[]).get(a)).push(s);b&&b!==a&&(byT.get(b)||byT.set(b,[]).get(b)).push(s)});
  let push=(ev,key,c,t,ts,txt)=>{ts=ZZa_ms(ts);if(!c||!isFinite(ts)||ts<since||ts>now)return;ZZrecips(c,ev).forEach(r=>r.channels.forEach(ch=>{let to=ch==="sms"?r.phone:r.email;
    out.push({id:`${ev}:${key}:${r.idx}:${ch}`,channel:ch,to:to||"",toName:r.name,subject:ch==="email"?txt.subject:null,
      body:ch==="email"?`Hi ${r.name||c.name},\n\n${txt.email||txt.sms}\n\nQuestions? Call us at 916-616-3481.\n\n— ${Uo}`:`${Uo}: ${txt.sms}`,
      ts,about:`truck ${(t&&t.truck)||"—"}`,deliverable:!!to,event:ev,customerId:c.id,trailerId:t?t.id:null,lang:"en"})}))};
  T.forEach(t=>{try{let c=cu(t.customerId),tk=t.truck||"—",out2=t.direction==="outbound",door=t.dock&&Gi.includes(t.dock)?t.dock:null;
    if(c){let bts=t.confirmedAt||((c.dispatch||t.bookedVia==="office")&&t.createdAt),
        /* only a real saved code (older trucks have none until the office makes one): same rule as the customer and office screens */
        rc=/^\d{4}$/.test(String(t.code??""))?String(t.code):null;
      t.scheduledAt&&bts&&push("booked",t.id,c,t,bts,{subject:`Booking confirmed: truck ${tk}, ${ZZa_when(t.scheduledAt)}`,
        sms:`Truck ${tk} is booked for ${ZZa_when(t.scheduledAt)} (dock time).${rc?` Check-in code ${rc}.`:""}`,
        email:`Truck ${tk} is booked at our dock for ${ZZa_when(t.scheduledAt)} (dock time).${rc?`\n\nCheck-in code for the driver: ${rc}\nDriver link for ETA updates: ${ZZetaLink(t)}`:""}`});
      t.eta&&t.eta.at&&t.eta.updatedAt&&push("eta",t.id+":"+t.eta.updatedAt,c,t,t.eta.updatedAt,{subject:`ETA for truck ${tk}: ${ZZa_hm(t.eta.at)}`,sms:`Truck ${tk} ETA now ${ZZa_hm(t.eta.at)} (${ZZa_srcName[t.eta.source]||"update"}).`});
      t.arrivedAt&&push("arrived",t.id,c,t,t.arrivedAt,{subject:`Truck ${tk} checked in`,sms:`Truck ${tk} checked in at our dock at ${ZZa_hm(t.arrivedAt)}.`});
      if(t.arrivedAt){let wts=ZZa_ms(t.arrivedAt)+st.waitGoalMin*6e4,ws=t.workStartedAt?ZZa_ms(t.workStartedAt):Infinity;
        ws>wts&&t.stage!=="cancelled"&&push("waiting",t.id,c,t,wts,{subject:`Truck ${tk} is waiting for a door`,sms:`Truck ${tk} has waited ${st.waitGoalMin} minutes since check-in. We are working to get it to a door.`})}
      t.workStartedAt&&push("started",t.id,c,t,t.workStartedAt,{subject:`${out2?"Loading":"Unloading"} started: truck ${tk}`,sms:`${out2?"Loading":"Unloading"} started on truck ${tk}${door?" at door "+door:""}.`});
      let L=ld(t).filter(s=>(out2?s.trailerOutId===t.id:s.trailerInId===t.id)&&(!s.customerId||s.customerId===c.id));
      if(t.workDoneAt){let bol=L.reduce((a,s)=>a+fe(s),0),cnt=L.reduce((a,s)=>a+(out2?(s.pullCount!=null?ie(s.pullCount):s.loadedAt||s.shippedAt?fe(s):0):(s.qc&&s.qc.counted!=null?ie(s.qc.counted):s.receivedAt?fe(s):0)),0),
          ph=ie(t.afterPhotoCount)+ie(t.beforePhotoCount)+ie(t.unloadPhotoCount)+ie(t.strapPhotoCount)+ie(t.bolPhotoCount)+L.reduce((a,s)=>a+ie(s.photoCount)+ie(s.rowPhotoCount)+ie(s.loadPhotoCount)+ie(s.inspPhotoCount),0),
          dm=L.reduce((a,s)=>a+(s.exceptions||[]).filter(x=>x&&x.kind==="Damage"&&!x.draft).length,0),pr=ZZpromise(doc,t,now),
          tm=pr.doneMin!=null?` ${ot(pr.doneMin*6e4)}, ${pr.kept?"within":"over"} our ${ZZa_promiseName(pr.limitMin)} promise.`:"",
          line=`Truck ${tk} is done: ${cnt} of ${ZZa_plural(bol,"pallet")} counted against the BOL, ${ZZa_plural(ph,"photo")}, ${ZZa_plural(dm,"damage report")}.${tm}`;
        push("done",t.id,c,t,t.workDoneAt,{subject:`Done: truck ${tk}`,sms:line})}
      t.secure&&t.secure.signedAt&&push("secured",t.id,c,t,t.secure.signedAt,{subject:`Loaded and secured: truck ${tk}`,
        sms:`Truck ${tk} is loaded and secured: ${t.secure.confidence}/5${t.secure.seal?", seal "+t.secure.seal:""}, signed by ${t.secure.signedBy||"our crew"}.`})}
    /* translated copies of pQ's English driver texts, when stream C provides ZZdriverText */
    if(t.driverLang&&t.driverLang!=="en"&&typeof ZZdriverText==="function"){let lang=t.driverLang,
      dtx=(key,ts,id)=>{ts=ZZa_ms(ts);if(!isFinite(ts)||ts<since||ts>now)return;let body=null;try{body=ZZdriverText(lang,key,{driver:t.driver||"",truck:tk,dock:t.dock||"",time:t.scheduledAt?ZZa_hm(t.scheduledAt):""})}catch{body=null}
        typeof body==="string"&&body&&out.push({id:`sms:${key}:${id}:${lang}`,channel:"sms",to:t.phone||"",toName:t.driver||"Driver",subject:null,body,ts,about:`truck ${tk}`,deliverable:!!t.phone,event:"driver",customerId:t.customerId||null,trailerId:t.id,lang})};
      t.arrivedAt&&ZZactive(t)&&(t.dock&&t.dock!==Ee?dtx("door",t.dockedAt||t.arrivedAt,t.id+":"+t.dock):dtx("yard",t.arrivedAt,t.id));
      t.stage==="departed"&&t.departedAt&&dtx("released",t.departedAt,t.id);
      t.stage==="scheduled"&&t.scheduledAt&&!t.arrivedAt&&ZZa_ms(t.scheduledAt)-now<2*Nt&&ZZa_ms(t.scheduledAt)>now&&dtx("reminder",ZZa_ms(t.scheduledAt)-2*Nt,t.id)}
  }catch(x){console.error("ZZmsgs truck",t&&t.id,x)}});
  /* damage: once per report (a load can sit on an inbound and a pickup truck), to the load's customer. A damage snap
     (draft) is not a report yet: its alert is queued when the crew adds the details (finishedAt). */
  let tm=new Map(T.map(t=>[t.id,t]));
  SH.forEach(s=>{try{let t=tm.get(s.trailerInId)||tm.get(s.trailerOutId)||null,c2=cu(s.customerId||(t&&t.customerId));
    (s.exceptions||[]).forEach(x=>{if(!x||x.kind!=="Damage"||!x.id||x.draft)return;let pl=ie(x.pallets);
      push("damage",x.id,c2,t,x.finishedAt||x.at,{subject:`Damage found: ${s.ref}`,sms:`Damage found on ${s.ref}${pl?` (${ZZa_plural(pl,"pallet")})`:""}. We have photos and the fix price for you. Call 916-616-3481.`})})}catch(x){console.error("ZZmsgs load",s&&s.id,x)}})
  }catch(x){console.error("ZZmsgs",x)}
  return out.sort((a,b)=>b.ts-a.ts)},

/* Lists that open inside the dark white-text headers (.zzhd: office, customer, crew) - today the bell. Nick's head CSS
   forces white text on everything inside .zzhd (!important), so on the light theme the list was white on white.
   These rules give the open list the theme's text colours and its rows their card look and urgency edge again,
   and lift the header above the office tab bar while the list is open.
   Rendered by the office / staff header (patch A40) and the customer header (ZZCSS); the crew screen has its own copy. */
ZZa_rgb=c=>{let h=String(c||"").replace("#","");if(!/^[0-9a-f]{6}$/i.test(h))return String(c||"");return`rgb(${parseInt(h.slice(0,2),16)}, ${parseInt(h.slice(2,4),16)}, ${parseInt(h.slice(4,6),16)})`},
ZZhdCSS=()=>`.zzhd .fixed.inset-0 div,.zzhd .fixed.inset-0 button,.zzhd .fixed.inset-0 a,.zzhd .fixed.inset-0 span:not([class*="rounded-full"]){color:${m.text}!important}`+
  `.zzhd .fixed.inset-0 .tabular-nums,.zzhd .fixed.inset-0 .leading-relaxed{color:${m.mut}!important}`+
  `.zzhd .fixed.inset-0 button[style*="background"]{background:${m.raised}!important;border-color:${m.line}!important}`+
  [m.red,m.amber,m.green,m.blue,m.orange,m.mut].map(c=>`.zzhd .fixed.inset-0 button[style*="${ZZa_rgb(c)}"]{border-left-color:${c}!important}`).join("")+
  /* while the list is open its sticky header sits above the office tab bar (both were z 30, so the tab bar covered the list) */
  `.zzhd:has(.fixed.inset-0),.zz-hdr:has(.fixed.inset-0),div[style*="sticky"]:has(.zzhd .fixed.inset-0){z-index:60!important}`,
/* ---------- actions: spread into the actions object by patch A09 ----------
   S saves (one write), C adds an activity line, M / N patch a load / truck, L() role label, B() person, w toast. */
ZZacts=({S,C,M,N,L,B,w})=>{
  /* auto-approve rule shared by zzEstLines and zzReportDamage; runs inside the same write */
  let auto=(x,sid,xid)=>{let s=x.shipments.find(q=>q.id===sid),ex=s&&(s.exceptions||[]).find(q=>q.id===xid);if(!s||!ex||ex.draft)return!1;
    let cu=x.customers.find(c=>c.id===s.customerId),lim=ZZautoLimit(cu),est=ZZestOf(s,ex,Ln(x,s.customerId));
    if(ex.est&&ex.est.applied||lim==null||!(est.total>0&&est.total<lim))return!1;
    let now=ye(Date.now()),adds=est.lines.filter(l=>!l.auto).map(l=>({id:Ce(),label:`Damage: ${l.label}`,amount:l.amount})),
      msg={id:Ce(),from:"office",who:"Auto-approve",text:`AUTO-APPROVED damage charges of ${je(est.total)} on #${s.ref} (your setting: approve fixes under ${ZZa_money(lim)}).`,at:now,refs:[sid]};
    M(x,sid,q=>({adjustments:[...(q.adjustments||[]),...adds],chat:[...(q.chat||[]),{...msg,id:Ce(),via:"account chat"}],
      exceptions:(q.exceptions||[]).map(e2=>e2.id!==xid?e2:{...e2,answer:{status:"accepted",auto:!0,by:`Auto-approved (your setting: under ${ZZa_money(lim)})`,note:"",at:now,total:est.total},est:{...(e2.est||{}),applied:!0}})}));
    if(s.customerId)x.accountChat={...(x.accountChat||{}),[s.customerId]:[...((x.accountChat||{})[s.customerId]||[]),msg].slice(-500)};
    C(x,L(),"exception",`Damage fix auto-approved on ${s.ref} \xB7 ${je(est.total)} (under ${ZZa_money(lim)})`);return!0};
  let truck=(x,tid)=>x.trailers.find(k=>k.id===tid),
    /* the plain Damage exception crewSaveReceiving opens for a "Damaged" count: a photo report replaces it */
    plain=q=>q&&q.kind==="Damage"&&!q.resolved&&!q.draft&&!q.photoOwner&&!((q.est&&q.est.lines)||[]).length&&!q.answer&&/at the door$/.test(q.note||""),
    onTruck=(s,tid)=>!!s&&!!tid&&(s.trailerInId===tid||s.trailerOutId===tid),
    /* an exception or truck-level snap id already in use (a second tap on Save) */
    used=(x,id)=>x.shipments.some(q=>(q.exceptions||[]).some(e2=>e2&&e2.id===id))||x.trailers.some(k=>(k.dmgDrafts||[]).some(d=>d&&d.id===id)),
    snapX=(id,n,at,by,words,tid)=>({id,kind:"Damage",draft:!0,photoOwner:"dmg:"+id,photoCount:n,at,openedBy:by,note:words||"Damage photo, details to come",snapNote:words||"",resolved:!1,trailerId:tid}),
    JOBN={pack:"Pack (consolidated trailer)",delivery:"Delivery",pickup:"Pickup (customer's carrier)"};
  return{
  /* 1. merge patch into the truck + a history line (time change, confirmation, driver link) */
  zzLog:(tid,text,patch)=>S(x=>{let t=truck(x,tid);if(!t)return null;let{id:_i,history:_h,bookedFor:_bf,...p}=patch||{},by=B();
    /* the first time change keeps the original booked time (the trail's "Booked for ..." line) */
    if(p.scheduledAt!==void 0&&t.scheduledAt&&!t.bookedFor&&p.scheduledAt!==t.scheduledAt)p.bookedFor=t.scheduledAt;
    N(x,tid,k=>({...p,history:ZZa_hist(k,by,text)}));return C(x,L(),"trailer",`Truck ${t.truck||"—"}: ${text}`)}),
  /* 2. ETA; ignored once the truck checked in, left or was cancelled */
  zzEta:(tid,o={})=>{let ms=ZZa_ms(o&&o.at);if(!isFinite(ms))return null;return S(x=>{let t=truck(x,tid);if(!t||t.arrivedAt||!ZZactive(t))return null;
    let now=ye(Date.now()),src=["driver","client","office","samsara","gps"].includes(o.source)?o.source:"client",by=o.by||B(),iso=ye(ms),note=String(o.note||"").trim();
    N(x,tid,k=>({eta:{at:iso,source:src,updatedAt:now,by,note},history:ZZa_hist(k,by,`ETA now ${ZZa_hm(iso)} (${ZZa_srcName[src]})${note?" \xB7 "+note:""}`,now)}));
    return C(x,L(),"trailer",`Truck ${t.truck||"—"} ETA ${ZZa_hm(iso)} (${ZZa_srcName[src]})`)})},
  /* 3. tracking choice and live-location link (https only) */
  zzTrack:(tid,o={})=>{o=o||{};let p={};if(o.trackUrl!==void 0){let raw=String(o.trackUrl??"").trim(),u=ZZsafeUrl(raw);if(raw&&!u){w(R("That link must start with https://"),{tone:"bad"});return null}p.trackUrl=u}
    if(["link","samsara","gps","self","none"].includes(o.tracking))p.tracking=o.tracking;if(!Object.keys(p).length)return null;
    return S(x=>{let t=truck(x,tid);if(!t)return null;let by=B(),tr=p.tracking||t.tracking,txt=p.trackUrl?`Live location link added (${ZZa_trName[tr]||"link"})`:p.trackUrl===""?"Live location link removed":`Tracking: ${ZZa_trName[tr]||tr}`;
      N(x,tid,k=>({...p,history:ZZa_hist(k,by,txt)}));return C(x,L(),"trailer",`Truck ${t.truck||"—"}: ${txt}`)})},
  /* 4. give an older truck a real check-in code */
  zzEnsureCode:tid=>S(x=>{let t=truck(x,tid);if(!t||/^\d{4}$/.test(String(t.code??"")))return null;let c=ZZnewCode(x),by=B();
    N(x,tid,k=>({code:c,history:ZZa_hist(k,by,"Driver link made")}));return x}),
  /* 5. office confirms a requested time */
  zzConfirm:tid=>S(x=>{let t=truck(x,tid);if(!t||t.confirmedAt||!ZZactive(t))return null;let now=ye(Date.now()),by=B();
    N(x,tid,k=>({confirmedAt:now,confirmedBy:by,history:ZZa_hist(k,by,"Time confirmed",now)}));return C(x,L(),"schedule",`Confirmed truck ${t.truck||"—"} for ${ge(t.scheduledAt)}`)}),
  /* 6. partial customer edits; never id, name, rates, pin or dispatch (updateCustomer wipes rates) */
  zzCustomer:(cid,f={})=>{let{id:_i,name:_n,rates:_r,pin:_p,dispatch:_d,...p}=f||{};if(!Object.keys(p).length)return null;
    return S(x=>{let c=x.customers.find(q=>q.id===cid);if(!c)return null;x.customers=x.customers.map(q=>q.id===cid?{...q,...p}:q);return C(x,L(),"setup",`Account settings updated: ${c.name}`)})},
  /* 7. damage estimate lines (replaces ZZEst.save) + auto-approve under the customer's limit */
  /* a damage snap (draft) gets its fix lines through zzDamageFinish, never here (nothing is priced or billed before the details) */
  zzEstLines:(sid,xid,lines)=>S(x=>{let s=x.shipments.find(q=>q.id===sid),ex=s&&(s.exceptions||[]).find(q=>q.id===xid);if(!s||!ex||ex.draft||ex.est&&ex.est.applied)return null;
    let ls=ZZa_lines(lines),now=ye(Date.now());
    M(x,sid,q=>({exceptions:(q.exceptions||[]).map(e2=>e2.id!==xid?e2:{...e2,est:{...(e2.est||{}),lines:ls,sentAt:now},answer:e2.answer&&e2.answer.status==="call"?e2.answer:null})}));
    auto(x,sid,xid);return x}),
  /* 8. crew damage report with photos (2 or more) */
  zzReportDamage:(sid,o={})=>{o=o||{};let n=ie(o.photoCount);if(n<2){w(R("Take at least 2 photos of the damage first."),{tone:"bad"});return null}
    return S(x=>{let s=x.shipments.find(q=>q.id===sid);if(!s)return null;let id=o.id||Ce();if((s.exceptions||[]).some(q=>q.id===id))return null;
      let now=ye(Date.now()),by=B(),kinds=(o.kinds||[]).map(String).filter(Boolean),pal=Math.max(0,ie(o.pallets)),what=String(o.what||"").trim(),ls=ZZa_lines(o.lines),
        note=[pal?ZZa_plural(pal,"pallet"):"",kinds.join(", "),what].filter(Boolean).join(" \xB7 ")||"Damage reported";
      M(x,sid,q=>({exceptions:[...(q.exceptions||[]).filter(e2=>!plain(e2)),{id,kind:"Damage",note,at:now,openedBy:by,resolved:!1,pallets:pal,kinds,what,photoOwner:"dmg:"+id,photoCount:n,est:{lines:ls,sentAt:ls.length?now:null},answer:null}],
        touches:Fo(q,by,"damage")}));
      C(x,L(),"exception",`Damage reported on ${s.ref}: ${note} (${n} photos)`);auto(x,sid,id);return x})},
  /* 9. secure the load: photos of how it is secured and what is used (strap:<tid>, photoCount 1 or more; the older
     5 named photos {nose, middle, tail, closeup, seal} are still accepted), confidence 1-5 (note at 1-3), rows checked, signature */
  zzSecure:(tid,sec={})=>{sec=sec||{};let ph=sec.photos&&typeof sec.photos==="object"?sec.photos:null,n=Math.max(0,Math.round(ie(sec.photoCount))),
      miss=ZZSECSLOTS.filter(sl=>!(ie((ph||{})[sl.k])>0)).map(sl=>sl.label),five=!!ph&&!miss.length,cf=ie(sec.confidence),
      why=n<1&&!five?(ph&&miss.length<5?`Take all 5 photos (missing: ${miss.join(", ")}).`:"Take at least 1 photo of how the load is secured."):!(cf>=1&&cf<=5&&Math.round(cf)===cf)?"Pick how solid the load is (1 to 5).":cf<=3&&!String(sec.note||"").trim()?"Say what would make it safer.":sec.checkedRows!==!0?"Check that every row is tight first.":!String(sec.signature||"").trim()?"Sign with your name.":"";
    if(why){w(R(why),{tone:"bad"});return null}
    return S(x=>{let t=truck(x,tid);if(!t)return null;let now=ye(Date.now()),by=B(),seal=String(sec.seal||"").trim().toUpperCase(),gear={},photos={};
      ZZGEAR.forEach(g=>{let v=(sec.gear||{})[g.k]||{};gear[g.k]={qty:Math.max(0,Math.round(ie(v.qty))),owner:v.owner==="driver"?"driver":"ours"}});ZZSECSLOTS.forEach(sl=>{photos[sl.k]=ie((ph||{})[sl.k])});
      let tags=(sec.tags||[]).map(v=>String(v).trim()).filter(Boolean),ours=ZZGEAR.map(g=>g.k).filter(k=>gear[k].owner==="ours"&&gear[k].qty>0),tagOn=ours.includes("bars")?"bars":ours[0],
        rows=ours.map(k=>({id:Ce(),customerId:t.customerId||null,trailerId:tid,type:k,qty:gear[k].qty,dir:"out",tags:k===tagOn?tags:[],at:now,by,note:"",src:"secure"})),
        /* new reports: photos:null (never a missing key: shared data merges nested objects), photoOwner + photoCount */
        S2={gear,tags,seal,...(n>=1?{photos:null,photoOwner:"strap:"+tid,photoCount:n,v:2}:{photos}),confidence:cf,note:String(sec.note||"").trim(),checkedRows:!0,signature:String(sec.signature).trim(),signedBy:by,signedAt:now};
      x.zzGear=[...(x.zzGear||[]).filter(g=>!(g&&g.src==="secure"&&g.trailerId===tid)),...rows];
      N(x,tid,k=>({secure:S2,...(seal?{sealOut:seal}:{}),...(n>=1?{strapPhotoCount:n}:{}),history:ZZa_hist(k,by,`Load secured: ${cf}/5${seal?", seal "+seal:""}`,now)}));
      (t.direction==="outbound"?x.shipments.filter(s=>s.trailerOutId===tid):x.shipments.filter(s=>s.trailerInId===tid&&be(s)==="sac")).forEach(s=>M(x,s.id,q=>({touches:Fo(q,by,"secure")})));
      return C(x,L(),"seal",`Truck ${t.truck||"—"} secured ${cf}/5${seal?" \xB7 seal "+seal:""}`)})},
  /* 10. gear ledger row (returns and manual moves) */
  zzGear:(o={})=>{o=o||{};let ty=ZZGEAR.some(g=>g.k===o.type)?o.type:null,q=Math.round(ie(o.qty)),dir=o.dir==="back"?"back":o.dir==="out"?"out":null;if(!ty||!(q>0)||!dir||!o.customerId)return null;
    return S(x=>{let row={id:Ce(),customerId:o.customerId,trailerId:o.trailerId||null,type:ty,qty:q,dir,tags:(o.tags||[]).map(v=>String(v).trim()).filter(Boolean),at:ye(Date.now()),by:B(),note:String(o.note||"").trim(),src:dir==="back"?"return":"manual"},
      cn=(x.customers.find(c=>c.id===o.customerId)||{}).name||"customer";x.zzGear=[...(x.zzGear||[]),row];
      return C(x,L(),"gear",`${dir==="back"?"Gear back from":"Gear out to"} ${cn}: ${q} ${ty}`)})},
  /* 11. kiosk (or office) check-in in one write; returns {dock, place, estMin, trailerId, truck, trailer, afterHours} | {already:true,...} | null */
  zzKioskIn:async(tid,o={})=>{o=o||{};let res=null;
    /* S resolves null when the save failed or was refused (storage full, shared data offline or look-only):
       then nothing was checked in, so resolve null (kiosk: "Please go to the office"; office: "did not save").
       Only the first run of the change is the real one: after a failed save S runs it again on the screen's copy,
       which would show a check-in that was never saved (and the kiosk would then say "already checked in"). */
    let runs=0,saved=await ZZsync.lease("doors",()=>S(x=>{if(runs++)return null;let t=truck(x,tid);res=null;if(!t)return null;
      if(t.arrivedAt||!ZZactive(t)){res={already:!0,dock:t.dock||null,place:ZZplace(x,tid),trailerId:tid};return null}
      let busy=x.trailers.filter(k=>k.id!==tid&&k.dock&&k.dock!==Ee&&k.stage!=="departed"&&k.stage!=="cancelled").map(k=>k.dock),I=Gi.find(k=>!busy.includes(k))||Ee,
        T0=ye(Date.now()),office=o.by==="office",by=office?B():"Kiosk",pick=(v,old)=>{let s2=v==null?"":String(v).trim();return s2||old||""},
        lang=ZZLANGS.some(l=>l.k===o.lang)?o.lang:t.driverLang||"en";
      N(x,tid,k=>({driver:pick(o.driver,k.driver),phone:pick(o.phone,k.phone),truck:pick(o.truck,k.truck),trailer:pick(o.trailer,k.trailer),driverLang:lang,checkedInBy:office?"office":"kiosk",
        stage:I===Ee?"arrived":"at-dock",arrivedAt:T0,dockedAt:I===Ee?null:T0,dock:I,history:ZZa_hist(k,by,`${office?"Checked in by the office":"Checked in at the kiosk"}${I===Ee?", waiting for a door":", door "+I}`,T0)}));
      let t2=truck(x,tid),pl=I===Ee?ZZplace(x,tid):null;
      res={dock:I,place:pl,estMin:pl?ZZestWait(x,tid,Date.now()):null,trailerId:tid,truck:t2.truck||"—",trailer:t2.trailer||"—",afterHours:vm(T0)};
      return C(x,office?L():"Kiosk","checkin",`${t2.driver||"Driver"} \xB7 truck ${t2.truck||"—"} checked in to ${I}${office?" (by the office)":""}`)}));
    return saved==null?null:res},
  /* 12. reorder loads inside THIS truck (pickups). With cid (the customer portal): the load must be that customer's,
     and it swaps with the next load of that same customer, so another company's loads keep their places. */
  zzReorder:(sid,tid,dir,cid)=>S(x=>{let D=truck(x,tid);if(!D)return null;let I=ir(D,x.shipments).map(r=>r.s.id),a=I.indexOf(sid),d=dir==="up"?-1:dir==="down"?1:ie(dir)<0?-1:1,b=a+d;
    if(cid){let own=id=>{let s=x.shipments.find(q=>q.id===id);return!!s&&(!s.customerId||s.customerId===cid)};if(a<0||!own(sid))return null;while(b>=0&&b<I.length&&!own(I[b]))b+=d}
    if(a<0||b<0||b>=I.length)return null;[I[a],I[b]]=[I[b],I[a]];I.forEach((id,q)=>M(x,id,{seq:q}));return x}),
  /* 13. dock settings (never admins or crewMembers); patch.rates merges into rates */
  zzSettings:(p={})=>{let{admins:_a,crewMembers:_c,rates:r,...rest}=p||{},hasR=!!r&&typeof r==="object"&&Object.keys(r).length>0;if(!Object.keys(rest).length&&!hasR)return null;
    return S(x=>{x.settings={...(x.settings||{}),...rest};if(hasR)x.rates={...(x.rates||{}),...r};return C(x,L(),"setup","Dock settings updated")})},
  /* 14. queue Friday summaries once per customer per week; resolves to how many were queued */
  zzQueueFriday:async(week,entries)=>{let n=0;await S(x=>{let ob=x.zzOutbox||[],had=new Set(ob.filter(o=>o&&o.event==="friday"&&o.week===week).map(o=>o.customerId)),now=ye(Date.now()),add=[];n=0;
      (entries||[]).forEach(en=>{if(!en||!en.customerId||had.has(en.customerId))return;add.push({id:Ce(),at:now,event:"friday",week,customerId:en.customerId,trailerId:null,channel:en.channel==="sms"?"sms":"email",to:String(en.to||""),toName:String(en.toName||""),subject:String(en.subject||""),body:String(en.body||"")})});
      if(!add.length)return null;n=add.length;x.zzOutbox=[...add,...ob].slice(0,300);return C(x,L(),"outbox",`Queued ${ZZa_plural(n,"Friday summary")} for the week of ${ZZa_day(ZZzonedIso(week,"12:00"))||week}`)});
    return n},
  /* 15. damage snap: photo now, details later. The crew makes the id first and takes the photos into 'dmg:'+id, then
     calls this with the photo count (1 or more). sid = the load (on this truck) or null ("Not sure which load": the snap
     waits on the truck, trailer.dmgDrafts). A snap is a draft: customers never see it and no alert is queued until
     zzDamageFinish. No truck history line (the trail is shown to customers); staff see it in ZZdmgDrafts / ZZtrail staff. */
  zzDamageSnap:(tid,sid,o={})=>{o=o||{};let n=Math.max(0,Math.round(ie(o.photoCount)));if(n<1){w(R("Take a photo of the damage first."),{tone:"bad"});return null}
    return S(x=>{let t=truck(x,tid);if(!t)return null;let id=String(o.id||Ce()),now=ye(Date.now()),by=B(),words=String(o.note||"").trim().slice(0,300);if(used(x,id))return null;
      if(sid){let s=x.shipments.find(q=>q.id===sid);if(!onTruck(s,tid))return null;
        M(x,sid,q=>({exceptions:[...(q.exceptions||[]),snapX(id,n,now,by,words,tid)]}));
        return C(x,L(),"exception",`Damage photo on ${s.ref} (truck ${t.truck||"—"}), details to come (${ZZa_plural(n,"photo")})`)}
      N(x,tid,k=>({dmgDrafts:[...(k.dmgDrafts||[]).filter(Boolean),{id,photoOwner:"dmg:"+id,photoCount:n,at:now,by,note:words}]}));
      return C(x,L(),"exception",`Damage photo on truck ${t.truck||"—"}, load not picked yet (${ZZa_plural(n,"photo")})`)})},
  /* 16. say which load a snap belongs to: a snap waiting on the truck, or a snap on another load of this truck (picked
     wrong). sid null puts a load snap back on the truck ("Not sure which load"). It stays a draft. */
  zzDamageAssign:(tid,xid,sid)=>S(x=>{let t=truck(x,tid);if(!t||!xid)return null;let to=sid?x.shipments.find(q=>q.id===sid):null;if(sid&&!onTruck(to,tid))return null;
    let d=(t.dmgDrafts||[]).find(q=>q&&q.id===xid),from=null,fx=null;
    if(!d){from=x.shipments.find(q=>(q.exceptions||[]).some(e2=>e2&&e2.id===xid));fx=from&&from.exceptions.find(e2=>e2&&e2.id===xid);
      if(!fx||!fx.draft||(fx.trailerId?fx.trailerId!==tid:!onTruck(from,tid))||(to&&from.id===to.id))return null}
    if(d&&!to)return null;
    let r=d?{id:d.id,n:ie(d.photoCount),at:d.at,by:d.by,words:d.note||""}:{id:fx.id,n:ie(fx.photoCount),at:fx.at,by:fx.openedBy,words:fx.snapNote||""};
    if(d)N(x,tid,k=>({dmgDrafts:(k.dmgDrafts||[]).filter(q=>q&&q.id!==xid)}));else M(x,from.id,q=>({exceptions:(q.exceptions||[]).filter(e2=>!(e2&&e2.id===xid))}));
    if(to){M(x,to.id,q=>({exceptions:[...(q.exceptions||[]),{...(fx||{}),...snapX(r.id,r.n,r.at,r.by,r.words,tid)}]}));
      return C(x,L(),"exception",`Damage photo matched to ${to.ref} (truck ${t.truck||"—"})`)}
    N(x,tid,k=>({dmgDrafts:[...(k.dmgDrafts||[]).filter(Boolean),{id:r.id,photoOwner:"dmg:"+r.id,photoCount:r.n,at:r.at,by:r.by,note:r.words}]}));
    return C(x,L(),"exception",`Damage photo on truck ${t.truck||"—"}, load not picked yet`)}),
  /* 17. finish a snap: pallets, what's wrong, fix lines, 2+ photos (more can be added now). Only now is it a damage report
     the customer sees, with its alert; exactly like zzReportDamage (replaces the plain crew exception, damage touch,
     auto-approve under the customer's limit). The snap time stays in `at`; finishedAt / finishedBy say when it was finished. */
  zzDamageFinish:(sid,xid,o={})=>{o=o||{};let n=ie(o.photoCount);if(n<2){w(R("Take at least 2 photos of the damage first."),{tone:"bad"});return null}
    return S(x=>{let s=x.shipments.find(q=>q.id===sid),d=s&&(s.exceptions||[]).find(q=>q&&q.id===xid);if(!d||!d.draft)return null;
      let now=ye(Date.now()),by=B(),kinds=(o.kinds||[]).map(String).filter(Boolean),pal=Math.max(0,ie(o.pallets)),what=String(o.what||d.snapNote||"").trim(),ls=ZZa_lines(o.lines),
        note=[pal?ZZa_plural(pal,"pallet"):"",kinds.join(", "),what].filter(Boolean).join(" \xB7 ")||"Damage reported";
      M(x,sid,q=>({exceptions:(q.exceptions||[]).filter(e2=>!plain(e2)).map(e2=>!e2||e2.id!==xid?e2:{...e2,draft:!1,note,pallets:pal,kinds,what,photoOwner:e2.photoOwner||"dmg:"+xid,photoCount:n,est:{lines:ls,sentAt:ls.length?now:null},answer:null,finishedAt:now,finishedBy:by}),
        touches:Fo(q,by,"damage")}));
      C(x,L(),"exception",`Damage reported on ${s.ref}: ${note} (${n} photos)`);auto(x,sid,xid);return x})},
  /* 18. throw away a snap that is not damage after all (sid null: a snap waiting on the truck). Finished reports are never
     removed here. The screen may then clear the photos: ex('dmg:'+id, []). */
  zzDamageDiscard:(tid,sid,xid)=>S(x=>{if(!xid)return null;let t=tid?truck(x,tid):null;
    if(sid){let s=x.shipments.find(q=>q.id===sid),d=s&&(s.exceptions||[]).find(q=>q&&q.id===xid);if(!d||!d.draft)return null;
      M(x,sid,q=>({exceptions:(q.exceptions||[]).filter(e2=>!(e2&&e2.id===xid))}));return C(x,L(),"exception",`Damage photo on ${s.ref} thrown away (not damage)`)}
    if(!t||!(t.dmgDrafts||[]).some(q=>q&&q.id===xid))return null;
    N(x,tid,k=>({dmgDrafts:(k.dmgDrafts||[]).filter(q=>q&&q.id!==xid)}));return C(x,L(),"exception",`Damage photo on truck ${t.truck||"—"} thrown away (not damage)`)}),
  /* 19. multi-stop load plan: trailer.multiStop, and per load its stop (1, 2 ...) and place in the trailer
     ('nose' | 'middle' | 'tail'). Only loads going out on (or reloading onto) this truck. With cid (the customer portal)
     only that customer's loads change, and multiStop only on that customer's own truck. Nothing changed: no write. */
  zzLoadPlan:(tid,o={},cid)=>{o=o||{};let ls=Array.isArray(o.loads)?o.loads.filter(l=>l&&l.sid):[],hasMS=typeof o.multiStop==="boolean";if(!ls.length&&!hasMS)return null;
    return S(x=>{let t=truck(x,tid);if(!t)return null;let by=B(),ch=0,ms=null;
      ls.forEach(l=>{let s=x.shipments.find(q=>q.id===l.sid);if(!onTruck(s,tid)||cid&&s.customerId!==cid)return;
        let st=l.stop===void 0?ZZa_stop(s.stop):ZZa_stop(l.stop),ps=l.pos===void 0?ZZa_pos(s.pos):ZZa_pos(l.pos);
        if(ZZa_stop(s.stop)===st&&ZZa_pos(s.pos)===ps)return;M(x,s.id,{stop:st,pos:ps});ch++});
      if(hasMS&&(!cid||t.customerId===cid)&&!!t.multiStop!==o.multiStop){ms=o.multiStop;ch++}
      if(!ch)return null;
      N(x,tid,k=>({...(ms!=null?{multiStop:ms}:{}),history:ZZa_hist(k,by,ms===!0?"Load plan: more than one stop":ms===!1?"Load plan: one stop":"Load plan updated")}));
      return C(x,L(),"trailer",`Truck ${t.truck||"—"}: load plan updated${ms!=null?ms?" (multi-stop)":" (one stop)":""}`)})},
  /* 20. the office picks the loading job of an outbound truck: 'pack' | 'delivery' | 'pickup', or null (worked out:
     ZZloadJob). Inbound trucks are unpack / unload by their loads and refuse this. */
  zzLoadJob:(tid,job)=>{let j=job==null||job===""||job==="auto"?null:job==="pack"||job==="delivery"||job==="pickup"?job:void 0;if(j===void 0){w(R("Pick pack, delivery or pickup."),{tone:"bad"});return null}
    return S(x=>{let t=truck(x,tid);if(!t||t.direction!=="outbound"||(t.loadJob??null)===j)return null;let by=B();
      N(x,tid,k=>({loadJob:j,history:ZZa_hist(k,by,j?`Loading job: ${JOBN[j]}`:"Loading job: worked out from the loads")}));
      return C(x,L(),"trailer",`Truck ${t.truck||"—"}: loading job ${j?JOBN[j]:"automatic"}`)})},
  /* 21. the manifest of what went in, signed by the forklift driver: one line per load (sid; ref and customer come from the
     load) plus any extra line (sid null, e.g. loose freight), pallets loaded on every line, typed signature. Saved on the
     truck in one write; signing again replaces it. Refused (nothing written): no lines, a line without pallets loaded,
     no signature. History says only "Manifest signed" (customers read the trail; their lines come from ZZmanifestFor). */
  /* 22. Setup > "Reload demo data" (local mode only, staff Setup): a fresh demo day in one write, like a first visit;
     logins, settings and rates stay; the old demo's photos are removed from this device. Shared data: refused. */
  zzDemoReload:()=>{if(typeof ZZsync==="undefined"||ZZsync.mode!=="local"){w(R("Reload demo data works only on this device's own copy."),{tone:"bad"});return null}
    ZZa_wipeDemo();let p=S(x=>x.demoCleared?null:ZZdemoFresh(x));w(R("Fresh demo day loaded."),{tone:"good"});return p},
  zzManifest:(tid,mf={})=>{mf=mf||{};let sig=String(mf.signature||"").trim(),raw=(Array.isArray(mf.lines)?mf.lines:[]).filter(l=>l&&(l.sid||String(l.ref||"").trim()||String(l.note||"").trim())),
      bad=v=>v==null||v===""||!Number.isFinite(+v)||+v<0,
      why=!raw.length?"Add at least one line to the manifest.":raw.some(l=>bad(l.loaded))?"Fill in the pallets loaded on every line.":!sig?"Sign the manifest with your name.":"";
    if(why){w(R(why),{tone:"bad"});return null}
    return S(x=>{let t=truck(x,tid);if(!t)return null;let now=ye(Date.now()),by=B(),seen=new Set,
      lines=raw.map(l=>{let s=l.sid?x.shipments.find(q=>q.id===l.sid):null,id=String(l.id||Ce());if(seen.has(id))id=Ce();seen.add(id);
        return{id,sid:s?s.id:null,ref:String((s&&s.ref)||l.ref||"").trim().slice(0,60),customerId:s?s.customerId||null:l.customerId||null,
          planned:l.planned==null||l.planned===""?s?fe(s):0:Math.max(0,Math.round(ie(l.planned))),loaded:Math.max(0,Math.round(ie(l.loaded))),stop:ZZa_stop(l.stop),pos:ZZa_pos(l.pos),note:String(l.note||"").trim().slice(0,300)}}),
      total=lines.reduce((a,l)=>a+l.loaded,0);
      N(x,tid,k=>({manifest:{lines,total,signature:sig.slice(0,80),signedBy:by,signedAt:now},history:ZZa_hist(k,by,"Manifest signed",now)}));
      return C(x,L(),"trailer",`Truck ${t.truck||"—"} manifest signed: ${ZZa_plural(lines.length,"line")}, ${ZZa_plural(total,"pallet")}`)})}
  }},
/* the red save banner on the kiosk (role "driver"): a driver cannot fix storage or retry a staff change, so the
   instruction becomes "Please see the office." (the reason stays, for staff); patch A08 */
ZZa_kioskBanner=txt=>{let s=String(txt||""),r=s.replace(/\s*(Please try again|Shorten the long text[^.]*and try again|Delete old photos or use another device, and tell the office|Tell the owner: [^.]*)\.\s*$/,"");return r!==s?r+" Please see the office.":s},
/* test probe: only rendered when the test harness sets window.__ZZTEST */
ZZa_probe=({doc,actions,role})=>{(0,H.useEffect)(()=>{try{window.__zz={doc,actions,role,h:{ZZFLAGS,ZZPUBLIC_URL,ZZLANGS,ZZEVENTS,ZZALERTS,ZZGEAR,ZZSECSLOTS,ZZDMGKINDS,ZZS,ZZactive,ZZcode,ZZnewCode,ZZokCode,ZZbyCode,ZZetaLink,ZZsafeUrl,ZZzonedIso,ZZdockParts,ZZyardQ,ZZplace,ZZwaitMs,ZZtone,ZZtoneColor,ZZestWait,ZZpromise,ZZtruckSteps,ZZdayLoad,ZZcrewOnShift,ZZgearOut,ZZdmgLines,ZZestTotal,ZZautoLimit,ZZdmgMonths,ZZweekKey,ZZweek,ZZtrail,ZZrecips,ZZmsgs,ZZrewrapBilled,ZZa_kioskBanner,ZZBADGE,ZZPOS,ZZJOBS,ZZPHOTO_BIG,ZZloadJob,ZZloadBadges,ZZposSuggest,ZZloadOrder,ZZdmgDrafts,ZZmanifestFor,ZZphotoCap,ZZnoDrafts,ZZcustView,ZZDEMO_V,ZZDEMO_REFRESH,ZZdemoStale,ZZdemoMore,ZZdriverText:typeof ZZdriverText==="function"?ZZdriverText:void 0,pQ:(d,n)=>pQ(d,n),Im:(s,r,n)=>Im(s,r,n),Ln:(d,c)=>Ln(d,c),sync:ZZsync,photos:{ls:k=>ls(k),ex:(k,v)=>ex(k,v)}}}}catch{}});return null},

/* ---------- demo day (Nick's private preview) ----------
   ZZt10 (Nick's base) injects the zz demo trucks once; patch A50 hands its result to ZZdemoMore, which turns the set into
   a believable busy day around "now": every truck state and every forklift job (UNPACK with 4 companies and a damage
   snap, UNLOAD, PACK partly packed, DELIVERY with 3 stops, PICKUP), a finished damage report waiting for the customer,
   a departed PACK with a signed manifest, inventory on the floor, open requests and messages. No photos are made
   (every photo count is 0). tx() stamps a fresh demo (patch A51: zzDemo {v, at, day}).
   ZZDEMO_REFRESH is false in the source; `build2.py --demo-refresh` bakes true into the PREVIEW build only: then, in
   local mode, a demo doc (not demoCleared) older than today's dock day or than ZZDEMO_V is rebuilt on load (patch A06,
   like a first visit; logins, settings and rates stay). Shared (db) mode is never touched. */
ZZDEMO_V=2,
ZZDEMO_REFRESH=!1,
ZZdemoStamp=d=>d&&typeof d==="object"?{...d,zzDemo:{v:ZZDEMO_V,at:ye(Date.now()),day:ZZdockParts(Date.now()).ymd}}:d,
ZZdemoStale=(d,now)=>{if(!ZZDEMO_REFRESH||typeof ZZsync==="undefined"||ZZsync.mode!=="local"||!d||typeof d!=="object"||d.demoCleared||!(d.zzT10||d.zzDemo))return!1;
  let z=d.zzDemo;return!z||ie(z.v)<ZZDEMO_V||!z.day||String(z.day)<ZZdockParts(ZZa_nowMs(now)).ymd},
/* local mode only: the old demo's photos (owners keyed by the old ids) and bell "seen" lists go with it */
ZZa_wipeDemo=()=>{if(typeof ZZsync==="undefined"||ZZsync.mode!=="local")return;try{let ks=[];for(let k=0;k<localStorage.length;k++){let n=localStorage.key(k);n&&(n.startsWith("cdweb:cd6:photos:")||n.startsWith("cd6:seen:"))&&ks.push(n)}ks.forEach(n=>localStorage.removeItem(n))}catch{}},
/* a fresh demo day; logins, settings and rates of the old doc stay */
ZZdemoFresh=old=>{let f=tx();if(old&&typeof old==="object"){old.settings&&typeof old.settings==="object"&&(f.settings=old.settings);old.rates&&typeof old.rates==="object"&&(f.rates={...f.rates,...old.rates});f.rev=ie(old.rev)+1}return f},
ZZdemoMore=d=>{try{
  let now=Date.now(),H=h=>ye(now+h*Nt),day=ZZdockParts(now).ymd,TR=(d.trailers||[]).map(t=>({...t})),SH=(d.shipments||[]).map(s=>({...s})),
    tk=id=>TR.find(t=>t.id===id),setT=(id,p)=>{let t=tk(id);t&&Object.assign(t,p)},setS=(id,p)=>{let s=SH.find(q=>q.id===id);s&&Object.assign(s,p)},
    tc=(at,who,...w)=>w.map((what,k)=>({id:Ce(),at:H(at+k*.02),who,what})),
    rc=(at,who,p,row,o={})=>({status:"staged",receivedAt:H(at),receivedBy:who,row:row||"",qc:{condition:o.cond||"Good",counted:o.cnt??p,note:o.qn||""},touches:tc(at,who,"receive","count",...(row?["row"]:[]))}),
    NT=o=>({id:o.id,carrier:o.c,driver:o.drv,phone:o.ph||"",truck:o.tk,trailer:o.tl,direction:o.dir||"inbound",customerId:o.cu,needsMatch:!1,scheduledAt:H(o.sch),dock:o.dock||null,stage:o.stage,
      arrivedAt:o.arr!=null?H(o.arr):null,dockedAt:o.dk!=null?H(o.dk):null,workStartedAt:o.ws!=null?H(o.ws):null,workDoneAt:o.wd!=null?H(o.wd):null,departedAt:o.dp!=null?H(o.dp):null,
      sealIn:o.seal||"",sealOut:o.sealOut||"",sealVerified:o.seal?!0:null,notes:"",chat:[],instructions:o.ins||"",workStartedBy:o.ws!=null?o.by||"Roman":null,workDoneBy:o.wd!=null?o.by||"Roman":null,
      jobType:o.jt||"",createdAt:H(o.sch-22),bookedVia:"office",confirmedAt:H(o.sch-20),confirmedBy:"Nick",driverLang:"en",...(o.arr!=null?{checkedInBy:"kiosk"}:{}),...(o.x||{})}),
    NS=o=>({...gm(),id:o.id,ref:o.ref,customerId:o.cu,origin:o.org,dest:o.dst,lane:o.lane||"reno",units:{std:o.p,lg:0,crate:0},weight:o.p*(o.w||900),commodity:o.cm,status:"expected",
      trailerInId:o.tin||null,trailerOutId:o.tout||null,row:"",bol:"BOL-"+o.ref,loadNotes:o.nt||"",deliverBy:H(24*(o.due||2)),seq:o.seq||0,
      qc:{condition:"",counted:null,note:""},...(o.rcv!=null?rc(o.rcv,o.by||"Roman",o.p,o.row,o):{}),...(o.x||{})});
  /* ---- the zz trucks Nick's ZZt10 made: spread over the day ---- */
  setT("zzt1",{stage:"working",workStartedAt:H(-.15),workStartedBy:"Roman",scheduledAt:H(-.5),arrivedAt:H(-.35),dockedAt:H(-.3)});
  setS("zzs1_1",rc(-.08,"Roman",8,"R14"));
  setT("zzt2",{stage:"departed",scheduledAt:H(-3.5),arrivedAt:H(-3.1),dockedAt:H(-3),workStartedAt:H(-2.9),workStartedBy:"Sergio",workDoneAt:H(-2.1),workDoneBy:"Sergio",departedAt:H(-1.8)});
  setS("zzs2_1",rc(-2.8,"Sergio",7,"R15"));setS("zzs2_2",rc(-2.6,"Sergio",9,"R16"));setS("zzs2_3",rc(-2.4,"Sergio",6,"R17"));
  setT("zzt5",{stage:"departed",scheduledAt:H(-5.5),arrivedAt:H(-5.2),dockedAt:H(-5.1),workStartedAt:H(-5),workDoneAt:H(-3.7),workStartedBy:"Roman",workDoneBy:"Roman",departedAt:H(-3.4),
    instructions:"East Coast consolidated. Unload all, sort. SSE-9001 waits on the floor for the Sacramento trailer (D8). The other two stay in Reno, one lane each."});
  setS("zzs5_1",{...rc(-4.8,"Roman",11,""),trailerOutId:"zzt12",status:"loaded",loadedAt:H(-.35),pullCount:11,touches:[...tc(-4.8,"Roman","receive","count"),...tc(-.35,"Vlad","load")]});
  setS("zzs5_2",{...rc(-4.7,"Roman",9,"R10",{cond:"Damaged",qn:"2 pallets crushed on the nose"}),touches:[...tc(-4.7,"Roman","receive","count","row"),...tc(-4,"Roman","damage")],
    exceptions:[{id:"zzx_dmg1",kind:"Damage",draft:!1,note:"2 pallets \xB7 Crushed, Torn wrap \xB7 Forklift tine holes in 2 pallets on the nose",at:H(-4.7),openedBy:"Roman",resolved:!1,pallets:2,kinds:["Crushed","Torn wrap"],
      what:"Forklift tine holes in 2 pallets on the nose",photoOwner:"dmg:zzx_dmg1",photoCount:0,est:{lines:[{id:"zzl1",label:"Rewrap pallet",qty:2,unit:15},{id:"zzl2",label:"Labor hours",qty:.5,unit:120}],sentAt:H(-4)},
      answer:null,finishedAt:H(-4),finishedBy:"Roman",trailerId:"zzt5"}]});
  setS("zzs5_3",rc(-4.5,"Roman",7,"R11"));
  setT("zzt6",{dock:Ee,stage:"arrived",dockedAt:null,scheduledAt:H(-1),arrivedAt:H(-.9)});
  setT("zzt3",{arrivedAt:H(-.35),scheduledAt:H(-.5)});
  setT("zzt7",{arrivedAt:H(-.15)});
  setT("zzt4",{eta:{at:H(.75),source:"driver",updatedAt:H(-.2),by:"Andre",note:"Chain-up at Donner, running a little late"},createdAt:H(-26),confirmedAt:H(-24),confirmedBy:"Nick"});
  setT("zzt8",{arrivedAt:H(-.25),instructions:"The customer's own carrier picks up 3 loads from the floor, 24 pallets. Count, photo, load."});
  setT("zzt9",{instructions:"The customer's carrier picks up 3 loads. Last one loads first."});
  setT("zzt10",{instructions:"The customer's carrier picks up 3 loads, 25 pallets. Check the counts."});
  /* ---- new trucks: the new forklift jobs ---- */
  let gear=(p,b,s2,a)=>({plywood:{qty:p,owner:"ours"},bars:{qty:b,owner:"ours"},straps:{qty:s2,owner:"driver"},airbags:{qty:a,owner:"ours"}}),
    nt=[
    NT({id:"zzt11",c:"Keystone Linehaul",cu:"zzc11",drv:"Walt",ph:"775-555-0311",tk:"212",tl:"KL-5310",sch:-1.2,arr:-1,dk:-.9,ws:-.75,dock:"D6",stage:"working",seal:"SL-77120",jt:"Consolidate & reload",
      ins:"East Coast consolidated from Edison, NJ: 5 loads, 4 companies. Sort each load to its own lane. BW-2201 and SSE-9050 go back on this trailer for Sacramento and Stockton. KL-7705 goes on the Sacramento trailer at D8."}),
    NT({id:"zzt12",c:"Tahoe Freightways",cu:"zzc6",drv:"Ruben",ph:"775-555-0312",tk:"318",tl:"TF-882",dir:"outbound",sch:-.9,arr:-.8,dk:-.7,ws:-.5,dock:"D8",stage:"working",by:"Vlad",jt:"Consolidate & reload",
      ins:"Consolidated trailer for Sacramento and Oakland: 3 loads from 3 companies. SSE-9001 is on. Pull WV-6120 and KL-7705, count, load, then secure it and fill in the manifest."}),
    NT({id:"zzt13",c:"Carson Line Trucking",cu:"zzc3",drv:"Hector",ph:"775-555-0313",tk:"77",tl:"T612",dir:"outbound",sch:-.4,arr:-.3,dk:-.25,dock:"D5",stage:"at-dock",jt:"Reno delivery",
      ins:"Delivery, 3 stops: Sparks first, Fernley second, Fallon last. Fallon goes in the nose, Sparks by the doors. Liftgate at Fallon.",x:{multiStop:!0}}),
    NT({id:"zzt14",c:"Sparks Pallet Movers",cu:"zzc9",drv:"Dale",ph:"775-555-0314",tk:"140",tl:"SP-220",dir:"outbound",sch:-6,arr:-5.8,dk:-5.7,ws:-5.6,wd:-4.4,dp:-4.1,dock:"D8",stage:"departed",by:"Sergio",sealOut:"SL-91204",jt:"Consolidate & reload",
      ins:"Consolidated trailer for Salt Lake City: 3 loads from 3 companies.",
      x:{afterPhotoCount:0,strapPhotoCount:0,secure:{gear:gear(5,2,4,0),tags:["LB-2041","LB-2042"],seal:"SL-91204",photos:null,photoOwner:"strap:zzt14",photoCount:0,v:2,confidence:5,note:"",checkedRows:!0,signature:"Sergio",signedBy:"Sergio",signedAt:H(-4.5)},
        manifest:{lines:[{id:"zzm1",sid:"zzs14_1",ref:"SP-3420",customerId:"zzc9",planned:8,loaded:8,stop:null,pos:null,note:""},{id:"zzm2",sid:"zzs14_2",ref:"GB-8320",customerId:"zzc4",planned:6,loaded:6,stop:null,pos:null,note:""},
          {id:"zzm3",sid:"zzs14_3",ref:"NN-3520",customerId:"zzc10",planned:5,loaded:5,stop:null,pos:null,note:"Top row only"},{id:"zzm4",sid:null,ref:"Loose cartons",customerId:"zzc9",planned:0,loaded:1,stop:null,pos:null,note:"2 loose cartons shrink-wrapped onto one pallet"}],
          total:20,signature:"Sergio",signedBy:"Sergio",signedAt:H(-4.45)},
        history:[{id:Ce(),at:H(-4.5),by:"Sergio",text:"Load secured: 5/5, seal SL-91204"},{id:Ce(),at:H(-4.45),by:"Sergio",text:"Manifest signed"}]}})],
    ns=[
    NS({id:"zzs11_1",ref:"KL-7701",cu:"zzc11",org:"Edison, NJ",dst:"Reno, NV",p:10,cm:"Housewares",tin:"zzt11",seq:0,rcv:-.6,row:"R18"}),
    NS({id:"zzs11_2",ref:"BW-2201",cu:"zzc12",org:"Edison, NJ",dst:"Sacramento, CA",lane:"sac",p:12,cm:"Imported tile",w:1400,tin:"zzt11",seq:1,rcv:-.5,nt:"Reloads nose-first \xB7 No double stack"}),
    NS({id:"zzs11_3",ref:"KL-7705",cu:"zzc11",org:"Edison, NJ",dst:"Sacramento, CA",p:7,cm:"Small appliances",tin:"zzt11",tout:"zzt12",seq:2,rcv:-.4,row:"R19"}),
    NS({id:"zzs11_4",ref:"JH-4410",cu:"zzc13",org:"Allentown, PA",dst:"Sparks, NV",p:8,cm:"Patio furniture",tin:"zzt11",seq:3,nt:"Fragile — top row only",
      x:{exceptions:[{id:"zzx_snap1",kind:"Damage",draft:!0,photoOwner:"dmg:zzx_snap1",photoCount:0,at:H(-.1),openedBy:"Roman",note:"Corner crushed on the top pallet",snapNote:"Corner crushed on the top pallet",resolved:!1,trailerId:"zzt11"}]}}),
    NS({id:"zzs11_5",ref:"SSE-9050",cu:"zzc5",org:"Baltimore, MD",dst:"Stockton, CA",lane:"sac",p:6,cm:"Building material",tin:"zzt11",seq:4}),
    NS({id:"zzs2_4",ref:"WV-6120",cu:"zzc2",org:"Fresno, CA",dst:"Oakland, CA",p:8,cm:"Canned goods",tin:"zzt2",tout:"zzt12",seq:3,rcv:-2.3,by:"Sergio",row:"R13"}),
    NS({id:"zzs13_1",ref:"CL-7310",cu:"zzc3",org:"Salt Lake City, UT",dst:"Fallon, NV",p:6,cm:"Tile",tout:"zzt13",seq:0,rcv:-22,row:"R05",x:{stop:3,pos:"nose"}}),
    NS({id:"zzs13_2",ref:"CL-7311",cu:"zzc3",org:"Salt Lake City, UT",dst:"Fernley, NV",p:8,cm:"Grout",tout:"zzt13",seq:1,rcv:-22,row:"R06",x:{stop:2,pos:"middle"}}),
    NS({id:"zzs13_3",ref:"CL-7312",cu:"zzc3",org:"Salt Lake City, UT",dst:"Sparks, NV",p:5,cm:"Fixtures",tout:"zzt13",seq:2,rcv:-22,row:"R07",x:{stop:1,pos:"tail"}}),
    ...[["zzs14_1","SP-3420","zzc9","Salt Lake City, UT",8,"Pallet racking"],["zzs14_2","GB-8320","zzc4","Ogden, UT",6,"Lumber"],["zzs14_3","NN-3520","zzc10","Salt Lake City, UT",5,"Insulation"]].map(([id,ref,cu,dst,p,cm],k)=>
      NS({id,ref,cu,org:"Reno, NV",dst,p,cm,tout:"zzt14",seq:k,rcv:-27,x:{status:"shipped",shippedAt:H(-4.1),loadedAt:H(-5.3+k*.2),pullCount:p,row:""}}))];
  TR=[...TR,...nt];SH=[...SH,...ns];
  /* a door an older (non-demo) truck holds sends the demo truck to the yard */
  let held=new Set(TR.filter(t=>!/^zzt/.test(t.id)&&ZZactive(t)&&t.dock&&Gi.includes(t.dock)).map(t=>t.dock));
  TR.forEach(t=>{/^zzt/.test(t.id)&&ZZactive(t)&&t.dock&&Gi.includes(t.dock)&&held.has(t.dock)&&Object.assign(t,{dock:Ee,dockedAt:null,stage:"arrived",workStartedAt:null,workStartedBy:null})});
  let cus=[["zzc11","Keystone Linehaul","dispatch@keystone-linehaul.example"],["zzc12","Bluewater Imports","ops@bluewater-imports.example"],["zzc13","Juniper Home Goods","receiving@juniper-home.example"]],
    have=new Set((d.customers||[]).map(c=>c.id)),
    CU=[...(d.customers||[]).map(c=>/^zzc\d+$/.test(c.id)&&!c.contact?{...c,contact:`dispatch@${c.name.toLowerCase().replace(/[^a-z]+/g,"-").replace(/^-|-$/g,"")}.example`}:c),
      ...cus.filter(([id])=>!have.has(id)).map(([id,name,contact],k)=>({id,name,aliases:[],contact,phone:"775-555-03"+String(20+k),rates:null,pin:String(5110+k),terms:30}))],
    out={...d,customers:CU,trailers:TR,shipments:SH};
  /* every active demo truck gets a real 4-digit check-in code (never a PIN) */
  TR.forEach(t=>{/^zzt/.test(t.id)&&ZZactive(t)&&!/^\d{4}$/.test(String(t.code??""))&&(t.code=ZZnewCode(out))});
  let ac={...(d.accountChat||{})},say=(cid,from,who,text,at,refs)=>{ac[cid]=[...(ac[cid]||[]),{id:Ce(),from,who,text,at:H(at),refs:refs||[]}]};
  say("zzc12","dispatcher","Bluewater dispatch","BW-2201 has to reload nose-first for Sacramento. Can you send a photo when it is back on?",-.7,["zzs11_2"]);
  say("zzc12","dispatcher","Bluewater dispatch","REQUEST R-1002 (Photos, size or weight): BW-2201 \xB7 Photos, Weight",-.65,["zzs11_2"]);
  say("zzc5","office","Office","Damage on SSE-9002: 2 pallets crushed. The fix price is on the load, please approve or decline.",-3.9,["zzs5_2"]);
  say("zzc13","dispatcher","Juniper receiving","REQUEST R-1003 (Something else): please hold JH-4410 on the floor until Monday.",-.5,["zzs11_4"]);
  say("zzc3","office","Office","Your 3-stop delivery is at door D5. Sparks, Fernley, then Fallon.",-.25,[]);
  out.accountChat=ac;
  out.zzRequests=[...(d.zzRequests||[]),
    {id:"zzr1",num:"R-1001",customerId:"zzc3",type:"delivery",status:"confirmed",createdAt:H(-26),by:"Dana",loads:["zzs13_1","zzs13_2","zzs13_3"],want:[],note:"3 stops: Sparks, Fernley, Fallon.",address:"Sparks, NV \xB7 Fernley, NV \xB7 Fallon, NV",date:day,time:"Any time",liftgate:!0,contact:"Dana",phone:"775-555-0213",back:"",repeat:!1,confirmedAt:H(-24)},
    {id:"zzr2",num:"R-1002",customerId:"zzc12",type:"info",status:"new",createdAt:H(-.65),by:"Mia",loads:["zzs11_2"],want:["Photos","Weight"],note:"Need a photo before it goes back on the trailer.",address:"",date:"",time:"Any time",liftgate:!1,contact:"",phone:"",back:"",repeat:!1},
    {id:"zzr3",num:"R-1003",customerId:"zzc13",type:"other",status:"new",createdAt:H(-.5),by:"Owen",loads:["zzs11_4"],want:[],note:"Please hold JH-4410 on the floor until Monday, the store is not ready.",address:"",date:"",time:"Any time",liftgate:!1,contact:"",phone:"",back:"",repeat:!1}];
  out.chat=[...(d.chat||[]),{id:Ce(),from:"office",who:"Office",text:"D8 Tahoe trailer: SSE-9001 is on. KL-7705 comes off D6 next.",at:H(-.3)},{id:Ce(),from:"crew",who:"Roman",text:"D6 Keystone: crushed corner on JH-4410, snapped it, details after the sort.",at:H(-.1)}];
  out.zzGear=[...(d.zzGear||[]),{id:"zzg1",customerId:"zzc9",trailerId:"zzt14",type:"plywood",qty:5,dir:"out",tags:[],at:H(-4.5),by:"Sergio",note:"",src:"secure"},{id:"zzg2",customerId:"zzc9",trailerId:"zzt14",type:"bars",qty:2,dir:"out",tags:["LB-2041","LB-2042"],at:H(-4.5),by:"Sergio",note:"",src:"secure"}];
  out.activity=[...[{id:Ce(),ts:H(-.1),actor:"Crew \xB7 Roman",kind:"exception",text:"Damage photo on JH-4410 (truck 212), details to come"},{id:Ce(),ts:H(-.35),actor:"Crew \xB7 Vlad",kind:"load",text:"Loaded SSE-9001 \xB7 11 plt on truck 318"},
    {id:Ce(),ts:H(-4),actor:"Crew \xB7 Roman",kind:"exception",text:"Damage reported on SSE-9002: 2 pallets"},{id:Ce(),ts:H(-4.45),actor:"Crew \xB7 Sergio",kind:"trailer",text:"Truck 140 manifest signed: 4 lines, 20 pallets"}].sort((a,b)=>b.ts<a.ts?-1:1),...(d.activity||[])];
  return out}catch(x){console.error("ZZdemoMore",x);return d}},
/* Setup > next to Nick's "Clear demo data" (patch A52; that card shows only while the demo is on): staff rebuild a fresh
   demo day in local mode. The confirm is on the page (no confirm()). Hidden in shared mode. */
ZZDemoReload=({actions:a})=>{let[o,setO]=(0,H.useState)(!1);if(typeof ZZsync==="undefined"||ZZsync.mode!=="local"||!a||!a.zzDemoReload)return null;
  return(0,i.jsxs)("div",{className:"pt-2 space-y-2","data-zz":"demo-reload",children:[(0,i.jsx)("div",{className:"text-xs",style:{color:m.mut},children:"Trying things out? Put back a fresh, busy demo day: today's trucks, loads, damage reports and messages, all made up."}),
    o?(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)("div",{className:"text-sm font-semibold",children:"Replace every demo truck, load, photo and message on this device with a fresh demo day? Logins and settings stay."}),
      (0,i.jsxs)("div",{className:"flex gap-2 flex-wrap",children:[(0,i.jsx)(Z,{onClick:()=>setO(!1),children:"Keep it"}),(0,i.jsx)(Z,{kind:"primary",onClick:()=>{a.zzDemoReload();setO(!1)},children:"Yes — reload the demo"})]})]})
    :(0,i.jsx)(Z,{onClick:()=>setO(!0),children:"Reload demo data"})]})},
