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
/* [{month:'2026-10', reports, pallets, approved, declined, open, items:[{s,x}]}] newest first, Damage only */
ZZdmgMonths=(doc,cid)=>{let g0={};((doc&&doc.shipments)||[]).forEach(s=>{if(cid&&s.customerId!==cid)return;(s.exceptions||[]).forEach(x=>{if(!x||x.kind!=="Damage")return;
    let mo=(ZZdockParts(x.at).ymd||"").slice(0,7)||"unknown",g=g0[mo]||(g0[mo]={month:mo,reports:0,pallets:0,approved:0,declined:0,open:0,items:[]}),st=x.answer&&x.answer.status;
    g.reports++;g.pallets+=ie(x.pallets);st==="accepted"?g.approved++:st==="declined"?g.declined++:x.resolved||g.open++;g.items.push({s,x})})});
  return Object.values(g0).sort((a,b)=>a.month<b.month?1:a.month>b.month?-1:0).map(g=>(g.items.sort((a,b)=>(ZZa_ms(b.x.at)||0)-(ZZa_ms(a.x.at)||0)),g))},

/* ---------- week, trail and messages ---------- */
ZZweekKey=now=>{let p=ZZa_parts(ZZa_nowMs(now)),d=new Date(Date.UTC(p.y,p.mo-1,p.d));d.setUTCDate(d.getUTCDate()-((p.wd+6)%7));return d.toISOString().slice(0,10)},
ZZweek=(doc,cid,now)=>{now=ZZa_nowMs(now);let from=ZZzonedIso(ZZweekKey(now),"00:00"),f=ZZa_ms(from),inR=v=>{let x=ZZa_ms(v);return isFinite(x)&&x>=f&&x<=now},
  T=((doc&&doc.trailers)||[]).filter(t=>!cid||t.customerId===cid),Sh=((doc&&doc.shipments)||[]).filter(s=>!cid||s.customerId===cid),
  trucks=T.filter(t=>t.stage!=="cancelled"&&(inR(t.arrivedAt)||inR(t.scheduledAt))),done=T.filter(t=>inR(t.workDoneAt)),
  waits=T.filter(t=>inR(t.arrivedAt)&&t.workStartedAt).map(t=>ZZwaitMs(t,now)/6e4),doorT=done.filter(t=>t.workStartedAt).map(t=>(ZZa_ms(t.workDoneAt)-ZZa_ms(t.workStartedAt))/6e4),
  pr=done.map(t=>ZZpromise(doc,t,now)).filter(p=>p.kept!=null),avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null,dmg=[];
  Sh.forEach(s=>(s.exceptions||[]).forEach(x=>{x&&x.kind==="Damage"&&inR(x.at)&&dmg.push(x)}));
  return{from,trucks:trucks.length,done:done.length,palletsIn:Sh.filter(s=>inR(s.receivedAt)).reduce((a,s)=>a+fe(s),0),palletsOut:Sh.filter(s=>inR(s.shippedAt)).reduce((a,s)=>a+fe(s),0),
    avgWaitMin:avg(waits),avgDoorMin:avg(doorT),promiseKeptPct:pr.length?Math.round(100*pr.filter(p=>p.kept).length/pr.length):null,
    damageReports:dmg.length,damageApproved:dmg.filter(x=>x.answer&&x.answer.status==="accepted").length,gearOut:ZZgearOut(doc,cid)}},
/* the time a truck was first booked for, as "Mon, Oct 27, 10:00 AM": t.bookedFor (zzLog keeps it at the first time change),
   else the "(was ...)" of the oldest "Time changed to ..." history line, else the current scheduledAt */
ZZa_bookedFor=t=>{if(!t)return"";if(t.bookedFor&&isFinite(ZZa_ms(t.bookedFor)))return ZZa_when(t.bookedFor);
  let h=(t.history||[]).map(x=>x&&/^Time changed to .+ \(was (.+)\)$/.exec(String(x.text||""))).find(Boolean);
  if(h)return h[1]==="no time"?"":h[1];return t.scheduledAt?ZZa_when(t.scheduledAt):""},
/* [{at, by, text, sid?}] oldest first. Safe for customers: never reads doc.activity. With sid, only that load's lines. */
ZZtrail=(doc,tid,sid)=>{let T=((doc&&doc.trailers)||[]).find(t=>t.id===tid)||null,syn=[],ev=[],add=(arr,at2,by,text,s2)=>{if(!at2||!isFinite(ZZa_ms(at2)))return;let x={at:at2,by:by||"",text};if(s2)x.sid=s2;arr.push(x)};
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
    let hs=new Set;(t.history||[]).forEach(h=>{if(!h)return;add(ev,h.at,h.by,h.text);hs.add(h.at)});
    syn.forEach(x=>{hs.has(x.at)||ev.push(x)})}
  /* a truck's trail lists only its loads of the truck's own customer (another company's load on it stays private) */
  let lab={...fQ,damage:fQ.damage||"Reported damage",secure:fQ.secure||"Secured the load"},
    L=((doc&&doc.shipments)||[]).filter(s=>sid?s.id===sid:(s.trailerInId===tid||s.trailerOutId===tid)&&(!T||!T.customerId||!s.customerId||s.customerId===T.customerId));
  L.forEach(s=>{s.receivedAt&&add(ev,s.receivedAt,s.receivedBy,`Received ${s.ref}: ${s.qc&&s.qc.counted!=null?`counted ${s.qc.counted} of ${fe(s)} on the BOL`:$e(s)}`,s.id);
    (s.touches||[]).forEach(tc=>{tc&&tc.what!=="receive"&&add(ev,tc.at,tc.who,`${lab[tc.what]||tc.what}: ${s.ref}`,s.id)});
    (s.corrections||[]).forEach(c=>{c&&add(ev,c.at,c.by,`Corrected ${s.ref} ${c.field||""}: ${c.from??""} → ${c.to??""}`,s.id)});
    (s.exceptions||[]).forEach(x=>{if(!x||x.kind!=="Damage")return;let pl=ie(x.pallets);
      add(ev,x.at,x.openedBy,`Damage reported on ${s.ref}${pl?`: ${ZZa_plural(pl,"pallet")}`:""}${(x.kinds||[]).length?` (${x.kinds.join(", ")})`:""}`,s.id);
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
          ph=ie(t.afterPhotoCount)+ie(t.beforePhotoCount)+L.reduce((a,s)=>a+ie(s.photoCount)+ie(s.rowPhotoCount)+ie(s.loadPhotoCount),0),
          dm=L.reduce((a,s)=>a+(s.exceptions||[]).filter(x=>x&&x.kind==="Damage").length,0),pr=ZZpromise(doc,t,now),
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
  /* damage: once per report (a load can sit on an inbound and a pickup truck), to the load's customer */
  let tm=new Map(T.map(t=>[t.id,t]));
  SH.forEach(s=>{try{let t=tm.get(s.trailerInId)||tm.get(s.trailerOutId)||null,c2=cu(s.customerId||(t&&t.customerId));
    (s.exceptions||[]).forEach(x=>{if(!x||x.kind!=="Damage"||!x.id)return;let pl=ie(x.pallets);
      push("damage",x.id,c2,t,x.at,{subject:`Damage found: ${s.ref}`,sms:`Damage found on ${s.ref}${pl?` (${ZZa_plural(pl,"pallet")})`:""}. We have photos and the fix price for you. Call 916-616-3481.`})})}catch(x){console.error("ZZmsgs load",s&&s.id,x)}})
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
  let auto=(x,sid,xid)=>{let s=x.shipments.find(q=>q.id===sid),ex=s&&(s.exceptions||[]).find(q=>q.id===xid);if(!s||!ex)return!1;
    let cu=x.customers.find(c=>c.id===s.customerId),lim=ZZautoLimit(cu),est=ZZestOf(s,ex,Ln(x,s.customerId));
    if(ex.est&&ex.est.applied||lim==null||!(est.total>0&&est.total<lim))return!1;
    let now=ye(Date.now()),adds=est.lines.filter(l=>!l.auto).map(l=>({id:Ce(),label:`Damage: ${l.label}`,amount:l.amount})),
      msg={id:Ce(),from:"office",who:"Auto-approve",text:`AUTO-APPROVED damage charges of ${je(est.total)} on #${s.ref} (your setting: approve fixes under ${ZZa_money(lim)}).`,at:now,refs:[sid]};
    M(x,sid,q=>({adjustments:[...(q.adjustments||[]),...adds],chat:[...(q.chat||[]),{...msg,id:Ce(),via:"account chat"}],
      exceptions:(q.exceptions||[]).map(e2=>e2.id!==xid?e2:{...e2,answer:{status:"accepted",auto:!0,by:`Auto-approved (your setting: under ${ZZa_money(lim)})`,note:"",at:now,total:est.total},est:{...(e2.est||{}),applied:!0}})}));
    if(s.customerId)x.accountChat={...(x.accountChat||{}),[s.customerId]:[...((x.accountChat||{})[s.customerId]||[]),msg].slice(-500)};
    C(x,L(),"exception",`Damage fix auto-approved on ${s.ref} \xB7 ${je(est.total)} (under ${ZZa_money(lim)})`);return!0};
  let truck=(x,tid)=>x.trailers.find(k=>k.id===tid);
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
  zzEstLines:(sid,xid,lines)=>S(x=>{let s=x.shipments.find(q=>q.id===sid),ex=s&&(s.exceptions||[]).find(q=>q.id===xid);if(!s||!ex||ex.est&&ex.est.applied)return null;
    let ls=ZZa_lines(lines),now=ye(Date.now());
    M(x,sid,q=>({exceptions:(q.exceptions||[]).map(e2=>e2.id!==xid?e2:{...e2,est:{...(e2.est||{}),lines:ls,sentAt:now},answer:e2.answer&&e2.answer.status==="call"?e2.answer:null})}));
    auto(x,sid,xid);return x}),
  /* 8. crew damage report with photos (2 or more) */
  zzReportDamage:(sid,o={})=>{o=o||{};let n=ie(o.photoCount);if(n<2){w(R("Take at least 2 photos of the damage first."),{tone:"bad"});return null}
    return S(x=>{let s=x.shipments.find(q=>q.id===sid);if(!s)return null;let id=o.id||Ce();if((s.exceptions||[]).some(q=>q.id===id))return null;
      let now=ye(Date.now()),by=B(),kinds=(o.kinds||[]).map(String).filter(Boolean),pal=Math.max(0,ie(o.pallets)),what=String(o.what||"").trim(),ls=ZZa_lines(o.lines),
        note=[pal?ZZa_plural(pal,"pallet"):"",kinds.join(", "),what].filter(Boolean).join(" \xB7 ")||"Damage reported",
        plain=q=>q&&q.kind==="Damage"&&!q.resolved&&!q.photoOwner&&!((q.est&&q.est.lines)||[]).length&&!q.answer&&/at the door$/.test(q.note||"");
      M(x,sid,q=>({exceptions:[...(q.exceptions||[]).filter(e2=>!plain(e2)),{id,kind:"Damage",note,at:now,openedBy:by,resolved:!1,pallets:pal,kinds,what,photoOwner:"dmg:"+id,photoCount:n,est:{lines:ls,sentAt:ls.length?now:null},answer:null}],
        touches:Fo(q,by,"damage")}));
      C(x,L(),"exception",`Damage reported on ${s.ref}: ${note} (${n} photos)`);auto(x,sid,id);return x})},
  /* 9. secure the load: 5 photos, confidence 1-5 (note at 1-3), rows checked, signature */
  zzSecure:(tid,sec={})=>{sec=sec||{};let ph=sec.photos||{},miss=ZZSECSLOTS.filter(sl=>!(ie(ph[sl.k])>0)).map(sl=>sl.label),cf=ie(sec.confidence),
      why=miss.length?`Take all 5 photos (missing: ${miss.join(", ")}).`:!(cf>=1&&cf<=5&&Math.round(cf)===cf)?"Pick how solid the load is (1 to 5).":cf<=3&&!String(sec.note||"").trim()?"Say what would make it safer.":sec.checkedRows!==!0?"Check that every row is tight first.":!String(sec.signature||"").trim()?"Sign with your name.":"";
    if(why){w(R(why),{tone:"bad"});return null}
    return S(x=>{let t=truck(x,tid);if(!t)return null;let now=ye(Date.now()),by=B(),seal=String(sec.seal||"").trim().toUpperCase(),gear={},photos={};
      ZZGEAR.forEach(g=>{let v=(sec.gear||{})[g.k]||{};gear[g.k]={qty:Math.max(0,Math.round(ie(v.qty))),owner:v.owner==="driver"?"driver":"ours"}});ZZSECSLOTS.forEach(sl=>{photos[sl.k]=ie(ph[sl.k])});
      let tags=(sec.tags||[]).map(v=>String(v).trim()).filter(Boolean),ours=ZZGEAR.map(g=>g.k).filter(k=>gear[k].owner==="ours"&&gear[k].qty>0),tagOn=ours.includes("bars")?"bars":ours[0],
        rows=ours.map(k=>({id:Ce(),customerId:t.customerId||null,trailerId:tid,type:k,qty:gear[k].qty,dir:"out",tags:k===tagOn?tags:[],at:now,by,note:"",src:"secure"})),
        S2={gear,tags,seal,photos,confidence:cf,note:String(sec.note||"").trim(),checkedRows:!0,signature:String(sec.signature).trim(),signedBy:by,signedAt:now};
      x.zzGear=[...(x.zzGear||[]).filter(g=>!(g&&g.src==="secure"&&g.trailerId===tid)),...rows];
      N(x,tid,k=>({secure:S2,...(seal?{sealOut:seal}:{}),history:ZZa_hist(k,by,`Load secured: ${cf}/5${seal?", seal "+seal:""}`,now)}));
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
    return n}
  }},
/* the red save banner on the kiosk (role "driver"): a driver cannot fix storage or retry a staff change, so the
   instruction becomes "Please see the office." (the reason stays, for staff); patch A08 */
ZZa_kioskBanner=txt=>{let s=String(txt||""),r=s.replace(/\s*(Please try again|Shorten the long text[^.]*and try again|Delete old photos or use another device, and tell the office|Tell the owner: [^.]*)\.\s*$/,"");return r!==s?r+" Please see the office.":s},
/* test probe: only rendered when the test harness sets window.__ZZTEST */
ZZa_probe=({doc,actions,role})=>{(0,H.useEffect)(()=>{try{window.__zz={doc,actions,role,h:{ZZFLAGS,ZZPUBLIC_URL,ZZLANGS,ZZEVENTS,ZZALERTS,ZZGEAR,ZZSECSLOTS,ZZDMGKINDS,ZZS,ZZactive,ZZcode,ZZnewCode,ZZokCode,ZZbyCode,ZZetaLink,ZZsafeUrl,ZZzonedIso,ZZdockParts,ZZyardQ,ZZplace,ZZwaitMs,ZZtone,ZZtoneColor,ZZestWait,ZZpromise,ZZtruckSteps,ZZdayLoad,ZZcrewOnShift,ZZgearOut,ZZdmgLines,ZZestTotal,ZZautoLimit,ZZdmgMonths,ZZweekKey,ZZweek,ZZtrail,ZZrecips,ZZmsgs,ZZrewrapBilled,ZZa_kioskBanner,ZZdriverText:typeof ZZdriverText==="function"?ZZdriverText:void 0,pQ:(d,n)=>pQ(d,n),Im:(s,r,n)=>Im(s,r,n),Ln:(d,c)=>Ln(d,c),sync:ZZsync,photos:{ls:k=>ls(k),ex:(k,v)=>ex(k,v)}}}}catch{}});return null},
