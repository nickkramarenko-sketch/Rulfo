ZZh=(t,p,...c)=>H.createElement(t,p,...c),
ZZPHONE="916-616-3481",ZZTEL="tel:+19166163481",
/* Damage estimate for one exception: rewrap already recorded at the door + extra lines the office/crew added. */
ZZestOf=(s,x,y)=>{
  let lines=[];
  if(x.kind==="Damage"){
    let first=(s.exceptions||[]).find(q=>q.kind==="Damage"),rw=ie(s.rewrapPallets);
    if(first&&first.id===x.id&&rw>0)lines.push({label:`Rewrap ${rw} damaged pallet${rw>1?"s":""}`,qty:rw,unit:y.rewrap,amount:rw*y.rewrap,auto:!0});
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
  ZZh("div",{style:{display:"flex",padding:"12px",background:"#FBF1E8",fontSize:17,fontWeight:800}},ZZh("span",{style:{flex:1}},"Estimated total"),ZZh("span",{style:{fontVariantNumeric:"tabular-nums"}},je(est.total)))),
ZZpill=(txt,col)=>ZZh("span",{style:{display:"inline-block",fontSize:13,fontWeight:800,padding:"3px 10px",borderRadius:20,color:col,border:`1px solid ${col}`,background:m.panel,whiteSpace:"nowrap"}},txt),
ZZstatus=(x)=>{let a=x.answer;return !a?null:a.status==="accepted"?ZZpill("You approved \xB7 "+ge(a.at),m.green):a.status==="declined"?ZZpill("You declined \xB7 we'll call you",m.red):ZZpill("We'll call you about this",m.blue)},

/* Office / crew: build the estimate the customer approves. Shown inside the load's Exceptions box. */
ZZEst=({s,x,rates:y,actions:a})=>{
  let [lab,setLab]=(0,H.useState)(""),[amt,setAmt]=(0,H.useState)(""),
    est=ZZestOf(s,x,y),ans=x.answer,locked=!!x.est?.applied,
    save=fn=>a.patchShipment(s.id,sh=>({exceptions:(sh.exceptions||[]).map(q=>q.id!==x.id?q:{...q,est:{...(q.est||{}),lines:fn(q.est?.lines||[]),sentAt:ye(Date.now())},answer:q.answer&&q.answer.status==="call"?q.answer:null})})),
    add=(label,unit)=>save(L=>{let f=L.find(l=>l.label===label&&ie(l.unit)===ie(unit));return f?L.map(l=>l===f?{...l,qty:ie(l.qty,1)+1}:l):[...L,{id:Ce(),label,qty:1,unit:ie(unit)}]}),
    quick=[["Rewrap pallet",y.rewrap],["Labor, 1 hour",y.laborHour],["Replacement pallet",20],["Dispose of 1 pallet",200]];
  return ZZh("div",{className:"mt-2 rounded p-2.5",style:{background:m.panel,border:`1px dashed ${m.orange}`}},
    ZZh("div",{className:"text-xs font-bold mb-1",style:{color:m.orange}},"Charge estimate for the customer"),
    est.lines.length?ZZtable(est):ZZh("div",{className:"text-xs",style:{color:m.dim}},"No charges yet. Add what fixing this costs. The customer sees it right away and can approve, decline or ask for a call."),
    ZZh("div",{className:"text-xs mt-2 font-bold",style:{color:!ans?m.amber:ans.status==="accepted"?m.green:ans.status==="declined"?m.red:m.blue}},
      !ans?(est.total>0?"Waiting on the customer's answer":"Nothing to approve yet")
      :ans.status==="accepted"?`Approved by ${ans.by} \xB7 ${ge(ans.at)} \xB7 added to the bill`
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
  if(k.stage==="departed")return{txt:`Left ${k.departedAt?at(k.departedAt):""}`,tone:""};
  if(k.stage==="done")return{txt:"Finished, paperwork going out",tone:"live"};
  if(k.stage==="working")return{txt:`${inb?"Unloading":"Loading"} now${door?" at door "+door:""} \xB7 ${off} of ${L.length} load${L.length===1?"":"s"} ${inb?"off":"on"}`,tone:"live"};
  if(k.arrivedAt)return{txt:door?`Here, at door ${door}`:"Here, waiting for a door",tone:"wait"};
  if(Kn(k,t)>An)return{txt:"Late, hasn't checked in",tone:"late"};
  return{txt:"Booked",tone:""};
},
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
}`,
ZZCP=({doc:e,now:t,actions:a,onExit:r,openShipment:n,customerId:o})=>{
  let A=e.customers.find(k=>k.id===o),y=Ln(e,o,t),w=ie(e.settings?.crew,3),b=!!A?.dispatch,
    TABS=["schedule","trucks","floor","damage","bills","chat"],
    [tab,setTab]=(0,H.useState)(()=>{let h=(location.hash||"").replace("#","");return h==="home"?"schedule":TABS.includes(h)?h:"schedule"}),
    [wk,setWk]=(0,H.useState)(0),[sel,setSel]=(0,H.useState)(null),[form,setForm]=(0,H.useState)(null),[flash,setFlash]=(0,H.useState)(""),
    [stmt,setStmt]=(0,H.useState)(!1),[past,setPast]=(0,H.useState)(!1),[shipped,setShipped]=(0,H.useState)(!1),[q,setQ]=(0,H.useState)(""),
    [mod,setMod]=(0,H.useState)(null),[who,setWho]=(0,H.useState)(()=>{try{return localStorage.getItem("cd6:zzname")||""}catch{return""}}),
    [note,setNote]=(0,H.useState)(""),[why,setWhy]=(0,H.useState)(""),[ok,setOk]=(0,H.useState)(!1),
    [tx,setTx]=(0,H.useState)({}),[wo,setWo]=(0,H.useState)(null),
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
    go=k=>{setTab(k);setFlash("");try{history.replaceState(null,"","#"+k)}catch{}window.scrollTo(0,0)};
  (0,H.useEffect)(()=>{if(tab==="chat"&&msgs!==seenMsgs){setSeenMsgs(msgs);try{localStorage.setItem(seenKey,String(msgs))}catch{}}},[msgs,tab]);

  /* ---------- shared bits ---------- */
  let btn=(label,onClick,cls,icon,dis)=>ZZh("button",{type:"button",className:"zz-btn "+(cls||""),onClick,disabled:dis},icon?ZZh(icon,{size:16}):null,label),
    inp=(val,set,ph,extra)=>ZZh("input",{className:"zz-inp",value:val,placeholder:ph||"",onChange:v=>set(v.target.value),...(extra||{})}),
    fl=(label,el)=>ZZh("label",{className:"zz-fl"},label,el),
    dt2=d=>d?new Date(d).toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"No time set",
    loadsOf=k=>e.shipments.filter(s=>k.direction==="inbound"?s.trailerInId===k.id:s.trailerOutId===k.id),
    truckName=k=>k.truck?`Truck ${k.truck}`:(k.carrier&&k.carrier!==A?.name?k.carrier:"Truck # not set"),
    pltTxt=(k,pl)=>pl?`${pl} plt`:(k.direction==="inbound"?"no loads listed":"loads not picked yet"),
    dirName=k=>k.direction==="inbound"?"Drop-off":"Pickup",
    freeNote=k=>{let p=ha(k,t),wk2=(fe(k)*y.storageMonthly)/4;return k.receivedAt&&!k.shippedAt&&p.phase!=="waiting"?(p.phase==="storage"?`Storage running, ${Fe(wk2)} a week`:`Free until ${ge(Na(k))}`):"—"},
    newForm=(date,kind,extra)=>{let d=date||new Date(t);setFlash("");setForm({date:ZZiso(d),time:"08:00",kind:kind||"drop",
      loads:[{id:Ce(),ref:"",pallets:"",lane:"reno",more:!1,bol:"",po:"",deliverBy:"",notes:""}],pick:kind==="pick"?free.map(k=>k.id):[],
      carrier:"",truck:"",trailer:"",driver:"",phone:"",notes:"",err:"",...(extra||{})})};

  /* ---------- truck row used on the Trucks tab ---------- */
  let truckRow=k=>{let st=ZZtStatus(k,e.shipments,t),w2=ZZwhen(k),pl=ZZplt(k,e.shipments);
    return ZZh("button",{key:k.id,type:"button",className:"zz-row",onClick:()=>setSel(k.id)},
      ZZh("div",{className:"zz-when"},ZZh("b",null,w2?at(w2):"—"),w2?new Date(w2).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"}):""),
      ZZh("div",{className:"m"},ZZh("b",null,`${dirName(k)} \xB7 ${pltTxt(k,pl)} \xB7 ${truckName(k)}`),
        ZZh("span",null,ZZh("i",{className:"zz-dot "+st.tone}),` ${st.txt}${k.truck&&k.carrier&&k.carrier!==A?.name?" \xB7 "+k.carrier:""}`)),
      ZZh(qa,{size:18,style:{color:m.dim,flexShrink:0}}))};

  /* ---------- SCHEDULE ---------- */
  let schedule=()=>{
    let mon=ZZsow(t);mon.setDate(mon.getDate()+wk*7);
    let days=[...Array(7)].map((_,k)=>{let d=new Date(mon);d.setDate(d.getDate()+k);return d}),
      today=new Date(t);today.setHours(0,0,0,0);
    let sun=days[6],range=`${mon.toLocaleDateString([],{month:"short",day:"numeric"})} – ${sun.toLocaleDateString([],{month:"short",day:"numeric"})}`;
    return[
      flash?ZZh("div",{key:"fl",className:"zz-flash"},ZZh(Ze,{size:18}),flash):null,
      (waiting.length||clock.length)?ZZh("div",{key:"nt",className:"zz-notes"},
        waiting.length?ZZh("div",{className:"zz-note"},ZZh(wr,{size:17}),ZZh("span",null,ZZh("b",null,`${waiting.length} damage report${waiting.length>1?"s need":" needs"} your answer.`)," See photos and the cost to fix."),ZZh("button",{className:"zz-link",onClick:()=>go("damage")},"Review")):null,
        clock.length?ZZh("div",{className:"zz-note"},ZZh(Fd,{size:17}),ZZh("span",null,ZZh("b",null,`${clock.length} load${clock.length>1?"s are":" is"} past or near free time.`)," Book a pickup to stop storage."),ZZh("button",{className:"zz-link",onClick:()=>newForm(null,"pick")},"Book pickup")):null):null,
      ZZh("div",{key:"bar",className:"zz-bar"},
        ZZh("div",null,ZZh("h1",{className:"zz-h1"},wk===0?"This week":wk===1?"Next week":wk===-1?"Last week":"Week of "+mon.toLocaleDateString([],{month:"short",day:"numeric"})),ZZh("p",{className:"zz-sub"},`${range} \xB7 tap a day to add a truck, tap a truck to see its loads`)),
        ZZh("div",{style:{display:"flex",gap:6,alignItems:"center"}},
          ZZh("button",{className:"zz-icon","aria-label":"Previous week",onClick:()=>setWk(wk-1)},ZZh(jd,{size:18})),
          wk!==0?btn("Today",()=>setWk(0),"ghost sm"):null,
          ZZh("button",{className:"zz-icon","aria-label":"Next week",onClick:()=>setWk(wk+1)},ZZh(qa,{size:18})),
          btn("Schedule a truck",()=>newForm(days.find(d=>d>=today)||today),"",wa))),
      ZZh("div",{key:"wk",className:"zz-week"},...days.map(d=>{
        let isPast=d<today,isToday=ZZsame(d,today),
          ev=M.filter(k=>ZZwhen(k)&&ZZsame(new Date(ZZwhen(k)),d)).sort((k,_)=>new Date(ZZwhen(k))-new Date(ZZwhen(_)));
        return ZZh("div",{key:d.toISOString(),className:"zz-day"+(isToday?" today":"")+(isPast?" past":"")},
          ZZh("div",{className:"zz-dh"},ZZh("b",null,isToday?"Today":d.toLocaleDateString([],{weekday:"short"})),ZZh("span",null,d.toLocaleDateString([],{month:"short",day:"numeric"}))),
          ZZh("div",{className:"zz-db"},
            ...ev.map(k=>{let st=ZZtStatus(k,e.shipments,t),pl=ZZplt(k,e.shipments);
              return ZZh("button",{key:k.id,type:"button",className:"zz-ev"+(k.stage==="cancelled"?" cx":""),onClick:()=>setSel(k.id)},
                ZZh("div",{className:"t"},at(ZZwhen(k))),
                ZZh("div",{className:"n"},`${dirName(k)} \xB7 ${pltTxt(k,pl)}`),
                ZZh("div",{className:"s"},ZZh("i",{className:"zz-dot "+st.tone}),ZZh("span",null,`${truckName(k)} \xB7 ${st.txt}`)))}),
            !ev.length&&isPast?ZZh("div",{className:"zz-empty"},"No trucks"):null,
            !isPast?ZZh("button",{type:"button",className:"zz-add",onClick:()=>newForm(d)},"+ Add truck"):null))})),
      ZZh("div",{key:"two",className:"zz-2"},
        ZZh("section",{className:"zz-panel"},
          ZZh("div",{className:"zz-bar",style:{marginBottom:6}},ZZh("div",null,ZZh("h2",{className:"zz-h2"},"On the floor now"),ZZh("p",{className:"zz-sub"},`${pallets} pallets in ${floor.length} load${floor.length===1?"":"s"}`)),ZZh("button",{className:"zz-link",onClick:()=>go("floor")},"See all")),
          floor.length?ZZh("div",{className:"zz-list"},...floor.slice(0,5).map(k=>ZZh("button",{key:k.id,type:"button",className:"zz-row",onClick:()=>n(k)},
            ZZh("div",{className:"m"},ZZh("b",null,`Load ${k.ref}`),ZZh("span",null,`${ZZlane[be(k)]} \xB7 ${freeNote(k)}`)),ZZh("div",{className:"r"},ZZh("b",null,fe(k))," plt")))):ZZh("div",{className:"zz-empty",style:{padding:0}},"Nothing on our floor right now."),
          free.length?ZZh("div",{style:{marginTop:10}},btn("Book a pickup",()=>newForm(null,"pick"),"ghost sm",Sa)):null),
        ZZh("section",{className:"zz-panel"},
          ZZh("div",{className:"zz-bar",style:{marginBottom:6}},ZZh("div",null,ZZh("h2",{className:"zz-h2"},"Coming in"),ZZh("p",{className:"zz-sub"},`${booked.length} booked truck${booked.length===1?"":"s"} \xB7 ${comingPlt} pallets coming in`)),ZZh("button",{className:"zz-link",onClick:()=>go("trucks")},"All trucks")),
          booked.length?ZZh("div",{className:"zz-list"},...booked.slice(0,5).map(truckRow)):ZZh("div",{className:"zz-empty",style:{padding:0}},"Nothing booked. Tap a day above to add a truck.")))];
  };

  /* ---------- TRUCKS ---------- */
  let trucks=()=>[
    ZZh("div",{key:"b",className:"zz-bar"},ZZh("div",null,ZZh("h1",{className:"zz-h1"},"Trucks"),ZZh("p",{className:"zz-sub"},"Live status of every truck we're handling for you.")),btn("Schedule a truck",()=>newForm(),"",wa)),
    ZZh("section",{key:"d",className:"zz-panel",style:{marginBottom:16}},ZZh("h2",{className:"zz-h2"},`At our dock now \xB7 ${atDock.length}`),ZZh("p",{className:"zz-sub",style:{marginBottom:6}},"Unloading, loading or waiting for a door."),
      atDock.length?ZZh("div",{className:"zz-list"},...atDock.map(truckRow)):ZZh("div",{className:"zz-empty",style:{padding:0}},"No trucks at our dock right now.")),
    ZZh("section",{key:"u",className:"zz-panel",style:{marginBottom:16}},ZZh("h2",{className:"zz-h2"},`Booked \xB7 ${booked.length}`),ZZh("p",{className:"zz-sub",style:{marginBottom:6}},"Scheduled and on the way."),
      booked.length?ZZh("div",{className:"zz-list"},...booked.map(truckRow)):ZZh("div",{className:"zz-empty",style:{padding:0}},"Nothing booked.")),
    pastT.length?ZZh("section",{key:"p",className:"zz-panel"},ZZh("button",{className:"zz-link",style:{color:m.text},onClick:()=>setPast(!past)},ZZh("span",{className:"zz-h2"},`${past?"▾":"▸"} Past trucks \xB7 ${pastT.length}`)),
      past?ZZh("div",{className:"zz-list",style:{marginTop:6}},...pastT.map(truckRow)):null):null];

  /* ---------- ON THE FLOOR ---------- */
  let floorTab=()=>{let f=k=>!q||(k.ref||"").toLowerCase().includes(q.toLowerCase())||(k.po||"").toLowerCase().includes(q.toLowerCase()),
    tbl=(list,cols)=>ZZh("div",null,ZZh("div",{className:"zz-tblw zz-wide"},ZZh("table",{className:"zz-tbl"},
      ZZh("thead",null,ZZh("tr",null,...cols.map(c=>ZZh("th",{key:c[0],className:c[2]||""},c[0])))),
      ZZh("tbody",null,...list.map(k=>ZZh("tr",{key:k.id,className:"click",onClick:()=>n(k)},...cols.map(c=>ZZh("td",{key:c[0],className:c[2]||""},c[1](k)))))))),
      ZZh("div",{className:"zz-list zz-narrow"},...list.map(k=>ZZh("button",{key:k.id,type:"button",className:"zz-row",onClick:()=>n(k)},
        ZZh("div",{className:"m"},ZZh("b",null,`Load ${k.ref}`),...cols.slice(2).map(c=>ZZh("span",{key:c[0]},`${c[0]}: `,c[1](k)))),ZZh("div",{className:"r"},ZZh("b",null,cols[1][1](k)),cols[1][0]==="Pallets"?" plt":"")))));
    return[
      ZZh("div",{key:"b",className:"zz-bar"},ZZh("div",null,ZZh("h1",{className:"zz-h1"},"On the floor"),ZZh("p",{className:"zz-sub"},`${pallets} pallets in ${floor.length} loads \xB7 first 24 hours free`)),
        ZZh("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},ZZh("input",{className:"zz-inp",style:{width:220},value:q,placeholder:"Search load or PO",onChange:v=>setQ(v.target.value)}),free.length?btn("Book a pickup",()=>newForm(null,"pick"),"",Sa):null)),
      ZZh("section",{key:"f",className:"zz-panel",style:{marginBottom:16}},floor.filter(f).length?tbl(floor.filter(f),[["Load",k=>ZZh("b",null,k.ref)],["Pallets",k=>fe(k),"num"],["In since",k=>ge(k.receivedAt)],["Goes to",k=>ZZlane[be(k)]],["Storage",k=>freeNote(k)],["Pickup",k=>k.trailerOutId?"Booked":"—"]]):ZZh("div",{className:"zz-empty",style:{padding:0}},q?"No match.":"Nothing on our floor right now.")),
      coming.filter(f).length?ZZh("section",{key:"c",className:"zz-panel",style:{marginBottom:16}},ZZh("h2",{className:"zz-h2",style:{marginBottom:6}},`On trucks coming to us \xB7 ${comingPlt} pallets`),
        tbl(coming.filter(f),[["Load",k=>ZZh("b",null,k.ref)],["Pallets",k=>fe(k),"num"],["Truck",k=>{let tr=e.trailers.find(x=>x.id===k.trailerInId);return tr?`${truckName(tr)} \xB7 ${dt2(tr.scheduledAt)}`:"—"}],["Goes to",k=>ZZlane[be(k)]]])):null,
      ZZh("section",{key:"s",className:"zz-panel"},ZZh("button",{className:"zz-link",style:{color:m.text},onClick:()=>setShipped(!shipped)},ZZh("span",{className:"zz-h2"},`${shipped?"▾":"▸"} Shipped \xB7 ${done.length}`)),
        shipped?(done.filter(f).length?ZZh("div",{style:{marginTop:8}},tbl(done.filter(f).slice(0,40),[["Load",k=>ZZh("b",null,k.ref)],["Pallets",k=>fe(k),"num"],["Shipped",k=>ge(k.shippedAt)],["Charges",k=>je(ur(k,y,t)),"num"]])):ZZh("div",{className:"zz-empty"},"Nothing shipped yet.")):null)];
  };

  /* ---------- DAMAGE ---------- */
  let dmgCard=({s,x})=>{
    let est=ZZestOf(s,x,y),ans=x.answer,need=ZZneeds(s,x,y),tr=e.trailers.find(k=>k.id===s.trailerInId),hasCost=est.total>0;
    return ZZh("section",{key:x.id,className:"zz-panel",style:{marginBottom:14,borderColor:need?m.orange:m.line}},
      ZZh("div",{className:"zz-bar",style:{marginBottom:8,alignItems:"flex-start"}},
        ZZh("div",null,ZZh("h2",{className:"zz-h2"},`${x.kind} on load ${s.ref}`),ZZh("p",{className:"zz-sub"},`Reported ${ge(x.at)}${x.openedBy?" by "+x.openedBy:""}${tr?.truck?" \xB7 truck "+tr.truck:""}`)),
        x.resolved?ZZpill("Closed",m.green):need?ZZpill(hasCost?"Needs your answer":"New",m.orange):ZZstatus(x)),
      ZZh("p",{style:{margin:"0 0 10px",fontSize:15}},x.note||"No notes."),
      ZZh(lr,{ownerId:dt.off(s.id),size:84,label:"Photos",empty:"No photos yet. Ask us in Messages."}),
      hasCost?ZZh("div",{style:{marginTop:12}},ZZh("b",null,"What it costs to fix"),ZZtable(est),ZZh("p",{className:"zz-sub",style:{marginTop:6}},"Approved charges go on your next bill for this load.")):ZZh("p",{className:"zz-sub",style:{marginTop:10}},"No extra charges on this one."),
      !x.resolved&&(!ans||ans.status==="call")&&hasCost&&ZZh("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}},
        btn(`Accept ${je(est.total)}`,()=>{setNote("");setOk(!1);setMod({type:"accept",s,x})},"ok",Ze),
        btn("Decline",()=>{setNote("");setWhy("");setMod({type:"decline",s,x})},"danger",dn),
        btn("Call or message us",()=>{setNote("");setMod({type:"call",s,x})},"ghost",un)),
      !x.resolved&&!hasCost&&!x.seenAt&&ZZh("div",{style:{marginTop:12}},btn("Got it",()=>a.ackException(s.id,x.id),"",Ze)),
      ans&&ZZh("p",{style:{marginTop:12,fontSize:14,color:ans.status==="accepted"?m.green:ans.status==="declined"?m.red:m.blue}},
        ans.status==="accepted"?`Approved by ${ans.by} on ${ge(ans.at)}.`:ans.status==="declined"?`Declined by ${ans.by} on ${ge(ans.at)}${ans.note?": "+ans.note:""}. We'll call you to sort it out.`:`${ans.by} asked for a call on ${ge(ans.at)}. We'll reach out. Need us now? Call ${ZZPHONE}.`),
      ZZh("div",{style:{marginTop:10}},ZZh("button",{className:"zz-link",onClick:()=>n(s)},"See the full load")));
  };
  let damage=()=>[
    ZZh("div",{key:"h",className:"zz-bar"},ZZh("div",null,ZZh("h1",{className:"zz-h1"},"Damage"),ZZh("p",{className:"zz-sub"},"When we find damage you get photos and the cost to fix. Accept, decline, or talk to us first."))),
    probs.length===0?ZZh("div",{key:"e",className:"zz-panel zz-empty"},"No damage or problems reported."):null,
    ...waiting.map(dmgCard),...openProbs.filter(p=>!waiting.includes(p)).map(dmgCard),
    probs.some(p=>p.x.resolved)?ZZh("h2",{key:"cl",className:"zz-h2",style:{margin:"18px 0 10px",color:m.mut}},"Closed"):null,
    ...probs.filter(p=>p.x.resolved).slice(0,10).map(dmgCard)];

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
        ZZh("li",null,"Damage charges are only added after you approve them.")))),
    stmt&&ZZh(Kj,{key:"k",customerId:o,doc:e,now:t,onClose:()=>setStmt(!1)})];

  /* ---------- MESSAGES ---------- */
  let chat=()=>[
    ZZh("div",{key:"h",className:"zz-bar"},ZZh("div",null,ZZh("h1",{className:"zz-h1"},"Messages"),ZZh("p",{className:"zz-sub"},`Talk to our Reno office. A real person answers, Mon–Fri 6am–10pm. Urgent? Call ${ZZPHONE}.`))),
    ZZh("section",{key:"c",className:"zz-panel"},ZZh("p",{className:"zz-sub",style:{marginBottom:10}},"Tip: type # and a load number (like #112045) and the message is saved on that load too."),
      ZZh(Uj,{customerId:o,doc:e,actions:a,as:"dispatcher",openShipment:n,onOpenTrailer:k=>setSel(k.id)}))];

  /* ---------- schedule-a-truck form ---------- */
  let formSheet=()=>{
    if(!form)return null;let f=form,setF=p=>setForm({...f,...p,err:""}),
      setL=(id,p)=>setF({loads:f.loads.map(l=>l.id===id?{...l,...p}:l)}),
      d=f.date&&f.time?new Date(`${f.date}T${f.time}`):null,
      ah=d&&(d.getDay()===0||d.getDay()===6||d.getHours()<6||d.getHours()>=22),
      used=f.loads.filter(l=>l.ref.trim()||String(l.pallets).trim()),
      totalIn=used.reduce((s2,l)=>s2+ie(l.pallets),0),
      picked=free.filter(k=>f.pick.includes(k.id)),totalOut=picked.reduce((s2,k)=>s2+fe(k),0),
      submit=()=>{
        if(!d||isNaN(d))return setForm({...f,err:"Pick a day and a time."});
        if(d.getTime()<t-60*6e4)return setForm({...f,err:"That time has already passed. Pick a later time."});
        if(f.kind==="drop"){if(!used.length)return setForm({...f,err:"Add at least one load with its pallet count."});if(used.some(l=>!(ie(l.pallets)>0)))return setForm({...f,err:"Every load needs a pallet count."})}
        else if(!picked.length)return setForm({...f,err:"Tick at least one load to pick up."});
        let inb=f.kind==="drop";
        a.addTrailer({truck:f.truck.trim(),trailer:f.trailer.trim(),carrier:f.carrier.trim(),driver:f.driver.trim(),phone:f.phone.trim(),
          direction:inb?"inbound":"outbound",jobType:inb?(used.every(l=>l.lane==="other")?"Long-term storage":used.some(l=>l.lane==="sac")?"Consolidate & reload":"Cross-dock"):"Reno pickup",
          customerId:o,scheduledAt:d.toISOString(),notes:[f.notes.trim(),b?"":"Requested by customer"].filter(Boolean).join(" \xB7 "),
          lines:inb?used.map(l=>({id:l.id,ref:l.ref.trim(),bol:l.bol.trim(),po:l.po.trim(),lane:l.lane,units:{std:ie(l.pallets),lg:0,crate:0},commodity:"",dest:"",deliverBy:l.deliverBy,loadNotes:l.notes.trim(),scans:[]})):[],
          pickupIds:inb?[]:picked.map(k=>k.id)});
        let off=Math.round((ZZsow(d)-ZZsow(t))/(7*864e5));setWk(off);setForm(null);setTab("schedule");
        setFlash(`${inb?"Drop-off":"Pickup"} added for ${dt2(d)} \xB7 ${inb?totalIn:totalOut} pallets.${b?"":" We'll confirm the time."}`);window.scrollTo(0,0)};
    return ZZh(Gt,{open:!0,wide:!0,onClose:()=>setForm(null),title:"Schedule a truck"},
      ZZh("div",{className:"zz zz-f",style:{minHeight:0,background:"transparent"}},
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"When"),
          ZZh("div",{className:"zz-g2"},fl("Day",ZZh("input",{type:"date",className:"zz-inp",value:f.date,min:ZZiso(new Date(t)),onChange:v=>setF({date:v.target.value})})),
            fl("Time",ZZh("select",{className:"zz-inp",value:f.time,onChange:v=>setF({time:v.target.value})},...ZZtimes.map(([v2,l2])=>ZZh("option",{key:v2,value:v2},l2))))),
          ah?ZZh("div",{className:"hint",style:{color:m.amber,marginTop:0}},`Outside Mon–Fri 6am–10pm. A ${je(y.afterHours)} after-hours fee applies.`):null),
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"What's the truck doing?"),
          ZZh("div",{className:"zz-opts"},
            ZZh("button",{type:"button",className:"zz-opt","aria-pressed":f.kind==="drop",onClick:()=>setF({kind:"drop"})},ZZh("i",{className:"rd"}),ZZh("div",null,ZZh("b",null,"Dropping off at your dock"),ZZh("span",null,"Inbound trailer with one or more loads"))),
            ZZh("button",{type:"button",className:"zz-opt","aria-pressed":f.kind==="pick",onClick:()=>setF({kind:"pick",pick:f.pick.length?f.pick:free.map(k=>k.id)}),disabled:!free.length},ZZh("i",{className:"rd"}),ZZh("div",null,ZZh("b",null,"Picking up from your dock"),ZZh("span",null,free.length?`${free.reduce((s2,k)=>s2+fe(k),0)} pallets on the floor ready`:"Nothing on the floor to pick up"))))),
        f.kind==="drop"?ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Loads on this trailer"),ZZh("div",{className:"hint"},"One row per load (BOL or PO). Add as many as the trailer carries."),
          ...f.loads.map((l,ix)=>ZZh("div",{key:l.id,className:"zz-load"},
            fl(`Load ${ix+1}: number or PO`,ZZh("input",{className:"zz-inp",value:l.ref,placeholder:"e.g. 112045",onChange:v=>setL(l.id,{ref:v.target.value})})),
            fl("Pallets",ZZh("input",{className:"zz-inp",value:l.pallets,inputMode:"numeric",placeholder:"0",onChange:v=>setL(l.id,{pallets:v.target.value.replace(/\D/g,"").slice(0,4)})})),
            ZZh("label",{className:"zz-fl ln"},"After we unload it",ZZh("select",{className:"zz-inp",value:l.lane,onChange:v=>setL(l.id,{lane:v.target.value})},...Object.entries(ZZlane).map(([k2,v2])=>ZZh("option",{key:k2,value:k2},v2)))),
            ZZh("button",{type:"button",className:"zz-icon x","aria-label":`Remove load ${ix+1}`,disabled:f.loads.length===1,onClick:()=>setF({loads:f.loads.filter(z2=>z2.id!==l.id)})},ZZh(dn,{size:16})),
            ZZh("div",{style:{gridColumn:"1/-1"}},ZZh("button",{type:"button",className:"zz-link",style:{fontSize:13},onClick:()=>setL(l.id,{more:!l.more})},l.more?"Hide BOL, PO and notes":"Add BOL, PO, deliver-by date or notes")),
            l.more?ZZh("div",{className:"zz-more"},fl("BOL",ZZh("input",{className:"zz-inp",value:l.bol,onChange:v=>setL(l.id,{bol:v.target.value})})),fl("PO",ZZh("input",{className:"zz-inp",value:l.po,onChange:v=>setL(l.id,{po:v.target.value})})),fl("Deliver by",ZZh("input",{type:"date",className:"zz-inp",value:l.deliverBy,onChange:v=>setL(l.id,{deliverBy:v.target.value})})),
              ZZh("label",{className:"zz-fl",style:{gridColumn:"1/-1"}},"How it's loaded / notes",ZZh("input",{className:"zz-inp",value:l.notes,placeholder:"Double stacked, strapped, fragile…",onChange:v=>setL(l.id,{notes:v.target.value})}))):null)),
          ZZh("div",null,btn("+ Add another load",()=>setF({loads:[...f.loads,{id:Ce(),ref:"",pallets:"",lane:f.loads[f.loads.length-1]?.lane||"reno",more:!1,bol:"",po:"",deliverBy:"",notes:""}]}),"ghost sm")),
          ZZh("div",{className:"zz-total"},ZZh("span",null,`${used.length} load${used.length===1?"":"s"} on this trailer`),ZZh("span",null,`${totalIn} pallets`)))
        :ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Which loads go on the truck?"),
          ...free.map(k=>{let on=f.pick.includes(k.id);return ZZh("label",{key:k.id,className:"zz-pick",style:{borderColor:on?m.orange:m.line}},
            ZZh("input",{type:"checkbox",checked:on,onChange:()=>setF({pick:on?f.pick.filter(z2=>z2!==k.id):[...f.pick,k.id]})}),
            ZZh("div",{style:{flex:1,minWidth:0}},ZZh("b",null,`Load ${k.ref}`),ZZh("div",{className:"zz-sub",style:{margin:0}},`${$e(k)} \xB7 in since ${ge(k.receivedAt)} \xB7 ${freeNote(k)}`)),ZZh("b",{style:{fontVariantNumeric:"tabular-nums"}},`${fe(k)} plt`))}),
          ZZh("div",{className:"zz-total"},ZZh("span",null,`${picked.length} load${picked.length===1?"":"s"} selected`),ZZh("span",null,`${totalOut} pallets`))),
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Truck and driver"),ZZh("div",{className:"hint"},"Optional. Don't know yet? Add it later from the truck."),
          ZZh("div",{className:"zz-g2"},fl("Carrier",inp(f.carrier,v=>setF({carrier:v}),"Company hauling it")),fl("Driver phone",inp(f.phone,v=>setF({phone:v}),"775-555-0100",{type:"tel",inputMode:"tel"})),
            fl("Truck number",inp(f.truck,v=>setF({truck:v}),"e.g. 4521")),fl("Trailer number",inp(f.trailer,v=>setF({trailer:v}),"e.g. T880")),
            fl("Driver name",inp(f.driver,v=>setF({driver:v}),"First and last")))),
        ZZh("div",{className:"zz-fs"},fl("Notes for the crew (optional)",ZZh("textarea",{className:"zz-inp",rows:2,value:f.notes,placeholder:"Liftgate, call ahead, load order…",onChange:v=>setF({notes:v.target.value})}))),
        f.err?ZZh("div",{className:"zz-err",role:"alert"},f.err):null,
        ZZh("div",{style:{display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap"}},btn("Cancel",()=>setForm(null),"ghost"),btn(b?"Add to schedule":"Send request",submit,"",Ze))));
  };

  /* ---------- truck sheet ---------- */
  let truckSheet=()=>{
    let k=sel&&e.trailers.find(z2=>z2.id===sel);if(!k)return null;
    let inb=k.direction==="inbound",L=loadsOf(k),st=ZZtStatus(k,e.shipments,t),sched=k.stage==="scheduled",tot=L.reduce((s2,z2)=>s2+fe(z2),0),
      T=tx[k.id]||{},setT=p=>setTx({...tx,[k.id]:{...T,...p}}),
      w2=ZZwhen(k),wd=w2?new Date(w2):null,
      addOK=(T.ref||"").trim()&&ie(T.plt)>0,
      loadSt=s2=>inb?(s2.receivedAt?(s2.qc?.counted!=null?`Off, counted ${s2.qc.counted}`:"Off the truck"):"On the truck"):(s2.shippedAt?"Shipped":s2.loadedAt?"Loaded":"Planned");
    return ZZh(Gt,{open:!0,wide:!0,onClose:()=>{setSel(null)},title:`${dirName(k)} \xB7 ${truckName(k)}`},
      ZZh("div",{className:"zz zz-f",style:{minHeight:0,background:"transparent"}},
        ZZh("div",null,ZZh("div",{style:{fontSize:17,fontWeight:800}},dt2(w2)),ZZh("div",{style:{display:"flex",gap:6,alignItems:"baseline",color:m.mut,fontSize:14.5}},ZZh("i",{className:"zz-dot "+st.tone}),st.txt)),
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},inb?"Loads on this trailer":"Loads going on this truck"),
          L.length?ZZh("div",{className:"zz-tblw"},ZZh("table",{className:"zz-tbl"},
            ZZh("thead",null,ZZh("tr",null,ZZh("th",null,"Load"),ZZh("th",{className:"num"},"Pallets"),ZZh("th",null,inb?"After unload":"From"),ZZh("th",null,"Status"),ZZh("th",null,""))),
            ZZh("tbody",null,...L.map(s2=>ZZh("tr",{key:s2.id},ZZh("td",null,ZZh("button",{className:"zz-link",style:{color:m.text},onClick:()=>{setSel(null);n(s2)}},s2.ref)),ZZh("td",{className:"num"},fe(s2)),ZZh("td",null,inb?ZZlane[be(s2)]:"Our floor"),ZZh("td",null,loadSt(s2)),
              ZZh("td",{className:"num"},sched&&(inb?!s2.receivedAt:!s2.loadedAt)?ZZh("button",{className:"zz-link",style:{color:m.red,fontSize:13},onClick:()=>inb?a.zzRemoveLoad(s2.id):a.planOnto(s2.id,null)},"Remove"):null)))),
            ZZh("tfoot",null,ZZh("tr",null,ZZh("td",null,`${L.length} load${L.length===1?"":"s"}`),ZZh("td",{className:"num"},tot),ZZh("td",{colSpan:3},"pallets"))))):ZZh("div",{className:"zz-empty",style:{padding:0}},"No loads listed yet."),
          sched&&inb?ZZh("div",{className:"zz-load",style:{marginTop:4}},
            fl("Add a load: number or PO",ZZh("input",{className:"zz-inp",value:T.ref||"",placeholder:"e.g. 112046",onChange:v=>setT({ref:v.target.value})})),
            fl("Pallets",ZZh("input",{className:"zz-inp",value:T.plt||"",inputMode:"numeric",placeholder:"0",onChange:v=>setT({plt:v.target.value.replace(/\D/g,"").slice(0,4)})})),
            ZZh("label",{className:"zz-fl ln"},"After we unload it",ZZh("select",{className:"zz-inp",value:T.lane||"reno",onChange:v=>setT({lane:v.target.value})},...Object.entries(ZZlane).map(([k2,v2])=>ZZh("option",{key:k2,value:k2},v2)))),
            ZZh("button",{type:"button",className:"zz-icon x","aria-label":"Add load",disabled:!addOK,style:{background:addOK?m.orange:m.panel,color:addOK?"#fff":m.dim},onClick:()=>{a.zzAddLoad(k.id,{ref:T.ref.trim(),units:{std:ie(T.plt)},lane:T.lane||"reno"});setT({ref:"",plt:""})}},ZZh(wa,{size:18}))):null,
          sched&&!inb&&free.length?ZZh("div",{style:{display:"grid",gap:6,marginTop:4}},ZZh("div",{className:"zz-sub"},"Add from the floor:"),
            ...free.map(s2=>ZZh("div",{key:s2.id,className:"zz-pick",style:{cursor:"default"}},ZZh("div",{style:{flex:1}},ZZh("b",null,`Load ${s2.ref}`),ZZh("span",{className:"zz-sub"},` \xB7 ${fe(s2)} plt \xB7 ${freeNote(s2)}`)),btn("Add",()=>a.planOnto(s2.id,k.id),"ghost sm",wa)))):null),
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Truck and driver"),
          ZZh("div",{className:"zz-kv"},...[["Carrier",k.carrier],["Truck",k.truck],["Trailer",k.trailer],["Driver",k.driver],["Driver phone",k.phone],["Door",k.dock&&k.dock!==Ee?k.dock:"Not yet"]].map(([l2,v2])=>ZZh("div",{key:l2},ZZh("span",null,l2),v2||"—"))),
          k.notes?ZZh("p",{className:"zz-sub"},`Notes: ${k.notes}`):null),
        sched?ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Change the time"),
          ZZh("div",{className:"zz-g2"},fl("Day",ZZh("input",{type:"date",className:"zz-inp",value:T.date||(wd?ZZiso(wd):""),onChange:v=>setT({date:v.target.value})})),
            fl("Time",ZZh("select",{className:"zz-inp",value:T.time||(wd?`${String(wd.getHours()).padStart(2,"0")}:${wd.getMinutes()<30?"00":"30"}`:"08:00"),onChange:v=>setT({time:v.target.value})},...ZZtimes.map(([v2,l2])=>ZZh("option",{key:v2,value:v2},l2))))),
          (T.date||T.time)?ZZh("div",null,btn("Save new time",()=>{let dd=T.date||(wd?ZZiso(wd):ZZiso(new Date(t))),tt=T.time||"08:00",nd=new Date(`${dd}T${tt}`);if(!isNaN(nd)){a.patchTrailer(k.id,{scheduledAt:nd.toISOString()});setT({date:"",time:""});setWk(Math.round((ZZsow(nd)-ZZsow(t))/(7*864e5)))}},"sm")):null):null,
        ZZh("div",{className:"zz-fs"},ZZh("div",{className:"lbl"},"Message the dock about this truck"),
          ...(k.chat||[]).slice(-3).map(c2=>ZZh("div",{key:c2.id,className:"zz-msg"},ZZh("b",null,`${c2.who||c2.from}: `),c2.text,ZZh("span",{className:"zz-sub"},` \xB7 ${ge(c2.at)}`))),
          ZZh("div",{style:{display:"flex",gap:8}},ZZh("input",{className:"zz-inp",value:T.msg||"",placeholder:"Driver is running 30 min late…",onChange:v=>setT({msg:v.target.value})}),btn("Send",()=>{if((T.msg||"").trim()){a.sendTrailerChat(k.id,"dispatcher",T.msg.trim());setT({msg:""})}},"",un,!(T.msg||"").trim()))),
        ZZh("div",{style:{display:"flex",gap:8,flexWrap:"wrap",borderTop:`1px solid ${m.line}`,paddingTop:14}},
          btn("Work order",()=>setWo(k.id),"ghost",Ct),
          btn("Book this again next week",()=>{let nd=new Date(wd||t);nd.setDate(nd.getDate()+7);setSel(null);newForm(nd,inb?"drop":"pick",{time:wd?`${String(wd.getHours()).padStart(2,"0")}:${wd.getMinutes()<30?"00":"30"}`:"08:00",carrier:k.carrier||"",truck:k.truck||"",trailer:k.trailer||"",driver:k.driver||"",phone:k.phone||"",
            loads:inb&&L.length?L.map(s2=>({id:Ce(),ref:"",pallets:String(fe(s2)),lane:be(s2),more:!1,bol:"",po:"",deliverBy:"",notes:s2.loadNotes||""})):[{id:Ce(),ref:"",pallets:"",lane:"reno",more:!1,bol:"",po:"",deliverBy:"",notes:""}]})},"ghost",qd),
          sched?(T.cx?ZZh("span",{style:{display:"inline-flex",gap:8,alignItems:"center",flexWrap:"wrap"}},ZZh("b",{style:{color:m.red}},"Cancel this truck?"),btn("Yes, cancel it",()=>{a.cancelTrailer(k.id,who.trim()||A?.name||"Customer");setSel(null);setFlash(`${truckName(k)} on ${dt2(w2)} was cancelled.`)},"danger sm"),btn("Keep it",()=>setT({cx:!1}),"ghost sm"))
            :btn("Cancel booking",()=>setT({cx:!0}),"danger",dn)):null)),
      wo===k.id&&ZZh(sx,{t:k,doc:e,now:t,onClose:()=>setWo(null)}));
  };

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

  let tabs=[
    {k:"schedule",label:"Schedule",icon:sn},
    {k:"trucks",label:"Trucks",icon:Ca,n:atDock.length,soft:!0},
    {k:"floor",label:"On the floor",icon:cn},
    {k:"damage",label:"Damage",icon:wr,n:waiting.length},
    {k:"bills",label:"Bills",icon:gl},
    {k:"chat",label:"Messages",icon:un,n:newMsgs}];
  return ZZh("div",{className:"zz"},
    ZZh("style",null,ZZCSS()),
    ZZh("div",{className:"zz-hdr"},
      ZZh("div",{className:"zz-top zzhd"},ZZh("div",{className:"zz-in"},
        ZZh("span",{className:"zzc",style:{display:"grid",placeItems:"center",width:34,height:34,background:"#A95A24",borderRadius:3,fontWeight:800,fontSize:16,flexShrink:0}},"24"),
        ZZh("div",{style:{flex:1,minWidth:0}},ZZh("div",{style:{fontWeight:800,fontSize:16.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}},A?.name||"Customer portal"),ZZh("div",{className:"text-xs"},"24 HR Crossdock \xB7 Reno")),
        ZZh(MA,{role:"client",doc:e,now:t,customerId:o,onShipment:n,onTrailer:k=>setSel(k.id)}),
        ZZh("button",{onClick:r,style:{display:"inline-flex",alignItems:"center",gap:6,background:"transparent",border:"1px solid rgba(255,255,255,.35)",borderRadius:6,padding:"7px 10px",fontWeight:700,fontSize:14,cursor:"pointer"}},ZZh(yl,{size:15}),"Sign out"))),
      ZZh("nav",{className:"zz-tabs","aria-label":"Portal"},ZZh("div",{className:"zz-in"},...tabs.map(k=>ZZh("button",{key:k.k,type:"button",className:"zz-tab",onClick:()=>go(k.k),"aria-current":tab===k.k?"page":void 0},
        ZZh(k.icon,{size:21}),ZZh("span",null,k.label),k.n?ZZh("i",{style:k.soft?{background:m.green}:void 0},k.n):null))))),
    ZZh("main",{className:"zz-main"},...[].concat(tab==="schedule"?schedule():tab==="trucks"?trucks():tab==="floor"?floorTab():tab==="damage"?damage():tab==="bills"?bills():chat())),
    truckSheet(),formSheet(),modal());
},
