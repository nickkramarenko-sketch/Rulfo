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

/* ================= Customer portal ================= */
ZZCP=({doc:e,now:t,actions:a,onExit:r,openShipment:n,customerId:o})=>{
  let A=e.customers.find(k=>k.id===o),y=Ln(e,o,t),w=ie(e.settings?.crew,3),b=!!A?.dispatch,
    [tab,setTab]=(0,H.useState)(()=>{let h=(location.hash||"").replace("#","");return["home","book","freight","damage","bills","chat"].includes(h)?h:"home"}),
    [truck,setTruck]=(0,H.useState)(null),[adv,setAdv]=(0,H.useState)(null),[stmt,setStmt]=(0,H.useState)(!1),
    [past,setPast]=(0,H.useState)(!1),[shipped,setShipped]=(0,H.useState)(!1),[q,setQ]=(0,H.useState)(""),
    [mod,setMod]=(0,H.useState)(null),[who,setWho]=(0,H.useState)(()=>{try{return localStorage.getItem("cd6:zzname")||""}catch{return""}}),
    [note,setNote]=(0,H.useState)(""),[why,setWhy]=(0,H.useState)(""),[ok,setOk]=(0,H.useState)(!1),
    blank={step:1,kind:"",after:"reno",pallets:1,ref:"",commodity:"",pick:null,day:"",hour:null,custom:"",carrier:"",driver:"",phone:"",truck:"",notes:""},
    [bk,setBk]=(0,H.useState)(blank),[booked,setBooked]=(0,H.useState)(null),
    S=e.shipments.filter(k=>k.customerId===o),
    floor=S.filter(k=>k.receivedAt&&!k.shippedAt),
    free=floor.filter(k=>!k.trailerOutId),
    coming=S.filter(k=>!k.receivedAt&&k.status!=="left-on-truck"),
    done=S.filter(k=>k.shippedAt).sort((k,_)=>new Date(_.shippedAt)-new Date(k.shippedAt)),
    M=e.trailers.filter(k=>k.customerId===o),
    live=M.filter(k=>k.stage!=="departed"&&k.stage!=="cancelled"),
    atDock=live.filter(k=>k.arrivedAt),
    upcoming=live.filter(k=>!k.arrivedAt).sort((k,_)=>new Date(k.scheduledAt||0)-new Date(_.scheduledAt||0)),
    pastT=M.filter(k=>k.stage==="departed"||k.stage==="cancelled").sort((k,_)=>new Date(_.departedAt||_.cancelledAt||0)-new Date(k.departedAt||k.cancelledAt||0)).slice(0,30),
    pallets=floor.reduce((k,_)=>k+fe(_),0),
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
    go=k=>{setTab(k);try{history.replaceState(null,"","#"+k)}catch{}window.scrollTo(0,0);if(k==="chat"){setSeenMsgs(msgs);try{localStorage.setItem(seenKey,String(msgs))}catch{}}},
    startBook=kind=>{setBooked(null);setBk({...blank,kind:kind||"",step:kind?2:1,pick:kind==="pickup"?free.map(k=>k.id):null});go("book")};
  (0,H.useEffect)(()=>{if(tab==="chat"&&msgs!==seenMsgs){setSeenMsgs(msgs);try{localStorage.setItem(seenKey,String(msgs))}catch{}}},[msgs,tab]);

  /* ---------- little building blocks ---------- */
  let C={maxWidth:880,margin:"0 auto",padding:"18px 16px 60px"},
    card=(ch,o)=>ZZh("div",{key:o&&o.key,style:{background:m.panel,border:`1px solid ${m.line}`,borderRadius:12,padding:18,marginBottom:14}},...[].concat(ch)),
    H2=(txt,sub)=>ZZh("div",{style:{marginBottom:10}},ZZh("div",{className:"zzc",style:{fontSize:24,fontWeight:800,lineHeight:1.1,color:m.text}},txt),sub?ZZh("div",{style:{fontSize:15,color:m.mut,marginTop:3}},sub):null),
    big=(label,onClick,kind,icon,dis)=>ZZh("button",{onClick,disabled:dis,style:{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,padding:"14px 20px",borderRadius:8,fontWeight:800,fontSize:16,cursor:dis?"not-allowed":"pointer",opacity:dis?.45:1,
      ...(kind==="go"?{background:m.orange,color:"#fff",border:`2px solid ${m.orange}`}:kind==="ok"?{background:m.green,color:"#fff",border:`2px solid ${m.green}`}:kind==="no"?{background:m.panel,color:m.red,border:`2px solid ${m.red}`}:kind==="dark"?{background:"#0F3B44",color:"#fff",border:"2px solid #0F3B44"}:{background:m.panel,color:m.text,border:`2px solid ${m.line}`})}},icon?ZZh(icon,{size:18}):null,label),
    empty=(txt)=>ZZh("div",{style:{fontSize:15,color:m.dim,background:m.raised,border:`1px solid ${m.line}`,borderRadius:10,padding:14}},txt),
    trucks=(list)=>ZZh("div",{className:"space-y-2"},...list.map(k=>ZZh(pm,{key:k.id,t:k,doc:e,now:t,crew:w,onOpen:setTruck}))),
    freeNote=k=>{let p=ha(k,t),wk=(fe(k)*y.storageMonthly)/4;return k.receivedAt&&!k.shippedAt&&p.phase!=="waiting"?(p.phase==="storage"?`Storage is running \xB7 ${Fe(wk)} each week it stays`:`Free until ${ge(Na(k))} \xB7 then ${Fe(wk)} a week`):null},
    tile=(label,value,sub,onClick,col)=>ZZh("button",{onClick,style:{textAlign:"left",background:m.panel,border:`1px solid ${m.line}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",color:m.text}},
      ZZh("div",{style:{fontSize:14,fontWeight:700,color:m.mut}},label),ZZh("div",{className:"zzc",style:{fontSize:34,fontWeight:800,lineHeight:1.05,color:col||m.text,fontVariantNumeric:"tabular-nums"}},value),ZZh("div",{style:{fontSize:13,color:m.dim}},sub));

  /* ---------- damage / problem card ---------- */
  let dmgCard=({s,x})=>{
    let est=ZZestOf(s,x,y),ans=x.answer,need=ZZneeds(s,x,y),tr=e.trailers.find(k=>k.id===s.trailerInId),hasCost=est.total>0;
    return ZZh("div",{key:x.id,style:{background:m.panel,border:`2px solid ${need?m.orange:m.line}`,borderRadius:12,padding:18,marginBottom:14}},
      ZZh("div",{style:{display:"flex",gap:10,alignItems:"flex-start",flexWrap:"wrap"}},
        ZZh(wr,{size:22,style:{color:x.resolved?m.mut:m.red,flexShrink:0,marginTop:2}}),
        ZZh("div",{style:{flex:1,minWidth:200}},
          ZZh("div",{className:"zzc",style:{fontSize:22,fontWeight:800,lineHeight:1.1}},`${x.kind} on load ${s.ref}`),
          ZZh("div",{style:{fontSize:14,color:m.mut,marginTop:2}},`Reported ${ge(x.at)}${x.openedBy?" by "+x.openedBy:""}${tr?.truck?" \xB7 truck "+tr.truck:""}`)),
        x.resolved?ZZpill("Closed",m.green):need?ZZpill(hasCost?"Needs your answer":"New",m.orange):ZZstatus(x)),
      ZZh("div",{style:{fontSize:16,margin:"12px 0 6px"}},x.note||"No notes."),
      ZZh(lr,{ownerId:dt.off(s.id),size:84,label:"Photos",empty:"No photos yet. Ask us in Messages."}),
      hasCost?ZZh("div",{style:{marginTop:14}},ZZh("div",{style:{fontWeight:800,fontSize:16}},"What it costs to fix"),ZZtable(est),
        ZZh("div",{style:{fontSize:13,color:m.dim,marginTop:6}},"Approved charges go on your next bill for this load.")):
        ZZh("div",{style:{fontSize:15,color:m.mut,marginTop:12}},"No extra charges on this one."),
      !x.resolved&&(!ans||ans.status==="call")&&hasCost&&ZZh("div",{style:{background:m.raised,borderRadius:10,padding:14,marginTop:14}},
        ZZh("div",{style:{fontWeight:800,fontSize:17,marginBottom:10}},ans?"Ready to decide?":"What would you like to do?"),
        ZZh("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}},
          big(`Accept ${je(est.total)}`,()=>{setNote("");setOk(!1);setMod({type:"accept",s,x})},"ok",Ze),
          big("Decline",()=>{setNote("");setWhy("");setMod({type:"decline",s,x})},"no",dn),
          big("Call or message us",()=>{setNote("");setMod({type:"call",s,x})},"dark",un))),
      !x.resolved&&!hasCost&&!x.seenAt&&ZZh("div",{style:{marginTop:12}},big("Got it",()=>a.ackException(s.id,x.id),"go",Ze)),
      ans&&ZZh("div",{style:{marginTop:12,fontSize:15,borderRadius:10,padding:12,background:ans.status==="accepted"?"rgba(30,138,90,.1)":ans.status==="declined"?"rgba(192,57,43,.08)":"rgba(37,99,168,.08)",color:ans.status==="accepted"?m.green:ans.status==="declined"?m.red:m.blue}},
        ans.status==="accepted"?`Approved by ${ans.by} on ${ge(ans.at)}. Thank you.`:ans.status==="declined"?`Declined by ${ans.by} on ${ge(ans.at)}${ans.note?": "+ans.note:""}. We'll call you to sort it out.`:`${ans.by} asked for a call on ${ge(ans.at)}. We'll reach out. Need us now? Call ${ZZPHONE}.`),
      ZZh("div",{style:{marginTop:12}},ZZh("button",{onClick:()=>n(s),style:{background:"none",border:0,padding:0,color:m.orange,fontWeight:700,fontSize:15,cursor:"pointer"}},"See the full load →")));
  };

  /* ---------- screens ---------- */
  let home=()=>[
    ZZh("div",{key:"hi",style:{margin:"4px 0 16px"}},ZZh("div",{className:"zzc",style:{fontSize:30,fontWeight:800,lineHeight:1.1}},`Hi, ${A?.name||"there"}`),ZZh("div",{style:{fontSize:16,color:m.mut}},"Everything you have at our Reno dock, in one place.")),
    (waiting.length||clock.length)?ZZh("div",{key:"attn",style:{border:`2px solid ${m.orange}`,background:"#FBF1E8",borderRadius:12,padding:16,marginBottom:14}},
      ZZh("div",{className:"zzc",style:{fontSize:22,fontWeight:800,display:"flex",alignItems:"center",gap:8,color:"#0F2F36"}},ZZh(wr,{size:22,style:{color:m.orange}}),"Needs your answer"),
      ...waiting.map(({s,x})=>{let est=ZZestOf(s,x,y);return ZZh("div",{key:x.id,style:{background:"#fff",borderRadius:10,padding:"12px 14px",marginTop:10,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",color:"#0F2F36"}},
        ZZh("div",{style:{flex:1,minWidth:180}},ZZh("b",{style:{fontSize:16}},`${x.kind} on load ${s.ref}`),ZZh("div",{style:{fontSize:14,color:"#4B6166"}},est.total>0?`Estimate ${je(est.total)} \xB7 accept, decline or call`:"Take a look at the photos")),
        big("Review",()=>go("damage"),"go"))}),
      clock.length?ZZh("div",{style:{background:"#fff",borderRadius:10,padding:"12px 14px",marginTop:10,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",color:"#0F2F36"}},
        ZZh("div",{style:{flex:1,minWidth:180}},ZZh("b",{style:{fontSize:16}},`${clock.length} load${clock.length>1?"s are":" is"} at or past free time`),ZZh("div",{style:{fontSize:14,color:"#4B6166"}},`${clock.map(k=>k.ref).join(", ")}. Book a pickup and storage stops.`)),
        big("Book a pickup",()=>startBook("pickup"),"go")):null)
    :ZZh("div",{key:"ok",style:{border:`2px solid ${m.green}`,background:"rgba(30,138,90,.08)",borderRadius:12,padding:"14px 16px",marginBottom:14,fontWeight:700,color:m.green,display:"flex",gap:10,alignItems:"center"}},ZZh(Ze,{size:22}),"You're all caught up. Nothing needs your answer."),
    ZZh("div",{key:"acts",style:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10,marginBottom:14}},
      big(b?"Book a truck":"Book a truck",()=>startBook(""),"go",Ca),
      big("Track my freight",()=>go("freight"),"",Sa),
      big("Message the dock",()=>go("chat"),"",un)),
    ZZh("div",{key:"tiles",style:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}},
      tile("On our floor",pallets,"pallets",()=>go("freight")),
      tile("At our dock",atDock.length,atDock.length===1?"truck now":"trucks now",()=>go("freight"),atDock.length?m.orange:null),
      tile("Coming in",upcoming.length,"booked trucks",()=>go("freight")),
      tile("Open bills",Fe(openTotal),`${openInv.length} open`,()=>go("bills"))),
    card([H2("At our dock now"),atDock.length?trucks(atDock):empty("No trucks at our dock right now.")],{key:"dock"}),
    card([ZZh("div",{key:"h",style:{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:10,flexWrap:"wrap"}},H2("Coming up"),big("Book a truck",()=>startBook(""),"go",wa)),
      upcoming.length?trucks(upcoming.slice(0,4)):empty("Nothing booked yet. Tap Book a truck. It takes about a minute."),
      upcoming.length>4?ZZh("button",{key:"more",onClick:()=>go("freight"),style:{background:"none",border:0,color:m.orange,fontWeight:700,marginTop:10,cursor:"pointer",fontSize:15}},`See all ${upcoming.length} →`):null],{key:"up"}),
    ZZh(ZZUp,{key:"up2",actions:a,customerId:o,isDispatch:b})];

  /* Booking: 4 simple steps */
  let setB=p=>setBk({...bk,...p}),
    days=[...Array(7)].map((_,k)=>{let d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()+k);return d}),
    hours=[6,8,10,12,14,16,18,20],
    hourLbl=h=>`${h%12||12} ${h<12?"am":"pm"}`,
    dayLbl=(d,k)=>k===0?"Today":k===1?"Tomorrow":d.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"}),
    when=()=>{if(bk.custom)return new Date(bk.custom);if(bk.day===""||bk.hour==null)return null;let d=new Date(days[bk.day]);d.setHours(bk.hour,0,0,0);return d},
    afterHrs=d=>d&&(d.getDay()===0||d.getDay()===6||d.getHours()<6||d.getHours()>=22),
    kinds={drop:{t:"Send a truck to your dock",s:"Your truck brings freight to us",icon:Ca},pickup:{t:"Pick up freight you're holding",s:"Your truck takes pallets off our floor",icon:Sa}},
    afters={reno:["Deliver it in Reno","Reno delivery"],sac:["Reload it to California","Consolidate & reload"],cross:["Cross-dock it out","Cross-dock"],other:["Store it with you","Long-term storage"]},
    pickList=bk.pick||[],
    pickPlt=free.filter(k=>pickList.includes(k.id)).reduce((k,_)=>k+fe(_),0),
    can=bk.step===1?!!bk.kind:bk.step===2?(bk.kind==="drop"?ie(bk.pallets)>0:pickList.length>0):bk.step===3?!!when():!0,
    submit=()=>{let d=when(),inb=bk.kind==="drop",lane=bk.after==="sac"?"sac":bk.after==="other"?"other":"reno",
      payload={truck:bk.truck.trim(),trailer:"",carrier:bk.carrier.trim(),driver:bk.driver.trim(),phone:bk.phone.trim(),direction:inb?"inbound":"outbound",
        jobType:inb?afters[bk.after][1]:"Reno pickup",customerId:o,scheduledAt:d?d.toISOString():"",
        notes:[bk.notes.trim(),b?"":"Requested by customer"].filter(Boolean).join(" \xB7 "),
        lines:inb?[{id:Ce(),ref:bk.ref.trim(),bol:"",po:"",lane,units:{std:ie(bk.pallets),lg:0,crate:0},commodity:bk.commodity.trim(),dest:"",deliverBy:"",loadNotes:"",scans:[]}]:[],
        pickupIds:inb?[]:pickList};
      a.addTrailer(payload);setBooked({when:d,inb,pallets:inb?ie(bk.pallets):pickPlt,request:!b});window.scrollTo(0,0)},
    choice=(on,title,sub,onClick,icon,dis)=>ZZh("button",{key:title,onClick,disabled:dis,style:{textAlign:"left",display:"flex",gap:12,alignItems:"center",padding:16,borderRadius:12,cursor:dis?"not-allowed":"pointer",opacity:dis?.5:1,background:on?"#FBF1E8":m.panel,border:`2px solid ${on?m.orange:m.line}`,color:m.text,width:"100%"}},
      icon?ZZh("span",{style:{width:46,height:46,borderRadius:10,background:"#0F3B44",color:"#fff",display:"grid",placeItems:"center",flexShrink:0}},ZZh(icon,{size:22})):null,
      ZZh("span",null,ZZh("b",{style:{display:"block",fontSize:17}},title),sub?ZZh("span",{style:{fontSize:14,color:m.mut}},sub):null)),
    chip=(on,label,onClick,dis)=>ZZh("button",{key:label,onClick,disabled:dis,style:{padding:"10px 14px",borderRadius:30,fontWeight:700,fontSize:15,cursor:dis?"not-allowed":"pointer",opacity:dis?.35:1,background:on?"#0F3B44":m.panel,color:on?"#fff":m.text,border:`2px solid ${on?"#0F3B44":m.line}`}},label),
    field=(label,el,hint,isInput)=>ZZh(isInput?"label":"div",{style:{display:"block",marginBottom:14}},ZZh("span",{style:{display:"block",fontSize:15,fontWeight:700,marginBottom:6}},label),el,hint?ZZh("span",{style:{display:"block",fontSize:13,color:m.dim,marginTop:4}},hint):null),
    inp=(k,ph,extra)=>ZZh(se,{value:bk[k],placeholder:ph,onChange:v=>setB({[k]:v.target.value}),style:{fontSize:16,padding:"12px"},...(extra||{})});
  let book=()=>{
    if(booked)return card([
      ZZh("div",{key:"i",style:{width:64,height:64,borderRadius:"50%",background:m.green,color:"#fff",display:"grid",placeItems:"center",margin:"6px auto 10px"}},ZZh(Ze,{size:34})),
      ZZh("div",{key:"t",className:"zzc",style:{fontSize:30,fontWeight:800,textAlign:"center"}},booked.request?"Request sent!":"You're booked!"),
      ZZh("div",{key:"s",style:{fontSize:17,textAlign:"center",color:m.mut,margin:"6px 0 18px"}},
        `${booked.inb?"Truck coming in":"Pickup"} \xB7 ${booked.pallets} pallet${booked.pallets===1?"":"s"} \xB7 ${booked.when?booked.when.toLocaleString([],{weekday:"long",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):""}`,
        ZZh("br"),booked.request?"We'll confirm the time shortly. You'll see it under Coming up.":"It's on our schedule. Track it under My freight."),
      ZZh("div",{key:"b",style:{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}},big("Back to Home",()=>go("home"),"go",xi),big("Book another",()=>startBook(""),"",wa))]);
    let st=bk.step,d=when();
    return ZZh("div",null,
      ZZh("div",{style:{display:"flex",gap:6,marginBottom:14}},...[1,2,3,4].map(k=>ZZh("div",{key:k,style:{flex:1,height:8,borderRadius:4,background:k<=st?m.orange:m.line}}))),
      card([
        st===1&&[H2("What do you need?","Pick one."),ZZh("div",{key:"c",style:{display:"grid",gap:10}},
          choice(bk.kind==="drop",kinds.drop.t,kinds.drop.s,()=>setB({kind:"drop",step:2}),kinds.drop.icon),
          choice(bk.kind==="pickup",kinds.pickup.t,free.length?`${free.reduce((k,_)=>k+fe(_),0)} pallets on our floor ready to go`:"Nothing on our floor right now",()=>setB({kind:"pickup",pick:free.map(k=>k.id),step:2}),kinds.pickup.icon,!free.length))],
        st===2&&bk.kind==="drop"&&[H2("Tell us about the freight"),
          field("How many pallets?",ZZh("div",{style:{display:"flex",alignItems:"center",border:`2px solid ${m.line}`,borderRadius:10,width:"max-content",overflow:"hidden"}},
            ZZh("button",{onClick:()=>setB({pallets:Math.max(1,ie(bk.pallets)-1)}),style:{width:54,height:54,fontSize:26,fontWeight:800,background:m.raised,border:0,cursor:"pointer",color:m.text}},"−"),
            ZZh("input",{value:bk.pallets,inputMode:"numeric",onChange:v=>setB({pallets:v.target.value.replace(/\D/g,"").slice(0,4)}),style:{width:80,height:54,textAlign:"center",fontSize:24,fontWeight:800,border:0,background:m.panel,color:m.text}}),
            ZZh("button",{onClick:()=>setB({pallets:ie(bk.pallets)+1}),"aria-label":"One more pallet",style:{width:54,height:54,fontSize:26,fontWeight:800,background:m.raised,border:0,cursor:"pointer",color:m.text}},"+")),"A best guess is fine."),
          field("What should we do with it?",ZZh("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},...Object.entries(afters).map(([k,[l]])=>chip(bk.after===k,l,()=>setB({after:k}))))),
          field("Load number, BOL or PO (optional)",inp("ref","e.g. 112045"),null,1),
          field("What is it? (optional)",inp("commodity","e.g. furniture, retail, auto parts"),null,1)],
        st===2&&bk.kind==="pickup"&&[H2("Which pallets go on the truck?",`${pickPlt} pallet${pickPlt===1?"":"s"} selected`),
          ZZh("div",{key:"l",style:{display:"grid",gap:8}},...free.map(k=>{let on=pickList.includes(k.id),fn=freeNote(k);return ZZh("label",{key:k.id,style:{display:"flex",gap:12,alignItems:"center",padding:"12px 14px",borderRadius:10,border:`2px solid ${on?m.orange:m.line}`,background:on?"#FBF1E8":m.panel,cursor:"pointer"}},
            ZZh("input",{type:"checkbox",checked:on,onChange:()=>setB({pick:on?pickList.filter(q=>q!==k.id):[...pickList,k.id]}),style:{width:22,height:22,flexShrink:0}}),
            ZZh("span",{style:{flex:1,color:"#0F2F36"}},ZZh("b",{style:{fontSize:16}},`Load ${k.ref}`),ZZh("span",{style:{display:"block",fontSize:14,color:"#4B6166"}},`${$e(k)} \xB7 in since ${ge(k.receivedAt)}${fn?" \xB7 "+fn:""}`)))}))],
        st===3&&[H2("When should the truck come?","Mon–Fri 6am–10pm. Other times by appointment."),
          field("Day",ZZh("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},...days.map((dd,k)=>chip(bk.day===k&&!bk.custom,dayLbl(dd,k),()=>setB({day:k,custom:""}))))),
          field("Time",ZZh("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},...hours.map(h=>{let x=new Date(days[bk.day===""?0:bk.day]);x.setHours(h,0,0,0);return chip(bk.hour===h&&!bk.custom,hourLbl(h),()=>setB({hour:h,custom:""}),bk.day!==""&&x.getTime()<t)}))),
          field("Or pick an exact time",ZZh(se,{type:"datetime-local",value:bk.custom,onChange:v=>setB({custom:v.target.value}),style:{fontSize:16,padding:12}})),
          afterHrs(d)?ZZh("div",{key:"ah",style:{fontSize:14,color:m.amber,fontWeight:700}},`That's outside our normal hours. A ${je(y.afterHours)} after-hours fee applies per truck.`):null],
        st===4&&[H2("Truck details","All optional. Don't know yet? Leave it blank and add it later."),
          ZZh("div",{key:"g",style:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"0 14px"}},
            field("Carrier",inp("carrier","Company hauling it"),null,1),field("Truck number",inp("truck","e.g. 4521"),null,1),
            field("Driver name",inp("driver","First and last"),null,1),field("Driver phone",inp("phone","775-555-0100",{type:"tel",inputMode:"tel"}),null,1)),
          field("Anything the crew should know?",ZZh(wm,{value:bk.notes,placeholder:"Liftgate, call ahead, load order…",onChange:v=>setB({notes:v.target.value})})),
          ZZh("div",{key:"rv",style:{background:m.raised,borderRadius:10,padding:14,fontSize:16,lineHeight:1.7}},
            ZZh("div",{style:{fontWeight:800,marginBottom:4}},"Check your booking"),
            ZZh("div",null,ZZh("span",{style:{color:m.mut}},"What: "),bk.kind==="drop"?`Truck brings ${ie(bk.pallets)} pallet${ie(bk.pallets)===1?"":"s"} \xB7 ${afters[bk.after][0].toLowerCase()}`:`Pickup of ${pickPlt} pallet${pickPlt===1?"":"s"} (${free.filter(k=>pickList.includes(k.id)).map(k=>k.ref).join(", ")})`),
            ZZh("div",null,ZZh("span",{style:{color:m.mut}},"When: "),d?d.toLocaleString([],{weekday:"long",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"—"),
            bk.ref?ZZh("div",null,ZZh("span",{style:{color:m.mut}},"Reference: "),bk.ref):null)]
      ]),
      ZZh("div",{style:{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}},
        st>1?big("Back",()=>setB({step:st-1}),"",jd):ZZh("span"),
        st<4?big("Next",()=>setB({step:st+1}),"go",null,!can):big(b?"Book it":"Send request",submit,"go",Ze,!can)),
      ZZh("div",{style:{marginTop:22,fontSize:14,color:m.mut}},"Need to list many loads with BOLs and load notes? ",
        ZZh("button",{onClick:()=>setAdv("truck"),style:{background:"none",border:0,padding:0,color:m.orange,fontWeight:700,cursor:"pointer",fontSize:14}},"Use the full work order →")));
  };

  let freight=()=>{
    let f=k=>!q||(k.ref||"").toLowerCase().includes(q.toLowerCase())||(k.po||"").toLowerCase().includes(q.toLowerCase()),
      row=k=>{let fn=freeNote(k),p=ha(k,t);return ZZh("div",{key:k.id},ZZh(rx,{s:k,rates:y,now:t,onTap:n}),fn?ZZh("div",{style:{padding:"4px 12px 6px",fontSize:13,fontWeight:600,color:p.phase==="storage"?m.violet:m.dim}},fn):null)};
    return [
      ZZh("div",{key:"s",style:{position:"relative",marginBottom:14}},ZZh(se,{value:q,placeholder:"Search by load number or PO",onChange:v=>setQ(v.target.value),style:{fontSize:16,padding:"13px 12px"}})),
      card([H2("Trucks",`${atDock.length} at our dock \xB7 ${upcoming.length} coming`),
        live.length?trucks([...atDock,...upcoming]):empty("No trucks booked."),
        ZZh("div",{key:"b",style:{marginTop:12,display:"flex",gap:10,flexWrap:"wrap"}},big("Book a truck",()=>startBook(""),"go",wa),pastT.length?big(past?"Hide past trucks":`Past trucks (${pastT.length})`,()=>setPast(!past)):null),
        past?ZZh("div",{key:"p",style:{marginTop:12}},trucks(pastT)):null],{key:"tr"}),
      card([H2("On our floor",`${pallets} pallets \xB7 tap a load for photos and counts`),
        floor.filter(f).length?ZZh("div",{key:"l",className:"space-y-2"},...floor.filter(f).map(row)):empty(q?"No match on the floor.":"Nothing on our floor right now."),
        free.length?ZZh("div",{key:"b",style:{marginTop:12}},big("Book a pickup",()=>startBook("pickup"),"go",Sa)):null],{key:"fl"}),
      coming.filter(f).length?card([H2("On the way to us"),ZZh("div",{key:"l",className:"space-y-2"},...coming.filter(f).map(row))],{key:"co"}):null,
      card([ZZh("button",{key:"t",onClick:()=>setShipped(!shipped),style:{background:"none",border:0,padding:0,cursor:"pointer",color:m.text,textAlign:"left"}},H2(`${shipped?"▾":"▸"} Shipped (${done.length})`)),
        shipped?(done.filter(f).length?ZZh("div",{key:"l",className:"space-y-2"},...done.filter(f).slice(0,40).map(row)):empty("Nothing shipped yet.")):null],{key:"sh"})];
  };

  let damage=()=>[
    ZZh("div",{key:"h",style:{marginBottom:12}},H2("Damage & problems","When we find damage, you see photos and what it costs to fix. You choose: accept, decline, or talk to us first.")),
    probs.length===0?empty("No damage or problems reported. Good news."):null,
    ...waiting.map(dmgCard),
    ...openProbs.filter(p=>!waiting.includes(p)).map(dmgCard),
    probs.some(p=>p.x.resolved)?ZZh("div",{key:"cl",className:"zzc",style:{fontSize:20,fontWeight:800,margin:"18px 0 10px",color:m.mut}},"Closed"):null,
    ...probs.filter(p=>p.x.resolved).slice(0,10).map(dmgCard)];

  let bills=()=>[
    ZZh("div",{key:"t",style:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:14}},
      tile("Open bills",Fe(openTotal),`${openInv.length} of ${inv.length} not paid yet`),
      tile("Not billed yet",Fe(unbilled),"charges so far"),
      tile("Pallets on our floor",pallets,"storage clock running per load")),
    card([ZZh("div",{key:"h",style:{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:10,flexWrap:"wrap"}},H2("Your bills"),big("Statement / print",()=>setStmt(!0),"",Ct)),
      inv.length?ZZh("div",{key:"l"},...[...inv].reverse().slice(0,20).map(k=>ZZh("div",{key:k.id,style:{display:"flex",gap:10,alignItems:"center",padding:"12px 0",borderTop:`1px solid ${m.line}`,flexWrap:"wrap",fontSize:16}},
        ZZh("b",{style:{fontVariantNumeric:"tabular-nums"}},k.number),ZZh("span",{style:{color:m.mut}},`${Dt(k.issuedAt)} \xB7 ${k.shipmentIds.length} load${k.shipmentIds.length===1?"":"s"}`),
        ZZh("b",{style:{marginLeft:"auto",fontVariantNumeric:"tabular-nums"}},je(k.total)),k.status==="paid"?ZZpill("Paid",m.green):ZZpill("Not paid",m.amber)))):empty("No bills yet."),
      ZZh("div",{key:"p",style:{fontSize:14,color:m.mut,marginTop:12}},`Questions or ready to pay? Call ${ZZPHONE} or send us a message.`)],{key:"inv"}),
    card([H2("Charges so far, by load","Not billed yet. Tap a load to see photos."),
      ...S.filter(k=>k.receivedAt&&!k.invoiceId).map(k=>ZZh("div",{key:k.id,style:{borderTop:`1px solid ${m.line}`,padding:"12px 0"}},
        ZZh("div",{style:{display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}},ZZh("button",{onClick:()=>n(k),style:{background:"none",border:0,padding:0,fontWeight:800,fontSize:16,cursor:"pointer",color:m.text}},`Load ${k.ref}`),ZZh(fs,{shipment:k,now:t}),ZZh("b",{style:{marginLeft:"auto"}},je(ur(k,y,t)))),
        ZZh(Fj,{shipment:k,rates:y,now:t}))),
      S.some(k=>k.receivedAt&&!k.invoiceId)?null:empty("Nothing waiting to be billed.")],{key:"un"}),
    card([ZZh("details",{key:"d"},ZZh("summary",{style:{cursor:"pointer",fontWeight:800,fontSize:17}},"How billing works"),
      ZZh("ul",{style:{margin:"10px 0 0",paddingLeft:20,fontSize:15,color:m.mut,lineHeight:1.7}},
        ZZh("li",null,`Cross-dock: ${je(y.std)} per standard pallet in, ${je(y.std)} out. Large ${je(y.lg)}, crate ${je(y.crate)}.`),
        ZZh("li",null,`Storage: ${je(y.storageIn)} per pallet to put away, ${je(y.storageOut)} to pick.`),
        ZZh("li",null,`First 24 hours on our floor are free. After that ${je(y.storageMonthly/4)} per pallet per week.`),
        ZZh("li",null,`Rewrap: ${je(y.rewrap)} per pallet. Labor: ${je(y.laborHour)} per hour per person, in half hours.`),
        ZZh("li",null,`After-hours: ${je(y.afterHours)} once per truck outside Mon–Fri 6am–10pm.`),
        ZZh("li",null,"Damage charges are only added after you approve them.")))],{key:"how"}),
    stmt&&ZZh(Kj,{key:"k",customerId:o,doc:e,now:t,onClose:()=>setStmt(!1)})];

  let chat=()=>[
    card([H2("Messages","Talk to our Reno office. A real person answers, Mon–Fri 6am–10pm."),
      ZZh("div",{key:"tip",style:{fontSize:14,color:m.mut,marginBottom:10}},"Tip: type # and a load number (like #112045) and the message is saved on that load too. Urgent? ",ZZh("a",{href:ZZTEL,style:{color:m.orange,fontWeight:700}},`Call ${ZZPHONE}`)),
      ZZh(Uj,{key:"u",customerId:o,doc:e,actions:a,as:"dispatcher",openShipment:n,onOpenTrailer:k=>setTruck(k)})],{key:"c"})];

  /* ---------- answer modal (accept / decline / call) ---------- */
  let modal=()=>{
    if(!mod)return null;let {s,x,type}=mod,est=ZZestOf(s,x,y),nm=who.trim(),
      fin=st=>{try{localStorage.setItem("cd6:zzname",nm)}catch{}ZZanswer(a,s,x,st,nm||A?.name||"Customer",st==="declined"?why+(note.trim()?": "+note.trim():""):note.trim(),o,y);setMod(null)};
    return ZZh(Gt,{open:!0,onClose:()=>setMod(null),title:type==="accept"?"Accept the charges":type==="decline"?"Decline the charges":"Talk to us first"},
      ZZh("div",{style:{fontSize:16}},
        ZZh("div",{style:{fontWeight:800,fontSize:18}},`${x.kind} on load ${s.ref}`),
        type!=="call"&&ZZtable(est),
        ZZh("div",{style:{marginTop:14}},field("Your name",ZZh(se,{value:who,placeholder:"First and last name",onChange:v=>setWho(v.target.value),style:{fontSize:16,padding:12}}))),
        type==="accept"&&[ZZh("label",{key:"c",style:{display:"flex",gap:10,alignItems:"flex-start",fontSize:15,fontWeight:600,cursor:"pointer",marginBottom:14}},ZZh("input",{type:"checkbox",checked:ok,onChange:()=>setOk(!ok),style:{width:22,height:22,flexShrink:0}}),`I approve ${je(est.total)} in charges for load ${s.ref}. Add them to my bill.`),
          big(`Yes, approve ${je(est.total)}`,()=>fin("accepted"),"ok",Ze,!ok||!nm)],
        type==="decline"&&[field("Why? (pick one)",ZZh("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},...["It was damaged before it got to you","The price looks too high","I need more photos or info","Something else"].map(r=>chip(why===r,r,()=>setWhy(r))))),
          field("Anything else? (optional)",ZZh(wm,{value:note,placeholder:"Tell us more",onChange:v=>setNote(v.target.value)})),
          big("Send my answer",()=>fin("declined"),"no",dn,!nm||!why)],
        type==="call"&&[ZZh("a",{key:"tel",href:ZZTEL,style:{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:16,borderRadius:10,background:"#0F3B44",color:"#fff",fontWeight:800,fontSize:20,textDecoration:"none",marginBottom:14}},`Call now: ${ZZPHONE}`),
          field("Or send a message and we'll call you",ZZh(wm,{value:note,placeholder:"Best time to call, questions…",onChange:v=>setNote(v.target.value)})),
          big("Send and ask for a call",()=>fin("call"),"go",un,!nm)]));
  };

  let tabs=[
    {k:"home",label:"Home",icon:xi},
    {k:"book",label:"Book a truck",icon:Ca},
    {k:"freight",label:"My freight",icon:Sa},
    {k:"damage",label:"Damage",icon:wr,n:waiting.length,red:!0},
    {k:"bills",label:"Bills",icon:gl},
    {k:"chat",label:"Messages",icon:un,n:newMsgs}];
  return ZZh("div",{style:{minHeight:"100vh",background:m.bg,color:m.text}},
    ZZh("div",{style:{position:"sticky",top:0,zIndex:30,boxShadow:"0 2px 10px rgba(0,0,0,.12)"}},
      ZZh("div",{className:"zzhd",style:{background:"#0F3B44",color:"#fff",borderBottom:"3px solid #E09A63"}},
        ZZh("div",{style:{maxWidth:880,margin:"0 auto",padding:"10px 16px",display:"flex",alignItems:"center",gap:12}},
          ZZh("span",{className:"zzc",style:{display:"grid",placeItems:"center",width:36,height:36,background:"#A95A24",borderRadius:3,fontWeight:800,fontSize:17,flexShrink:0}},"24"),
          ZZh("div",{style:{flex:1,minWidth:0}},ZZh("div",{style:{fontWeight:800,fontSize:17,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}},A?.name||"Customer portal"),ZZh("div",{className:"text-xs"},"24 HR Crossdock \xB7 Customer portal")),
          ZZh(MA,{role:"client",doc:e,now:t,customerId:o,onShipment:n,onTrailer:k=>setTruck(k)}),
          ZZh("button",{onClick:r,style:{display:"inline-flex",alignItems:"center",gap:6,background:"transparent",border:"1px solid rgba(255,255,255,.35)",borderRadius:6,padding:"7px 10px",fontWeight:700,fontSize:14,cursor:"pointer"}},ZZh(yl,{size:15}),"Sign out"))),
      ZZh("nav",{"aria-label":"Portal",style:{background:m.panel,borderBottom:`1px solid ${m.line}`}},
        ZZh("div",{style:{maxWidth:880,margin:"0 auto",display:"flex"}},...tabs.map(k=>ZZh("button",{key:k.k,onClick:()=>k.k==="book"?startBook(""):go(k.k),"aria-current":tab===k.k?"page":void 0,style:{flex:1,minWidth:0,position:"relative",background:"none",border:0,borderBottom:`4px solid ${tab===k.k?m.orange:"transparent"}`,padding:"10px 2px 7px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,color:tab===k.k?m.text:m.mut}},
          ZZh(k.icon,{size:22}),ZZh("span",{style:{fontSize:"clamp(11px,2.6vw,14px)",fontWeight:800,whiteSpace:"nowrap"}},k.label),
          k.n?ZZh("span",{style:{position:"absolute",top:4,left:"calc(50% + 6px)",minWidth:20,height:20,padding:"0 5px",borderRadius:10,background:m.red,color:"#fff",fontSize:12,fontWeight:800,display:"grid",placeItems:"center"}},k.n):null))))),
    ZZh("main",{style:C},...[].concat(tab==="home"?home():tab==="book"?book():tab==="freight"?freight():tab==="damage"?damage():tab==="bills"?bills():chat())),
    truck&&(()=>{let k=e.trailers.find(_=>_.id===truck.id)||truck;return ZZh(WQ,{t:k,doc:e,now:t,actions:a,crew:w,isDispatch:b,customerId:o,onClose:()=>setTruck(null),openShipment:n})})(),
    modal(),
    ZZh(Gt,{open:!!adv,onClose:()=>setAdv(null),title:"Full work order"},adv&&ZZh(Cm,{trailers:e.trailers,customers:e.customers.filter(k=>k.id===o),shipments:S,crew:w,initial:{customerId:o},onCancel:()=>setAdv(null),
      onSave:k=>{a.addTrailer(b?k:{...k,notes:(k.notes?k.notes+" \xB7 ":"")+"Requested by customer"});setAdv(null);setBooked({when:k.scheduledAt?new Date(k.scheduledAt):null,inb:k.direction==="inbound",pallets:(k.lines||[]).reduce((s,l)=>s+fe({units:In(l.units)}),0),request:!b})}})));
},
