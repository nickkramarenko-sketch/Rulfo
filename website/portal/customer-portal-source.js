ZZh=(t,p,...c)=>H.createElement(t,p,...c),
ZZPHONE="916-616-3481",ZZTEL="tel:+19166163481",
/* Damage estimate for one exception: rewrap already recorded at the door + extra lines the office/crew added. */
ZZestOf=(s,x,y)=>{
  let lines=[];
  if(x.kind==="Damage"){
    let first=(s.exceptions||[]).find(q=>q.kind==="Damage"),rw=ie(s.rewrapPallets);
    /* the crew's fix lines (or the office) may already charge the rewrap: never charge it twice */
    if(first&&first.id===x.id&&rw>0&&!(x.est?.lines||[]).some(l=>/rewrap/i.test(String(l&&l.label||""))))lines.push({label:`Rewrap ${rw} damaged pallet${rw>1?"s":""}`,qty:rw,unit:y.rewrap,amount:rw*y.rewrap,auto:!0});
  }
  (x.est?.lines||[]).forEach(l=>{let q=ie(l.qty,1),u=ie(l.unit);lines.push({id:l.id,label:l.label,qty:q,unit:u,amount:q*u})});
  return{lines,total:lines.reduce((a,l)=>a+l.amount,0)};
},
ZZneeds=(s,x,y)=>!x.resolved&&!x.answer&&(ZZestOf(s,x,y).total>0||!x.seenAt),
ZZanswer=(a,s,x,status,by,note,cid,y)=>{
  let est=ZZestOf(s,x,y),now=ye(Date.now());
  a.patchShipment(s.id,sh=>({exceptions:(sh.exceptions||[]).map(q=>q.id!==x.id?q:{...q,
    answer:{status,by,note:note||"",at:now,total:est.total},
    seenBy:q.seenBy||by,seenAt:q.seenAt||now,
    est:q.est?{...q.est,applied:q.est.applied||status==="accepted"}:q.est})}));
  if(status==="accepted"&&!x.est?.applied)est.lines.filter(l=>!l.auto).forEach(l=>a.addAdjustment(s.id,`Damage: ${l.label}`,l.amount));
  a.sendAccountChat(cid,"dispatcher",
    status==="accepted"?`APPROVED damage charges of ${je(est.total)} on #${s.ref}. (${by})`
    :status==="declined"?`DECLINED damage charges of ${je(est.total)} on #${s.ref}.${note?" Reason: "+note+".":""} Please call me. (${by})`
    :`Please CALL ME about the damage on #${s.ref}.${note?" "+note:""} (${by})`);
},
ZZtable=(est)=>ZZh("div",{style:{border:`1px solid ${m.line}`,borderRadius:8,overflow:"hidden",marginTop:10}},
  ...est.lines.map((l,k)=>ZZh("div",{key:k,style:{display:"flex",gap:10,padding:"10px 12px",borderBottom:`1px solid ${m.line}`,fontSize:15}},
    ZZh("span",{style:{flex:1}},l.label,ZZh("span",{style:{color:m.dim,fontSize:13}},` \xB7 ${l.qty} \xD7 ${je(l.unit)}`)),
    ZZh("b",{style:{fontVariantNumeric:"tabular-nums"}},je(l.amount)))),
  /* the cream total row is for the light theme; on the dark themes the text is light, so use the raised panel colour */
  ZZh("div",{style:{display:"flex",padding:"12px",background:ZZb_light()?"#FBF1E8":m.raised,fontSize:17,fontWeight:800}},ZZh("span",{style:{flex:1}},"Estimated total"),ZZh("span",{style:{fontVariantNumeric:"tabular-nums"}},je(est.total)))),
ZZpill=(txt,col)=>ZZh("span",{style:{display:"inline-block",fontSize:13,fontWeight:800,padding:"3px 10px",borderRadius:20,color:col,border:`1px solid ${col}`,background:m.panel,whiteSpace:"nowrap"}},txt),
ZZstatus=(x)=>{let a=x.answer;return !a?null:a.status==="accepted"?ZZpill((a.auto?"Auto-approved \xB7 ":"You approved \xB7 ")+ge(a.at),m.green):a.status==="declined"?ZZpill("You declined \xB7 we'll call you",m.red):ZZpill("We'll call you about this",m.blue)},

/* Office / crew: build the estimate the customer approves. Shown inside the load's Exceptions box. */
ZZEst=({s,x,rates:y,actions:a})=>{
  let [lab,setLab]=(0,H.useState)(""),[amt,setAmt]=(0,H.useState)(""),last=(0,H.useRef)(null),
    est=ZZestOf(s,x,y),ans=x.answer,locked=!!x.est?.applied,
    /* zzEstLines saves the whole list in one write and applies the customer's auto-approve limit (if they set one).
       It takes a list, not an updater, so a second tap before the first save lands builds on the list just sent. */
    save=fn=>{if(!a.zzEstLines)return a.patchShipment(s.id,sh=>({exceptions:(sh.exceptions||[]).map(q=>q.id!==x.id?q:{...q,est:{...(q.est||{}),lines:fn(q.est?.lines||[]),sentAt:ye(Date.now())},answer:q.answer&&q.answer.status==="call"?q.answer:null})}));
      let src=x.est&&x.est.lines,r=last.current,next=fn(r&&r.src===src?r.lines:src||[]);last.current={src,lines:next};return a.zzEstLines(s.id,x.id,next)},
    add=(label,unit)=>save(L=>{let f=L.find(l=>l.label===label&&ie(l.unit)===ie(unit));return f?L.map(l=>l===f?{...l,qty:ie(l.qty,1)+1}:l):[...L,{id:Ce(),label,qty:1,unit:ie(unit)}]}),
    quick=[["Rewrap pallet",y.rewrap],["Labor, 1 hour",y.laborHour],["Replacement pallet",ie(y.newPallet,20)||20],["Dispose of 1 pallet",200]];
  return ZZh("div",{className:"mt-2 rounded p-2.5",style:{background:m.panel,border:`1px dashed ${m.orange}`}},
    ZZh("div",{className:"text-xs font-bold mb-1",style:{color:m.orange}},"Charge estimate for the customer"),
    est.lines.length?ZZtable(est):ZZh("div",{className:"text-xs",style:{color:m.dim}},"No charges yet. Add what fixing this costs. The customer sees it right away and can approve, decline or ask for a call."),
    ZZh("div",{className:"text-xs mt-2 font-bold",style:{color:!ans?m.amber:ans.status==="accepted"?m.green:ans.status==="declined"?m.red:m.blue}},
      !ans?(est.total>0?"Waiting on the customer's answer":"Nothing to approve yet")
      :ans.status==="accepted"?(ans.auto?`Auto-approved by the customer's setting \xB7 ${ge(ans.at)} \xB7 added to the bill`:`Approved by ${ans.by} \xB7 ${ge(ans.at)} \xB7 added to the bill`)
      :ans.status==="declined"?`Declined by ${ans.by} \xB7 ${ge(ans.at)}${ans.note?" \xB7 "+ans.note:""} — call them`
      :`${ans.by} wants a call \xB7 ${ge(ans.at)}${ans.note?" \xB7 "+ans.note:""}`),
    locked?ZZh("div",{className:"text-xs mt-1",style:{color:m.dim}},"Approved charges are on the load. Use Charges → adjustment for anything new.")
    :ZZh("div",{className:"mt-2 space-y-2"},
      ZZh("div",{className:"flex flex-wrap gap-1.5"},...quick.map(([l,u])=>ZZh(Z,{key:l,size:"sm",icon:wa,onClick:()=>add(l,u)},`${l} ${Fe(u)}`))),
      ZZh("div",{className:"flex gap-1.5"},
        ZZh(se,{value:lab,placeholder:"Other charge",onChange:v=>setLab(v.target.value)}),
        ZZh(se,{value:amt,placeholder:"$",inputMode:"decimal",style:{width:90},onChange:v=>setAmt(v.target.value.replace(/[^\d.]/g,""))}),
        ZZh(Z,{size:"sm",kind:"primary",disabled:!lab.trim()||!(+amt>0),onClick:()=>{add(lab.trim(),+amt);setLab("");setAmt("")}},"Add")),
      (x.est?.lines||[]).length>0&&ZZh("div",{className:"flex flex-wrap gap-1.5"},...(x.est.lines).map(l=>ZZh(Z,{key:l.id,size:"sm",kind:"danger",icon:dn,onClick:()=>save(L=>L.filter(q=>q.id!==l.id))},l.label)))));
},

/* ================= Customer portal (schedule first) ================= */
ZZlane={reno:"Stays in Reno",sac:"Reloads to California",other:"Goes into storage"},
ZZsow=d=>{let x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x},
ZZsame=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(),
ZZiso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,
ZZtimes=[...Array(48)].map((_,k)=>{let h=Math.floor(k/2),mi=k%2?"30":"00";return[`${String(h).padStart(2,"0")}:${mi}`,`${h%12||12}:${mi} ${h<12?"AM":"PM"}`]}),
ZZwhen=k=>k.scheduledAt||k.arrivedAt||null,
ZZplt=(k,S)=>{let p=sa(k,S);return k.direction==="inbound"?p.unload:p.load},
ZZtStatus=(k,S,t)=>{
  let inb=k.direction==="inbound",L=S.filter(s=>inb?s.trailerInId===k.id:s.trailerOutId===k.id),off=inb?L.filter(s=>s.receivedAt).length:L.filter(s=>s.loadedAt||s.shippedAt).length,
    door=k.dock&&k.dock!==Ee?k.dock:null;
  if(k.stage==="cancelled")return{txt:"Cancelled",tone:""};
  if(k.stage==="departed")return{txt:`Left ${k.departedAt?ZZb_hm(k.departedAt):""}`,tone:""};
  if(k.stage==="done")return{txt:"Finished, paperwork going out",tone:"live"};
  if(k.stage==="working")return{txt:`${inb?"Unloading":"Loading"} now${door?" at door "+door:""} \xB7 ${off} of ${L.length} load${L.length===1?"":"s"} ${inb?"off":"on"}`,tone:"live"};
  if(k.arrivedAt)return{txt:door?`Here, at door ${door}`:"Here, waiting for a door",tone:"wait"};
  /* an ETA still ahead means "on the way"; "late" only once the appointment AND the ETA have passed */
  let eta=ZZb_ms(k.eta&&k.eta.at),now=ie(t,Date.now());
  if(isFinite(eta)&&eta>now)return{txt:`On the way, ETA ${ZZb_near(eta,now)}`,tone:"live"};
  if(Kn(k,t)>An&&(!isFinite(eta)||now-eta>An))return{txt:"Late, hasn't checked in",tone:"late"};
  if(isFinite(eta))return{txt:`ETA was ${ZZb_near(eta,now)}`,tone:"wait"};
  return{txt:"Booked",tone:""};
},
/* ---------- stream B private helpers (ZZb_): dock time, rows, copy ---------- */
ZZb_fT=null,ZZb_fD=null,
ZZb_ms=v=>v==null||v===""?NaN:typeof v==="number"?v:Date.parse(v),
/* "8:15 AM" in dock time (America/Los_Angeles) */
ZZb_hm=v=>{let ms=ZZb_ms(v);if(!isFinite(ms))return"";try{ZZb_fT=ZZb_fT||new Intl.DateTimeFormat("en-US",{timeZone:lQ,hour:"numeric",minute:"2-digit"});return ZZb_fT.format(new Date(ms))}catch{return at(ms)}},
/* "Mon, Oct 27" in dock time */
ZZb_day=v=>{let ms=ZZb_ms(v);if(!isFinite(ms))return"";try{ZZb_fD=ZZb_fD||new Intl.DateTimeFormat("en-US",{timeZone:lQ,weekday:"short",month:"short",day:"numeric"});return ZZb_fD.format(new Date(ms))}catch{return Dt(ms)}},
ZZb_when=v=>{let d=ZZb_day(v);return d?`${d}, ${ZZb_hm(v)}`:""},
/* "2:40 PM" when it is today (dock time), else "Tue, Oct 27, 2:40 PM" */
ZZb_near=(v,now)=>{let ms=ZZb_ms(v);return!isFinite(ms)?"":ZZdockParts(ms).ymd===ZZb_today(now)?ZZb_hm(ms):ZZb_when(ms)},
ZZb_today=now=>ZZdockParts(ie(now,Date.now())).ymd,
ZZb_add=(ymd,n)=>{let d=new Date(ymd+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)},
ZZb_mon=ymd=>ZZb_add(ymd,-((new Date(ymd+"T12:00:00Z").getUTCDay()+6)%7)),
ZZb_lbl=(ymd,o)=>{try{return new Date(ymd+"T12:00:00Z").toLocaleDateString([],{...o,timeZone:"UTC"})}catch{return ymd}},
ZZb_wkOff=(ymd,today)=>Math.round((Date.parse(ZZb_mon(ymd)+"T12:00:00Z")-Date.parse(ZZb_mon(today)+"T12:00:00Z"))/(7*864e5)),
ZZb_pl=(n,w)=>`${n} ${w}${n===1?"":"s"}`,
ZZb_pn=min=>min%60===0?`${min/60}-hour`:`${min}-minute`,
ZZb_hasCode=k=>/^\d{4}$/.test(String(k&&k.code!=null?k.code:"")),
/* the light ("24 HR light") theme has a white panel; the clean and hi-vis themes are dark */
ZZb_light=()=>{try{return /^#[e-f]/i.test(String(m.panel))}catch{return!0}},
/* one booking-form load row; every place a row is made uses this (new form, + Add another load, Book this again) */
ZZb_row=p=>({id:Ce(),ref:"",pallets:"",lane:"reno",more:!1,bol:"",po:"",deliverBy:"",notes:"",weight:"",pieces:"",dest:"",stackable:null,hazmat:!1,...(p||{})}),
ZZb_TRACK=[{k:"link",t:"Send my driver a link",d:"Your driver taps one button to tell us when they're close. No app needed."},
  {k:"samsara",t:"Samsara",d:"Paste your Samsara live share link. We watch the truck come in."},
  {k:"gps",t:"Other GPS app",d:"Paste a live location link (Google Maps, Motive or any tracker)."},
  {k:"self",t:"I'll update it myself",d:"You change the ETA here in the portal when plans change."},
  {k:"none",t:"No updates",d:"We go by the appointment time."}],
ZZb_trName={link:"Driver link",samsara:"Samsara",gps:"GPS link",self:"You update it here",none:"No updates, we go by the appointment"},
ZZb_etaSrc={driver:"from the driver",client:"from your team",office:"from our office",samsara:"from Samsara",gps:"from GPS"},
ZZb_CONF=["","Not safe","Needs work","OK","Solid","Rock solid"],
ZZb_lang=k=>(ZZLANGS.find(l=>l.k===k)||{}).name||"English",
/* copy text: clipboard first; if the browser blocks it, select the text so the person can copy it by hand */
ZZb_copy=async(text,id)=>{try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(text);return"ok"}}catch{}
  try{let el=id&&document.getElementById(id);if(el){let r=document.createRange();r.selectNodeContents(el);let s=window.getSelection();s.removeAllRanges();s.addRange(r);try{if(document.execCommand&&document.execCommand("copy"))return"ok"}catch{}return"sel"}}catch{}return"sel"},
/* the "done" numbers for one truck (the truck customer's own loads only): counted vs BOL, photos, damage reports, promise */
ZZb_done=(e,k,now)=>{let out=k.direction==="outbound",L=(e.shipments||[]).filter(s=>(out?s.trailerOutId===k.id:s.trailerInId===k.id)&&(!s.customerId||!k.customerId||s.customerId===k.customerId)),
    bol=L.reduce((a,s)=>a+fe(s),0),
    cnt=L.reduce((a,s)=>a+(out?(s.pullCount!=null?ie(s.pullCount):s.loadedAt||s.shippedAt?fe(s):0):(s.qc&&s.qc.counted!=null?ie(s.qc.counted):s.receivedAt?fe(s):0)),0),
    ph=ie(k.afterPhotoCount)+ie(k.beforePhotoCount)+L.reduce((a,s)=>a+ie(s.photoCount)+ie(s.rowPhotoCount)+ie(s.loadPhotoCount),0),
    dm=L.reduce((a,s)=>a+(s.exceptions||[]).filter(x=>x&&x.kind==="Damage").length,0),pr=ZZpromise(e,k,now),
    tm=pr.doneMin!=null?`${ot(pr.doneMin*6e4)}, ${pr.kept?"within":"over"} our ${ZZb_pn(pr.limitMin)} promise`:"";
  /* no loads listed on the truck: leave out "0 of 0 pallets" */
  return{L,bol,cnt,ph,dm,pr,tm,txt:`${k.truck?"Truck "+k.truck:"Your truck"} is done: ${[bol?`${cnt} of ${ZZb_pl(bol,"pallet")}`:"",ZZb_pl(ph,"photo"),ZZb_pl(dm,"damage report")].filter(Boolean).join(", ")}.${tm?" "+tm[0].toUpperCase()+tm.slice(1)+".":""}`}},
/* 53' dry van: 26 floor spots, ~44,000 lb legal load */
ZZTRL={spots:26,lb:44e3},
ZZphoneI=({size:z})=>ZZh("svg",{width:z,height:z,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2.2,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true"},ZZh("path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"})),
ZZwt=k=>ie(k.weight),
ZZlb=n=>`${Math.round(n).toLocaleString()} lb`,
ZZkinds=k=>{let u=In(k.units),p=[];u.std&&p.push(`${u.std} standard`);u.lg&&p.push(`${u.lg} large`);u.crate&&p.push(`${u.crate} crate${u.crate>1?"s":""}`);return p.join(", ")||"—"},
ZZgroup=k=>be(k)==="reno"?"del":"pick",
ZZREQ={info:{t:"Photos, size or weight",d:"We send photos, dimensions or weight for a load"},delivery:{t:"Third-party delivery",d:"$300 per delivery. We check availability first"},trailer:{t:"Rent a trailer",d:"Per drop: goes out and comes back, usually under 2 hours"},other:{t:"Something else",d:"Rewrap, relabel, sort, anything"}},
ZZreqSt={new:["Waiting on us",m.amber],available:["Available, confirm it",m.orange],unavailable:["Not available",m.red],confirmed:["Booked",m.green],done:["Done",m.green],cancelled:["Cancelled",m.dim]},
/* who to call: most senior crew member on shift right now, else the office */
ZZlead=(e,t)=>{let d=new Date(t),mins=d.getHours()*60+d.getMinutes(),tm=s=>{let[h,mi]=String(s||"").split(":").map(Number);return h*60+(mi||0)},
  on=(e.settings?.crewMembers||[]).filter(c=>c.phone&&c.shift&&(c.shift.days||[0,1,2,3,4,5,6]).includes(d.getDay())&&(()=>{let a=tm(c.shift.start),b=tm(c.shift.end);return a<=b?mins>=a&&mins<b:mins>=a||mins<b})());
  on.sort((x,y)=>ie(x.rank,99)-ie(y.rank,99));return on[0]?{name:on[0].name,role:"Dock lead on shift",phone:on[0].phone}:{name:"Reno dock & office",role:"Main line",phone:ZZPHONE}},
ZZmeter=(lbl,v,max,txt)=>ZZh("div",{className:"zz-meter"},ZZh("div",{className:"zz-mt"},ZZh("span",null,lbl),ZZh("b",null,txt)),ZZh("div",{className:"zz-mb"},ZZh("i",{style:{width:`${Math.min(100,max?v/max*100:0)}%`,background:v>max?m.red:m.orange}}))),
/* how much a set of loads fills a 53' trailer, and how much room is left */
ZZfit=(plt,lb)=>{let n=Math.max(Math.ceil(plt/ZZTRL.spots),Math.ceil(lb/ZZTRL.lb),1),sp=n*ZZTRL.spots,wl=n*ZZTRL.lb;
  return ZZh("div",{className:"zz-fit"},
    ZZmeter("Pallet spots",plt,sp,`${plt} of ${sp}`),ZZmeter("Weight",lb,wl,`${ZZlb(lb)} of ${ZZlb(wl)}`),
    ZZh("p",{className:"zz-sub",style:{margin:0}},`${n>1?`Needs ${n} trailers (53'). `:"One 53' trailer. "}Room left: ${Math.max(0,sp-plt)} pallet spot${sp-plt===1?"":"s"} and ${ZZlb(Math.max(0,wl-lb))}. Real fit depends on size and stacking.`))},
ZZCSS=()=>`.zz{--bg:${m.bg};--panel:${m.panel};--raised:${m.raised};--line:${m.line};--text:${m.text};--mut:${m.mut};--dim:${m.dim};--acc:${m.orange};--green:${m.green};--red:${m.red};--amber:${m.amber};background:var(--bg);color:var(--text);min-height:100vh;font-size:15px;line-height:1.45}
.zz *{box-sizing:border-box}
.zz-in{max-width:1120px;margin:0 auto;padding:0 16px}
.zz-hdr{position:sticky;top:0;z-index:30;box-shadow:0 1px 8px rgba(0,0,0,.12)}
.zz-top{background:#0F3B44;color:#fff;border-bottom:3px solid #E09A63}
.zz-top .zz-in{display:flex;align-items:center;gap:12px;padding-top:10px;padding-bottom:10px}
.zz-tabs{background:var(--panel);border-bottom:1px solid var(--line)}
.zz-tabs .zz-in{display:flex;padding:0 4px}
.zz-tab{flex:1;min-width:0;position:relative;background:none;border:0;border-bottom:3px solid transparent;padding:10px 2px 8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--mut);font:inherit}
.zz-tab[aria-current=page]{color:var(--text);border-bottom-color:var(--acc)}
.zz-tab span{font-size:clamp(11px,2.5vw,14px);font-weight:700;white-space:nowrap}
.zz-tab i{position:absolute;top:4px;left:calc(50% + 6px);font-style:normal;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--red);color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center}
.zz-main{max-width:1120px;margin:0 auto;padding:18px 16px 64px}
.zz-h1{font:800 28px/1.1 "Barlow Condensed","Arial Narrow",Arial,sans-serif;margin:0;text-wrap:balance}
.zz-h2{font:800 21px/1.15 "Barlow Condensed","Arial Narrow",Arial,sans-serif;margin:0}
.zz-sub{color:var(--mut);font-size:14px;margin:2px 0 0}
.zz-bar{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.zz-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:6px;padding:10px 16px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;border:1px solid var(--acc);background:var(--acc);color:#fff;white-space:nowrap}
.zz-btn:disabled{opacity:.45;cursor:not-allowed}
.zz-btn.ghost{background:var(--panel);color:var(--text);border-color:var(--line)}
.zz-btn.ghost:hover{border-color:var(--mut)}
.zz-btn.danger{background:var(--panel);color:var(--red);border-color:var(--red)}
.zz-btn.ok{background:var(--green);border-color:var(--green)}
.zz-btn.sm{padding:6px 10px;font-size:13px}
.zz-link{background:none;border:0;padding:0;color:var(--acc);font:inherit;font-weight:700;cursor:pointer}
.zz-icon{background:var(--panel);border:1px solid var(--line);border-radius:6px;width:36px;height:36px;display:grid;place-items:center;cursor:pointer;color:var(--text)}
.zz-panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px}
.zz-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
.zz-2>*{min-width:0}
.zz-notes{display:grid;gap:6px;margin-bottom:14px}
.zz-note{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--panel);border:1px solid var(--line);border-radius:8px;font-size:14px}
.zz-note svg{color:var(--acc);flex:none}
.zz-note b{font-weight:700}
.zz-note .zz-link{margin-left:auto;white-space:nowrap}
.zz-flash{padding:9px 12px;border-radius:8px;background:var(--raised);border:1px solid var(--line);font-size:14px;margin-bottom:12px;display:flex;gap:8px;align-items:center}
.zz-flash svg{color:var(--green)}
.zz-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.zz-day{border-left:1px solid var(--line);min-height:200px;display:flex;flex-direction:column;min-width:0}
.zz-day:first-child{border-left:0}
.zz-dh{padding:9px 10px 7px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline;gap:6px}
.zz-dh b{font-weight:800;font-size:14px}
.zz-dh span{color:var(--mut);font-size:13px;font-variant-numeric:tabular-nums}
.zz-day.today .zz-dh{box-shadow:inset 0 3px 0 var(--acc)}
.zz-day.today .zz-dh b{color:var(--acc)}
.zz-day.past{background:var(--raised)}
.zz-db{display:flex;flex-direction:column;flex:1;min-width:0}
.zz-ev{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line);padding:8px 10px;cursor:pointer;color:var(--text);font:inherit}
.zz-ev:hover{background:var(--raised)}
.zz-ev .t{font-size:12.5px;color:var(--mut);font-variant-numeric:tabular-nums}
.zz-ev .n{font-weight:700;font-size:14px;line-height:1.25}
.zz-ev .s{font-size:12.5px;color:var(--mut);display:flex;gap:6px;align-items:baseline;margin-top:1px}
.zz-ev.cx .n{text-decoration:line-through;color:var(--mut)}
.zz-dot{width:7px;height:7px;border-radius:50%;background:var(--dim);flex:none;display:inline-block;transform:translateY(-1px)}
.zz-dot.live{background:var(--green)}.zz-dot.late{background:var(--red)}.zz-dot.wait{background:var(--amber)}
.zz-add{margin:auto 8px 8px;padding:6px;border:1px dashed var(--line);border-radius:6px;background:none;color:var(--mut);font:inherit;font-weight:700;font-size:13px;cursor:pointer}
.zz-add:hover{border-color:var(--acc);color:var(--acc)}
.zz-empty{color:var(--dim);font-size:13px;padding:8px 10px}
.zz-list{display:grid}
.zz-row{display:flex;align-items:center;gap:12px;padding:11px 2px;border-top:1px solid var(--line);background:none;border-left:0;border-right:0;border-bottom:0;width:100%;text-align:left;color:var(--text);font:inherit}
button.zz-row{cursor:pointer}
button.zz-row:hover{background:var(--raised)}
.zz-row:first-child{border-top:0}
.zz-row .m{flex:1;min-width:0}
.zz-row .m b{display:block;font-size:15px}
.zz-row .m span{display:block;font-size:13.5px;color:var(--mut)}
.zz-row .r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.zz-when{width:64px;flex:none;font-size:13px;color:var(--mut);font-variant-numeric:tabular-nums;line-height:1.3}
.zz-when b{display:block;color:var(--text);font-size:14px}
.zz-tblw{overflow-x:auto}
.zz-tbl{width:100%;border-collapse:collapse;font-size:14.5px}
.zz-tbl th{text-align:left;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--mut);padding:8px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
.zz-tbl td{padding:10px;border-bottom:1px solid var(--line);vertical-align:middle}
.zz-tbl tr.click{cursor:pointer}.zz-tbl tr.click:hover td{background:var(--raised)}
.zz-tbl .num{text-align:right;font-variant-numeric:tabular-nums}
.zz-tbl tfoot td{font-weight:800;border-bottom:0}
.zz-f{display:grid;gap:18px}
.zz-fs{display:grid;gap:10px}
.zz-fs>.lbl{font-weight:800;font-size:16px}
.zz-fs>.hint{font-size:13px;color:var(--mut);margin-top:-6px}
.zz-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.zz-g2>*{min-width:0}
.zz-fl{display:grid;gap:4px;font-size:13px;font-weight:700;color:var(--mut)}
.zz-inp{width:100%;padding:10px 11px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--text);font:inherit;font-size:16px;font-weight:500}
.zz-inp:focus{outline:2px solid var(--acc);outline-offset:-1px;border-color:var(--acc)}
.zz-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.zz-opt{display:flex;gap:10px;align-items:flex-start;text-align:left;padding:12px;border:1px solid var(--line);border-radius:8px;background:var(--panel);cursor:pointer;color:var(--text);font:inherit}
.zz-opt[aria-pressed=true]{border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)}
.zz-opt b{display:block;font-size:15px}.zz-opt span{font-size:13px;color:var(--mut)}
.zz-opt .rd{width:18px;height:18px;border-radius:50%;border:2px solid var(--line);flex:none;margin-top:2px}
.zz-opt[aria-pressed=true] .rd{border:5px solid var(--acc)}
.zz-load{display:grid;grid-template-columns:minmax(0,1.3fr) 90px minmax(0,1.3fr) 36px;gap:8px;align-items:end}
.zz-load .x{height:44px}
.zz-more{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.zz-total{display:flex;justify-content:space-between;padding:10px 12px;background:var(--raised);border-radius:6px;font-weight:800;font-variant-numeric:tabular-nums}
.zz-err{color:var(--red);font-size:14px;font-weight:700}
.zz-pick{display:flex;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:8px;cursor:pointer}
.zz-pick input{width:20px;height:20px;flex:none}
.zz-kv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 16px;font-size:14px}
.zz-kv div span{display:block;font-size:12px;color:var(--mut);font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.zz-narrow{display:none}
.zz-msg{font-size:14px;padding:6px 0;border-top:1px solid var(--line)}
.zz-msg b{font-weight:700}
.zz-meter{display:grid;gap:4px}
.zz-mt{display:flex;justify-content:space-between;font-size:13.5px;color:var(--mut)}.zz-mt b{color:var(--text);font-variant-numeric:tabular-nums}
.zz-mb{height:10px;border-radius:5px;background:var(--raised);overflow:hidden;border:1px solid var(--line)}.zz-mb i{display:block;height:100%}
.zz-fit{display:grid;gap:10px}
.zz-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}
.zz-stat{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.zz-stat span{display:block;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--mut)}
.zz-stat b{display:block;font:800 26px/1.15 "Barlow Condensed","Arial Narrow",Arial,sans-serif;font-variant-numeric:tabular-nums}
.zz-stat em{font-style:normal;font-size:13px;color:var(--mut)}
.zz-chk{display:flex;gap:8px;align-items:center;font-size:15px;font-weight:600;cursor:pointer}.zz-chk input{width:20px;height:20px}
.zz-callb{display:inline-flex;align-items:center;gap:6px;background:#E09A63;color:#0F3B44;border:0;border-radius:6px;padding:7px 11px;font:inherit;font-weight:800;font-size:14px;cursor:pointer;white-space:nowrap}
@media(max-width:820px){.zz-stats{grid-template-columns:1fr 1fr}}
@media(max-width:480px){.zz-callb span{display:none}}
@media(max-width:820px){
  .zz-week{grid-template-columns:1fr}
  .zz-day{border-left:0;border-top:1px solid var(--line);min-height:0;display:grid;grid-template-columns:76px minmax(0,1fr)}
  .zz-day:first-child{border-top:0}
  .zz-dh{border-bottom:0;border-right:1px solid var(--line);flex-direction:column;justify-content:flex-start;gap:0}
  .zz-day.today .zz-dh{box-shadow:inset 3px 0 0 var(--acc)}
  .zz-ev:last-of-type{border-bottom:1px solid var(--line)}
  .zz-add{margin:6px 8px 8px;text-align:left;padding:6px 10px}
  .zz-2,.zz-g2,.zz-opts{grid-template-columns:1fr}
  .zz-load{grid-template-columns:minmax(0,1fr) 80px 36px}
  .zz-load .ln{grid-column:1/-1;order:3}
  .zz-more{grid-template-columns:1fr}
  .zz-kv{grid-template-columns:1fr 1fr}
  .zz-wide{display:none}.zz-narrow{display:grid}
}
.zzb-hic{display:inline-grid;place-items:center;width:36px;height:36px;flex:none;background:transparent;border:1px solid rgba(255,255,255,.35);border-radius:6px;color:#fff;cursor:pointer}
.zzb-live{display:grid;gap:10px;margin-bottom:12px}
.zzb-card{background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--dim);border-radius:10px;padding:12px 14px;display:grid;gap:7px;text-align:left;color:var(--text);font:inherit;width:100%}
button.zzb-card{cursor:pointer}button.zzb-card:hover{background:var(--raised)}
.zzb-card.live{border-left-color:var(--green)}.zzb-card.wait{border-left-color:var(--amber)}.zzb-card.late{border-left-color:var(--red)}
.zzb-ct{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}
.zzb-ct b{font-size:15px}.zzb-ct span{font-size:13px;color:var(--mut)}
.zzb-big{font:800 22px/1.15 "Barlow Condensed","Arial Narrow",Arial,sans-serif;font-variant-numeric:tabular-nums}
.zzb-sub{font-size:14px;color:var(--mut)}
.zzb-st{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}
.zzb-st div{min-width:0}
.zzb-st i{display:block;height:6px;border-radius:3px;background:var(--line)}
.zzb-st .done i{background:var(--green)}.zzb-st .now i{background:var(--acc)}
.zzb-st span{display:block;font-size:11.5px;color:var(--mut);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.zzb-st .now span{color:var(--text);font-weight:700}
.zzb-pb{display:grid;gap:4px}
.zzb-pb .zz-mb{height:8px}
.zzb-pt{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:13px;color:var(--mut)}
.zzb-pt b{font-weight:700}
.zzb-box{border:1px solid var(--line);border-radius:10px;padding:12px;display:grid;gap:10px;background:var(--panel)}
.zzb-chips{display:flex;flex-wrap:wrap;gap:6px}
.zzb-code{font:800 40px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.12em}
.zzb-link{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;padding:9px 11px;border:1px dashed var(--line);border-radius:6px;background:var(--raised);overflow-wrap:anywhere;word-break:break-all;user-select:all}
.zzb-check{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:var(--green);color:#fff;margin:0 auto}
.zzb-ol{margin:0;padding-left:20px;display:grid;gap:6px;font-size:14.5px}
.zzb-busy{border:1px solid var(--line);border-radius:10px;padding:12px;display:grid;gap:8px;background:var(--raised)}
.zzb-bh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.zzb-bh b{font-size:15px;margin-right:auto}
.zzb-bk{display:grid;grid-template-columns:96px minmax(0,1fr) 64px;gap:8px;align-items:center;font-size:13px;padding:2px 4px;border-radius:5px}
.zzb-bk.me{background:var(--panel);box-shadow:inset 0 0 0 2px var(--acc);font-weight:700}
.zzb-bk em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums;color:var(--mut)}
.zzb-bk .zz-mb{height:8px}
.zzb-lx{grid-column:1/-1;display:grid;grid-template-columns:130px 110px max-content max-content;justify-content:start;gap:8px 16px;align-items:end}
.zzb-lx>*{min-width:0}
.zzb-seg{display:inline-flex;justify-self:start;border:1px solid var(--line);border-radius:6px;overflow:hidden;height:44px}
.zzb-seg button{background:var(--panel);border:0;border-left:1px solid var(--line);padding:0 14px;font:inherit;font-weight:700;font-size:14px;color:var(--mut);cursor:pointer}
.zzb-seg button:first-child{border-left:0}
.zzb-seg button[aria-pressed=true]{background:var(--acc);color:#fff}
.zzb-hz{height:44px}
.zzb-ord{display:inline-flex;gap:6px;align-items:center;margin-left:auto}
.zzb-num{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:12px;background:var(--acc);color:#fff;font-weight:800;font-size:13px}
.zzb-tl{display:grid;gap:0}
.zzb-tl div{display:grid;grid-template-columns:118px minmax(0,1fr);gap:10px;padding:7px 0;border-top:1px solid var(--line);font-size:14px}
.zzb-tl div:first-child{border-top:0}
.zzb-tl time{color:var(--mut);font-size:12.5px;font-variant-numeric:tabular-nums}
.zzb-tl b{font-weight:700}
.zzb-bars{display:flex;gap:4px}.zzb-bars i{flex:1;height:12px;border-radius:3px;background:var(--line)}
.zzb-g4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.zzb-g4>div{background:var(--raised);border-radius:8px;padding:8px 10px}
.zzb-g4 span{display:block;font-size:12px;color:var(--mut);font-weight:700}
.zzb-g4 b{font:800 22px/1.15 "Barlow Condensed","Arial Narrow",Arial,sans-serif;font-variant-numeric:tabular-nums}
.zzb-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.zzb-alt{width:100%;border-collapse:collapse;font-size:14px}
.zzb-alt th{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--mut);text-align:left;padding:6px 4px;border-bottom:1px solid var(--line)}
.zzb-alt th.c,.zzb-alt td.c{text-align:center;width:60px}
.zzb-alt td{padding:4px;border-bottom:1px solid var(--line)}
.zzb-alt input{width:22px;height:22px}
.zzb-alt label{display:grid;place-items:center;min-height:40px;cursor:pointer}
.zzb-mo{border:1px solid var(--line);border-radius:10px;background:var(--panel);margin-bottom:10px}
.zzb-mo>summary{cursor:pointer;padding:12px 14px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;list-style:none}
.zzb-mo>summary::-webkit-details-marker{display:none}
.zzb-mo>summary b{font-size:16px}.zzb-mo>summary span{font-size:13.5px;color:var(--mut)}
.zzb-mr{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--line);padding:10px 14px;font:inherit;color:var(--text);cursor:pointer}
.zzb-mr:hover{background:var(--raised)}
.zzb-mr .m{flex:1;min-width:0}.zzb-mr .m b{display:block;font-size:14.5px}.zzb-mr .m span{display:block;font-size:13px;color:var(--mut)}
.zzb-ph{display:grid;gap:8px}
.zzb-tag{display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;font-weight:700;padding:3px 9px;border-radius:14px;border:1px solid var(--line);background:var(--raised);overflow-wrap:anywhere}
.zzb-chips .zz-btn{min-height:44px;min-width:68px}
.zz-icon.zzb-arw{width:44px;height:44px}
.zzb-hit{display:inline-flex;align-items:center;min-height:44px}
.zzb-alt label{min-height:44px}
.zz input[type=checkbox]{accent-color:var(--acc)}
${ZZb_light()?".zz input[type=checkbox],.zz input[type=radio]{color-scheme:light}":""}
@media(max-width:480px){.zzb-so span{display:none}}
@media(max-width:820px){.zzb-g4{grid-template-columns:1fr 1fr}.zzb-stats{grid-template-columns:1fr 1fr}.zzb-lx{grid-template-columns:1fr 1fr}.zz-load .zzb-lx{order:4}.zz-load .zzb-mt{order:5}.zz-load .zz-more{order:6}}
@media(max-width:480px){.zz-top .zz-in{gap:8px}}
@media(max-width:560px){.zzb-st span{display:none}.zzb-tl div{grid-template-columns:1fr;gap:2px}.zzb-bk{grid-template-columns:84px minmax(0,1fr) 58px}}`,
ZZCP=({doc:e,now:t,actions:a,onExit:r,openShipment:n,customerId:o})=>{
  let A=e.customers.find(k=>k.id===o),y=Ln(e,o,t),w=ie(e.settings?.crew,3),b=!!A?.dispatch,
    TABS=["schedule","trucks","floor","requests","damage","bills","chat"],
    [tab,setTab]=(0,H.useState)(()=>{let h=(location.hash||"").replace("#","");return h==="home"?"schedule":TABS.includes(h)?h:"schedule"}),
    [wk,setWk]=(0,H.useState)(0),[sel,setSel]=(0,H.useState)(null),[form,setForm]=(0,H.useState)(null),[flash,setFlash]=(0,H.useState)(""),
    [stmt,setStmt]=(0,H.useState)(!1),[past,setPast]=(0,H.useState)(!1),[shipped,setShipped]=(0,H.useState)(!1),[q,setQ]=(0,H.useState)(""),
    [mod,setMod]=(0,H.useState)(null),[who,setWho]=(0,H.useState)(()=>{try{return localStorage.getItem("cd6:zzname")||""}catch{return""}}),
    [note,setNote]=(0,H.useState)(""),[why,setWhy]=(0,H.useState)(""),[ok,setOk]=(0,H.useState)(!1),
    [tx,setTx]=(0,H.useState)({}),[wo,setWo]=(0,H.useState)(null),[rq,setRq]=(0,H.useState)(null),[rqx,setRqx]=(0,H.useState)(null),[call,setCall]=(0,H.useState)(!1),
    /* stream B: booked sheet (truck id), alerts & settings draft, load trail sheet, copy state, open damage row */
    [bk,setBk]=(0,H.useState)(null),[al,setAl]=(0,H.useState)(null),[trl,setTrl]=(0,H.useState)(null),[cp,setCp]=(0,H.useState)(""),[hx,setHx]=(0,H.useState)(null),[planAsk,setPlanAsk]=(0,H.useState)(!1),planRef=(0,H.useRef)(!1),
    doneKey="cd6:zzdone:"+o,[seenDone,setSeenDone]=(0,H.useState)(()=>{try{let v=JSON.parse(localStorage.getItem(doneKey)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}),
    todayYmd=ZZb_today(t),
    REQ=(e.zzRequests||[]).filter(k=>k.customerId===o).sort((k,_)=>new Date(_.createdAt)-new Date(k.createdAt)),
    reqAns=REQ.filter(k=>k.status==="available").length,
    S=e.shipments.filter(k=>k.customerId===o),
    floor=S.filter(k=>k.receivedAt&&!k.shippedAt),
    free=floor.filter(k=>!k.trailerOutId),
    coming=S.filter(k=>!k.receivedAt&&k.status!=="left-on-truck"),
    done=S.filter(k=>k.shippedAt).sort((k,_)=>new Date(_.shippedAt)-new Date(k.shippedAt)),
    M=e.trailers.filter(k=>k.customerId===o),
    live=M.filter(k=>k.stage!=="departed"&&k.stage!=="cancelled"),
    atDock=live.filter(k=>k.arrivedAt).sort((k,_)=>new Date(k.arrivedAt)-new Date(_.arrivedAt)),
    booked=live.filter(k=>!k.arrivedAt).sort((k,_)=>new Date(k.scheduledAt||0)-new Date(_.scheduledAt||0)),
    pastT=M.filter(k=>k.stage==="departed"||k.stage==="cancelled").sort((k,_)=>new Date(_.departedAt||_.cancelledAt||0)-new Date(k.departedAt||k.cancelledAt||0)).slice(0,30),
    pallets=floor.reduce((k,_)=>k+fe(_),0),
    comingPlt=coming.reduce((k,_)=>k+fe(_),0),
    clock=floor.filter(k=>["closing","warn","storage"].includes(ha(k,t).phase)),
    probs=S.flatMap(k=>(k.exceptions||[]).map(x=>({s:k,x}))).sort((u,v)=>new Date(v.x.at)-new Date(u.x.at)),
    waiting=probs.filter(p=>ZZneeds(p.s,p.x,y)),
    openProbs=probs.filter(p=>!p.x.resolved),
    inv=e.invoices.filter(k=>k.customerId===o&&k.status!=="void"),
    openInv=inv.filter(k=>k.status!=="paid"),
    openTotal=openInv.reduce((k,_)=>k+_.total,0),
    unbilled=S.filter(k=>!k.invoiceId&&k.receivedAt).reduce((k,_)=>k+ur(_,y,t),0),
    msgs=((e.accountChat||{})[o]||[]).filter(k=>k.from!=="dispatcher").length,
    seenKey="cd6:zzmsg:"+o,[seenMsgs,setSeenMsgs]=(0,H.useState)(()=>{try{return+localStorage.getItem(seenKey)||0}catch{return 0}}),
    newMsgs=Math.max(0,msgs-seenMsgs),
    go=k=>{setTab(k);setFlash("");try{history.replaceState(null,"","#"+k)}catch{}window.scrollTo(0,0)},
    /* status line; a customer request that the office has not confirmed yet says so */
    stOf=k=>{let s=ZZtStatus(k,e.shipments,t);return s.txt==="Booked"&&!b&&k.bookedVia==="client"&&!k.confirmedAt?{txt:"Requested, waiting for our OK",tone:""}:s},
    /* today's active trucks (dock time): at our dock, or booked / due today */
    liveNow=live.filter(k=>k.arrivedAt||[k.scheduledAt,k.eta&&k.eta.at].some(v=>v&&ZZdockParts(v).ymd===todayYmd))
      .sort((u,v)=>{let r=k=>k.workDoneAt||k.stage==="done"?3:k.stage==="working"||k.workStartedAt?0:k.arrivedAt?1:2;return r(u)-r(v)||(ZZb_ms(ZZwhen(u))||0)-(ZZb_ms(ZZwhen(v))||0)}),
    /* trucks finished in the last 24 h that this browser has not seen yet */
    doneNew=M.filter(k=>{let d=ZZb_ms(k.workDoneAt);return isFinite(d)&&t-d<864e5&&t-d>-6e4&&!seenDone.includes(k.id)}).sort((u,v)=>ZZb_ms(v.workDoneAt)-ZZb_ms(u.workDoneAt)),
    markDone=id=>{let nx2=[...seenDone.filter(z2=>z2!==id),id].slice(-200);setSeenDone(nx2);try{localStorage.setItem(doneKey,JSON.stringify(nx2))}catch{}};
  (0,H.useEffect)(()=>{if(tab==="chat"&&msgs!==seenMsgs){setSeenMsgs(msgs);try{localStorage.setItem(seenKey,String(msgs))}catch{}}},[msgs,tab]);

  /* ---------- shared bits ---------- */
  let btn=(label,onClick,cls,icon,dis)=>ZZh("button",{type:"button",className:"zz-btn "+(cls||""),onClick,disabled:dis},icon?ZZh(icon,{size:16}):null,label),
    inp=(val,set,ph,extra)=>ZZh("input",{className:"zz-inp",value:val,placeholder:ph||"",onChange:v=>set(v.target.value),...(extra||{})}),
    fl=(label,el)=>ZZh("label",{className:"zz-fl"},label,el),
    /* appointment times are dock time (Pacific), wherever the dispatcher is */
    dt2=d=>d&&isFinite(ZZb_ms(d instanceof Date?d.getTime():d))?ZZb_when(d instanceof Date?d.getTime():d):"No time set",
    loadsOf=k=>e.shipments.filter(s=>k.direction==="inbound"?s.trailerInId===k.id:s.trailerOutId===k.id),
    truckName=k=>k.truck?`Truck ${k.truck}`:(k.carrier&&k.carrier!==A?.name?k.carrier:"Truck # not set"),
    pltTxt=(k,pl)=>pl?`${pl} plt`:(k.direction==="inbound"?"no loads listed":"loads not picked yet"),
    dirName=k=>k.direction==="inbound"?"Drop-off":"Pickup",
    freeNote=k=>{let p=ha(k,t),wk2=(fe(k)*y.storageMonthly)/4;return k.receivedAt&&!k.shippedAt&&p.phase!=="waiting"?(p.phase==="storage"?`Storage running, ${Fe(wk2)} a week`:`Free until ${ge(Na(k))}`):"—"},
    /* date: a dock-time day "YYYY-MM-DD" (or a Date); pickups start with nothing ticked */
    newForm=(date,kind,extra)=>{let ymd=typeof date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date:date instanceof Date?ZZiso(date):todayYmd;if(ymd<todayYmd)ymd=todayYmd;setFlash("");setForm({id:Ce(),date:ymd,time:"08:00",kind:kind||"drop",
      loads:[ZZb_row()],pick:[],order:!1,tracking:"link",trackUrl:"",lang:"en",
      carrier:"",truck:"",trailer:"",driver:"",phone:"",notes:"",err:"",...(extra||{})})},
    newReq=(type,pre)=>{setFlash("");let p2=pre||{};setRq({type:type||"",loads:p2.loads||[],want:p2.want&&p2.want.length?p2.want:["Photos"],note:p2.note||"",address:p2.address||"",date:p2.date||"",time:p2.time||"Any time",liftgate:!!p2.liftgate,contact:p2.contact||"",phone:p2.phone||"",back:p2.back||"Under 2 hours",repeat:!!p2.repeat,err:""})};

  /* ---------- truck row used on the Trucks tab ---------- */
  let truckRow=k=>{let st=stOf(k),w2=ZZwhen(k),pl=ZZplt(k,e.shipments);
    return ZZh("button",{key:k.id,type:"button",className:"zz-row",onClick:()=>setSel(k.id)},
      ZZh("div",{className:"zz-when"},ZZh("b",null,w2?ZZb_hm(w2):"—"),w2?ZZb_day(w2):""),
      ZZh("div",{className:"m"},ZZh("b",null,`${dirName(k)} \xB7 ${pltTxt(k,pl)} \xB7 ${truckName(k)}`),
        ZZh("span",null,ZZh("i",{className:"zz-dot "+st.tone}),` ${st.txt}${k.truck&&k.carrier&&k.carrier!==A?.name?" \xB7 "+k.carrier:""}`)),
      ZZh(qa,{size:18,style:{color:m.dim,flexShrink:0}}))};

  /* ---------- live truck card: steps, wait clock, place in line, promise ---------- */
  let liveCard=(k,full)=>{
    let st=stOf(k),steps=ZZtruckSteps(k,t),out=k.direction==="outbound",door=k.dock&&k.dock!==Ee?k.dock:null,pl=ZZplt(k,e.shipments),
      fin=!!k.workDoneAt||k.stage==="done"||k.stage==="departed",cx=k.stage==="cancelled",wm=ZZwaitMs(k,t),tone=ZZtone(wm,e),
      pr=ZZpromise(e,k,t),pn=ZZb_pn(pr.limitMin),eta=k.eta&&k.eta.at,working=!fin&&!cx&&(!!k.workStartedAt||k.stage==="working"),
      place=k.arrivedAt&&!door&&!working&&!fin?ZZplace(e,k.id):null,est=place?ZZestWait(e,k.id,t):null,big,bigCol=m.text,sub=[];
    if(cx){big="Cancelled";bigCol=m.mut}
    else if(fin){big=pr.doneMin!=null?`Done in ${ot(pr.doneMin*6e4)}, ${pr.kept?"within":"over"} our ${pn} promise`:"Done";bigCol=pr.kept===!1?m.amber:m.green;
      k.workDoneAt&&sub.push(`Finished ${ZZb_when(k.workDoneAt)}`);wm!=null&&sub.push(`waited ${ot(wm)} for a door`)}
    else if(working){big=`${out?"Loading":"Unloading"}${door?" at door "+door:""} \xB7 ${ot(Math.max(0,t-ZZb_ms(k.workStartedAt||k.dockedAt||k.arrivedAt)))}`;
      wm!=null&&sub.push(`waited ${ot(wm)} for a door`)}
    else if(k.arrivedAt&&door){big=`At door ${door}`;wm!=null&&sub.push(`checked in ${ot(wm)} ago`)}
    else if(k.arrivedAt){big=`Waiting ${ot(wm||0)}`;bigCol=ZZtoneColor(tone);place&&sub.push(`#${place} in line`);est&&sub.push(`about ${est} min until a door opens`)}
    else{big=eta?`ETA ${ZZb_near(eta,t)}`:k.scheduledAt?`Booked for ${ZZb_near(k.scheduledAt,t)}`:"Booked, no time set";
      k.scheduledAt&&sub.push(eta?`appointment ${ZZb_when(k.scheduledAt)}`:ZZdockParts(k.scheduledAt).ymd===todayYmd?"today, dock time":"dock time");eta&&sub.push(ZZb_etaSrc[k.eta.source]||"")}
    let pct=pr.deadline?Math.min(100,Math.round(pr.elapsedMin/pr.limitMin*100)):0,pcol=pr.kept===!1||pr.leftMin<0?m.red:pct>=75?m.amber:m.green,
      bar=!cx&&k.arrivedAt&&pr.deadline?ZZh("div",{className:"zzb-pb"},
        ZZh("div",{className:"zz-mb"},ZZh("i",{style:{width:`${Math.max(3,fin?100:pct)}%`,background:fin?(pr.kept===!1?m.amber:m.green):pcol}})),
        ZZh("div",{className:"zzb-pt"},ZZh("span",null,`Checked in ${ZZb_hm(k.arrivedAt)}`),
          ZZh("b",{style:{color:fin?(pr.kept===!1?m.amber:m.green):pcol}},fin?(pr.kept===!1?`Over our ${pn} promise`:`Within our ${pn} promise`)
            :pr.leftMin>=0?`${ot(pr.leftMin*6e4)} left on our ${pn} promise`:`${ot(-pr.leftMin*6e4)} past our ${pn} promise`))):null,
      kids=[
        ZZh("div",{key:"t",className:"zzb-ct"},ZZh("b",null,`${dirName(k)} \xB7 ${truckName(k)} \xB7 ${pltTxt(k,pl)}`),ZZh("span",null,ZZh("i",{className:"zz-dot "+st.tone}),` ${st.txt}`)),
        cx?null:ZZh("div",{key:"s",className:"zzb-st","aria-label":`Progress: ${(steps.find(s2=>s2.state==="now")||{}).label||(fin?"Done":"")}`},
          ...steps.map(s2=>ZZh("div",{key:s2.k,className:s2.state},ZZh("i"),ZZh("span",null,s2.label)))),
        ZZh("div",{key:"b",className:"zzb-big",style:{color:bigCol}},big),
        sub.filter(Boolean).length?ZZh("div",{key:"u",className:"zzb-sub"},sub.filter(Boolean).join(" \xB7 ")):null,
        bar?ZZh("div",{key:"p"},bar):null];
    return full?ZZh("div",{className:"zzb-card "+st.tone},...kids)
      :ZZh("button",{key:k.id,type:"button",className:"zzb-card "+st.tone,onClick:()=>setSel(k.id)},...kids)};

  /* ---------- driver link + check-in code (with Copy) ---------- */
  let linkBlock=k=>{let link=ZZetaLink(k),lid="zzb-link-"+k.id,st=cp&&cp.startsWith(k.id+":")?cp.slice(k.id.length+1):"";
    return ZZh("div",{style:{display:"grid",gap:8}},
      ZZh("div",{id:lid,className:"zzb-link"},link),
      ZZh("div",{style:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}},
        btn(st==="ok"?"Copied":"Copy link",()=>{ZZb_copy(link,lid).then(r=>setCp(k.id+":"+r))},"ghost",Ct),
        st==="ok"?ZZh("span",{className:"zz-sub",style:{margin:0,color:m.green,fontWeight:700}},"Copied. Paste it in a text to your driver."):
        st==="sel"?ZZh("span",{className:"zz-sub",style:{margin:0}},"Your browser blocked copying. The link is selected: copy it by hand."):null))};

  /* ---------- how busy a day is (counts only: never other companies' names) ---------- */
  let busyPanel=(ymd,hhmm,excl)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(ymd||""))return null;
    let dl=ZZdayLoad(e,ymd,excl),hr=/^\d{2}:\d{2}$/.test(hhmm||"")?+hhmm.slice(0,2):-1,mx=Math.max(1,...dl.blocks.map(z2=>z2.trucks)),
      iso=ZZzonedIso(ymd,hr>=0?hhmm:"12:00"),crewN=iso?ZZcrewOnShift(e,ZZb_ms(iso)).length:dl.crew,
      lvc={Light:m.green,Steady:m.amber,Busy:m.red},shared=typeof ZZsync!=="undefined"&&ZZsync.mode==="db";
    return ZZh("div",{className:"zzb-busy","data-zzb":"busy"},
      ZZh("div",{className:"zzb-bh"},ZZh("b",null,`How busy is ${ZZb_lbl(ymd,{weekday:"long",month:"short",day:"numeric"})}?`),ZZpill(dl.level,lvc[dl.level]||m.mut),shared?null:ZZpill("Estimate",m.mut)),
      ...dl.blocks.map(z2=>{let me=hr>=z2.from&&hr<z2.to;return ZZh("div",{key:z2.from,className:"zzb-bk"+(me?" me":"")},
        ZZh("span",null,z2.label),ZZh("div",{className:"zz-mb"},ZZh("i",{style:{width:`${z2.trucks?Math.max(6,z2.trucks/mx*100):0}%`,background:lvc[z2.level]||m.orange}})),
        ZZh("em",null,me?`${z2.trucks} + you`:ZZb_pl(z2.trucks,"truck")))}),
      dl.outside?ZZh("div",{className:"zz-sub",style:{margin:0}},`${ZZb_pl(dl.outside,"truck")} booked outside 6 AM–10 PM.`):null,
      hr>=0&&(hr<6||hr>=22)?ZZh("div",{className:"zz-sub",style:{margin:0}},"Your time is outside these hours."):null,
      ZZh("div",{className:"zz-sub",style:{margin:0}},`${ZZb_pl(crewN,"forklift driver")} on shift \xB7 ${dl.doors} doors \xB7 Other companies stay private.`))};

  /* ---------- SCHEDULE ---------- */
  let schedule=()=>{
    /* the week grid is in dock time, the same days the dock works by */
    let mon=ZZb_add(ZZb_mon(todayYmd),wk*7),
      days=[...Array(7)].map((_,k)=>ZZb_add(mon,k));
    let sun=days[6],range=`${ZZb_lbl(mon,{month:"short",day:"numeric"})} – ${ZZb_lbl(sun,{month:"short",day:"numeric"})}`,
      wkS=ZZweek(e,o,t),goal=ZZS(e).waitGoalMin,gearN=["plywood","bars","straps","airbags"].reduce((a2,g2)=>a2+ie(wkS.gearOut&&wkS.gearOut[g2]),0);
    return[
      flash?ZZh("div",{key:"fl",className:"zz-flash"},ZZh(Ze,{size:18}),flash):null,
      (waiting.length||clock.length||doneNew.length)?ZZh("div",{key:"nt",className:"zz-notes"},
        ...doneNew.map(k=>ZZh("div",{key:"dn"+k.id,className:"zz-note","data-zzb":"done-note"},ZZh(Ze,{size:17}),ZZh("span",{style:{flex:1,minWidth:0}},ZZh("b",null,ZZb_done(e,k,t).txt)),
          ZZh("span",{style:{display:"inline-flex",gap:12,flex:"none"}},ZZh("button",{className:"zz-link zzb-hit",style:{marginLeft:0},onClick:()=>{markDone(k.id);setSel(k.id)}},"Open"),
            ZZh("button",{className:"zz-link zzb-hit",style:{marginLeft:0,color:m.mut},"aria-label":"Dismiss",onClick:()=>markDone(k.id)},"Dismiss")))),
        waiting.length?ZZh("div",{className:"zz-note"},ZZh(wr,{size:17}),ZZh("span",null,ZZh("b",null,`${waiting.length} damage report${waiting.length>1?"s need":" needs"} your answer.`)," See photos and the cost to fix."),ZZh("button",{className:"zz-link",onClick:()=>go("damage")},"Review")):null,
        clock.length?ZZh("div",{className:"zz-note"},ZZh(Fd,{size:17}),ZZh("span",null,ZZh("b",null,`${clock.length} load${clock.length>1?"s are":" is"} past or near free time.`)," Book a pickup to stop storage."),ZZh("button",{className:"zz-link",onClick:()=>newForm(null,"pick")},"Book pickup")):null):null,
      liveNow.length?ZZh("section",{key:"lv",style:{marginBottom:16},"data-zzb":"live-now"},
        ZZh("div",{className:"zz-bar",style:{marginBottom:8}},ZZh("div",null,ZZh("h2",{className:"zz-h2"},`Live now \xB7 ${liveNow.length}`),ZZh("p",{className:"zz-sub"},"Today's trucks. Tap one for the full details."))),
        ZZh("div",{className:"zzb-live"},...liveNow.map(k=>liveCard(k,!1)))):null,
      ZZh("div",{key:"bar",className:"zz-bar"},
        ZZh("div",null,ZZh("h1",{className:"zz-h1"},wk===0?"This week":wk===1?"Next week":wk===-1?"Last week":"Week of "+ZZb_lbl(mon,{month:"short",day:"numeric"})),ZZh("p",{className:"zz-sub"},`${range} \xB7 tap a day to add a truck, tap a truck to see its loads`)),
        ZZh("div",{style:{display:"flex",gap:6,alignItems:"center"}},
          ZZh("button",{className:"zz-icon","aria-label":"Previous week",onClick:()=>setWk(wk-1)},ZZh(jd,{size:18})),
          wk!==0?btn("Today",()=>setWk(0),"ghost sm"):null,
          ZZh("button",{className:"zz-icon","aria-label":"Next week",onClick:()=>setWk(wk+1)},ZZh(qa,{size:18})),
          btn("Schedule a truck",()=>newForm(days.find(d=>d>=todayYmd)||todayYmd),"",wa))),
      ZZh("div",{key:"wk",className:"zz-week"},...days.map(d=>{
        let isPast=d<todayYmd,isToday=d===todayYmd,
          ev=M.filter(k=>ZZwhen(k)&&ZZdockParts(ZZwhen(k)).ymd===d).sort((k,_)=>ZZb_ms(ZZwhen(k))-ZZb_ms(ZZwhen(_)));
        return ZZh("div",{key:d,className:"zz-day"+(isToday?" today":"")+(isPast?" past":"")},
          ZZh("div",{className:"zz-dh"},ZZh("b",null,isToday?"Today":ZZb_lbl(d,{weekday:"short"})),ZZh("span",null,ZZb_lbl(d,{month:"short",day:"numeric"}))),
          ZZh("div",{className:"zz-db"},
            ...ev.map(k=>{let st=stOf(k),pl=ZZplt(k,e.shipments);
              return ZZh("button",{key:k.id,type:"button",className:"zz-ev"+(k.stage==="cancelled"?" cx":""),onClick:()=>setSel(k.id)},
                ZZh("div",{className:"t"},ZZb_hm(ZZwhen(k))),
                ZZh("div",{className:"n"},`${dirName(k)} \xB7 ${pltTxt(k,pl)}`),
                ZZh("div",{className:"s"},ZZh("i",{className:"zz-dot "+st.tone}),ZZh("span",null,`${truckName(k)} \xB7 ${st.txt}`)))}),
            !ev.length&&isPast?ZZh("div",{className:"zz-empty"},"No trucks"):null,
            !isPast?ZZh("button",{type:"button",className:"zz-add",onClick:()=>newForm(d)},"+ Add truck"):null))})),
      ZZh("div",{key:"two",className:"zz-2"},
        ZZh("section",{className:"zz-panel"},
          ZZh("div",{className:"zz-bar",style:{marginBottom:6}},ZZh("div",null,ZZh("h2",{className:"zz-h2"},"In our warehouse"),ZZh("p",{className:"zz-sub"},`${pallets} pallets · ${ZZlb(floor.reduce((s2,k)=>s2+ZZwt(k),0))} in ${floor.length} load${floor.length===1?"":"s"}`)),ZZh("button",{className:"zz-link",onClick:()=>go("floor")},"Inventory")),
          floor.length?ZZh("div",{className:"zz-list"},...floor.slice(0,5).map(k=>ZZh("button",{key:k.id,type:"button",className:"zz-row",onClick:()=>n(k)},
            ZZh("div",{className:"m"},ZZh("b",null,`Load ${k.ref}`),ZZh("span",null,`${ZZlane[be(k)]} \xB7 ${freeNote(k)}`)),ZZh("div",{className:"r"},ZZh("b",null,fe(k))," plt")))):ZZh("div",{className:"zz-empty",style:{padding:0}},"Nothing on our floor right now."),
          free.length?ZZh("div",{style:{marginTop:10}},btn("Book a pickup",()=>newForm(null,"pick"),"ghost sm",Sa)):null),
        ZZh("section",{className:"zz-panel"},
          ZZh("div",{className:"zz-bar",style:{marginBottom:6}},ZZh("div",null,ZZh("h2",{className:"zz-h2"},"Coming in"),ZZh("p",{className:"zz-sub"},`${booked.length} booked truck${booked.length===1?"":"s"} \xB7 ${comingPlt} pallets coming in`)),ZZh("button",{className:"zz-link",onClick:()=>go("trucks")},"All trucks")),
          booked.length?ZZh("div",{className:"zz-list"},...booked.slice(0,5).map(truckRow)):ZZh("div",{className:"zz-empty",style:{padding:0}},"Nothing booked. Tap a day above to add a truck."))),
      /* this week so far (Monday 00:00 dock time to now); the same numbers go in the Friday summary */
      ZZh("section",{key:"ws",className:"zz-panel",style:{marginTop:16},"data-zzb":"week"},
        ZZh("div",{className:"zz-bar",style:{marginBottom:10}},ZZh("div",null,ZZh("h2",{className:"zz-h2"},"This week so far"),
          ZZh("p",{className:"zz-sub"},`Since Monday \xB7 ${A?.fridaySummary===!1?"Friday summary email is off (turn it on in Alerts & settings).":"We'll email this summary on Friday."}`))),
        ZZh("div",{className:"zzb-stats"},
          ZZh("div",{className:"zz-stat"},ZZh("span",null,"Trucks"),ZZh("b",null,wkS.trucks),ZZh("em",null,`${wkS.done} done`)),
          ZZh("div",{className:"zz-stat"},ZZh("span",null,"Pallets in / out"),ZZh("b",null,`${wkS.palletsIn} / ${wkS.palletsOut}`),ZZh("em",null,"received / shipped")),
          ZZh("div",{className:"zz-stat"},ZZh("span",null,"Average wait"),ZZh("b",{style:{color:wkS.avgWaitMin==null?m.text:ZZtoneColor(ZZtone(wkS.avgWaitMin*6e4,e))}},wkS.avgWaitMin==null?"—":`${wkS.avgWaitMin} min`),ZZh("em",null,`for a door \xB7 goal ${goal} min`)),
          ZZh("div",{className:"zz-stat"},ZZh("span",null,"Promise kept"),ZZh("b",null,wkS.promiseKeptPct==null?"—":`${wkS.promiseKeptPct}%`),ZZh("em",null,ZZS(e).promiseText)),
          ZZh("div",{className:"zz-stat"},ZZh("span",null,"Damage reports"),ZZh("b",null,wkS.damageReports),ZZh("em",null,`${wkS.damageApproved} approved`)),
          ZZh("div",{className:"zz-stat"},ZZh("span",null,"Our gear with you"),ZZh("b",null,gearN),ZZh("em",null,gearN?"pieces of securement gear":"none out"))))];
  };

  /* ---------- TRUCKS ---------- */
  let trucks=()=>[
    ZZh("div",{key:"b",className:"zz-bar"},ZZh("div",null,ZZh("h1",{className:"zz-h1"},"Trucks"),ZZh("p",{className:"zz-sub"},"Live status of every truck we're handling for you.")),btn("Schedule a truck",()=>newForm(),"",wa)),
    ZZh("section",{key:"d",className:"zz-panel",style:{marginBottom:16}},ZZh("h2",{className:"zz-h2"},`At our dock now \xB7 ${atDock.length}`),ZZh("p",{className:"zz-sub",style:{marginBottom:8}},"Unloading, loading or waiting for a door. Tap one for the full details."),
      atDock.length?ZZh("div",{className:"zzb-live",style:{marginBottom:0}},...atDock.map(k=>liveCard(k,!1))):ZZh("div",{className:"zz-empty",style:{padding:0}},"No trucks at our dock right now.")),
    ZZh("section",{key:"u",className:"zz-panel",style:{marginBottom:16}},ZZh("h2",{className:"zz-h2"},`Booked \xB7 ${booked.length}`),ZZh("p",{className:"zz-sub",style:{marginBottom:6}},"Scheduled and on the way."),
      booked.length?ZZh("div",{className:"zz-list"},...booked.map(truckRow)):ZZh("div",{className:"zz-empty",style:{padding:0}},"Nothing booked.")),
    pastT.length?ZZh("section",{key:"p",className:"zz-panel"},ZZh("button",{className:"zz-link",style:{color:m.text},onClick:()=>setPast(!past)},ZZh("span",{className:"zz-h2"},`${past?"▾":"▸"} Past trucks \xB7 ${pastT.length}`)),
      past?ZZh("div",{className:"zz-list",style:{marginTop:6}},...pastT.map(truckRow)):null):null];

  /* ---------- INVENTORY ---------- */
  let floorTab=()=>{let f=k=>!q||[k.ref,k.po,k.bol,k.commodity].some(v=>(v||"").toLowerCase().includes(q.toLowerCase())),
    tbl=(list,cols,foot)=>ZZh("div",null,ZZh("div",{className:"zz-tblw zz-wide"},ZZh("table",{className:"zz-tbl"},
      ZZh("thead",null,ZZh("tr",null,...cols.map(c=>ZZh("th",{key:c[0],className:c[2]||""},c[0])))),
      ZZh("tbody",null,...list.map(k=>ZZh("tr",{key:k.id,className:"click",onClick:()=>n(k)},...cols.map(c=>ZZh("td",{key:c[0],className:c[2]||""},c[1](k)))))),
      foot?ZZh("tfoot",null,ZZh("tr",null,...cols.map((c,ix)=>ZZh("td",{key:c[0],className:c[2]||""},foot[ix]??"")))):null)),
      ZZh("div",{className:"zz-list zz-narrow"},...list.map(k=>ZZh("button",{key:k.id,type:"button",className:"zz-row",onClick:()=>n(k)},
        ZZh("div",{className:"m"},ZZh("b",null,`Load ${k.ref}`),...cols.slice(3).filter(c=>c[1](k)!=="—").map(c=>ZZh("span",{key:c[0]},`${c[0]}: `,c[1](k)))),ZZh("div",{className:"r"},ZZh("b",null,`${fe(k)} plt`),ZZh("div",{className:"zz-sub",style:{margin:0}},ZZwt(k)?ZZlb(ZZwt(k)):"")))),
        foot?ZZh("div",{className:"zz-total",style:{marginTop:6}},ZZh("span",null,foot[0]),ZZh("span",null,`${foot[1]} plt \xB7 ${foot[2]}`)):null));
    let sum=L=>[`${L.length} load${L.length===1?"":"s"}`,L.reduce((a2,k)=>a2+fe(k),0),ZZlb(L.reduce((a2,k)=>a2+ZZwt(k),0))],
      fCols=[["Load",k=>ZZh("b",null,k.ref)],["Pallets",k=>fe(k),"num"],["Weight",k=>ZZwt(k)?ZZlb(ZZwt(k)):"—","num"],["Type",ZZkinds],["Spot",k=>k.row||"—"],["In since",k=>ge(k.receivedAt)],["Free time",k=>freeNote(k)],["Pickup",k=>k.trailerOutId?"Booked":"—"]],
      pick=floor.filter(k=>ZZgroup(k)==="pick"),del=floor.filter(k=>ZZgroup(k)==="del"),
      pickFree=pick.filter(k=>!k.trailerOutId),
      lbFloor=floor.reduce((a2,k)=>a2+ZZwt(k),0),lbComing=coming.reduce((a2,k)=>a2+ZZwt(k),0),
      gOut=ZZgearOut(e,o),gTot=gOut.plywood+gOut.bars+gOut.straps+gOut.airbags,gp=ZZS(e).gearPlan,
      gLed=(e.zzGear||[]).filter(g2=>g2&&g2.customerId===o).sort((u,v)=>(ZZb_ms(v.at)||0)-(ZZb_ms(u.at)||0)).slice(0,10),
      gName=k2=>(ZZGEAR.find(g2=>g2.k===k2)||{}).label||k2,
      gearPanel=ZZh("section",{key:"gear",className:"zz-panel","data-zzb":"gear"},
        ZZh("h2",{className:"zz-h2"},"Our gear with you"),ZZh("p",{className:"zz-sub",style:{marginBottom:10}},"Securement gear our crew put on your trucks that has not come back yet."),
        ZZh("div",{className:"zzb-g4"},...ZZGEAR.map(g2=>ZZh("div",{key:g2.k},ZZh("span",null,g2.label),ZZh("b",null,gOut[g2.k])))),
        gOut.tags.length?ZZh("div",{style:{marginTop:10}},ZZh("div",{className:"zz-sub",style:{margin:"0 0 6px",fontWeight:700}},"Tag numbers on our gear"),ZZh("div",{className:"zzb-chips"},...gOut.tags.map(tg=>ZZh("span",{key:tg,className:"zzb-tag"},tg)))):null,
        !gTot&&!gLed.length?ZZh("p",{className:"zz-sub",style:{marginTop:10}},"None of our gear is out with you."):null,
        gLed.length?ZZh("div",{style:{marginTop:10}},ZZh("div",{className:"zz-sub",style:{margin:"0 0 2px",fontWeight:700}},"Last moves"),
          ZZh("div",{className:"zz-list"},...gLed.map(g2=>{let tr=e.trailers.find(z2=>z2.id===g2.trailerId);return ZZh("div",{key:g2.id,className:"zz-row",style:{padding:"8px 2px"}},
            ZZh("div",{className:"m"},ZZh("b",null,`${g2.dir==="back"?"Back to us":"Out with you"}: ${g2.qty} ${gName(g2.type).toLowerCase()}`),ZZh("span",null,[Dt(g2.at),tr?.truck?"truck "+tr.truck:"",(g2.tags||[]).length?"tags "+g2.tags.join(", "):"",g2.note||""].filter(Boolean).join(" \xB7 "))))}))):null),
      planCard=ZZh("section",{key:"plan",className:"zz-panel",style:{borderColor:m.orange},"data-zzb":"plan"},
        ZZh("div",{className:"zz-bar",style:{marginBottom:6}},ZZh("h2",{className:"zz-h2"},"Securement plan"),ZZpill("New",m.orange)),
        ZZh("p",{style:{margin:"0 0 10px",fontSize:15}},"Our gear on every load for ",ZZh("b",null,`${Fe(gp.price)} per ${gp.months} months`),". Plywood, load bars, straps and airbags, put in by our crew, photographed and signed off on every truck."),
        A?.securementInterest||planAsk?ZZh("div",{className:"zz-flash",style:{margin:0}},ZZh(Ze,{size:18}),`Thanks! You told us you're interested (${Dt(A?.securementInterest||Date.now())}). We'll call you.`)
          :btn("I'm interested",()=>{if(planRef.current)return;planRef.current=!0;setPlanAsk(!0);let nm=who.trim()||A?.name||"Customer";a.zzCustomer(o,{securementInterest:ye(Date.now()),securementInterestBy:nm});
            a.sendAccountChat(o,"dispatcher",`Interested in the securement plan (${Fe(gp.price)} per ${gp.months} months). Please call me. (${nm})`)},"",Ze)),
      group=(key,title,sub,L)=>ZZh("section",{key,className:"zz-panel",style:{marginBottom:16}},
        ZZh("div",{className:"zz-bar",style:{marginBottom:6}},ZZh("div",null,ZZh("h2",{className:"zz-h2"},title),ZZh("p",{className:"zz-sub"},sub))),
        L.filter(f).length?tbl(L.filter(f),fCols,sum(L.filter(f))):ZZh("div",{className:"zz-empty",style:{padding:0}},q?"No match.":"Nothing here right now."));
    return[
      ZZh("div",{key:"b",className:"zz-bar"},ZZh("div",null,ZZh("h1",{className:"zz-h1"},"Inventory"),ZZh("p",{className:"zz-sub"},"Everything of yours in our warehouse, and what's on the way.")),
        ZZh("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},ZZh("input",{className:"zz-inp",style:{width:220},value:q,placeholder:"Search load, PO, BOL",onChange:v=>setQ(v.target.value)}),free.length?btn("Book a pickup",()=>newForm(null,"pick"),"",Sa):null)),
      ZZh("div",{key:"st",className:"zz-stats"},
        ZZh("div",{className:"zz-stat"},ZZh("span",null,"Pallets on our floor"),ZZh("b",null,pallets),ZZh("em",null,`${floor.length} load${floor.length===1?"":"s"}`)),
        ZZh("div",{className:"zz-stat"},ZZh("span",null,"Weight on our floor"),ZZh("b",null,Math.round(lbFloor).toLocaleString()),ZZh("em",null,"pounds")),
        ZZh("div",{className:"zz-stat"},ZZh("span",null,"For pickup"),ZZh("b",null,pick.reduce((a2,k)=>a2+fe(k),0)),ZZh("em",null,`pallets \xB7 ${ZZlb(pick.reduce((a2,k)=>a2+ZZwt(k),0))}`)),
        ZZh("div",{className:"zz-stat"},ZZh("span",null,"For delivery"),ZZh("b",null,del.reduce((a2,k)=>a2+fe(k),0)),ZZh("em",null,`pallets \xB7 ${ZZlb(del.reduce((a2,k)=>a2+ZZwt(k),0))}`))),
      pickFree.length?ZZh("section",{key:"fit",className:"zz-panel",style:{marginBottom:16}},
        ZZh("h2",{className:"zz-h2"},"Trailer space for your pickup freight"),ZZh("p",{className:"zz-sub",style:{marginBottom:10}},`${pickFree.length} load${pickFree.length===1?"":"s"} waiting for pickup and not on a truck yet.`),
        ZZfit(pickFree.reduce((a2,k)=>a2+fe(k),0),pickFree.reduce((a2,k)=>a2+ZZwt(k),0))):null,
      group("pk","For pickup","Reloads and storage. Waiting for your truck.",pick),
      group("dl","For delivery","Stays in Reno for local delivery.",del),
      coming.filter(f).length?ZZh("section",{key:"c",className:"zz-panel",style:{marginBottom:16}},ZZh("h2",{className:"zz-h2"},"On trucks coming to us"),ZZh("p",{className:"zz-sub",style:{marginBottom:6}},`${comingPlt} pallets${lbComing?" \xB7 "+ZZlb(lbComing):""}`),
        tbl(coming.filter(f),[["Load",k=>ZZh("b",null,k.ref)],["Pallets",k=>fe(k),"num"],["Weight",k=>ZZwt(k)?ZZlb(ZZwt(k)):"—","num"],["Truck",k=>{let tr=e.trailers.find(x=>x.id===k.trailerInId);return tr?`${truckName(tr)} \xB7 ${dt2(tr.scheduledAt)}`:"—"}],["Goes to",k=>ZZlane[be(k)]]],sum(coming.filter(f)))):null,
      ZZh("div",{key:"gp",className:"zz-2",style:{margin:"0 0 16px"}},gearPanel,planCard),
      ZZh("section",{key:"s",className:"zz-panel"},ZZh("button",{className:"zz-link",style:{color:m.text},onClick:()=>setShipped(!shipped)},ZZh("span",{className:"zz-h2"},`${shipped?"▾":"▸"} Shipped \xB7 ${done.length}`)),
        shipped?(done.filter(f).length?ZZh("div",{style:{marginTop:8}},tbl(done.filter(f).slice(0,40),[["Load",k=>ZZh("b",null,k.ref)],["Pallets",k=>fe(k),"num"],["Weight",k=>ZZwt(k)?ZZlb(ZZwt(k)):"—","num"],["Shipped",k=>ge(k.shippedAt)],["Charges",k=>je(ur(k,y,t)),"num"]])):ZZh("div",{className:"zz-empty"},"Nothing shipped yet.")):null)];
  };

  /* ---------- REQUESTS ---------- */
  let reqTitle=r=>r.type==="info"?`${(r.want||[]).join(", ")} for ${r.loads.map(id=>"#"+(e.shipments.find(s2=>s2.id===id)?.ref||"?")).join(", ")}`:r.type==="delivery"?`Delivery to ${r.address||"—"}`:r.type==="trailer"?`Trailer to ${r.address||"—"}`:(r.note||"Request").slice(0,60),
    reqWhen=r=>r.date?`${new Date(r.date+"T12:00").toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})}${r.time?" \xB7 "+r.time:""}`:"",
    reqCard=r=>{let st=ZZreqSt[r.status]||ZZreqSt.new,open=["new","available"].includes(r.status);
      return ZZh("section",{key:r.id,className:"zz-panel",style:{marginBottom:12,borderColor:r.status==="available"?m.orange:m.line}},
        ZZh("div",{className:"zz-bar",style:{marginBottom:4,alignItems:"flex-start"}},
          ZZh("div",{style:{minWidth:0}},ZZh("div",{className:"zz-sub",style:{margin:0,fontWeight:700}},`${r.num} \xB7 ${ZZREQ[r.type].t}`),ZZh("h2",{className:"zz-h2"},reqTitle(r))),ZZpill(st[0],st[1])),
        ZZh("p",{className:"zz-sub",style:{margin:"2px 0 8px"}},[reqWhen(r),r.type==="delivery"?"$300":"",r.liftgate?"Liftgate":"",r.repeat?"Repeats weekly":"",`Sent ${ge(r.createdAt)}${r.by?" by "+r.by:""}`].filter(Boolean).join(" \xB7 ")),
        r.type==="delivery"&&r.loads.length?ZZh("p",{style:{margin:"0 0 8px",fontSize:14.5}},"Loads: "+r.loads.map(id=>{let s2=e.shipments.find(z2=>z2.id===id);return s2?`#${s2.ref} (${fe(s2)} plt)`:"?"}).join(", ")):null,
        r.note&&r.type!=="other"?ZZh("p",{style:{margin:"0 0 8px",fontSize:14.5}},r.note):null,
        r.reply?ZZh("p",{style:{margin:"0 0 8px",fontSize:14.5,color:m.blue}},`Our answer: ${r.reply}`):null,
        ZZh("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
          r.status==="available"?btn(r.type==="delivery"?"Confirm delivery, $300":"Confirm",()=>{a.zzReqPatch(r.id,{status:"confirmed",confirmedAt:ye(Date.now())});a.sendAccountChat(o,"dispatcher",`CONFIRMED request ${r.num}: ${reqTitle(r)} ${reqWhen(r)}. (${who||A?.name||"Customer"})`)},"ok sm",Ze):null,
          btn("Same again",()=>newReq(r.type,{...r,date:r.date?ZZiso(new Date(new Date(r.date+"T12:00").getTime()+7*864e5)):""}),"ghost sm",qd),
          open?(rqx===r.id?ZZh("span",{style:{display:"inline-flex",gap:8,alignItems:"center"}},ZZh("b",{style:{color:m.red}},"Cancel it?"),btn("Yes",()=>{a.zzReqPatch(r.id,{status:"cancelled"});a.sendAccountChat(o,"dispatcher",`Cancelled request ${r.num}.`);setRqx(null)},"danger sm"),btn("No",()=>setRqx(null),"ghost sm"))
            :btn("Cancel",()=>setRqx(r.id),"ghost sm",dn)):null))},
    requests=()=>{let open=REQ.filter(r=>["new","available","unavailable","confirmed"].includes(r.status)).sort((u,v)=>(v.status==="available")-(u.status==="available")),old=REQ.filter(r=>!open.includes(r));
      return[
        flash&&tab==="requests"?ZZh("div",{key:"fl",className:"zz-flash"},ZZh(Ze,{size:18}),flash):null,
        ZZh("div",{key:"h",className:"zz-bar"},ZZh("div",null,ZZh("h1",{className:"zz-h1"},"Requests"),ZZh("p",{className:"zz-sub"},"Ask for photos, a delivery, a trailer, or anything else. We answer here and in Messages.")),btn("New request",()=>newReq(),"",wa)),
        ZZh("div",{key:"q",className:"zz-opts",style:{marginBottom:16}},...Object.entries(ZZREQ).map(([k2,v2])=>ZZh("button",{key:k2,type:"button",className:"zz-opt",onClick:()=>newReq(k2)},ZZh("div",null,ZZh("b",null,v2.t),ZZh("span",null,v2.d))))),
        open.length?ZZh("h2",{key:"oh",className:"zz-h2",style:{margin:"0 0 10px"}},`Open \xB7 ${open.length}`):null,...open.map(reqCard),
        old.length?ZZh("h2",{key:"ph",className:"zz-h2",style:{margin:"18px 0 10px",color:m.mut}},"Past"):null,...old.slice(0,15).map(reqCard)]};

  /* ---------- DAMAGE ---------- */
  let dmgCard=({s,x})=>{
    let est=ZZestOf(s,x,y),ans=x.answer,need=ZZneeds(s,x,y),tr=e.trailers.find(k=>k.id===s.trailerInId),hasCost=est.total>0;
    return ZZh("section",{key:x.id,className:"zz-panel",style:{marginBottom:14,borderColor:need?m.orange:m.line},"data-zzb":"dmg-card"},
      ZZh("div",{className:"zz-bar",style:{marginBottom:8,alignItems:"flex-start"}},
        ZZh("div",null,ZZh("h2",{className:"zz-h2"},`${x.kind} on load ${s.ref}`),ZZh("p",{className:"zz-sub"},`Reported ${ge(x.at)}${x.openedBy?" by "+x.openedBy:""}${tr?.truck?" \xB7 truck "+tr.truck:""}`)),
        x.resolved?ZZpill("Closed",m.green):need?ZZpill(hasCost?"Needs your answer":"New",m.orange):ZZstatus(x)),
      /* crew photo reports carry pallets, kinds and what happened; older reports only a note */
      x.photoOwner||ie(x.pallets)||(x.kinds||[]).length?ZZh("div",{style:{display:"grid",gap:6,margin:"0 0 10px"}},
        ZZh("div",{style:{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}},ie(x.pallets)?ZZh("b",{style:{fontSize:15,marginRight:4}},ZZb_pl(ie(x.pallets),"pallet")+" hurt"):null,...(x.kinds||[]).map(kd=>ZZh("span",{key:kd},ZZpill(kd,m.amber)))),
        ZZh("p",{style:{margin:0,fontSize:15}},x.what||(x.photoOwner?"":x.note)||"No notes.")):ZZh("p",{style:{margin:"0 0 10px",fontSize:15}},x.note||"No notes."),
      x.photoOwner?ZZh(lr,{ownerId:x.photoOwner,size:84,label:"Damage photos",empty:ie(x.photoCount)?`${ZZb_pl(ie(x.photoCount),"photo")} taken by our crew. Don't see them here? Ask us in Messages and we'll send them.`:"No photos yet. Ask us in Messages."})
        :ZZh("div",{className:"zzb-ph"},ZZh(lr,{ownerId:dt.off(s.id),size:84,label:"Photos",empty:"No photos yet. Ask us in Messages."}),ZZh(lr,{ownerId:`pull:${s.id}`,size:84,label:"Loading photos"})),
      hasCost?ZZh("div",{style:{marginTop:12}},ZZh("b",null,"What it costs to fix"),ZZtable(est),ZZh("p",{className:"zz-sub",style:{marginTop:6}},"Approved charges go on your next bill for this load.")):ZZh("p",{className:"zz-sub",style:{marginTop:10}},"No extra charges on this one."),
      !x.resolved&&(!ans||ans.status==="call")&&hasCost&&ZZh("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}},
        btn(`Accept ${je(est.total)}`,()=>{setNote("");setOk(!1);setMod({type:"accept",s,x})},"ok",Ze),
        btn("Decline",()=>{setNote("");setWhy("");setMod({type:"decline",s,x})},"danger",dn),
        btn("Call or message us",()=>{setNote("");setMod({type:"call",s,x})},"ghost",un)),
      !x.resolved&&!hasCost&&!x.seenAt&&ZZh("div",{style:{marginTop:12}},btn("Got it",()=>a.ackException(s.id,x.id),"",Ze)),
      ans&&ZZh("p",{style:{marginTop:12,fontSize:14,color:ans.status==="accepted"?m.green:ans.status==="declined"?m.red:m.blue}},
        ans.status==="accepted"?(ans.auto?`Auto-approved by your setting on ${ge(ans.at)}. ${ans.by||""}`.trim():`Approved by ${ans.by} on ${ge(ans.at)}.`):ans.status==="declined"?`Declined by ${ans.by} on ${ge(ans.at)}${ans.note?": "+ans.note:""}. We'll call you to sort it out.`:`${ans.by} asked for a call on ${ge(ans.at)}. We'll reach out. Need us now? Call ${ZZPHONE}.`),
      ZZh("div",{style:{marginTop:10}},ZZh("button",{className:"zz-link",onClick:()=>n(s)},"See the full load")));
  };
  /* monthly damage history (replaces the old "Closed" list, which stopped at 10) */
  let dmgSt=(s,x)=>{let a2=x.answer;return a2&&a2.status==="accepted"?[a2.auto?"Auto-approved":"Approved",m.green]:a2&&a2.status==="declined"?["Declined",m.red]:a2&&a2.status==="call"?["Call asked",m.blue]:x.resolved?["Closed",m.green]:ZZestOf(s,x,y).total>0?["Needs your answer",m.orange]:["Open",m.amber]},
    moName=mo=>/^\d{4}-\d{2}$/.test(mo)?ZZb_lbl(mo+"-15",{month:"long",year:"numeric"}):"Date not known",
    damage=()=>{let months=ZZdmgMonths(e,o),curM=todayYmd.slice(0,7),cm=months.find(g2=>g2.month===curM)||{reports:0,pallets:0,approved:0,declined:0,open:0},
      otherClosed=probs.filter(p=>p.x.resolved&&p.x.kind!=="Damage");
      return[
      ZZh("div",{key:"h",className:"zz-bar"},ZZh("div",null,ZZh("h1",{className:"zz-h1"},"Damage"),ZZh("p",{className:"zz-sub"},"When we find damage you get photos and the cost to fix. Accept, decline, or talk to us first.")),
        btn(ZZautoLimit(A)!=null?`Auto-approve under ${Fe(ZZautoLimit(A))}`:"Auto-approve: off",openAlerts,"ghost sm",uu)),
      ZZh("section",{key:"tm",className:"zz-panel",style:{marginBottom:14},"data-zzb":"dmg-month"},ZZh("h2",{className:"zz-h2",style:{marginBottom:8}},`This month \xB7 ${moName(curM)}`),
        ZZh("div",{className:"zzb-g4"},ZZh("div",null,ZZh("span",null,"Reports"),ZZh("b",null,cm.reports)),ZZh("div",null,ZZh("span",null,"Pallets hurt"),ZZh("b",null,cm.pallets)),
          ZZh("div",null,ZZh("span",null,"Approved"),ZZh("b",null,cm.approved)),ZZh("div",null,ZZh("span",null,"Declined or open"),ZZh("b",null,cm.declined+cm.open)))),
      probs.length===0?ZZh("div",{key:"e",className:"zz-panel zz-empty"},"No damage or problems reported."):null,
      ...waiting.map(dmgCard),...openProbs.filter(p=>!waiting.includes(p)).map(dmgCard),
      months.length?ZZh("h2",{key:"mh",className:"zz-h2",style:{margin:"18px 0 4px"}},"Damage history by month"):null,
      months.length?ZZh("p",{key:"mp",className:"zz-sub",style:{marginBottom:10}},"Every damage report, newest first. We keep damage photos; some older photos may no longer be available."):null,
      ...months.map((g2,ix)=>ZZh("details",{key:"m"+g2.month,className:"zzb-mo",open:ix===0,"data-zzb":"month"},
        ZZh("summary",null,ZZh("b",null,moName(g2.month)),ZZh("span",null,[ZZb_pl(g2.reports,"report"),ZZb_pl(g2.pallets,"pallet")+" hurt",`${g2.approved} approved`,g2.declined?`${g2.declined} declined`:"",g2.open?`${g2.open} open`:""].filter(Boolean).join(" \xB7 "))),
        ...g2.items.map(({s,x})=>{let sv=dmgSt(s,x),opn=hx===x.id,tot=ZZestOf(s,x,y).total;return ZZh(i.Fragment,{key:x.id},
          ZZh("button",{type:"button",className:"zzb-mr","aria-expanded":opn,onClick:()=>setHx(opn?null:x.id)},
            ZZh("div",{className:"m"},ZZh("b",null,`Load ${s.ref} \xB7 ${ge(x.at)}`),ZZh("span",null,[ie(x.pallets)?ZZb_pl(ie(x.pallets),"pallet"):"",(x.kinds||[]).join(", ")||x.note||"",tot>0?je(tot):""].filter(Boolean).join(" \xB7 "))),
            ZZpill(sv[0],sv[1])),
          opn?ZZh("div",{style:{padding:"0 10px 4px"}},dmgCard({s,x})):null)}))),
      otherClosed.length?ZZh("h2",{key:"oc",className:"zz-h2",style:{margin:"18px 0 10px",color:m.mut}},"Other closed reports"):null,
      ...otherClosed.slice(0,10).map(dmgCard)]};

  /* ---------- BILLS ---------- */
  let bills=()=>[
    ZZh("div",{key:"h",className:"zz-bar"},ZZh("div",null,ZZh("h1",{className:"zz-h1"},"Bills"),ZZh("p",{className:"zz-sub"},`${Fe(openTotal)} not paid yet \xB7 ${Fe(unbilled)} in charges not billed yet`)),btn("Statement",()=>setStmt(!0),"ghost",Ct)),
    ZZh("section",{key:"i",className:"zz-panel",style:{marginBottom:16}},ZZh("h2",{className:"zz-h2",style:{marginBottom:6}},"Your bills"),
      inv.length?ZZh("div",{className:"zz-tblw"},ZZh("table",{className:"zz-tbl"},ZZh("thead",null,ZZh("tr",null,ZZh("th",null,"Bill"),ZZh("th",null,"Date"),ZZh("th",{className:"num"},"Loads"),ZZh("th",{className:"num"},"Total"),ZZh("th",null,"Status"))),
        ZZh("tbody",null,...[...inv].reverse().slice(0,20).map(k=>ZZh("tr",{key:k.id},ZZh("td",null,ZZh("b",null,k.number)),ZZh("td",null,Dt(k.issuedAt)),ZZh("td",{className:"num"},k.shipmentIds.length),ZZh("td",{className:"num"},je(k.total)),ZZh("td",{style:{color:k.status==="paid"?m.green:m.amber,fontWeight:700}},k.status==="paid"?"Paid":"Not paid")))))):ZZh("div",{className:"zz-empty",style:{padding:0}},"No bills yet."),
      ZZh("p",{className:"zz-sub",style:{marginTop:10}},`Questions or ready to pay? Call ${ZZPHONE} or send us a message.`)),
    ZZh("section",{key:"u",className:"zz-panel",style:{marginBottom:16}},ZZh("h2",{className:"zz-h2"},"Charges so far, by load"),ZZh("p",{className:"zz-sub",style:{marginBottom:6}},"Not billed yet."),
      ...S.filter(k=>k.receivedAt&&!k.invoiceId).map(k=>ZZh("div",{key:k.id,style:{borderTop:`1px solid ${m.line}`,padding:"10px 0"}},
        ZZh("div",{style:{display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}},ZZh("button",{className:"zz-link",style:{color:m.text},onClick:()=>n(k)},`Load ${k.ref}`),ZZh(fs,{shipment:k,now:t}),ZZh("b",{style:{marginLeft:"auto"}},je(ur(k,y,t)))),
        ZZh(Fj,{shipment:k,rates:y,now:t}))),
      S.some(k=>k.receivedAt&&!k.invoiceId)?null:ZZh("div",{className:"zz-empty",style:{padding:0}},"Nothing waiting to be billed.")),
    ZZh("section",{key:"how",className:"zz-panel"},ZZh("details",null,ZZh("summary",{style:{cursor:"pointer",fontWeight:800,fontSize:16}},"How billing works"),
      ZZh("ul",{style:{margin:"10px 0 0",paddingLeft:20,fontSize:14.5,color:m.mut,lineHeight:1.7}},
        ZZh("li",null,`Cross-dock: ${je(y.std)} per standard pallet in, ${je(y.std)} out. Large ${je(y.lg)}, crate ${je(y.crate)}.`),
        ZZh("li",null,`Storage: ${je(y.storageIn)} per pallet to put away, ${je(y.storageOut)} to pick.`),
        ZZh("li",null,`First 24 hours on our floor are free. After that ${je(y.storageMonthly/4)} per pallet per week.`),
        ZZh("li",null,`Rewrap: ${je(y.rewrap)} per pallet. Labor: ${je(y.laborHour)} per hour per person, in half hours.`),
        ZZh("li",null,`After-hours: ${je(y.afterHours)} once per truck outside Mon–Fri 6am–10pm.`),
        ZZh("li",null,ZZautoLimit(A)!=null?`Damage charges are only added after you approve them, or right away when the fix costs under ${Fe(ZZautoLimit(A))} (your auto-approve setting). You always get the photos.`
          :"Damage charges are only added after you approve them. Auto-approve is off; you can set a limit in Alerts & settings.")))),
    stmt&&ZZh(Kj,{key:"k",customerId:o,doc:e,now:t,onClose:()=>setStmt(!1)})];

  /* ---------- MESSAGES ---------- */
  let chat=()=>[
    ZZh("div",{key:"h",className:"zz-bar"},ZZh("div",null,ZZh("h1",{className:"zz-h1"},"Messages"),ZZh("p",{className:"zz-sub"},`Talk to our Reno office. A real person answers, Mon–Fri 6am–10pm. Urgent? Call ${ZZPHONE}.`)),
      btn("Alerts & settings",openAlerts,"ghost sm",uu)),
    ZZh("section",{key:"c",className:"zz-panel"},ZZh("p",{className:"zz-sub",style:{marginBottom:10}},"Tip: type # and a load number (like #112045) and the message is saved on that load too."),
      ZZh(Uj,{customerId:o,doc:e,actions:a,as:"dispatcher",openShipment:n,onOpenTrailer:k=>setSel(k.id)}))];

  /* ---------- schedule-a-truck form ---------- */
  let formSheet=()=>{
    if(!form)return null;let f=form,setF=p=>setForm({...f,...p,err:""}),
      setL=(id,p)=>setF({loads:f.loads.map(l=>l.id===id?{...l,...p}:l)}),
      /* the day and time are dock time (Pacific); any minute of any day */
      iso=f.date&&/^\d{1,2}:\d{2}$/.test(f.time||"")?ZZzonedIso(f.date,f.time):null,dms=iso?ZZb_ms(iso):NaN,
      ah=!!iso&&vm(iso),
      used=f.loads.filter(l=>l.ref.trim()||String(l.pallets).trim()),
      totalIn=used.reduce((s2,l)=>s2+ie(l.pallets),0),lbIn=used.reduce((s2,l)=>s2+ie(l.weight),0),
      picked=free.filter(k=>f.pick.includes(k.id)),totalOut=picked.reduce((s2,k)=>s2+fe(k),0),
      needUrl=f.tracking==="samsara"||f.tracking==="gps",urlRaw=(f.trackUrl||"").trim(),urlBad=needUrl&&!!urlRaw&&!ZZsafeUrl(urlRaw),
      move=(ix,d)=>{let L=[...f.loads],j=ix+d;if(j<0||j>=L.length)return;[L[ix],L[j]]=[L[j],L[ix]];setF({loads:L})},
      submit=()=>{
        if(!iso||!isFinite(dms))return setForm({...f,err:"Pick a day and a time."});
        if(dms<t-60*6e4)return setForm({...f,err:"That time has already passed. Pick a later time."});
        if(f.kind==="drop"){if(!used.length)return setForm({...f,err:"Add at least one load with its pallet count."});if(used.some(l=>!(ie(l.pallets)>0)))return setForm({...f,err:"Every load needs a pallet count."})}
        else if(!picked.length)return setForm({...f,err:"Tick at least one load to pick up."});
        if(urlBad)return setForm({...f,err:"The live share link must start with https:// (copy it from Samsara or your GPS app)."});
        let inb=f.kind==="drop",id=f.id||Ce();
        a.addTrailer({id,bookedVia:"client",bookedBy:who.trim()||A?.name||"Customer",
          tracking:f.tracking||"link",trackUrl:needUrl?ZZsafeUrl(urlRaw):"",driverLang:f.lang||"en",loadOrder:inb&&!!f.order&&used.length>1,
          truck:f.truck.trim(),trailer:f.trailer.trim(),carrier:f.carrier.trim(),driver:f.driver.trim(),phone:f.phone.trim(),
          direction:inb?"inbound":"outbound",jobType:inb?(used.every(l=>l.lane==="other")?"Long-term storage":used.some(l=>l.lane==="sac")?"Consolidate & reload":"Cross-dock"):"Reno pickup",
          customerId:o,scheduledAt:iso,notes:[f.notes.trim(),b?"":"Requested by customer"].filter(Boolean).join(" \xB7 "),
          lines:inb?used.map(l=>({id:l.id,ref:l.ref.trim(),bol:l.bol.trim(),po:l.po.trim(),lane:l.lane,units:{std:ie(l.pallets),lg:0,crate:0},commodity:"",dest:(l.dest||"").trim(),deliverBy:l.deliverBy,loadNotes:l.notes.trim(),scans:[],
            weight:ie(l.weight),pieces:ie(l.pieces),stackable:l.stackable===!0||l.stackable===!1?l.stackable:null,hazmat:!!l.hazmat})):[],
          pickupIds:inb?[]:picked.map(k=>k.id)});
        setWk(ZZb_wkOff(f.date,todayYmd));setForm(null);setTab("schedule");try{history.replaceState(null,"","#schedule")}catch{}
        setFlash(`${inb?"Drop-off":"Pickup"} added for ${ZZb_when(iso)} (dock time) \xB7 ${inb?totalIn:totalOut} pallets.${b?"":" We'll confirm the time."}`);setCp("");setBk(id);window.scrollTo(0,0)};
    return ZZh(Gt,{open:!0,wide:!0,onClose:()=>setForm(null),title:"Schedule a truck"},
      ZZh("div",{className:"zz zz-f",style:{minHeight:0,background:"transparent"}},
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"When"),ZZh("div",{className:"hint"},"Any day, any time. Times are dock time (Pacific)."),
          ZZh("div",{className:"zz-g2"},fl("Day",ZZh("input",{type:"date",className:"zz-inp",value:f.date,min:todayYmd,onChange:v=>setF({date:v.target.value})})),
            fl("Time (dock time)",ZZh("input",{type:"time",step:60,className:"zz-inp",value:f.time,onChange:v=>setF({time:v.target.value})}))),
          ah?ZZh("div",{className:"hint",style:{color:m.amber,marginTop:0}},`Outside Mon–Fri 6am–10pm. A ${je(y.afterHours)} after-hours fee applies.`):null,
          busyPanel(f.date,f.time)),
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"What's the truck doing?"),
          ZZh("div",{className:"zz-opts"},
            ZZh("button",{type:"button",className:"zz-opt","aria-pressed":f.kind==="drop",onClick:()=>setF({kind:"drop"})},ZZh("i",{className:"rd"}),ZZh("div",null,ZZh("b",null,"Dropping off at your dock"),ZZh("span",null,"Inbound trailer with one or more loads"))),
            ZZh("button",{type:"button",className:"zz-opt","aria-pressed":f.kind==="pick",onClick:()=>setF({kind:"pick"}),disabled:!free.length},ZZh("i",{className:"rd"}),ZZh("div",null,ZZh("b",null,"Picking up from your dock"),ZZh("span",null,free.length?`${free.reduce((s2,k)=>s2+fe(k),0)} pallets on the floor ready`:"Nothing on the floor to pick up"))))),
        f.kind==="drop"?ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Loads on this trailer"),ZZh("div",{className:"hint"},"One row per load (BOL or PO). Add as many as the trailer carries."),
          f.loads.length>1?ZZh("label",{className:"zz-chk"},ZZh("input",{type:"checkbox",checked:!!f.order,onChange:()=>setF({order:!f.order})}),"Unload in this order"):null,
          f.loads.length>1&&f.order?ZZh("div",{className:"hint",style:{marginTop:-4}},"Load 1 comes off first. Use the arrows to change the order."):null,
          ...f.loads.map((l,ix)=>ZZh("div",{key:l.id,className:"zz-load"},
            fl(`Load ${ix+1}: number or PO`,ZZh("input",{className:"zz-inp",value:l.ref,placeholder:"e.g. 112045",onChange:v=>setL(l.id,{ref:v.target.value})})),
            fl("Pallets",ZZh("input",{className:"zz-inp",value:l.pallets,inputMode:"numeric",placeholder:"0",onChange:v=>setL(l.id,{pallets:v.target.value.replace(/\D/g,"").slice(0,4)})})),
            ZZh("label",{className:"zz-fl ln"},"After we unload it",ZZh("select",{className:"zz-inp",value:l.lane,onChange:v=>setL(l.id,{lane:v.target.value})},...Object.entries(ZZlane).map(([k2,v2])=>ZZh("option",{key:k2,value:k2},v2)))),
            ZZh("button",{type:"button",className:"zz-icon x","aria-label":`Remove load ${ix+1}`,disabled:f.loads.length===1,onClick:()=>setF({loads:f.loads.filter(z2=>z2.id!==l.id)})},ZZh(dn,{size:16})),
            ZZh("div",{className:"zzb-lx"},
              fl("Weight (lb)",ZZh("input",{className:"zz-inp",value:l.weight,inputMode:"numeric",placeholder:"e.g. 12000","aria-label":`Load ${ix+1} weight in pounds`,onChange:v=>setL(l.id,{weight:v.target.value.replace(/\D/g,"").slice(0,6)})})),
              fl("Pieces",ZZh("input",{className:"zz-inp",value:l.pieces,inputMode:"numeric",placeholder:"e.g. 40","aria-label":`Load ${ix+1} pieces`,onChange:v=>setL(l.id,{pieces:v.target.value.replace(/\D/g,"").slice(0,5)})})),
              ZZh("div",{className:"zz-fl"},"Stackable?",ZZh("div",{className:"zzb-seg",role:"group","aria-label":`Load ${ix+1} stackable`},
                ZZh("button",{type:"button","aria-pressed":l.stackable===!0,onClick:()=>setL(l.id,{stackable:l.stackable===!0?null:!0})},"Yes"),
                ZZh("button",{type:"button","aria-pressed":l.stackable===!1,onClick:()=>setL(l.id,{stackable:l.stackable===!1?null:!1})},"No"))),
              ZZh("label",{className:"zz-chk zzb-hz"},ZZh("input",{type:"checkbox",checked:!!l.hazmat,"aria-label":`Load ${ix+1} hazmat`,onChange:()=>setL(l.id,{hazmat:!l.hazmat})}),"Hazmat")),
            ZZh("div",{className:"zzb-mt",style:{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}},ZZh("button",{type:"button",className:"zz-link",style:{fontSize:13},onClick:()=>setL(l.id,{more:!l.more})},l.more?"Hide BOL, PO and notes":"Add BOL, PO, destination, deliver-by date or notes"),
              f.order&&f.loads.length>1?ZZh("span",{className:"zzb-ord"},ZZh("span",{className:"zzb-num"},`#${ix+1}`),
                ZZh("button",{type:"button",className:"zz-icon zzb-arw","aria-label":`Move load ${ix+1} up`,disabled:ix===0,onClick:()=>move(ix,-1)},ZZh(Bd,{size:16})),
                ZZh("button",{type:"button",className:"zz-icon zzb-arw","aria-label":`Move load ${ix+1} down`,disabled:ix===f.loads.length-1,onClick:()=>move(ix,1)},ZZh(_d,{size:16}))):null),
            l.more?ZZh("div",{className:"zz-more"},fl("BOL",ZZh("input",{className:"zz-inp",value:l.bol,onChange:v=>setL(l.id,{bol:v.target.value})})),fl("PO",ZZh("input",{className:"zz-inp",value:l.po,onChange:v=>setL(l.id,{po:v.target.value})})),fl("Deliver by",ZZh("input",{type:"date",className:"zz-inp",value:l.deliverBy,onChange:v=>setL(l.id,{deliverBy:v.target.value})})),
              ZZh("label",{className:"zz-fl",style:{gridColumn:"1/-1"}},"Destination",ZZh("input",{className:"zz-inp",value:l.dest||"",placeholder:"City or company, if you know it",onChange:v=>setL(l.id,{dest:v.target.value})})),
              ZZh("label",{className:"zz-fl",style:{gridColumn:"1/-1"}},"How it's loaded / notes",ZZh("input",{className:"zz-inp",value:l.notes,placeholder:"Double stacked, strapped, fragile…",onChange:v=>setL(l.id,{notes:v.target.value})}))):null)),
          ZZh("div",null,btn("+ Add another load",()=>setF({loads:[...f.loads,ZZb_row({lane:f.loads[f.loads.length-1]?.lane||"reno"})]}),"ghost sm")),
          ZZh("div",{className:"zz-total"},ZZh("span",null,`${used.length} load${used.length===1?"":"s"} on this trailer`),ZZh("span",null,`${totalIn} pallets${lbIn?" \xB7 "+ZZlb(lbIn):""}`)))
        :ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Which loads go on the truck?"),ZZh("div",{className:"hint"},"Tick each load to pick up."),
          ...free.map(k=>{let on=f.pick.includes(k.id);return ZZh("label",{key:k.id,className:"zz-pick",style:{borderColor:on?m.orange:m.line}},
            ZZh("input",{type:"checkbox",checked:on,onChange:()=>setF({pick:on?f.pick.filter(z2=>z2!==k.id):[...f.pick,k.id]})}),
            ZZh("div",{style:{flex:1,minWidth:0}},ZZh("b",null,`Load ${k.ref}`),ZZh("div",{className:"zz-sub",style:{margin:0}},`${$e(k)} \xB7 in since ${ge(k.receivedAt)} \xB7 ${freeNote(k)}`)),ZZh("b",{style:{fontVariantNumeric:"tabular-nums"}},`${fe(k)} plt`))}),
          ZZh("div",{className:"zz-total"},ZZh("span",null,`${picked.length} load${picked.length===1?"":"s"} selected`),ZZh("span",null,`${totalOut} pallets`)),picked.length?ZZfit(totalOut,picked.reduce((s2,k)=>s2+ZZwt(k),0)):null),
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Truck and driver"),ZZh("div",{className:"hint"},"Optional. Don't know yet? Add it later from the truck."),
          ZZh("div",{className:"zz-g2"},fl("Carrier",inp(f.carrier,v=>setF({carrier:v}),"Company hauling it")),fl("Driver phone",inp(f.phone,v=>setF({phone:v}),"775-555-0100",{type:"tel",inputMode:"tel"})),
            fl("Truck number",inp(f.truck,v=>setF({truck:v}),"e.g. 4521")),fl("Trailer number",inp(f.trailer,v=>setF({trailer:v}),"e.g. T880")),
            fl("Driver name",inp(f.driver,v=>setF({driver:v}),"First and last")),
            fl("Driver's language",ZZh("select",{className:"zz-inp",value:f.lang||"en",onChange:v=>setF({lang:v.target.value})},...ZZLANGS.map(l2=>ZZh("option",{key:l2.k,value:l2.k},l2.name))))),
          ZZh("div",{className:"hint"},"We use the driver's language at our check-in kiosk and on the driver's link.")),
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"How will we know when the truck is close?"),
          ZZh("div",{className:"zz-opts"},...ZZb_TRACK.map(o2=>ZZh("button",{key:o2.k,type:"button",className:"zz-opt","aria-pressed":(f.tracking||"link")===o2.k,onClick:()=>setF({tracking:o2.k})},ZZh("i",{className:"rd"}),ZZh("div",null,ZZh("b",null,o2.t),ZZh("span",null,o2.d))))),
          needUrl?fl(f.tracking==="samsara"?"Samsara live share link":"Live location link",ZZh("input",{className:"zz-inp",value:f.trackUrl||"",type:"url",inputMode:"url",placeholder:"https://…",onChange:v=>setF({trackUrl:v.target.value})})):null,
          needUrl?ZZh("div",{className:"hint",style:urlBad?{color:m.red,fontWeight:700}:void 0},urlBad?"That link must start with https://":"Starts with https://. No link yet? Add it later from the truck."):null,
          (f.tracking||"link")==="link"?ZZh("div",{className:"hint"},"After you book, you get the driver link to copy and send to your driver."):null),
        ZZh("div",{className:"zz-fs"},fl("Notes for the crew (optional)",ZZh("textarea",{className:"zz-inp",rows:2,value:f.notes,placeholder:"Liftgate, call ahead, load order…",onChange:v=>setF({notes:v.target.value})}))),
        f.err?ZZh("div",{className:"zz-err",role:"alert"},f.err):null,
        ZZh("div",{style:{display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap"}},btn("Cancel",()=>setForm(null),"ghost"),btn(b?"Add to schedule":"Send request",submit,"",Ze))));
  };

  /* ---------- booked: code, driver link, what happens next ---------- */
  let bookedSheet=()=>{
    if(!bk)return null;let k=e.trailers.find(z2=>z2.id===bk),close=()=>{setBk(null);setCp("")};
    if(!k)return ZZh(Gt,{open:!0,onClose:close,title:"Booking"},ZZh("div",{className:"zz zz-f",style:{minHeight:0,background:"transparent"}},ZZh("p",{className:"zz-sub"},"Saving your booking…")));
    let inb=k.direction==="inbound",ok=b||!!k.confirmedAt,code=ZZcode(k);
    return ZZh(Gt,{open:!0,onClose:close,title:`${ok?"Booked":"Request sent"}${k.truck?": Truck "+k.truck:""}`},
      ZZh("div",{className:"zz zz-f",style:{minHeight:0,background:"transparent"},"data-zzb":"booked"},
        ZZh("div",{style:{textAlign:"center",display:"grid",gap:6}},ZZh("div",{className:"zzb-check","aria-hidden":"true"},ZZh(Ze,{size:36})),
          ZZh("h2",{className:"zz-h1",style:{fontSize:26}},ok?"You're booked":"Request sent"),
          ZZh("div",{style:{fontSize:16}},"Booked for ",ZZh("b",null,ZZb_when(k.scheduledAt))," (dock time)"),
          ok?ZZh("div",{className:"zz-sub"},"It's on our schedule."):ZZh("div",null,ZZpill("Waiting for our OK",m.amber),ZZh("div",{className:"zz-sub",style:{marginTop:4}},"We'll confirm the time with you."))),
        ZZh("div",{className:"zzb-box",style:{textAlign:"center"}},ZZh("div",{className:"zz-sub",style:{margin:0,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",fontSize:12}},"Check-in code"),
          ZZh("div",{className:"zzb-code","data-zzb":"code"},code),
          ZZh("div",{className:"zz-sub",style:{margin:0}},"Your driver types this code at our check-in kiosk. It is not your portal PIN.")),
        ZZh("div",{className:"zzb-box"},ZZh("b",{style:{fontSize:16}},"Driver ETA link"),
          /* on the driver's own phone the page gives a ready text to send the dock (plan risk 6), so promise only that */
          ZZh("div",{className:"zz-sub",style:{margin:0}},"Text this link to your driver. They tap how far away they are and send us the update. The page also shows their check-in code and our phone number. No app needed."),
          linkBlock(k)),
        ZZh("div",{className:"zzb-box"},ZZh("b",{style:{fontSize:16}},"What happens next"),
          ZZh("ol",{className:"zzb-ol"},ZZh("li",null,"Your driver checks in at our kiosk with code ",ZZh("b",null,code),"."),
            ZZh("li",null,`We'll let you know when ${inb?"unloading":"loading"} starts (pick who hears from us in Alerts & settings).`),
            ZZh("li",null,inb?"You get the pallet count and photos when we're done.":"You get photos of the loaded, secured trailer when we're done."))),
        ZZh("div",{style:{display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap"}},btn("Done",close,"ghost"),btn("See this truck",()=>{close();setSel(k.id)},"",qa))));
  };

  /* ---------- request form ---------- */
  let reqSheet=()=>{
    if(!rq)return null;let f=rq,setF=p=>setRq({...f,...p,err:""}),ty=f.type,
      pool=ty==="delivery"?floor.filter(k=>!k.trailerOutId):[...floor,...coming],
      sel2=pool.filter(k=>f.loads.includes(k.id)),selPlt=sel2.reduce((a2,k)=>a2+fe(k),0),selLb=sel2.reduce((a2,k)=>a2+ZZwt(k),0),
      tog=(list,v)=>list.includes(v)?list.filter(z2=>z2!==v):[...list,v],
      submit=()=>{
        let err=ty==="info"?(!f.loads.length?"Pick at least one load.":!f.want.length?"Tick what you need.":"")
          :ty==="delivery"?(!f.loads.length?"Pick the loads to deliver.":!f.address.trim()?"Add the delivery address.":!f.date?"Pick a delivery day.":"")
          :ty==="trailer"?(!f.date?"Pick a day.":!f.address.trim()?"Add where the trailer is going.":"")
          :!f.note.trim()?"Tell us what you need.":"";
        if(!err&&!who.trim())err="Add your name.";
        if(err)return setRq({...f,err});
        try{localStorage.setItem("cd6:zzname",who.trim())}catch{}
        let r={id:Ce(),num:`R-${1001+(e.zzRequests||[]).length}`,customerId:o,type:ty,status:"new",createdAt:ye(Date.now()),by:who.trim(),
          loads:f.loads,want:ty==="info"?f.want:[],note:f.note.trim(),address:f.address.trim(),date:f.date,time:f.time,liftgate:ty==="delivery"&&f.liftgate,
          contact:f.contact.trim(),phone:f.phone.trim(),back:ty==="trailer"?f.back:"",repeat:(ty==="delivery"||ty==="trailer")&&f.repeat};
        a.zzReq(r);
        a.sendAccountChat(o,"dispatcher",`REQUEST ${r.num} (${ZZREQ[ty].t}): ${reqTitle(r)}${ty==="delivery"?" \xB7 loads "+sel2.map(k=>"#"+k.ref).join(" "):""}${r.date?" \xB7 "+reqWhen(r):""}${r.liftgate?" \xB7 liftgate":""}${r.back?" \xB7 back "+r.back:""}${r.repeat?" \xB7 every week":""}${r.note&&ty!=="other"?" \xB7 "+r.note:ty==="other"?"":""} (${r.by})`);
        setRq(null);setTab("requests");try{history.replaceState(null,"","#requests")}catch{}
        setFlash(`Request ${r.num} sent. ${ty==="delivery"||ty==="trailer"?"We'll check availability and answer here.":"We'll answer here and in Messages."}`);window.scrollTo(0,0)},
      loadPick=()=>ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},ty==="delivery"?"Which loads go out?":"Which load?"),
        pool.length?null:ZZh("div",{className:"zz-empty",style:{padding:0}},ty==="delivery"?"Nothing on our floor to deliver.":"No loads yet."),
        ...pool.map(k=>{let on=f.loads.includes(k.id);return ZZh("label",{key:k.id,className:"zz-pick",style:{borderColor:on?m.orange:m.line}},
          ZZh("input",{type:"checkbox",checked:on,onChange:()=>setF({loads:tog(f.loads,k.id)})}),
          ZZh("div",{style:{flex:1,minWidth:0}},ZZh("b",null,`Load ${k.ref}`),ZZh("div",{className:"zz-sub",style:{margin:0}},k.receivedAt?`On our floor \xB7 ${ZZlane[be(k)]}`:"Coming in")),
          ZZh("b",{style:{fontVariantNumeric:"tabular-nums",textAlign:"right"}},`${fe(k)} plt`,ZZwt(k)?ZZh("div",{className:"zz-sub",style:{margin:0,fontWeight:500}},ZZlb(ZZwt(k))):null))}),
        f.loads.length?ZZh("div",{className:"zz-total"},ZZh("span",null,`${sel2.length} load${sel2.length===1?"":"s"}`),ZZh("span",null,`${selPlt} plt${selLb?" \xB7 "+ZZlb(selLb):""}`)):null),
      when=lbl=>ZZh("div",{className:"zz-g2"},fl(lbl,ZZh("input",{type:"date",className:"zz-inp",value:f.date,min:ZZiso(new Date(t)),onChange:v=>setF({date:v.target.value})})),
        fl("Time",ZZh("select",{className:"zz-inp",value:f.time,onChange:v=>setF({time:v.target.value})},...["Any time","Morning (6–10am)","Midday (10am–2pm)","Afternoon (2–6pm)","Evening (6–10pm)","Overnight"].map(v2=>ZZh("option",{key:v2,value:v2},v2))))),
      box=txt=>ZZh("div",{className:"zz-flash",style:{margin:0}},ZZh(Ze,{size:18}),txt);
    return ZZh(Gt,{open:!0,wide:!0,onClose:()=>setRq(null),title:ty?ZZREQ[ty].t:"New request"},
      ZZh("div",{className:"zz zz-f",style:{minHeight:0,background:"transparent"}},
        !ty?ZZh("div",{className:"zz-opts"},...Object.entries(ZZREQ).map(([k2,v2])=>ZZh("button",{key:k2,type:"button",className:"zz-opt",onClick:()=>setF({type:k2})},ZZh("div",null,ZZh("b",null,v2.t),ZZh("span",null,v2.d))))):null,
        ty==="info"?loadPick():null,
        ty==="info"?ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"What do you need?"),ZZh("div",{style:{display:"flex",gap:16,flexWrap:"wrap"}},...["Photos","Dimensions","Weight"].map(w3=>ZZh("label",{key:w3,className:"zz-chk"},ZZh("input",{type:"checkbox",checked:f.want.includes(w3),onChange:()=>setF({want:tog(f.want,w3)})}),w3)))):null,
        ty==="delivery"?box("$300 per delivery. We check availability first. Nothing is booked until we say it's open and you confirm."):null,
        ty==="delivery"?loadPick():null,
        ty==="delivery"?ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Where and when"),fl("Delivery address",inp(f.address,v=>setF({address:v}),"Street, city")),when("Delivery day"),
          ZZh("label",{className:"zz-chk"},ZZh("input",{type:"checkbox",checked:f.liftgate,onChange:()=>setF({liftgate:!f.liftgate})}),"Needs a liftgate (no dock there)"),
          ZZh("div",{className:"zz-g2"},fl("Contact at delivery",inp(f.contact,v=>setF({contact:v}),"Name")),fl("Their phone",inp(f.phone,v=>setF({phone:v}),"775-555-0100",{type:"tel",inputMode:"tel"})))):null,
        ty==="trailer"?box("One drop = the trailer goes out and comes back, usually in under 2 hours. We check availability and confirm the price before it's booked."):null,
        ty==="trailer"?ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Where and when"),fl("Where is the trailer going?",inp(f.address,v=>setF({address:v}),"Address or company")),when("Day"),
          fl("Back to us in about",ZZh("select",{className:"zz-inp",value:f.back,onChange:v=>setF({back:v.target.value})},...["Under 2 hours","2 to 4 hours","Same day","Overnight"].map(v2=>ZZh("option",{key:v2,value:v2},v2))))):null,
        (ty==="delivery"||ty==="trailer")?ZZh("label",{className:"zz-chk"},ZZh("input",{type:"checkbox",checked:f.repeat,onChange:()=>setF({repeat:!f.repeat})}),"Same time every week"):null,
        ty?fl(ty==="other"?"What do you need?":"Notes (optional)",ZZh("textarea",{className:"zz-inp",rows:ty==="other"?4:2,value:f.note,placeholder:ty==="other"?"Rewrap 4 pallets on #112045, sort by PO, relabel…":"Anything we should know",onChange:v=>setF({note:v.target.value})})):null,
        ty?fl("Your name",ZZh("input",{className:"zz-inp",value:who,placeholder:"First and last name",onChange:v=>setWho(v.target.value)})):null,
        f.err?ZZh("div",{className:"zz-err",role:"alert"},f.err):null,
        ty?ZZh("div",{style:{display:"flex",gap:8,justifyContent:"space-between",flexWrap:"wrap"}},btn("Back",()=>setF({type:""}),"ghost"),btn(ty==="delivery"||ty==="trailer"?"Check availability":"Send request",submit,"",Ze)):null));
  };

  /* ---------- call the dock ---------- */
  let callSheet=()=>{if(!call)return null;let ld=ZZlead(e,t);
    return ZZh(Gt,{open:!0,onClose:()=>setCall(!1),title:"Call the dock"},
      ZZh("div",{className:"zz zz-f",style:{minHeight:0,background:"transparent",textAlign:"center"}},
        ZZh("div",null,ZZh("div",{className:"zz-sub"},ld.role),ZZh("div",{style:{fontSize:20,fontWeight:800}},ld.name)),
        ZZh("div",{style:{fontSize:30,fontWeight:800,userSelect:"all",fontVariantNumeric:"tabular-nums"}},ld.phone),
        ZZh("div",null,ZZh("a",{href:"tel:+1"+ld.phone.replace(/\D/g,"").slice(-10),className:"zz-btn",style:{textDecoration:"none"}},ZZh(ZZphoneI,{size:16}),"Call now")),
        ZZh("p",{className:"zz-sub"},"Not urgent? Send a message and we'll get back to you."),
        ZZh("div",null,btn("Send a message instead",()=>{setCall(!1);go("chat")},"ghost sm",un))))};

  /* ---------- truck sheet ---------- */
  let truckSheet=()=>{
    /* only this customer's trucks (the bell or a chat link could name another one) */
    let k=sel&&e.trailers.find(z2=>z2.id===sel);if(!k||k.customerId&&k.customerId!==o)return null;
    let inb=k.direction==="inbound",st=stOf(k),sched=k.stage==="scheduled",
      /* loads in their unload / load order (seq), the truck customer's own loads only */
      /* same order rule as the bundle's ir() (seq ?? position), which reorderLoad / zzReorder swap against */
      L=loadsOf(k).filter(s2=>!s2.customerId||s2.customerId===o).map((s2,j)=>({s2,j})).sort((u,v)=>(u.s2.seq??u.j)-(v.s2.seq??v.j)||u.j-v.j).map(z2=>z2.s2),
      tot=L.reduce((s2,z2)=>s2+fe(z2),0),lbs=L.reduce((s2,z2)=>s2+ZZwt(z2),0),
      T=tx[k.id]||{},setT=p=>setTx({...tx,[k.id]:{...T,...p}}),
      w2=ZZwhen(k),dp=ZZdockParts(k.scheduledAt||w2),
      addOK=(T.ref||"").trim()&&ie(T.plt)>0,
      fin=!!k.workDoneAt||k.stage==="done"||k.stage==="departed",active=ZZactive(k),notIn=active&&!k.arrivedAt,
      ord=!!k.loadOrder,canOrd=sched&&L.length>1,
      mv=(s2,d)=>inb?a.reorderLoad(s2.id,d):a.zzReorder(s2.id,k.id,d<0?"up":"down"),
      loadSt=s2=>inb?(s2.receivedAt?(s2.qc?.counted!=null?`Off, counted ${s2.qc.counted}`:"Off the truck"):"On the truck"):(s2.shippedAt?"Shipped":s2.loadedAt?"Loaded":"Planned"),
      pills=s2=>[s2.hazmat?ZZh("span",{key:"hz"},ZZpill("Hazmat",m.red)):null,s2.stackable===!1?ZZh("span",{key:"ns"},ZZpill("No stack",m.amber)):null].filter(Boolean),
      extra=s2=>[ie(s2.pieces)?ZZb_pl(ie(s2.pieces),"piece"):"",s2.dest&&!["Reno, NV","Sacramento, CA"].includes(s2.dest)?s2.dest:""].filter(Boolean).join(" \xB7 "),
      rm=s2=>sched&&(inb?!s2.receivedAt:!s2.loadedAt)?ZZh("button",{className:"zz-link zzb-hit",style:{color:m.red,fontSize:13},onClick:()=>inb?a.zzRemoveLoad(s2.id):a.planOnto(s2.id,null)},"Remove"):null,
      trailBtn=s2=>ZZh("button",{className:"zz-link zzb-hit",style:{fontSize:13},onClick:()=>setTrl({tid:k.id,sid:s2.id})},"Trail"),
      arrows=(s2,ix)=>ord&&sched?ZZh("span",{style:{display:"inline-flex",gap:4}},
        ZZh("button",{type:"button",className:"zz-icon zzb-arw","aria-label":`Move load ${s2.ref} up`,disabled:ix===0,onClick:()=>mv(s2,-1)},ZZh(Bd,{size:15})),
        ZZh("button",{type:"button",className:"zz-icon zzb-arw","aria-label":`Move load ${s2.ref} down`,disabled:ix===L.length-1,onClick:()=>mv(s2,1)},ZZh(_d,{size:15}))):null,
      trail=ZZtrail(e,k.id),trailShow=T.allTrail?trail:trail.slice(-8),
      dd=fin&&k.stage!=="cancelled"?ZZb_done(e,k,t):null,sec=k.secure,
      /* ETA box: chips, a time, a note */
      setEta=ms=>{a.zzEta(k.id,{at:ye(ms),source:"client",note:(T.etaNote||"").trim(),by:who.trim()||A?.name||"Customer"});setT({eta:"",etaNote:""})},
      etaAt=()=>{let iso=/^\d{1,2}:\d{2}$/.test(T.eta||"")?ZZzonedIso(todayYmd,T.eta):null,ms=ZZb_ms(iso);if(!isFinite(ms))return NaN;if(ms<Date.now()-10*6e4)ms=ZZb_ms(ZZzonedIso(ZZb_add(todayYmd,1),T.eta));return ms},
      trkSel=T.trkSel||k.tracking||"link",trkUrlNeed=trkSel==="samsara"||trkSel==="gps",
      /* send only what changed: no write (and no "link removed" history line) when nothing did */
      saveTrk=()=>{let u=(T.trkUrl!=null?T.trkUrl:k.trackUrl||"").trim(),old=k.trackUrl||"";if(trkUrlNeed&&u&&!ZZsafeUrl(u))return setT({trkErr:"That link must start with https://"});
        let p={};if(trkSel!==k.tracking)p.tracking=trkSel;if(trkUrlNeed){if(u!==old)p.trackUrl=u}else if(old)p.trackUrl="";
        Object.keys(p).length&&a.zzTrack(k.id,p);setT({trk:!1,trkSel:"",trkUrl:null,trkErr:""})},
      /* time change: keeps the time when only the day changes; any minute */
      newDay=T.date||dp.ymd||todayYmd,newTime=T.time||dp.hhmm||"08:00",changed=(T.date&&T.date!==dp.ymd)||(T.time&&T.time!==dp.hhmm),
      saveTime=()=>{let iso=ZZzonedIso(newDay,newTime),ms=ZZb_ms(iso);if(!iso||!isFinite(ms))return setT({tErr:"Pick a real day and time."});
        if(ms<t-60*6e4)return setT({tErr:"That time has already passed. Pick a later time."});
        let was=k.scheduledAt?ZZb_when(k.scheduledAt):"no time";
        a.zzLog(k.id,`Time changed to ${ZZb_when(iso)} (was ${was})`,{scheduledAt:iso,...(!b&&k.confirmedAt?{confirmedAt:null,confirmedBy:null}:{})});
        a.sendTrailerChat(k.id,"dispatcher",`New time: ${ZZb_when(iso)} dock time (was ${was}).${b?"":" Please confirm."}`);
        setT({date:"",time:"",tErr:""});setWk(ZZb_wkOff(newDay,todayYmd))};
    return ZZh(Gt,{open:!0,wide:!0,onClose:()=>{setSel(null)},title:`${dirName(k)} \xB7 ${truckName(k)}`},
      ZZh("div",{className:"zz zz-f",style:{minHeight:0,background:"transparent"},"data-zzb":"truck"},
        ZZh("div",{style:{display:"grid",gap:6}},liveCard(k,!0),
          ZZh("div",{className:"zz-sub",style:{margin:0}},w2?`Appointment ${dt2(w2)} (dock time)`:"No appointment time set",!b&&k.bookedVia==="client"&&active?(k.confirmedAt?" \xB7 confirmed by our office":" \xB7 waiting for our OK"):"")),
        /* ETA and live location: before check-in only */
        notIn?ZZh("div",{className:"zzb-box","data-zzb":"eta"},
          ZZh("b",{style:{fontSize:16}},"When will the truck get here?"),
          ZZh("div",{style:{fontSize:15}},k.eta&&k.eta.at?[ZZh("b",{key:"a"},`ETA ${ZZb_when(k.eta.at)}`),` ${ZZb_etaSrc[k.eta.source]||""}${k.eta.updatedAt?", updated "+ZZb_hm(k.eta.updatedAt):""}${k.eta.note?" \xB7 "+k.eta.note:""}`]:"No ETA yet. We go by the appointment time."),
          ZZh("div",{className:"zz-sub",style:{margin:0}},"Running early or late? Tell us how far away the truck is:"),
          ZZh("div",{className:"zzb-chips"},...[[15,"15 min"],[30,"30 min"],[60,"1 hour"],[120,"2 hours"]].map(([mn,lb2])=>btn(lb2,()=>setEta(Date.now()+mn*6e4),"ghost sm"))),
          ZZh("div",{className:"zz-g2"},fl("Or pick the time (dock time)",ZZh("input",{type:"time",step:60,className:"zz-inp",value:T.eta||"",onChange:v=>setT({eta:v.target.value})})),
            fl("Why? (optional)",ZZh("input",{className:"zz-inp",value:T.etaNote||"",placeholder:"Traffic, late from the shipper…",onChange:v=>setT({etaNote:v.target.value})}))),
          T.eta?ZZh("div",null,btn(`Set ETA ${isFinite(etaAt())?ZZb_when(etaAt()):""}`,()=>{let ms=etaAt();isFinite(ms)&&setEta(ms)},"sm",Fd,!isFinite(etaAt()))):null,
          ZZh("div",{style:{borderTop:`1px solid ${m.line}`,paddingTop:10,display:"grid",gap:8}},
            ZZh("div",{style:{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap"}},ZZh("b",null,"Live location"),ZZh("span",{className:"zz-sub",style:{margin:0}},`How we'll know it's close: ${ZZb_trName[k.tracking]||"not set"}`),
              T.trk?null:ZZh("button",{className:"zz-link zzb-hit",style:{fontSize:13},onClick:()=>setT({trk:!0,trkSel:k.tracking||"link",trkUrl:k.trackUrl||"",trkErr:""})},"Change")),
            k.trackUrl&&ZZsafeUrl(k.trackUrl)?ZZh("div",{style:{display:"grid",gap:6}},ZZh("div",null,ZZh("a",{href:ZZsafeUrl(k.trackUrl),target:"_blank",rel:"noopener noreferrer",className:"zz-btn ghost sm",style:{textDecoration:"none"}},"Open live map")),
              ZZh("div",{className:"zzb-link",style:{fontSize:13}},k.trackUrl)):null,
            T.trk?ZZh("div",{style:{display:"grid",gap:8}},
              fl("How will we know when the truck is close?",ZZh("select",{className:"zz-inp",value:trkSel,onChange:v=>setT({trkSel:v.target.value,trkErr:""})},...ZZb_TRACK.map(o2=>ZZh("option",{key:o2.k,value:o2.k},o2.t)))),
              trkUrlNeed?fl("Live share link (starts with https://)",ZZh("input",{className:"zz-inp",type:"url",inputMode:"url",value:T.trkUrl!=null?T.trkUrl:k.trackUrl||"",placeholder:"https://…",onChange:v=>setT({trkUrl:v.target.value,trkErr:""})})):null,
              T.trkErr?ZZh("div",{className:"zz-err",role:"alert"},T.trkErr):null,
              ZZh("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},btn("Save",saveTrk,"sm",Ze),btn("Cancel",()=>setT({trk:!1,trkErr:""}),"ghost sm"))):null)):null,
        /* driver link + check-in code */
        active&&!fin?ZZh("div",{className:"zzb-box","data-zzb":"driver-link"},
          ZZh("div",{style:{display:"flex",gap:10,alignItems:"baseline",flexWrap:"wrap"}},ZZh("b",{style:{fontSize:16}},"Driver link and check-in code"),
            ZZb_hasCode(k)?ZZh("span",{className:"zz-sub",style:{margin:0}},"Code ",ZZh("b",{style:{fontSize:18,color:m.text,letterSpacing:".08em"}},k.code)):null),
          ZZb_hasCode(k)?[ZZh("div",{key:"t",className:"zz-sub",style:{margin:0}},"Text this link to your driver. They tap how far away they are and send us the update. At our check-in kiosk they type the code."),ZZh("div",{key:"l"},linkBlock(k))]
            :[ZZh("div",{key:"t",className:"zz-sub",style:{margin:0}},"This truck was booked before driver links. Make one to send your driver a link and a check-in code."),
              ZZh("div",{key:"b"},btn("Make a driver link",()=>a.zzEnsureCode(k.id),"",Ca))]):null,
        /* done: counts against the BOL, photos, damage */
        dd?ZZh("div",{className:"zz-fs","data-zzb":"done"},ZZh("div",{className:"lbl"},inb?"Unloaded: count and photos":"Loaded: count and photos"),
          ZZh("div",{style:{fontSize:15,fontWeight:700,color:dd.pr.kept===!1?m.amber:m.green}},dd.tm?`Done in ${dd.tm}.`:"Done."),
          ...dd.L.map(s2=>{let c2=inb?(s2.qc&&s2.qc.counted!=null?ie(s2.qc.counted):s2.receivedAt?fe(s2):null):(s2.pullCount!=null?ie(s2.pullCount):s2.loadedAt||s2.shippedAt?fe(s2):null),okc=c2===fe(s2);
            return ZZh("div",{key:s2.id,style:{display:"flex",justifyContent:"space-between",gap:8,fontSize:14.5,borderTop:`1px solid ${m.line}`,paddingTop:6}},ZZh("span",null,`Load ${s2.ref}`),
              ZZh("b",{style:{color:c2==null?m.mut:okc?m.green:m.amber}},c2==null?"not counted yet":`${okc?"✓ ":""}${c2} of ${ZZb_pl(fe(s2),"pallet")} on the BOL`))}),
          ZZh("div",{className:"zzb-ph"},ZZh(lr,{ownerId:`before:${k.id}`,size:72,label:"Before"}),ZZh(lr,{ownerId:`after:${k.id}`,size:72,label:"After"}),
            !ie(k.afterPhotoCount)&&!ie(k.beforePhotoCount)?ZZh("div",{className:"zz-sub",style:{margin:0}},"No truck photos yet."):ZZh("div",{className:"zz-sub",style:{margin:0}},`${ZZb_pl(ie(k.beforePhotoCount)+ie(k.afterPhotoCount),"photo")} taken by our crew. Don't see them here? Ask us in Messages and we'll send them.`)),
          ...dd.L.filter(s2=>(s2.exceptions||[]).some(x=>x&&x.kind==="Damage")).map(s2=>ZZh("div",{key:"d"+s2.id,className:"zz-note",style:{margin:0}},ZZh(wr,{size:17}),
            ZZh("span",null,ZZh("b",null,`Damage on load ${s2.ref}.`)," Photos and the fix price are on the Damage tab."),ZZh("button",{className:"zz-link",onClick:()=>{setSel(null);go("damage")}},"See it")))):null,
        /* loaded and secured */
        sec?ZZh("div",{className:"zz-fs","data-zzb":"secured"},
          ZZh("div",{style:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}},ZZh("div",{style:{marginRight:"auto",fontWeight:800,fontSize:16}},"Loaded and secured"),sec.seal?ZZh("span",{className:"zzb-tag"},`Seal ${sec.seal}`):null),
          (()=>{let cf=Math.max(0,Math.min(5,ie(sec.confidence))),col=cf>=4?m.green:cf===3?m.amber:m.red;return ZZh("div",{style:{display:"grid",gap:4}},
            ZZh("div",{style:{display:"flex",justifyContent:"space-between",fontSize:14.5}},ZZh("span",null,"How safe is it?"),ZZh("b",{style:{color:col}},`${cf} of 5 \xB7 ${ZZb_CONF[cf]||""}`)),
            ZZh("div",{className:"zzb-bars",role:"img","aria-label":`Confidence ${cf} of 5`},...[1,2,3,4,5].map(n2=>ZZh("i",{key:n2,style:n2<=cf?{background:col}:void 0}))))})(),
          ZZGEAR.some(g2=>ie(sec.gear?.[g2.k]?.qty)>0)?ZZh("div",{className:"zz-tblw"},ZZh("table",{className:"zz-tbl"},ZZh("thead",null,ZZh("tr",null,ZZh("th",null,"Gear"),ZZh("th",{className:"num"},"Qty"),ZZh("th",null,"Whose"))),
            ZZh("tbody",null,...ZZGEAR.filter(g2=>ie(sec.gear?.[g2.k]?.qty)>0).map(g2=>ZZh("tr",{key:g2.k},ZZh("td",null,g2.label),ZZh("td",{className:"num"},ie(sec.gear[g2.k].qty)),ZZh("td",null,sec.gear[g2.k].owner==="driver"?"Driver's":"Ours (24 HR)")))))):ZZh("div",{className:"zz-sub",style:{margin:0}},"No gear listed."),
          (sec.tags||[]).length?ZZh("div",null,ZZh("div",{className:"zz-sub",style:{margin:"0 0 6px",fontWeight:700}},"Tag numbers on our gear"),ZZh("div",{className:"zzb-chips"},...sec.tags.map((tg,ix)=>ZZh("span",{key:ix+":"+tg,className:"zzb-tag"},tg)))):null,
          ZZh("div",{className:"zzb-ph"},...ZZSECSLOTS.map(sl=>ZZh(lr,{key:sl.k,ownerId:`sec:${k.id}:${sl.k}`,size:64,label:`${sl.label} (${sl.hint.toLowerCase()})`,empty:ie(sec.photos?.[sl.k])?`${ZZb_pl(ie(sec.photos[sl.k]),"photo")} taken`:"No photo"}))),
          sec.note?ZZh("p",{className:"zz-sub",style:{margin:0}},ZZh("b",null,"Crew note: "),sec.note):null,
          ZZh("p",{className:"zz-sub",style:{margin:0}},`Signed by ${sec.signedBy||"our crew"}${sec.signature&&sec.signature!==sec.signedBy?` ("${sec.signature}")`:""}${sec.signedAt?" \xB7 "+ZZb_when(sec.signedAt):""}${sec.checkedRows?" \xB7 checked every row is tight":""}`)):null,
        /* loads: weight, flags, order */
        ZZh("div",{className:"zz-fs","data-zzb":"loads"},ZZh("div",{className:"lbl"},inb?"Loads on this trailer":"Loads going on this truck"),
          canOrd?ZZh("label",{className:"zz-chk"},ZZh("input",{type:"checkbox",checked:ord,onChange:()=>a.zzLog(k.id,ord?"Load order turned off":inb?"Unload in this order":"Load in this order",{loadOrder:!ord})}),inb?"Unload in this order":"Load in this order"):null,
          L.length?ZZh("div",null,
            ZZh("div",{className:"zz-tblw zz-wide"},ZZh("table",{className:"zz-tbl"},
              ZZh("thead",null,ZZh("tr",null,ord?ZZh("th",null,"#"):null,ZZh("th",null,"Load"),ZZh("th",{className:"num"},"Pallets"),ZZh("th",{className:"num"},"Weight"),ZZh("th",null,inb?"After unload":"From"),ZZh("th",null,"Status"),ZZh("th",null,""))),
              ZZh("tbody",null,...L.map((s2,ix)=>ZZh("tr",{key:s2.id},ord?ZZh("td",null,ZZh("span",{className:"zzb-num"},ix+1)):null,
                ZZh("td",null,ZZh("div",{style:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}},ZZh("button",{className:"zz-link",style:{color:m.text},onClick:()=>{setSel(null);n(s2)}},s2.ref),...pills(s2)),extra(s2)?ZZh("div",{className:"zz-sub",style:{margin:0,fontSize:12.5}},extra(s2)):null),
                ZZh("td",{className:"num"},fe(s2)),ZZh("td",{className:"num"},ZZwt(s2)?ZZlb(ZZwt(s2)):"—"),ZZh("td",null,inb?ZZlane[be(s2)]:"Our floor"),ZZh("td",null,loadSt(s2)),
                ZZh("td",{className:"num"},ZZh("span",{style:{display:"inline-flex",gap:10,alignItems:"center"}},arrows(s2,ix),trailBtn(s2),rm(s2)))))),
              ZZh("tfoot",null,ZZh("tr",null,ord?ZZh("td",null,""):null,ZZh("td",null,`${L.length} load${L.length===1?"":"s"}`),ZZh("td",{className:"num"},tot),ZZh("td",{className:"num"},lbs?ZZlb(lbs):"—"),ZZh("td",{colSpan:3},"pallets"))))),
            ZZh("div",{className:"zz-list zz-narrow"},...L.map((s2,ix)=>ZZh("div",{key:s2.id,className:"zz-row",style:{alignItems:"flex-start"}},
              ord?ZZh("span",{className:"zzb-num"},ix+1):null,
              ZZh("div",{className:"m"},ZZh("div",{style:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}},ZZh("button",{className:"zz-link",style:{color:m.text,fontSize:15},onClick:()=>{setSel(null);n(s2)}},`Load ${s2.ref}`),...pills(s2)),
                ZZh("span",null,[`${fe(s2)} plt`,ZZwt(s2)?ZZlb(ZZwt(s2)):"",inb?ZZlane[be(s2)]:"from our floor",loadSt(s2)].filter(Boolean).join(" \xB7 ")),extra(s2)?ZZh("span",null,extra(s2)):null,
                ZZh("span",{style:{display:"flex",gap:14,alignItems:"center",marginTop:4}},trailBtn(s2),rm(s2))),
              arrows(s2,ix))),
              ZZh("div",{className:"zz-total",style:{marginTop:6}},ZZh("span",null,`${L.length} load${L.length===1?"":"s"}`),ZZh("span",null,`${tot} plt${lbs?" \xB7 "+ZZlb(lbs):""}`)))):ZZh("div",{className:"zz-empty",style:{padding:0}},"No loads listed yet."),
          sched&&inb?ZZh("div",{className:"zz-load",style:{marginTop:4}},
            fl("Add a load: number or PO",ZZh("input",{className:"zz-inp",value:T.ref||"",placeholder:"e.g. 112046",onChange:v=>setT({ref:v.target.value})})),
            fl("Pallets",ZZh("input",{className:"zz-inp",value:T.plt||"",inputMode:"numeric",placeholder:"0",onChange:v=>setT({plt:v.target.value.replace(/\D/g,"").slice(0,4)})})),
            ZZh("label",{className:"zz-fl ln"},"After we unload it",ZZh("select",{className:"zz-inp",value:T.lane||"reno",onChange:v=>setT({lane:v.target.value})},...Object.entries(ZZlane).map(([k2,v2])=>ZZh("option",{key:k2,value:k2},v2)))),
            ZZh("button",{type:"button",className:"zz-icon x","aria-label":"Add load",disabled:!addOK,style:{background:addOK?m.orange:m.panel,color:addOK?"#fff":m.dim},onClick:()=>{a.zzAddLoad(k.id,{ref:T.ref.trim(),units:{std:ie(T.plt)},lane:T.lane||"reno",weight:ie(T.wt)});setT({ref:"",plt:"",wt:""})}},ZZh(wa,{size:18})),
            ZZh("div",{className:"zzb-lx"},fl("Weight (lb)",ZZh("input",{className:"zz-inp",value:T.wt||"",inputMode:"numeric",placeholder:"e.g. 12000",onChange:v=>setT({wt:v.target.value.replace(/\D/g,"").slice(0,6)})})))):null,
          sched&&!inb&&free.length?ZZh("div",{style:{display:"grid",gap:6,marginTop:4}},ZZh("div",{className:"zz-sub"},"Add from the floor:"),
            ...free.map(s2=>ZZh("div",{key:s2.id,className:"zz-pick",style:{cursor:"default"}},ZZh("div",{style:{flex:1}},ZZh("b",null,`Load ${s2.ref}`),ZZh("span",{className:"zz-sub"},` \xB7 ${fe(s2)} plt \xB7 ${freeNote(s2)}`)),btn("Add",()=>a.planOnto(s2.id,k.id),"ghost sm",wa)))):null),
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Truck and driver"),
          ZZh("div",{className:"zz-kv"},...[["Carrier",k.carrier],["Truck",k.truck],["Trailer",k.trailer],["Driver",k.driver],["Driver phone",k.phone],["Door",k.dock&&k.dock!==Ee?k.dock:fin||!active?"—":k.arrivedAt?"Waiting in the yard":"Not yet"],["Driver's language",ZZb_lang(k.driverLang||"en")],["Check-in code",ZZb_hasCode(k)?k.code:"—"]].map(([l2,v2])=>ZZh("div",{key:l2},ZZh("span",null,l2),v2||"—"))),
          k.notes?ZZh("p",{className:"zz-sub"},`Notes: ${k.notes}`):null),
        sched?ZZh("div",{className:"zz-fs","data-zzb":"time"},ZZh("div",{className:"lbl"},"Change the time"),ZZh("div",{className:"hint"},"Any minute. Dock time (Pacific). Change only the day and the time stays the same."),
          ZZh("div",{className:"zz-g2"},fl("Day",ZZh("input",{type:"date",className:"zz-inp",value:newDay,min:todayYmd,onChange:v=>setT({date:v.target.value,tErr:""})})),
            fl("Time (dock time)",ZZh("input",{type:"time",step:60,className:"zz-inp",value:newTime,onChange:v=>setT({time:v.target.value,tErr:""})}))),
          changed?busyPanel(newDay,newTime,k.id):null,
          T.tErr?ZZh("div",{className:"zz-err",role:"alert"},T.tErr):null,
          changed?ZZh("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},btn(`Save new time: ${ZZzonedIso(newDay,newTime)?ZZb_when(ZZzonedIso(newDay,newTime)):"—"}`,saveTime,"sm",Ze),btn("Keep the old time",()=>setT({date:"",time:"",tErr:""}),"ghost sm")):null):null,
        /* load trail: who did what, when (never other companies, never the office log) */
        ZZh("div",{className:"zz-fs","data-zzb":"trail"},ZZh("div",{className:"lbl"},"Load trail"),ZZh("div",{className:"hint"},"Everything that happened with this truck and its loads. Dock time."),
          trail.length?ZZh("div",{className:"zzb-tl"},...trailShow.map((r2,ix)=>ZZh("div",{key:ix},ZZh("time",null,ZZb_when(r2.at)),ZZh("span",null,r2.by?ZZh("b",null,(r2.by==="Customer"?A?.name||"You":r2.by)+": "):null,r2.text)))):ZZh("div",{className:"zz-empty",style:{padding:0}},"Nothing yet."),
          trail.length>trailShow.length?ZZh("div",null,ZZh("button",{className:"zz-link",style:{fontSize:13},onClick:()=>setT({allTrail:!0})},`Show all ${trail.length}`)):null),
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Message the dock about this truck"),
          ...(k.chat||[]).slice(-3).map(c2=>ZZh("div",{key:c2.id,className:"zz-msg"},ZZh("b",null,`${c2.who||c2.from}: `),c2.text,ZZh("span",{className:"zz-sub"},` \xB7 ${ge(c2.at)}`))),
          ZZh("div",{style:{display:"flex",gap:8}},ZZh("input",{className:"zz-inp",value:T.msg||"",placeholder:"Driver is running 30 min late…",onChange:v=>setT({msg:v.target.value})}),btn("Send",()=>{if((T.msg||"").trim()){a.sendTrailerChat(k.id,"dispatcher",T.msg.trim());setT({msg:""})}},"",un,!(T.msg||"").trim()))),
        ZZh("div",{style:{display:"flex",gap:8,flexWrap:"wrap",borderTop:`1px solid ${m.line}`,paddingTop:14}},
          btn("Work order",()=>setWo(k.id),"ghost",Ct),
          btn("Book this again next week",()=>{let d0=dp.ymd||todayYmd;setSel(null);newForm(ZZb_add(d0,7),inb?"drop":"pick",{time:dp.hhmm||"08:00",carrier:k.carrier||"",truck:k.truck||"",trailer:k.trailer||"",driver:k.driver||"",phone:k.phone||"",
            lang:k.driverLang||"en",tracking:k.tracking||"link",order:inb&&!!k.loadOrder,
            loads:inb&&L.length?L.map(s2=>{let ds=s2.dest&&!["Reno, NV","Sacramento, CA"].includes(s2.dest)?s2.dest:"";return ZZb_row({pallets:String(fe(s2)),lane:be(s2),notes:s2.loadNotes||"",weight:ZZwt(s2)?String(ZZwt(s2)):"",pieces:ie(s2.pieces)?String(ie(s2.pieces)):"",dest:ds,
              stackable:s2.stackable===!0||s2.stackable===!1?s2.stackable:null,hazmat:!!s2.hazmat,more:!!(ds||s2.loadNotes)})}):[ZZb_row()]})},"ghost",qd),
          sched?(T.cx?ZZh("span",{style:{display:"inline-flex",gap:8,alignItems:"center",flexWrap:"wrap"}},ZZh("b",{style:{color:m.red}},"Cancel this truck?"),btn("Yes, cancel it",()=>{a.cancelTrailer(k.id,who.trim()||A?.name||"Customer");setSel(null);setFlash(`${truckName(k)} on ${dt2(w2)} was cancelled.`)},"danger sm"),btn("Keep it",()=>setT({cx:!1}),"ghost sm"))
            :btn("Cancel booking",()=>setT({cx:!0}),"danger",dn)):null)),
      wo===k.id&&ZZh(sx,{t:k,doc:e,now:t,onClose:()=>setWo(null)}));
  };

  /* ---------- one load's trail ---------- */
  let trailSheet=()=>{if(!trl)return null;let s2=e.shipments.find(z2=>z2.id===trl.sid);if(!s2||s2.customerId&&s2.customerId!==o)return null;let rows=ZZtrail(e,trl.tid,trl.sid);
    return ZZh(Gt,{open:!0,onClose:()=>setTrl(null),title:`Trail \xB7 load ${s2.ref}`},
      ZZh("div",{className:"zz zz-f",style:{minHeight:0,background:"transparent"},"data-zzb":"load-trail"},
        ZZh("div",{className:"zz-sub",style:{margin:0}},`${fe(s2)} pallets${ZZwt(s2)?" \xB7 "+ZZlb(ZZwt(s2)):""} \xB7 dock time`),
        rows.length?ZZh("div",{className:"zzb-tl"},...rows.map((r2,ix)=>ZZh("div",{key:ix},ZZh("time",null,ZZb_when(r2.at)),ZZh("span",null,r2.by?ZZh("b",null,(r2.by==="Customer"?A?.name||"You":r2.by)+": "):null,r2.text)))):ZZh("div",{className:"zz-empty",style:{padding:0}},"Nothing has happened with this load yet."),
        ZZh("div",null,btn("See the full load",()=>{setTrl(null);setSel(null);n(s2)},"ghost sm"))))};

  /* ---------- damage answer modal ---------- */
  let modal=()=>{
    if(!mod)return null;let {s,x,type}=mod,est=ZZestOf(s,x,y),nm=who.trim(),
      fin=st=>{try{localStorage.setItem("cd6:zzname",nm)}catch{}ZZanswer(a,s,x,st,nm||A?.name||"Customer",st==="declined"?why+(note.trim()?": "+note.trim():""):note.trim(),o,y);setMod(null)};
    return ZZh(Gt,{open:!0,onClose:()=>setMod(null),title:type==="accept"?"Accept the charges":type==="decline"?"Decline the charges":"Talk to us first"},
      ZZh("div",{className:"zz zz-f",style:{minHeight:0,background:"transparent"}},
        ZZh("div",null,ZZh("b",{style:{fontSize:17}},`${x.kind} on load ${s.ref}`),type!=="call"?ZZtable(est):null),
        fl("Your name",ZZh("input",{className:"zz-inp",value:who,placeholder:"First and last name",onChange:v=>setWho(v.target.value)})),
        type==="accept"?ZZh("label",{style:{display:"flex",gap:10,alignItems:"flex-start",fontSize:15,fontWeight:600,cursor:"pointer"}},ZZh("input",{type:"checkbox",checked:ok,onChange:()=>setOk(!ok),style:{width:20,height:20,flexShrink:0}}),`I approve ${je(est.total)} in charges for load ${s.ref}. Add them to my bill.`):null,
        type==="accept"?ZZh("div",null,btn(`Approve ${je(est.total)}`,()=>fin("accepted"),"ok",Ze,!ok||!nm)):null,
        type==="decline"?ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl",style:{fontSize:14}},"Why?"),ZZh("div",{style:{display:"grid",gap:6}},...["It was damaged before it got to you","The price looks too high","I need more photos or info","Something else"].map(r2=>ZZh("button",{key:r2,type:"button",className:"zz-opt","aria-pressed":why===r2,onClick:()=>setWhy(r2)},ZZh("i",{className:"rd"}),ZZh("b",null,r2))))):null,
        type==="decline"?fl("Anything else? (optional)",ZZh("textarea",{className:"zz-inp",rows:2,value:note,onChange:v=>setNote(v.target.value)})):null,
        type==="decline"?ZZh("div",null,btn("Send my answer",()=>fin("declined"),"danger",dn,!nm||!why)):null,
        type==="call"?ZZh("div",{className:"zz-panel",style:{textAlign:"center"}},ZZh("div",{className:"zz-sub"},"Call us"),ZZh("div",{style:{fontSize:24,fontWeight:800,userSelect:"all"}},ZZPHONE),ZZh("a",{href:ZZTEL,className:"zz-link"},"Tap to call")):null,
        type==="call"?fl("Or send a message and we'll call you",ZZh("textarea",{className:"zz-inp",rows:2,value:note,placeholder:"Best time to call, questions…",onChange:v=>setNote(v.target.value)})):null,
        type==="call"?ZZh("div",null,btn("Send and ask for a call",()=>fin("call"),"",un,!nm)):null));
  };

  /* ---------- alerts & settings (contacts x events, auto-approve, Friday summary); saved with zzCustomer ---------- */
  let alertsOf=c=>{let o2={};ZZEVENTS.forEach(ev=>{let v=(c&&c.alerts||{})[ev.k]||{};o2[ev.k]={text:!!v.text,email:!!v.email}});return o2},
    openAlerts=()=>{let cs=(Array.isArray(A?.contacts)?A.contacts:[]).filter(Boolean);
      setAl({contacts:cs.length?cs.map(c=>({id:c.id||Ce(),name:c.name||"",role:c.role||"",phone:c.phone||"",email:c.email||"",alerts:alertsOf(c)}))
        :[{id:Ce(),name:A?.person||"",role:"Dispatch",phone:A?.phone||"",email:A?.contact||"",alerts:alertsOf({alerts:ZZALERTS})}],
        auto:ZZautoLimit(A)!=null?String(ZZautoLimit(A)):"",friday:A?.fridaySummary!==!1,err:"",saved:!1})},
    alertSheet=()=>{if(!al)return null;let f=al,setF=p=>setAl({...f,...p,err:"",saved:!1}),
      setC=(id,p)=>setF({contacts:f.contacts.map(c=>c.id===id?{...c,...p}:c)}),
      setA=(id,ev,ch,v)=>setF({contacts:f.contacts.map(c=>c.id===id?{...c,alerts:{...c.alerts,[ev]:{...c.alerts[ev],[ch]:v}}}:c)}),
      allA=(id,v)=>setF({contacts:f.contacts.map(c=>c.id===id?{...c,alerts:Object.fromEntries(ZZEVENTS.map(ev=>[ev.k,{text:v,email:v}]))}:c)}),
      autoBad=f.auto.trim()!==""&&!(+f.auto>0),
      save=()=>{if(autoBad)return setAl({...f,err:"Type an amount for auto-approve, like 50. Or leave it blank so we always ask you first."});
        let cs=f.contacts.map(c=>({id:c.id||Ce(),name:c.name.trim(),role:c.role.trim(),phone:c.phone.trim(),email:c.email.trim(),alerts:alertsOf(c)})).filter(c=>c.name||c.phone||c.email);
        a.zzCustomer(o,{contacts:cs,autoApproveUnder:f.auto.trim()===""?null:Math.round(+f.auto*100)/100,fridaySummary:!!f.friday});
        setAl({...f,contacts:cs,err:"",saved:!0})};
    return ZZh(Gt,{open:!0,wide:!0,onClose:()=>setAl(null),title:"Alerts & settings"},
      ZZh("div",{className:"zz zz-f",style:{minHeight:0,background:"transparent"},"data-zzb":"alerts"},
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Who hears from us"),ZZh("div",{className:"hint"},"Pick who gets a text or an email when each thing happens. Add everyone who should know."),
          ...f.contacts.map((c,ix)=>{let anyT=ZZEVENTS.some(ev=>c.alerts[ev.k].text),anyE=ZZEVENTS.some(ev=>c.alerts[ev.k].email);
            return ZZh("section",{key:c.id,className:"zz-panel",style:{display:"grid",gap:10,padding:12},"data-zzb":"contact"},
              ZZh("div",{style:{display:"flex",alignItems:"center",gap:8}},ZZh("b",{style:{fontSize:16,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},c.name.trim()||`Contact ${ix+1}`),
                btn("Remove",()=>setF({contacts:f.contacts.filter(z2=>z2.id!==c.id)}),"danger sm",dn)),
              ZZh("div",{className:"zz-g2"},fl("Name",inp(c.name,v=>setC(c.id,{name:v}),"First and last name")),fl("Role",inp(c.role,v=>setC(c.id,{role:v}),"e.g. Dispatcher")),
                fl("Cell (for texts)",inp(c.phone,v=>setC(c.id,{phone:v}),"775-555-0100",{type:"tel",inputMode:"tel"})),fl("Email",inp(c.email,v=>setC(c.id,{email:v}),"name@company.com",{type:"email",inputMode:"email"}))),
              anyT&&!c.phone.trim()?ZZh("div",{className:"zz-err",style:{fontSize:13}},`Add a cell number so texts can reach ${c.name.trim()||"this contact"}.`):null,
              anyE&&!c.email.trim()?ZZh("div",{className:"zz-err",style:{fontSize:13}},`Add an email so emails can reach ${c.name.trim()||"this contact"}.`):null,
              ZZh("table",{className:"zzb-alt"},ZZh("thead",null,ZZh("tr",null,ZZh("th",null,"When this happens"),ZZh("th",{className:"c"},"Text"),ZZh("th",{className:"c"},"Email"))),
                ZZh("tbody",null,...ZZEVENTS.map(ev=>ZZh("tr",{key:ev.k},ZZh("td",null,ev.label),
                  ...["text","email"].map(ch=>ZZh("td",{key:ch,className:"c"},ZZh("label",null,ZZh("input",{type:"checkbox",checked:!!c.alerts[ev.k][ch],"aria-label":`${ch==="text"?"Text":"Email"} ${c.name.trim()||"contact "+(ix+1)}: ${ev.label}`,"data-ev":ev.k,"data-ch":ch,onChange:()=>setA(c.id,ev.k,ch,!c.alerts[ev.k][ch])})))))))),
              ZZh("div",{style:{display:"flex",gap:16}},ZZh("button",{type:"button",className:"zz-link",style:{fontSize:13},onClick:()=>allA(c.id,!0)},"Turn all on"),ZZh("button",{type:"button",className:"zz-link",style:{fontSize:13},onClick:()=>allA(c.id,!1)},"Turn all off")))}),
          f.contacts.length?null:ZZh("div",{className:"zz-sub"},`No contacts. We'll email ${A?.contact||"your account email"} about bookings, damage, finished trucks and the Friday summary.`),
          ZZh("div",null,btn("+ Add a contact",()=>setF({contacts:[...f.contacts,{id:Ce(),name:"",role:"",phone:"",email:"",alerts:alertsOf({alerts:ZZALERTS})}]}),"ghost sm"))),
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Damage fixes"),ZZh("div",{className:"hint"},"If we find damage, we always send photos and the fix price first."),
          ZZh("label",{className:"zz-fl",style:{maxWidth:320}},"Auto-approve damage fixes under $",ZZh("input",{className:"zz-inp",value:f.auto,inputMode:"decimal",placeholder:"Blank = always ask me","aria-label":"Auto-approve damage fixes under this many dollars",onChange:v=>setF({auto:v.target.value.replace(/[^\d.]/g,"").slice(0,8)})})),
          ZZh("div",{className:"hint",style:autoBad?{color:m.red,fontWeight:700}:void 0},autoBad?"Type an amount, like 50, or leave it blank.":f.auto.trim()===""?"Blank: nothing is added to your bill until you tap Approve. (Default)":`Fixes under ${Fe(+f.auto)} go on the bill right away. You still get the photos.`)),
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Friday summary"),
          ZZh("label",{className:"zz-chk"},ZZh("input",{type:"checkbox",checked:!!f.friday,onChange:()=>setF({friday:!f.friday})}),"Email a summary every Friday"),
          ZZh("div",{className:"hint"},"Trucks, wait times, damage and gear for the week. Goes to contacts with “Friday summary” ticked.")),
        f.err?ZZh("div",{className:"zz-err",role:"alert"},f.err):null,
        ZZh("div",{style:{display:"flex",gap:10,justifyContent:"flex-end",alignItems:"center",flexWrap:"wrap"}},
          f.saved?ZZh("span",{style:{color:m.green,fontWeight:700,marginRight:"auto"}},"✓ Saved"):null,
          btn("Close",()=>setAl(null),"ghost"),btn("Save",save,"",Ze))))};

  let tabs=[
    {k:"schedule",label:"Schedule",icon:sn},
    {k:"trucks",label:"Trucks",icon:Ca,n:atDock.length,soft:!0},
    {k:"floor",label:"Inventory",icon:cn},
    {k:"requests",label:"Requests",icon:Ct,n:reqAns},
    {k:"damage",label:"Damage",icon:wr,n:waiting.length},
    {k:"bills",label:"Bills",icon:gl},
    {k:"chat",label:"Messages",icon:un,n:newMsgs}];
  return ZZh("div",{className:"zz"},
    ZZh("style",null,ZZCSS()),
    ZZh("div",{className:"zz-hdr"},
      ZZh("div",{className:"zz-top zzhd"},ZZh("div",{className:"zz-in"},
        ZZh("span",{className:"zzc",style:{display:"grid",placeItems:"center",width:34,height:34,background:"#A95A24",borderRadius:3,fontWeight:800,fontSize:16,flexShrink:0}},"24"),
        ZZh("div",{style:{flex:1,minWidth:0}},ZZh("div",{style:{fontWeight:800,fontSize:16.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}},A?.name||"Customer portal"),ZZh("div",{className:"text-xs",style:{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}},"24 HR Crossdock \xB7 Reno")),
        ZZh("button",{type:"button",className:"zz-callb",onClick:()=>setCall(!0),"aria-label":"Call the dock"},ZZh(ZZphoneI,{size:15}),ZZh("span",null,"Call dock")),
        ZZh("button",{type:"button",className:"zzb-hic",onClick:openAlerts,"aria-label":"Alerts and settings",title:"Alerts and settings"},ZZh(uu,{size:18})),
        ZZh(MA,{role:"client",doc:e,now:t,customerId:o,onShipment:n,onTrailer:k=>setSel(k.id)}),
        /* on a phone the label hides (like "Call dock"), so the company name has room next to the settings icon */
        ZZh("button",{onClick:r,className:"zzb-so","aria-label":"Sign out",title:"Sign out",style:{display:"inline-flex",alignItems:"center",gap:6,background:"transparent",border:"1px solid rgba(255,255,255,.35)",borderRadius:6,padding:"7px 10px",fontWeight:700,fontSize:14,cursor:"pointer"}},ZZh(yl,{size:15}),ZZh("span",null,"Sign out")))),
      ZZh("nav",{className:"zz-tabs","aria-label":"Portal"},ZZh("div",{className:"zz-in"},...tabs.map(k=>ZZh("button",{key:k.k,type:"button",className:"zz-tab",onClick:()=>go(k.k),"aria-current":tab===k.k?"page":void 0},
        ZZh(k.icon,{size:21}),ZZh("span",null,k.label),k.n?ZZh("i",{style:k.soft?{background:m.green}:void 0},k.n):null))))),
    ZZh("main",{className:"zz-main"},...[].concat(tab==="schedule"?schedule():tab==="trucks"?trucks():tab==="floor"?floorTab():tab==="requests"?requests():tab==="damage"?damage():tab==="bills"?bills():chat())),
    truckSheet(),formSheet(),modal(),reqSheet(),callSheet(),bookedSheet(),trailSheet(),alertSheet());
},
