/* ================= Office (stream E): yard board, outbox, Friday summaries, gear, dock settings, truck sheet extras =================
   PLAN.md 3.E. Spliced into the bundle's `var a=...,b=...` chain: only `ZZName=value,` entries, ends with `,`.
   Public names (PLAN 2 / 3.E): ZZYard, ZZOutbox, ZZFriday, ZZGearOffice, ZZDockSet, ZZTruckExtra, ZZobx. Private helpers: ZZo_*.
   Look: Nick's own office parts (de card, Z button, ve pill, se input, xe field, zj select, Gt modal, AQ toasts, lr photos),
   theme m and the Tailwind classes the bundle already ships (no new classes: anything else is an inline style).
   Office screens are English in Nick's portal (no R()). Data changes only through actions; nothing is written on render.
   Nothing is texted or emailed: copy says "would be sent" / "queued", never "sent". */
ZZo_h=(t,p,...c)=>H.createElement(t,p,...c),
ZZo_tv={closed:0},
ZZo_ms=v=>v==null||v===""?NaN:typeof v==="number"?v:v instanceof Date?v.getTime():Date.parse(v),
ZZo_fT=null,ZZo_fD=null,
/* "2:40 PM" and "Mon, Oct 27" in dock time (America/Los_Angeles) */
ZZo_hm=v=>{let x=ZZo_ms(v);if(!isFinite(x))return"";try{ZZo_fT=ZZo_fT||new Intl.DateTimeFormat("en-US",{timeZone:lQ,hour:"numeric",minute:"2-digit"});return ZZo_fT.format(new Date(x))}catch{return at(x)}},
ZZo_day=v=>{let x=ZZo_ms(v);if(!isFinite(x))return"";try{ZZo_fD=ZZo_fD||new Intl.DateTimeFormat("en-US",{timeZone:lQ,weekday:"short",month:"short",day:"numeric"});return ZZo_fD.format(new Date(x))}catch{return Dt(x)}},
ZZo_today=now=>ZZdockParts(now).ymd,
ZZo_isDay=(v,ymd)=>isFinite(ZZo_ms(v))&&ZZdockParts(v).ymd===ymd,
/* time only when it is today, else "Mon, Oct 27, 2:40 PM" */
ZZo_when=(v,now)=>{let x=ZZo_ms(v);if(!isFinite(x))return"—";return ZZo_isDay(x,ZZo_today(now))?ZZo_hm(x):`${ZZo_day(x)}, ${ZZo_hm(x)}`},
ZZo_ago=(v,now)=>{let d=now-ZZo_ms(v);return!isFinite(d)?"":d<6e4?"just now":`${ot(d)} ago`},
ZZo_plural=(n,one,many)=>`${n} ${n===1?one:many||one+"s"}`,
ZZo_cust=(doc,id)=>id&&((doc&&doc.customers)||[]).find(c=>c.id===id)||null,
ZZo_cname=(doc,t)=>{let c=t&&ZZo_cust(doc,t.customerId);return c?c.name:(t&&t.carrier)||"No company"},
ZZo_atDoor=t=>!!t&&ZZactive(t)&&!!t.dock&&Gi.includes(t.dock),
ZZo_pal=(doc,t)=>{let x=sa(t,(doc&&doc.shipments)||[]);return t.direction==="outbound"?x.load:x.unload},
ZZo_byArr=L=>[...(L||[])].sort((a,b)=>(ZZo_ms(a.arrivedAt)||Infinity)-(ZZo_ms(b.arrivedAt)||Infinity)),
ZZo_promName=min=>min%60===0?`${min/60}-hour`:`${min}-minute`,
ZZo_promShort=min=>min%60===0?`${min/60} h`:`${min} min`,
/* a truck at a door is red once it is past the promise (from check-in; from the door time if it never checked in) */
ZZo_late=(doc,t,now)=>{if(!t)return!1;if(t.arrivedAt){let p=ZZpromise(doc,t,now);return p.leftMin!=null&&p.leftMin<0}
  let d=ZZo_ms(t.dockedAt);return isFinite(d)&&now-d>ZZS(doc).promiseMin*6e4},
/* customer booking that the office has not confirmed yet (dispatch accounts book straight onto the schedule) */
ZZo_needsOk=(doc,t)=>!!t&&t.stage==="scheduled"&&!t.confirmedAt&&ZZactive(t)&&(t.bookedVia==="client"&&!(ZZo_cust(doc,t.customerId)||{}).dispatch||(t.notes||"").includes("Requested by customer")),
ZZo_srcName={driver:"the driver",client:"the customer",office:"the office",samsara:"Samsara",gps:"GPS"},
ZZo_trName={link:"Driver link",samsara:"Samsara",gps:"GPS share link",self:"Customer updates it",none:"No updates"},
ZZo_gearShort={plywood:"Plywood",bars:"Load bars",straps:"Straps",airbags:"Airbags"},
ZZo_gearW={plywood:["plywood sheet","plywood sheets"],bars:["load bar","load bars"],straps:["strap","straps"],airbags:["airbag","airbags"]},
ZZo_gearText=g=>{let p=ZZGEAR.filter(x=>ie(g&&g[x.k])>0).map(x=>ZZo_plural(ie(g[x.k]),ZZo_gearW[x.k][0],ZZo_gearW[x.k][1]));return p.length?p.join(", ")+(g.tags&&g.tags.length?` (tags ${g.tags.join(", ")})`:""):""},
ZZo_hasGear=g=>!!g&&(g.plywood>0||g.bars>0||g.straps>0||g.airbags>0||(g.tags||[]).length>0),
ZZo_phone=()=>typeof ZZPHONE==="string"&&ZZPHONE?ZZPHONE:"916-616-3481",
/* toasts that look exactly like Nick's (AQ) */
ZZo_useToast=()=>{let[items,setItems]=(0,H.useState)([]),
  push=(0,H.useCallback)((text,tone)=>{let x={id:Ce(),text,tone:tone||"good"};setItems(b=>[...b,x]);setTimeout(()=>setItems(b=>b.filter(d=>d.id!==x.id)),8e3)},[]),
  drop=(0,H.useCallback)(id=>setItems(b=>b.filter(d=>d.id!==id)),[]);return[items,push,drop]},
ZZo_Toasts=({items,onDismiss})=>items.length?ZZo_h(AQ,{items,onDismiss,onUndo:()=>{}}):null,
/* one save at a time: a second tap while the first is still saving does nothing (no double rows) */
ZZo_useOnce=()=>{let r=(0,H.useRef)(!1),[b,setB]=(0,H.useState)(!1),
  run=(0,H.useCallback)(async fn=>{if(r.current)return;r.current=!0;setB(!0);try{return await fn()}catch(x){console.error(x)}finally{r.current=!1;setB(!1)}},[]);return[b,run]},
/* copy to the clipboard; when that is blocked (it can be inside the viewer) select the text so Ctrl+C works */
ZZo_copy=async(text,el)=>{try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(text);return"copied"}}catch{}
  try{if(el){el.focus();el.select();try{if(document.execCommand&&document.execCommand("copy"))return"copied"}catch{}return"selected"}}catch{}return"failed"},
ZZo_CopyBox=({text,label,href})=>{let r=(0,H.useRef)(null),[st,setSt]=(0,H.useState)(""),link=href?ZZsafeUrl(href):"";
  return ZZo_h("div",null,label?ZZo_h("div",{className:"text-[11px] font-semibold mb-1",style:{color:m.mut}},label):null,
    ZZo_h("div",{className:"flex items-center gap-2"},
      ZZo_h("input",{ref:r,readOnly:!0,value:text,onFocus:e=>e.target.select(),"aria-label":label||"Link",className:"w-full rounded-lg px-2.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",style:{...ne,color:m.text,minWidth:0,minHeight:44}}),
      ZZo_h(Z,{onClick:async()=>{let s=await ZZo_copy(text,r.current);setSt(s);setTimeout(()=>setSt(""),4e3)}},st==="copied"?"Copied":"Copy"),
      /* https links only (ZZsafeUrl); opens in a new tab without giving that page any hold on this one */
      link?ZZo_h("a",{href:link,target:"_blank",rel:"noopener noreferrer",className:"rounded-lg font-semibold inline-flex items-center justify-center px-4 py-2.5 text-sm shrink-0",style:{background:m.raised,color:m.text,border:`1px solid ${m.line}`}},"Open"):null),
    st==="selected"?ZZo_h("div",{className:"text-[11px] mt-1",style:{color:m.amber}},"Copy is blocked here. The link is selected: press Ctrl+C (or long-press and Copy)."):null)},
/* bottom tab bar with more tabs than fit (E03): a soft shadow on the edge that has more tabs. CSS only (the cover layers
   scroll with the tabs, the shadow layers stay put), so nothing re-renders while scrolling. Colors follow the theme. */
ZZo_tabShade=()=>{let c=m.panel,sh=m.mut+"73",tr="rgba(0,0,0,0)";
  return{background:`linear-gradient(to right, ${c} 30%, ${tr}) left center / 40px 100% no-repeat local, linear-gradient(to left, ${c} 30%, ${tr}) right center / 40px 100% no-repeat local, radial-gradient(farthest-side at 0 50%, ${sh}, ${tr}) left center / 14px 100% no-repeat scroll, radial-gradient(farthest-side at 100% 50%, ${sh}, ${tr}) right center / 14px 100% no-repeat scroll`,scrollbarWidth:"thin"}},
/* small pieces in Nick's style */
ZZo_Tile=({label,value,sub,color,onClick,title,stat})=>ZZo_h(de,{className:"p-3",onClick,style:onClick?{cursor:"pointer"}:{}},
  ZZo_h("div",{className:"text-xs font-semibold mb-1",style:{color:m.mut},"data-stat":stat,title},label),
  ZZo_h("div",{className:"text-2xl font-black tabular-nums",style:{color:color||m.text},"data-stat-value":stat},value),
  ZZo_h("div",{className:"text-xs",style:{color:m.dim}},sub)),
ZZo_Chips=({opts,value,onChange,label})=>ZZo_h("div",{className:"flex gap-1.5 flex-wrap",role:"group","aria-label":label},
  opts.map(([k,l])=>ZZo_h("button",{key:k,type:"button",onClick:()=>onChange(k),"aria-pressed":value===k,className:"px-3 py-2 rounded-lg text-sm font-bold",
    style:{minHeight:44,...(value===k?{background:m.orange,color:"#0A0A0A",border:`1px solid ${m.orange}`}:{...ne,color:m.mut})}},l))),
ZZo_Group=({label,children})=>ZZo_h("div",{role:"group","aria-label":label},ZZo_h("span",{className:"block text-xs font-semibold mb-1.5",style:{color:m.mut}},label),children),
ZZo_Banner=({tone,title,children})=>{let c=tone==="bad"?m.red:tone==="info"?m.blue:m.amber,bg=tone==="bad"?"rgba(255,77,77,0.10)":tone==="info"?"rgba(75,155,255,0.10)":"rgba(255,176,32,0.1)",bd=tone==="bad"?"rgba(255,77,77,0.35)":tone==="info"?"rgba(75,155,255,0.35)":"rgba(255,176,32,0.35)";
  return ZZo_h("div",{className:"rounded-lg p-3 text-sm",style:{background:bg,border:`1px solid ${bd}`},role:tone==="bad"?"alert":void 0},
    title?ZZo_h("div",{className:"font-bold",style:{color:c}},title):null,children?ZZo_h("div",{className:"text-xs mt-0.5",style:{color:m.mut}},children):null)},

/* ========================== Yard board (office tab "Yard") ========================== */
ZZo_comingToday=(t,now,day)=>{let w=ZZo_ms((t.eta&&t.eta.at)||t.scheduledAt);if(!isFinite(w))return!1;return ZZdockParts(w).ymd===day||w<now&&now-w<24*Nt},
ZZo_etaOf=t=>ZZo_ms((t.eta&&t.eta.at)||t.scheduledAt),
ZZo_Lane=({title,sub,count,color,children,lane})=>ZZo_h(de,{className:"p-3"},
  ZZo_h("div",{className:"flex items-baseline gap-2 mb-0.5","data-lane":lane},
    ZZo_h("div",{className:"text-xs font-bold",style:{color}},title),
    ZZo_h("span",{className:"text-xs font-black tabular-nums px-1.5 rounded",style:{...ne,color:count?m.text:m.dim}},count)),
  ZZo_h("div",{className:"text-[11px] mb-2.5",style:{color:m.dim}},sub),
  ZZo_h("div",{className:"space-y-2"},children)),
ZZo_Card=({rail,onClick,children,label,tid})=>ZZo_h("button",{type:"button",onClick,"aria-label":label,"data-truck":tid,className:"w-full rounded-lg px-3 py-2.5 text-left transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",
  style:{...ne,borderLeft:`3px solid ${rail}`}},children),
ZZo_Empty=({children})=>ZZo_h("div",{className:"text-sm rounded-lg px-3 py-4 text-center",style:{color:m.dim,border:`1px dashed ${m.line}`}},children),
ZZYard=({doc:e,now:t,openTrailer:v})=>{
  let T=e.trailers||[],SH=e.shipments||[],st=ZZS(e),goal=st.waitGoalMin,lim=st.promiseMin,day=ZZo_today(t),crew=ie(e.settings?.crew,3),open=x=>v&&v(x),
    yard=ZZyardQ(e),
    doors=T.filter(ZZo_atDoor).sort((a,b)=>Gi.indexOf(a.dock)-Gi.indexOf(b.dock)),
    done=T.filter(x=>x.workDoneAt&&x.stage!=="cancelled"&&ZZo_isDay(x.workDoneAt,day)).sort((a,b)=>ZZo_ms(b.workDoneAt)-ZZo_ms(a.workDoneAt)),
    booked=T.filter(x=>x.stage==="scheduled"&&!x.arrivedAt&&ZZactive(x)),
    coming=booked.filter(x=>ZZo_comingToday(x,t,day)).sort((a,b)=>(ZZo_etaOf(a)||Infinity)-(ZZo_etaOf(b)||Infinity)),
    later=booked.filter(x=>!coming.includes(x)&&ZZo_etaOf(x)>t).sort((a,b)=>ZZo_etaOf(a)-ZZo_etaOf(b)),
    inToday=T.filter(x=>x.stage!=="cancelled"&&x.arrivedAt&&x.workStartedAt&&ZZo_isDay(x.arrivedAt,day)),
    waits=inToday.map(x=>ZZwaitMs(x,t)).filter(x=>x!=null),avgW=waits.length?waits.reduce((a,b)=>a+b,0)/waits.length:null,
    waitingNow=T.filter(x=>ZZactive(x)&&x.arrivedAt&&!x.workStartedAt&&!x.workDoneAt&&x.stage!=="done"),
    longest=waitingNow.reduce((b,x)=>!b||ZZwaitMs(x,t)>ZZwaitMs(b,t)?x:b,null),lMs=longest?ZZwaitMs(longest,t):null,lTone=ZZtone(lMs,e),
    pr=done.map(x=>ZZpromise(e,x,t)).filter(p=>p.kept!=null),kept=pr.filter(p=>p.kept).length,pct=pr.length?Math.round(100*kept/pr.length):null,
    byDoor={};doors.forEach(x=>{(byDoor[x.dock]||=[]).push(x)});
  let snaps=ZZdmgDrafts(e,null),snapG=[...new Set(snaps.map(d=>d.tid))].map(id=>[T.find(x=>x.id===id),snaps.filter(d=>d.tid===id)]).filter(g=>g[0]);
  let dbl=Object.entries(byDoor).filter(([,L])=>L.length>1),dblSet=new Set(dbl.flatMap(([,L])=>L.map(x=>x.id))),
    working=doors.filter(x=>x.stage==="working").length,ready=doors.filter(x=>x.stage==="done").length,
    tiles=[
      {stat:"yard",label:"In yard",value:yard.length,sub:yard.length?"waiting for a door":"nobody waiting",color:yard.length?m.amber:m.mut},
      {stat:"doors",label:"At doors",value:doors.length,sub:doors.length?[working?`${working} working`:"",ready?`${ready} ready to release`:"",doors.length-working-ready>0?`${doors.length-working-ready} not started`:""].filter(Boolean).join(" \xB7 "):"all doors open",color:doors.length?m.orange:m.mut},
      {stat:"done",label:"Done today",value:done.length,sub:done.length?ZZo_plural(done.reduce((a,x)=>a+ZZo_pal(e,x),0),"pallet"):"none yet",color:done.length?m.green:m.mut},
      {stat:"avg",label:"Avg wait today",value:avgW==null?"—":ot(avgW),sub:waits.length?`${ZZo_plural(waits.length,"truck")} \xB7 goal ${goal} min`:"no trucks started yet",color:avgW==null?m.mut:ZZtoneColor(ZZtone(avgW,e))},
      {stat:"longest",label:"Longest wait now",value:longest?ot(lMs):"None",sub:longest?`${ZZo_cname(e,longest)}${lTone==="bad"?` \xB7 over the ${goal} min goal`:` \xB7 goal ${goal} min`}`:"nobody waiting",color:longest?ZZtoneColor(lTone):m.mut,onClick:longest?()=>open(longest):void 0,title:longest?"Open this truck":void 0},
      {stat:"promise",label:"Promise kept today",value:pct==null?"—":pct+"%",sub:pr.length?`${kept} of ${pr.length} within ${ZZo_promShort(lim)}`:`done within ${ZZo_promShort(lim)} of check-in`,color:pct==null?m.mut:pct>=90?m.green:pct>=75?m.amber:m.red}],
    kind=x=>ZZo_h(ve,{label:Ac(x,SH),color:m.mut,dot:!1}),
    sub2=x=>{let pl=ZZo_pal(e,x);return[`truck ${x.truck||"—"}`,pl?`${pl} plt`:"no loads listed"].join(" \xB7 ")},
    comingCard=x=>{let appt=ZZo_ms(x.scheduledAt),eta=x.eta&&x.eta.at?ZZo_ms(x.eta.at):NaN,w=isFinite(eta)?eta:appt,late=isFinite(w)&&w<t,behind=isFinite(eta)&&isFinite(appt)&&eta-appt>15*6e4,
        line=ZZo_h(H.Fragment,null,
          isFinite(eta)?ZZo_h("div",{className:"text-xs",style:{color:m.mut}},`ETA from ${ZZo_srcName[x.eta.source]||"an update"}${x.eta.updatedAt?`, ${ZZo_ago(x.eta.updatedAt,t)}`:""}${isFinite(appt)?` \xB7 appt ${ZZo_hm(appt)}`:""}`)
            :ZZo_h("div",{className:"text-xs",style:{color:m.dim}},"Appointment. No ETA update yet."),
          late?ZZo_h("div",{className:"text-xs font-bold",style:{color:m.red}},`Late: ${ot(t-w)} past the ${isFinite(eta)?"ETA":"appointment"}`)
            :behind?ZZo_h("div",{className:"text-xs font-bold",style:{color:m.amber}},`Running ${ot(eta-appt)} behind the appointment`):null),
        url=ZZsafeUrl(x.trackUrl);
      return ZZo_h(ZZo_Card,{key:x.id,tid:x.id,rail:late?m.red:behind?m.amber:m.blue,onClick:()=>open(x),label:`Open truck ${x.truck||""}`},
        ZZo_h("div",{className:"flex items-center gap-2"},ZZo_h("span",{className:"text-lg font-black tabular-nums"},isFinite(w)?ZZo_when(w,t):"No time"),ZZo_h("span",{className:"ml-auto"},kind(x))),
        ZZo_h("div",{className:"font-bold truncate"},ZZo_cname(e,x)),
        ZZo_h("div",{className:"text-xs",style:{color:m.mut}},sub2(x)),line,
        url?ZZo_h("div",{className:"text-[11px] truncate mt-0.5",style:{color:m.blue},title:url},`Live map: ${url}`)
          :x.tracking==="samsara"||x.tracking==="gps"?ZZo_h("div",{className:"text-[11px] mt-0.5",style:{color:m.amber}},"Live map link not pasted yet"):null,
        ZZo_needsOk(e,x)?ZZo_h("div",{className:"mt-1"},ZZo_h(ve,{label:"Needs your OK",color:m.amber})):null)},
    waitCard=(x,k)=>{let ms=ZZwaitMs(x,t),tone=ZZtone(ms,e),c=ZZtoneColor(tone),pc=ie(x.paperCount);
      return ZZo_h(ZZo_Card,{key:x.id,tid:x.id,rail:c,onClick:()=>open(x),label:`Open truck ${x.truck||""}`},
        ZZo_h("div",{className:"flex items-center gap-2"},ZZo_h("span",{className:"text-sm font-black"},`#${k+1} in line`),
          ms!=null&&ms<5*6e4?ZZo_h(ve,{label:"NEW",color:m.orange,dot:!1}):null,dblSet.has(x.id)?ZZo_h(ve,{label:"Same door twice",color:m.red}):null,ZZo_h("span",{className:"ml-auto"},kind(x))),
        ZZo_h("div",{className:"font-bold truncate"},ZZo_cname(e,x)),
        ZZo_h("div",{className:"flex items-end gap-2"},ZZo_h("span",{className:"text-2xl font-black tabular-nums leading-none",style:{color:c},"data-clock":"wait","data-tone":tone},ot(ms||0)),
          ZZo_h("span",{className:"text-[11px] ml-auto text-right",style:{color:m.dim}},`waiting since ${ZZo_hm(x.arrivedAt)}`)),
        tone==="bad"?ZZo_h("div",{className:"text-xs font-bold mt-1",style:{color:m.red}},`Over the ${goal} min goal. Give them a door.`):null,
        ZZo_h("div",{className:"text-xs mt-1",style:{color:m.mut}},sub2(x)),
        ZZo_h("div",{className:"text-xs",style:{color:pc?m.mut:m.amber}},`${pc?ZZo_plural(pc,"paperwork photo"):"No paperwork scanned"}${x.checkedInBy==="office"?" \xB7 checked in by the office":x.checkedInBy==="kiosk"?" \xB7 kiosk":""}`))},
    doorCard=x=>{let out=x.direction==="outbound",p=ZZpromise(e,x,t),late=ZZo_late(e,x,t),warnP=!late&&p.elapsedMin!=null&&p.elapsedMin>=.75*lim,
        est=qo(sa(x,SH).moves,crew),wk=x.workStartedAt?t-ZZo_ms(x.workStartedAt):null,over=wk!=null&&est>0&&wk>est*6e4,
        pill=x.stage==="done"?ZZo_h(ve,{label:"Done — release it",color:m.green}):x.stage==="working"?ZZo_h(ve,{label:out?"Loading":"Unloading",color:m.orange}):ZZo_h(ve,{label:"Not started",color:m.amber}),
        sec=out?x.secure&&x.secure.signedAt?ZZo_h(ve,{label:`Secured ${x.secure.confidence}/5`,color:ie(x.secure.confidence)>=4?m.green:m.amber}):ZZo_h(ve,{label:"Not secured yet",color:x.stage==="done"?m.red:m.amber}):null;
      return ZZo_h(ZZo_Card,{key:x.id,tid:x.id,rail:dblSet.has(x.id)||late?m.red:warnP?m.amber:m.orange,onClick:()=>open(x),label:`Open truck ${x.truck||""} at door ${x.dock}`},
        ZZo_h("div",{className:"flex items-center gap-2"},ZZo_h("span",{className:"text-lg font-black",style:{color:m.orange}},`Door ${x.dock}`),ZZo_h("span",{className:"ml-auto"},pill)),
        ZZo_h("div",{className:"font-bold truncate"},ZZo_cname(e,x)),
        x.stage==="working"&&wk!=null?ZZo_h("div",{className:"flex items-end gap-2"},ZZo_h("span",{className:"text-xl font-black tabular-nums leading-none",style:{color:over?m.red:m.text}},ot(wk)),
            ZZo_h("span",{className:"text-[11px] ml-auto text-right",style:{color:over?m.red:m.dim}},`${est?`of ~${ot(est*6e4)} estimate`:"working"}${x.workStartedBy?` \xB7 ${x.workStartedBy}`:""}`))
          :x.stage==="done"?ZZo_h("div",{className:"text-xs",style:{color:m.mut}},`Done ${ZZo_hm(x.workDoneAt)}${x.workDoneBy?` \xB7 ${x.workDoneBy}`:""}`)
          :ZZo_h("div",{className:"text-xs",style:{color:m.amber}},`At the door ${ot(t-ZZo_ms(x.dockedAt||x.arrivedAt||t))}, crew not started`),
        ZZo_h("div",{className:"text-xs mt-1",style:{color:m.mut}},sub2(x)),
        p.elapsedMin!=null?ZZo_h("div",{className:"text-xs font-semibold",style:{color:late?m.red:warnP?m.amber:m.mut}},
          x.workDoneAt?`Took ${ot(p.doneMin*6e4)} from check-in (${p.kept?"within":"over"} ${ZZo_promShort(lim)})`:`${ot(p.elapsedMin*6e4)} since check-in \xB7 ${late?"past the promise":`promise ${ZZo_promShort(lim)}`}`):null,
        dblSet.has(x.id)||sec?ZZo_h("div",{className:"flex gap-1.5 flex-wrap mt-1"},dblSet.has(x.id)?ZZo_h(ve,{label:"Same door twice",color:m.red}):null,sec):null)},
    doneCard=x=>{let p=ZZpromise(e,x,t),wm=x.workStartedAt?ZZwaitMs(x,t):null,dm=SH.filter(s=>s.trailerInId===x.id||s.trailerOutId===x.id).reduce((a,s)=>a+(s.exceptions||[]).filter(q=>q&&q.kind==="Damage"&&!q.draft).length,0);
      return ZZo_h(ZZo_Card,{key:x.id,tid:x.id,rail:p.kept===!1?m.red:m.green,onClick:()=>open(x),label:`Open truck ${x.truck||""}`},
        ZZo_h("div",{className:"flex items-center gap-2"},ZZo_h("span",{className:"font-bold truncate flex-1 min-w-0"},ZZo_cname(e,x)),
          p.kept==null?null:ZZo_h(ve,{label:p.kept?`✓ Within ${ZZo_promShort(lim)}`:`✗ Over ${ZZo_promShort(lim)}`,color:p.kept?m.green:m.red,dot:!1})),
        ZZo_h("div",{className:"text-sm"},p.doneMin!=null?`Total ${ot(p.doneMin*6e4)}`:"Total —",wm!=null?` \xB7 waited ${ot(wm)}`:""),
        ZZo_h("div",{className:"text-xs",style:{color:m.mut}},[`Done ${ZZo_hm(x.workDoneAt)}`,`truck ${x.truck||"—"}`,x.workDoneBy||x.workStartedBy||""].filter(Boolean).join(" \xB7 ")),
        dm?ZZo_h("div",{className:"mt-1"},ZZo_h(ve,{label:ZZo_plural(dm,"damage report"),color:m.amber})):null)};
  return ZZo_h("div",{className:"space-y-4","data-zz":"yard"},
    ZZo_h("div",{className:"grid grid-cols-2 lg:grid-cols-6 gap-3"},tiles.map(x=>ZZo_h(ZZo_Tile,{key:x.stat,...x}))),
    dbl.length?ZZo_h(ZZo_Banner,{tone:"bad",title:dbl.map(([d,L])=>`Two trucks are marked at door ${d}: ${L.map(x=>"truck "+(x.truck||"—")).join(" and ")}.`).join(" ")},"Open the one that is not really there and move it to its door or the yard."):null,
    /* damage snaps (photo now, details later) still waiting on any truck: staff only, no customer alert until finished */
    snapG.length?ZZo_h("div",{className:"rounded-lg p-3 text-sm space-y-2",style:{background:"rgba(255,176,32,0.1)",border:"1px solid rgba(255,176,32,0.35)"},"data-zz":"snaps"},
      ZZo_h("div",{className:"font-bold",style:{color:m.amber}},`Damage snaps waiting for details \xB7 ${snaps.length}`),
      ZZo_h("div",{className:"text-xs",style:{color:m.mut}},"The crew photographed damaged pallets before touching them and adds the details at the count. Customers see nothing and no alert is queued until then."),
      ZZo_h("div",{className:"flex gap-2 flex-wrap"},snapG.map(([x,L])=>ZZo_h(Z,{key:x.id,onClick:()=>open(x)},`Truck ${x.truck||"—"} \xB7 ${L.map(d=>d.ref||"load not picked yet").join(", ")}`)))):null,
    ZZo_h("div",{className:"text-xs",style:{color:m.mut}},`Goal: a door within ${goal} min of check-in. Promise: ${st.promiseText}. Change both in Setup. Tap a truck to open it.`),
    ZZo_h("div",{className:"grid lg:grid-cols-4 gap-3 items-start"},
      ZZo_h(ZZo_Lane,{lane:"coming",title:"Coming today",sub:"Booked, not checked in yet. Soonest first.",count:coming.length,color:m.blue},
        coming.length?coming.map(comingCard):ZZo_h(ZZo_Empty,null,"No more trucks booked for today."),
        later.length?ZZo_h("div",{className:"text-[11px] px-1",style:{color:m.dim}},`Later: ${ZZo_plural(later.length,"more truck")} booked. Next ${ZZo_when(ZZo_etaOf(later[0]),t)}, ${ZZo_cname(e,later[0])}.`):null),
      ZZo_h(ZZo_Lane,{lane:"waiting",title:"Waiting in the yard",sub:`In check-in order \xB7 goal ${goal} min`,count:yard.length,color:m.amber},
        yard.length?yard.map(waitCard):ZZo_h(ZZo_Empty,null,"Nobody is waiting.")),
      ZZo_h(ZZo_Lane,{lane:"doors",title:"At doors",sub:`Door clock against the estimate \xB7 promise ${ZZo_promShort(lim)}`,count:doors.length,color:m.orange},
        doors.length?doors.map(doorCard):ZZo_h(ZZo_Empty,null,"No trucks at the doors.")),
      ZZo_h(ZZo_Lane,{lane:"done",title:"Done today",sub:`Newest first \xB7 check-in to done against ${ZZo_promShort(lim)}`,count:done.length,color:m.green},
        done.length?done.map(doneCard):ZZo_h(ZZo_Empty,null,"Nothing finished yet today."))))},

/* ========================== Outbox (office tab "Outbox") ========================== */
/* stored messages (zzOutbox: Friday summaries queued on purpose) in the shape pQ uses */
ZZobx=doc=>((doc&&doc.zzOutbox)||[]).filter(Boolean).map(o=>{let c=ZZo_cust(doc,o.customerId);
  return{id:"obx:"+o.id,channel:o.channel==="sms"?"sms":"email",to:o.to||"",toName:o.toName||"",subject:o.subject||null,body:o.body||"",ts:ZZo_ms(o.at)||0,
    about:o.event==="friday"?`${c?c.name:"customer"} \xB7 week of ${o.week?ZZo_day(ZZzonedIso(o.week,"12:00"))||o.week:"—"}`:c?c.name:"—",deliverable:!!o.to,event:o.event||"manual",customerId:o.customerId||null,trailerId:o.trailerId||null,queued:!0}}),
ZZo_EV0={driver:"Text to driver",received:"Load received",closing:"Free time closing",storage:"Storage started",shipped:"Load shipped",invoice:"Invoice",manual:"Other"},
ZZo_evLabel=k=>{let x=ZZEVENTS.find(q=>q.k===k);return x?x.label:ZZo_EV0[k]||k||"Other"},
ZZo_evOrder=()=>[...ZZEVENTS.map(q=>q.k),"driver","received","closing","storage","shipped","invoice","manual"],
/* every message the system would send: pQ (old kinds + ZZmsgs) and the stored ones, with event / company / truck worked out */
ZZo_allMsgs=(doc,now)=>{let L=[];try{L=[...pQ(doc,now),...ZZobx(doc)]}catch(x){console.error("outbox",x)}
  let tr=new Map((doc.trailers||[]).map(x=>[x.id,x])),sh=new Map((doc.shipments||[]).map(x=>[x.id,x])),inv=new Map((doc.invoices||[]).map(x=>[x.id,x]));
  return L.map(q=>{let p=String(q.id||"").split(":"),ev=q.event,cid=q.customerId,tid=q.trailerId;
    if(!ev){if(p[0]==="sms"){ev="driver";tid=tid||p[2]}else if(p[0]==="email"){ev=p[1];if(ev==="invoice"){let v=inv.get(p[2]);cid=cid||v&&v.customerId}else{let s=sh.get(p[2]);if(s){cid=cid||s.customerId;tid=tid||(ev==="shipped"?s.trailerOutId||s.trailerInId:s.trailerInId)}}}}
    if(tid&&!cid){let x=tr.get(tid);cid=x&&x.customerId}return{...q,ev:ev||"manual",cid:cid||null,tid:tid||null}}).sort((a,b)=>b.ts-a.ts)},
ZZo_MsgRow=({q,doc,open,onToggle,onTruck})=>{let c=ZZo_cust(doc,q.cid),tk=q.tid&&(doc.trailers||[]).find(x=>x.id===q.tid);
  return ZZo_h("div",{className:"rounded-lg",style:{...ne,opacity:q.deliverable?1:.75},"data-msg":q.id,"data-event":q.ev},
    ZZo_h("button",{type:"button",onClick:onToggle,"aria-expanded":open,className:"w-full text-left px-3 py-2 transition hover:bg-white/5 rounded-lg"},
      ZZo_h("div",{className:"flex items-center gap-1.5 text-xs flex-wrap"},
        ZZo_h(ve,{label:q.channel==="sms"?"TEXT":"EMAIL",color:q.channel==="sms"?m.teal:m.blue,dot:!1}),
        ZZo_h(ve,{label:ZZo_evLabel(q.ev),color:q.ev==="damage"||q.ev==="waiting"?m.red:m.mut,dot:!1}),
        q.queued?ZZo_h(ve,{label:"Queued",color:m.violet,dot:!1}):null,
        ZZo_h("span",{className:"font-bold truncate",style:{minWidth:0,maxWidth:"100%"}},c?c.name:q.about||"—"),
        ZZo_h("span",{className:"ml-auto tabular-nums shrink-0",style:{color:m.dim}},ZZo_when(q.ts,Date.now()))),
      ZZo_h("div",{className:"text-sm font-semibold truncate mt-1"},q.channel==="sms"?q.body:q.subject||q.body),
      ZZo_h("div",{className:"text-[11px] mt-0.5",style:{color:q.deliverable?m.mut:m.amber}},
        q.deliverable?`to ${q.toName?q.toName+" \xB7 ":""}${q.to}`:`no ${q.channel==="sms"?"cell number":"email"} on file, so this can't go out`,q.about?` \xB7 about ${q.about}`:"")),
    open?ZZo_h("div",{className:"px-3 pb-3"},
      ZZo_h("pre",{className:"text-xs whitespace-pre-wrap leading-relaxed break-words",style:{color:m.text,fontFamily:"inherit",margin:0}},q.channel==="email"&&q.subject?`Subject: ${q.subject}\n\n`:"",q.body),
      tk&&onTruck?ZZo_h("div",{className:"mt-2"},ZZo_h(Z,{icon:Ca,onClick:()=>onTruck(tk)},`Open truck ${tk.truck||""}`)):null):null)},
ZZOutbox=({doc:e,now:t,actions:a,openTrailer:v})=>{
  let[view,setView]=(0,H.useState)("msgs"),[ev,setEv]=(0,H.useState)(""),[cid,setCid]=(0,H.useState)(""),[ch,setCh]=(0,H.useState)("all"),[open,setOpen]=(0,H.useState)(null),[more,setMore]=(0,H.useState)(!1),
    [toasts,toast,drop]=ZZo_useToast(),
    all=(0,H.useMemo)(()=>ZZo_allMsgs(e,Date.now()),[e,t]),
    day=ZZo_today(t),today=all.filter(q=>ZZo_isDay(q.ts,day)),
    rows=all.filter(q=>(!ev||q.ev===ev)&&(!cid||q.cid===cid)&&(ch==="all"||q.channel===ch)),
    shown=rows.slice(0,more?300:80),
    evCount={},cuIds=new Set;all.forEach(q=>{evCount[q.ev]=(evCount[q.ev]||0)+1;q.cid&&cuIds.add(q.cid)});
  let custs=[...cuIds].map(id=>ZZo_cust(e,id)).filter(Boolean).sort((x,y)=>x.name.localeCompare(y.name)),
    nonDel=today.filter(q=>!q.deliverable).length;
  return ZZo_h("div",{className:"space-y-4","data-zz":"outbox"},
    ZZo_h("div",{className:"flex items-center gap-3 flex-wrap"},
      ZZo_h(ZZo_Chips,{label:"Outbox view",value:view,onChange:setView,opts:[["msgs","Messages"],["friday","Friday summaries"]]})),
    ZZo_h(ZZo_Banner,{tone:"warn",title:"Not connected yet — this is exactly what would be sent. Send urgent ones by hand."},
      "No texting or email service is hooked up, so nothing here leaves the building. Customer alerts go to the contacts on the customer's account who have that alert ticked (or the account email); driver texts go to the cell number on the truck."),
    view==="friday"?ZZo_h(ZZFriday,{doc:e,now:t,actions:a,toast}):ZZo_h(H.Fragment,null,
      ZZo_h("div",{className:"grid grid-cols-2 lg:grid-cols-4 gap-3"},
        ZZo_h(ZZo_Tile,{stat:"today",label:"Messages today",value:today.length,sub:"would have gone out today"}),
        ZZo_h(ZZo_Tile,{stat:"texts",label:"Texts today",value:today.filter(q=>q.channel==="sms").length,sub:"drivers and customer contacts",color:m.teal}),
        ZZo_h(ZZo_Tile,{stat:"emails",label:"Emails today",value:today.filter(q=>q.channel==="email").length,sub:"customer contacts",color:m.blue}),
        ZZo_h(ZZo_Tile,{stat:"nocontact",label:"No contact on file",value:nonDel,sub:nonDel?"today — add a phone or email":"today — all have a contact",color:nonDel?m.amber:m.mut})),
      ZZo_h(de,{className:"p-3 space-y-3"},
        ZZo_h("div",{className:"grid sm:grid-cols-3 gap-3"},
          ZZo_h(xe,{label:"Kind of message"},ZZo_h(zj,{value:ev,onChange:x=>setEv(x.target.value),"aria-label":"Kind of message"},
            ZZo_h("option",{value:""},`All kinds (${all.length})`),...ZZo_evOrder().filter(k=>evCount[k]).map(k=>ZZo_h("option",{key:k,value:k},`${ZZo_evLabel(k)} (${evCount[k]})`)))),
          ZZo_h(xe,{label:"Company"},ZZo_h(zj,{value:cid,onChange:x=>setCid(x.target.value),"aria-label":"Company"},
            ZZo_h("option",{value:""},"All companies"),...custs.map(c=>ZZo_h("option",{key:c.id,value:c.id},c.name)))),
          ZZo_h(ZZo_Group,{label:"Text or email"},ZZo_h(ZZo_Chips,{label:"Text or email",value:ch,onChange:setCh,opts:[["all","All"],["sms","Texts"],["email","Emails"]]}))),
        ZZo_h("div",{className:"flex items-center gap-2 text-xs",style:{color:m.mut}},
          ZZo_h("span",{"data-count":rows.length},rows.length===all.length?`${ZZo_plural(all.length,"message")}, newest first. Alerts from the last 14 days.`:`${ZZo_plural(rows.length,"message")} match \xB7 ${all.length} in all`),
          ev||cid||ch!=="all"?ZZo_h("button",{type:"button",className:"font-bold ml-auto px-2",style:{color:m.orange,minHeight:44},onClick:()=>{setEv("");setCid("");setCh("all")}},"Clear filters"):null),
        ZZo_h("div",{className:"space-y-1.5"},shown.length?shown.map(q=>ZZo_h(ZZo_MsgRow,{key:q.id,q,doc:e,open:open===q.id,onToggle:()=>setOpen(open===q.id?null:q.id),onTruck:v?x=>v(x):null}))
          :ZZo_h(ZZo_Empty,null,all.length?"No messages match these filters.":"Nothing yet. Messages show up here as trucks are booked, checked in and finished.")),
        rows.length>shown.length?ZZo_h(Z,{onClick:()=>setMore(!0)},`Show more (${rows.length-shown.length} older)`):null)),
    ZZo_h(ZZo_Toasts,{items:toasts,onDismiss:drop}))},

/* ========================== Friday summaries (a view inside Outbox) ========================== */
ZZo_fridayText=(doc,c,w,now,name)=>{let st=ZZS(doc),from=ZZo_day(w.from||now),to=ZZo_day(now),dm=w.damageReports,g=ZZo_gearText(w.gearOut);
  return{subject:`Your week at ${Uo}: ${from} to ${to}`,
    body:[`Hi ${name||c.person||c.name},`,"",`Here is your week at our dock so far (${from} to ${to}).`,"",
      `Trucks: ${w.trucks} (${w.done} done)`,`Pallets in: ${w.palletsIn} \xB7 out: ${w.palletsOut}`,
      `Average wait for a door: ${w.avgWaitMin==null?"none yet":ot(w.avgWaitMin*6e4)}`,`Average time at the door: ${w.avgDoorMin==null?"none yet":ot(w.avgDoorMin*6e4)}`,
      `Done within our ${ZZo_promName(st.promiseMin)} promise: ${w.promiseKeptPct==null?"none finished yet":w.promiseKeptPct+"%"}`,
      `Damage reports: ${dm}${w.damageApproved?` (${w.damageApproved} approved)`:""}`,`Our gear still with you: ${g||"none"}`,"",
      `Questions? Call or text the dock: ${ZZo_phone()}.`,"Thank you for trucking with us.",`— ${Uo}`].join("\n"),
    sms:`${Uo}: your week so far: ${ZZo_plural(w.trucks,"truck")}, ${w.done} done${w.promiseKeptPct==null?"":`, ${w.promiseKeptPct}% within our ${ZZo_promName(st.promiseMin)} promise`}, ${ZZo_plural(dm,"damage report")}. Details are in your portal.`}},
ZZFriday=({doc:e,now:t,actions:a,toast})=>{
  let[pv,setPv]=(0,H.useState)(null),[busy,once]=ZZo_useOnce(),week=ZZweekKey(t),
    queued=(e.zzOutbox||[]).filter(o=>o&&o.event==="friday"&&o.week===week),qSet=new Set(queued.map(o=>o.customerId)),
    rows=(0,H.useMemo)(()=>(e.customers||[]).map(c=>({c,w:ZZweek(e,c.id,t)})).filter(r=>r.w.trucks>0).sort((x,y)=>x.c.name.localeCompare(y.c.name)),[e,t]),
    on=rows.filter(r=>r.c.fridaySummary!==!1),off=rows.filter(r=>r.c.fridaySummary===!1),
    /* only summaries with an address to go to: a customer with no email or cell on file is left out, so it can be queued
       later this week once the office adds a contact (zzQueueFriday queues each customer once per week) */
    entriesFor=r=>{let out=[];ZZrecips(r.c,"friday").forEach(p=>p.channels.forEach(chn=>{let to=String((chn==="sms"?p.phone:p.email)||"").trim();if(!to)return;let tx=ZZo_fridayText(e,r.c,r.w,t,p.name);
      out.push({customerId:r.c.id,channel:chn,to,toName:p.name||r.c.name,subject:chn==="email"?tx.subject:"",body:chn==="email"?tx.body:tx.sms})}));return out},
    todo=on.filter(r=>!qSet.has(r.c.id)&&entriesFor(r).length),noAddr=on.filter(r=>!qSet.has(r.c.id)&&!entriesFor(r).length),
    queue=()=>once(async()=>{let n=await a.zzQueueFriday(week,todo.flatMap(entriesFor))||0;
      let na=noAddr.length?`${ZZo_plural(noAddr.length,"customer")} still ${noAddr.length===1?"has":"have"} no email or cell on file.`:"";
      toast(n?`Queued ${ZZo_plural(n,"Friday summary","Friday summaries")}. They're in the Outbox, not sent.${na?" "+na:""}`
        :na?`Nothing new queued. ${na}`:"Nothing new to queue. This week's summaries are already in the Outbox.",n?"good":"info")});
  return ZZo_h("div",{className:"space-y-3","data-zz":"friday"},
    ZZo_h(de,{className:"p-4 space-y-3",rail:m.blue},
      ZZo_h("div",{className:"flex items-start justify-between gap-3 flex-wrap"},
        ZZo_h("div",{style:{minWidth:0}},ZZo_h("div",{className:"font-bold"},`Friday summaries \xB7 week of ${ZZo_day(ZZzonedIso(week,"12:00"))}`),
          ZZo_h("div",{className:"text-xs mt-0.5",style:{color:m.mut}},"One summary per customer, built from their trucks since Monday. It goes to the contacts on the account who have the Friday summary ticked (or the account email).")),
        ZZo_h(Z,{kind:"primary",icon:un,disabled:busy||!on.length,onClick:queue},busy?"Queuing…":"Queue Friday summaries")),
      queued.length?ZZo_h("div",{className:"text-xs",style:{color:m.mut},"data-queued":qSet.size},
        `Already queued this week for ${ZZo_plural(qSet.size,"customer")} (last ${ZZo_when(queued.reduce((b,o)=>ZZo_ms(o.at)>ZZo_ms(b)?o.at:b,queued[0].at),t)}). Queuing again only adds customers who are not queued yet${todo.length?` (${todo.length} now)`:""}.`):null,
      noAddr.length?ZZo_h("div",{className:"text-xs",style:{color:m.amber,overflowWrap:"anywhere"},"data-noaddr":noAddr.length},
        `Left out until they have an email or cell on file: ${noAddr.map(r=>r.c.name).join(", ")}. Add a contact to the account, then queue again.`):null),
    on.length?ZZo_h("div",{className:"grid lg:grid-cols-2 gap-3"},on.map(r=>{let{c,w}=r,rc=ZZrecips(c,"friday"),en=entriesFor(r),q=qSet.has(c.id),tx=ZZo_fridayText(e,c,w,t,rc[0]&&rc[0].name),
        kv=[["Trucks",`${w.trucks} (${w.done} done)`],["Pallets",`${w.palletsIn} in \xB7 ${w.palletsOut} out`],["Avg wait",w.avgWaitMin==null?"—":ot(w.avgWaitMin*6e4)],
          ["Avg at the door",w.avgDoorMin==null?"—":ot(w.avgDoorMin*6e4)],["Promise kept",w.promiseKeptPct==null?"—":w.promiseKeptPct+"%"],
          ["Damage",w.damageReports?`${ZZo_plural(w.damageReports,"report")}${w.damageApproved?`, ${w.damageApproved} approved`:""}`:"None"],["Our gear out",ZZo_gearText(w.gearOut)||"None"]];
      return ZZo_h(de,{key:c.id,className:"p-3 space-y-2"},
        ZZo_h("div",{className:"flex items-center gap-2"},ZZo_h("div",{className:"font-bold truncate flex-1 min-w-0","data-friday":c.id},c.name),q?ZZo_h(ve,{label:"Queued",color:m.violet}):en.length?ZZo_h(ve,{label:"Ready",color:m.green}):ZZo_h(ve,{label:"No address",color:m.amber})),
        ZZo_h("div",{className:"grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm"},kv.map(([k,x])=>ZZo_h("div",{key:k,style:{minWidth:0}},ZZo_h("div",{className:"text-[11px]",style:{color:m.mut}},k),ZZo_h("div",{className:"font-semibold",style:{overflowWrap:"anywhere"}},x)))),
        ZZo_h("div",{className:"text-xs",style:{color:en.length&&en.some(x=>x.to)?m.mut:m.amber,overflowWrap:"anywhere"}},
          !rc.length?"No contact has the Friday summary turned on, so there is nobody to send it to.":`Goes to: ${rc.map(p=>`${p.name||c.name} (${p.channels.map(x=>x==="sms"?p.phone||"no cell":p.email||"no email").join(", ")})`).join("; ")}`),
        ZZo_h("div",null,ZZo_h(Z,{icon:Ud,onClick:()=>setPv(pv===c.id?null:c.id)},pv===c.id?"Hide preview":"Preview email")),
        pv===c.id?ZZo_h("pre",{className:"text-xs whitespace-pre-wrap leading-relaxed rounded-lg p-3",style:{...ne,color:m.text,fontFamily:"inherit",margin:0,overflowWrap:"anywhere"}},`Subject: ${tx.subject}\n\n${tx.body}`):null)}))
      :ZZo_h(ZZo_Empty,null,"No customer with Friday summaries on had a truck this week."),
    off.length?ZZo_h("div",{className:"text-xs",style:{color:m.dim}},`Turned off by the customer: ${off.map(r=>r.c.name).join(", ")}.`):null)},

/* ========================== Gear (office tab "Gear") ========================== */
ZZo_srcLbl={secure:"secured load",return:"returned",manual:"logged by the office"},
ZZo_GearLog=({doc:e,init,actions:a,onClose,onDone})=>{
  let[f,setF]=(0,H.useState)(()=>({customerId:"",dir:"back",type:"plywood",qty:"",tags:[],tagText:"",note:"",...init})),[err,setErr]=(0,H.useState)(""),[busy,once]=ZZo_useOnce(),
    out=f.customerId?ZZgearOut(e,f.customerId):null,c=ZZo_cust(e,f.customerId),
    withGear=(e.customers||[]).filter(x=>ZZo_hasGear(ZZgearOut(e,x.id))).sort((x,y)=>x.name.localeCompare(y.name)),
    others=(e.customers||[]).filter(x=>!withGear.includes(x)).sort((x,y)=>x.name.localeCompare(y.name)),
    set=p=>{setF({...f,...p});setErr("")},
    save=()=>once(async()=>{let q=Math.round(ie(f.qty));if(!f.customerId)return setErr("Pick the company.");if(!(q>0))return setErr("Type how many.");
      let tags=f.dir==="back"?f.tags:String(f.tagText||"").split(/[,\s]+/).map(x=>x.trim()).filter(Boolean),
        r=a.zzGear({customerId:f.customerId,type:f.type,qty:q,dir:f.dir,tags,note:f.note});if(!r)return setErr("That could not be saved. Check the numbers.");await r;
      onDone&&onDone(`Logged: ${q} ${ZZo_gearW[f.type][q===1?0:1]} ${f.dir==="back"?"back from":"out to"} ${c?c.name:"the customer"}.`);onClose()}),
    gearBtn=g=>{let n=out?ie(out[g.k]):0,onp=f.type===g.k;return ZZo_h("button",{key:g.k,type:"button",onClick:()=>set({type:g.k}),"aria-pressed":onp,className:"rounded-lg px-2 py-2 text-left",
      style:onp?{background:m.orange,color:"#0A0A0A",border:`1px solid ${m.orange}`}:{...ne,color:m.text}},ZZo_h("div",{className:"text-sm font-bold"},g.label),ZZo_h("div",{className:"text-[11px]",style:{color:onp?"#0A0A0A":m.dim}},out?`${n} out now`:g.hint))};
  return ZZo_h(Gt,{open:!0,onClose,title:f.dir==="back"?"Log gear coming back":"Log gear going out"},
    ZZo_h("div",{className:"space-y-3"},
      ZZo_h(xe,{label:"Company"},ZZo_h(zj,{value:f.customerId,onChange:x=>set({customerId:x.target.value,tags:[]}),"aria-label":"Company"},
        ZZo_h("option",{value:""},"Pick the company…"),
        withGear.length?ZZo_h("optgroup",{label:"Has our gear now"},withGear.map(x=>ZZo_h("option",{key:x.id,value:x.id},x.name))):null,
        ZZo_h("optgroup",{label:"Everyone else"},others.map(x=>ZZo_h("option",{key:x.id,value:x.id},x.name))))),
      out?ZZo_h("div",{className:"text-xs",style:{color:m.mut}},`Out with them now: ${ZZo_gearText(out)||"nothing"}`):null,
      ZZo_h(ZZo_Chips,{label:"Coming back or going out",value:f.dir,onChange:x=>set({dir:x}),opts:[["back","Coming back"],["out","Going out"]]}),
      ZZo_h("div",{className:"grid grid-cols-2 gap-1.5"},ZZGEAR.map(gearBtn)),
      ZZo_h(xe,{label:"How many",hint:out&&f.dir==="back"&&ie(f.qty)>ie(out[f.type])?`That is more than the ${ie(out[f.type])} we show out. It saves anyway; the count never goes below zero.`:void 0},
        ZZo_h(se,{type:"number",inputMode:"numeric",min:1,value:f.qty,onChange:x=>set({qty:x.target.value}),placeholder:"0","aria-label":"How many"})),
      f.dir==="back"?out&&out.tags.length?ZZo_h(ZZo_Group,{label:"Tags coming back (tap each one)"},ZZo_h("div",{className:"flex gap-1.5 flex-wrap"},out.tags.map(tg=>{let onp=f.tags.includes(tg);
          return ZZo_h("button",{key:tg,type:"button","aria-pressed":onp,onClick:()=>set({tags:onp?f.tags.filter(x=>x!==tg):[...f.tags,tg]}),className:"px-3 py-2 rounded-lg text-sm font-bold",
            style:{minHeight:44,minWidth:52,...(onp?{background:m.orange,color:"#0A0A0A",border:`1px solid ${m.orange}`}:{...ne,color:m.text})}},tg)}))):null
        :ZZo_h(xe,{label:"Tag numbers (optional)",hint:"Separate with commas."},ZZo_h(se,{value:f.tagText,onChange:x=>set({tagText:x.target.value}),placeholder:"e.g. B-17, B-18"})),
      ZZo_h(xe,{label:"Note (optional)"},ZZo_h(se,{value:f.note,onChange:x=>set({note:x.target.value}),placeholder:f.dir==="back"?"e.g. driver dropped them at D2":"e.g. lent for a reload"})),
      err?ZZo_h("div",{className:"text-sm",style:{color:m.red},role:"alert"},err):null,
      ZZo_h("div",{className:"flex gap-2"},ZZo_h(Z,{className:"flex-1",onClick:onClose},"Cancel"),ZZo_h(Z,{kind:"primary",className:"flex-1",icon:br,disabled:busy,onClick:save},busy?"Saving…":f.dir==="back"?"Log gear back":"Save"))))},
ZZGearOffice=({doc:e,now:t,actions:a,openTrailer:v,officeUser:o})=>{
  let[log,setLog]=(0,H.useState)(null),[toasts,toast,drop]=ZZo_useToast(),[busy,once]=ZZo_useOnce(),G=(e.zzGear||[]).filter(Boolean),
    ids=[...new Set(G.map(g=>g.customerId).filter(Boolean))],
    rows=ids.map(id=>({c:ZZo_cust(e,id),id,g:ZZgearOut(e,id)})).filter(r=>ZZo_hasGear(r.g)).sort((x,y)=>(x.c?x.c.name:"").localeCompare(y.c?y.c.name:"")),
    tot={plywood:0,bars:0,straps:0,airbags:0};rows.forEach(r=>ZZGEAR.forEach(x=>{tot[x.k]+=r.g[x.k]}));
  let ledger=[...G].sort((x,y)=>(ZZo_ms(y.at)||0)-(ZZo_ms(x.at)||0)).slice(0,25),plan=ZZS(e).gearPlan,
    wants=(e.customers||[]).filter(c=>c.securementInterest).sort((x,y)=>(x.securementCalledAt?1:0)-(y.securementCalledAt?1:0)||(ZZo_ms(y.securementInterest)||0)-(ZZo_ms(x.securementInterest)||0)),
    trk=id=>id&&(e.trailers||[]).find(x=>x.id===id);
  return ZZo_h("div",{className:"space-y-4","data-zz":"gear"},
    ZZo_h("div",{className:"grid grid-cols-2 lg:grid-cols-4 gap-3"},ZZGEAR.map(x=>ZZo_h(ZZo_Tile,{key:x.k,stat:"gear-"+x.k,label:`${x.label} out`,value:tot[x.k],sub:tot[x.k]?`with ${ZZo_plural(rows.filter(r=>r.g[x.k]>0).length,"customer")}`:"all back",color:tot[x.k]?m.orange:m.mut}))),
    ZZo_h(de,{className:"p-4 space-y-3"},
      ZZo_h("div",{className:"flex items-start justify-between gap-3 flex-wrap"},
        ZZo_h("div",null,ZZo_h("div",{className:"font-bold"},"Our gear out with customers"),ZZo_h("div",{className:"text-xs mt-0.5",style:{color:m.mut}},"From the crew's securement reports, minus what came back. Log it here when a driver brings gear back.")),
        ZZo_h(Z,{kind:"primary",icon:wa,onClick:()=>setLog({})},"Log gear")),
      rows.length?ZZo_h("div",{className:"grid lg:grid-cols-2 gap-3"},rows.map(r=>ZZo_h("div",{key:r.id,className:"rounded-lg p-3 space-y-2",style:ne,"data-gear-row":r.id},
        ZZo_h("div",{className:"flex items-center gap-2"},ZZo_h("div",{className:"font-bold truncate flex-1 min-w-0"},r.c?r.c.name:"Unknown company"),
          ZZo_h(Z,{onClick:()=>setLog({customerId:r.id,dir:"back",type:(ZZGEAR.find(x=>r.g[x.k]>0)||ZZGEAR[0]).k})},"Log gear back")),
        ZZo_h("div",{className:"grid grid-cols-4 gap-1.5"},ZZGEAR.map(x=>ZZo_h("div",{key:x.k,className:"rounded-lg px-2 py-1.5",style:{background:m.panel,border:`1px solid ${m.line}`},"data-gear":x.k},
          ZZo_h("div",{className:"text-[10px] font-bold truncate",style:{color:m.mut},title:x.label},ZZo_gearShort[x.k]||x.label),ZZo_h("div",{className:"text-lg font-black tabular-nums leading-tight",style:{color:r.g[x.k]?m.text:m.dim}},r.g[x.k])))),
        r.g.tags.length?ZZo_h("div",{className:"flex gap-1.5 flex-wrap items-center"},ZZo_h("span",{className:"text-[11px]",style:{color:m.mut}},"Tags out:"),r.g.tags.map(tg=>ZZo_h(ve,{key:tg,label:tg,color:m.orange,dot:!1}))):null)))
        :ZZo_h(ZZo_Empty,null,"No gear out right now. When the crew secures a load with our plywood, bars, straps or airbags, it shows here.")),
    ZZo_h(de,{className:"p-4 space-y-2"},
      ZZo_h("div",{className:"font-bold"},"Recent gear moves"),
      ledger.length?ZZo_h("div",{className:"space-y-1.5"},ledger.map(g=>{let c=ZZo_cust(e,g.customerId),k=trk(g.trailerId),back=g.dir==="back",w=ZZo_gearW[g.type]||[g.type,g.type];
        return ZZo_h("div",{key:g.id,className:"rounded-lg px-3 py-2 flex items-start gap-3 flex-wrap",style:ne},
          ZZo_h("div",{className:"text-xs tabular-nums shrink-0",style:{color:m.dim,width:92}},ZZo_when(g.at,t)),
          ZZo_h("div",{className:"flex-1",style:{minWidth:180}},
            ZZo_h("div",{className:"text-sm"},ZZo_h("b",{style:{color:back?m.green:m.orange}},`${back?"−":"+"}${g.qty} ${w[g.qty===1?0:1]}`),` ${back?"back from":"out to"} `,ZZo_h("b",null,c?c.name:"—")),
            ZZo_h("div",{className:"text-[11px]",style:{color:m.mut}},[ZZo_srcLbl[g.src]||"",g.by?`by ${g.by}`:"",(g.tags||[]).length?`tags ${g.tags.join(", ")}`:"",g.note||""].filter(Boolean).join(" \xB7 "))),
          k&&v?ZZo_h(Z,{icon:Ca,onClick:()=>v(k)},`Truck ${k.truck||""}`):null)}))
        :ZZo_h("div",{className:"text-sm",style:{color:m.dim}},"Nothing logged yet.")),
    ZZo_h(de,{className:"p-4 space-y-2",rail:m.violet},
      ZZo_h("div",{className:"font-bold"},`Interested in the securement plan \xB7 ${wants.filter(c=>!c.securementCalledAt).length}`),
      ZZo_h("div",{className:"text-xs",style:{color:m.mut}},`Plan price: ${Fe(plan.price)} per ${plan.months} months (change it in Setup). These customers tapped "I'm interested". Call them back.`),
      wants.length?ZZo_h("div",{className:"space-y-1.5"},wants.map(c=>ZZo_h("div",{key:c.id,className:"rounded-lg px-3 py-2 flex items-center gap-3 flex-wrap",style:{...ne,opacity:c.securementCalledAt?.65:1},"data-interest":c.id},
        ZZo_h("div",{className:"flex-1",style:{minWidth:180}},ZZo_h("div",{className:"font-bold"},c.name),
          ZZo_h("div",{className:"text-[11px]",style:{color:m.mut}},[`asked ${ZZo_when(c.securementInterest,t)}${c.securementInterestBy?` by ${c.securementInterestBy}`:""}`,c.person||"",c.phone||"",c.contact||""].filter(Boolean).join(" \xB7 "))),
        c.securementCalledAt?ZZo_h("span",{className:"text-xs",style:{color:m.green}},`Called ${ZZo_when(c.securementCalledAt,t)}${c.securementCalledBy?` by ${c.securementCalledBy}`:""}`)
          :ZZo_h(Z,{kind:"good",icon:Ze,disabled:busy,onClick:()=>once(async()=>{let r=a.zzCustomer(c.id,{securementCalledAt:ye(Date.now()),securementCalledBy:o||"Office"});r&&await r})},"Mark called"))))
        :ZZo_h("div",{className:"text-sm",style:{color:m.dim}},"Nobody yet. Customers see the plan under Inventory in their portal.")),
    log?ZZo_h(ZZo_GearLog,{doc:e,init:log,actions:a,onClose:()=>setLog(null),onDone:x=>toast(x)}):null,
    ZZo_h(ZZo_Toasts,{items:toasts,onDismiss:drop}))},

/* ========================== Dock settings card (Setup, before "Crew on the floor") ========================== */
ZZDockSet=({doc:e,actions:a})=>{
  let st=ZZS(e),r=Ln(e,null),init={promiseMin:String(st.promiseMin),promiseText:st.promiseText,waitGoalMin:String(st.waitGoalMin),newPallet:String(ie(r.newPallet,20)),planPrice:String(ie(st.gearPlan.price,2e3)),planMonths:String(ie(st.gearPlan.months,6))},
    key=JSON.stringify(init),[f,setF]=(0,H.useState)(init),base=(0,H.useRef)(key),[toasts,toast,drop]=ZZo_useToast(),[err,setErr]=(0,H.useState)(""),[busy,once]=ZZo_useOnce();
  /* someone else saved: take the new values unless this form has unsaved edits */
  (0,H.useEffect)(()=>{if(key!==base.current){setF(cur=>JSON.stringify(cur)===base.current?init:cur);base.current=key}},[key]);
  let dirty=JSON.stringify(f)!==key,set=p=>{setF({...f,...p});setErr("")},
    save=()=>once(async()=>{let pm=Math.round(ie(f.promiseMin)),wg=Math.round(ie(f.waitGoalMin)),np=ie(f.newPallet,-1),pp=ie(f.planPrice,-1),mo=Math.round(ie(f.planMonths));
      if(!(pm>=15&&pm<=1440))return setErr("The promise must be between 15 and 1440 minutes.");if(!(wg>=5&&wg<=600))return setErr("The wait goal must be between 5 and 600 minutes.");
      if(!String(f.promiseText||"").trim())return setErr("Write the promise the way customers should read it.");if(!String(f.newPallet).trim()||!(np>=0))return setErr("Type the replacement pallet price (a number, 0 or more).");
      if(!String(f.planPrice).trim()||!(pp>=0))return setErr("Type the securement plan price (a number, 0 or more).");if(!(mo>=1&&mo<=36))return setErr("The plan length must be 1 to 36 months.");
      let p=a.zzSettings({promiseMin:pm,promiseText:String(f.promiseText).trim(),waitGoalMin:wg,gearPlan:{price:pp,months:mo},rates:{newPallet:np}});p&&await p;toast("Dock settings saved.")}),
    pmN=Math.round(ie(f.promiseMin)),
    num=(k,label,hint,w)=>ZZo_h(xe,{label,hint},ZZo_h(se,{type:"number",inputMode:"decimal",value:f[k],onChange:x=>set({[k]:x.target.value}),"aria-label":label,style:w?{maxWidth:w}:{}}));
  return ZZo_h("div",{"data-zz":"dockset"},ZZo_h(de,{className:"p-4 space-y-3"},
    ZZo_h("div",null,ZZo_h("div",{className:"font-bold"},"Dock promise and wait goal"),ZZo_h("div",{className:"text-xs mt-0.5",style:{color:m.mut}},"The promise is what we tell customers: the yard board, the door map, the TV and the alert texts measure against it. The wait goal colors the yard, crew and door clocks: amber at 75%, red at the goal.")),
    ZZo_h("div",{className:"grid sm:grid-cols-2 gap-3"},
      num("promiseMin","Our promise, in minutes from check-in to done",`${pmN>=15&&pmN<=1440?`${ot(pmN*6e4)} from check-in to done`:"120 = 2 hours"}. Doors on the board and the TV turn red after this.`),
      ZZo_h(xe,{label:"The promise, the way customers read it",hint:"Change this too when you change the minutes."},ZZo_h(se,{value:f.promiseText,onChange:x=>set({promiseText:x.target.value}),"aria-label":"Promise wording"})),
      num("waitGoalMin","Wait goal, in minutes until a door","Clocks turn red when a truck waits this long."),
      num("newPallet","Replacement pallet price ($)","Used in the crew's damage fix suggestions."),
      num("planPrice","Securement plan price ($)","The price for our gear on loan, shown with the plan."),
      num("planMonths","Securement plan length (months)","")),
    err?ZZo_h("div",{className:"text-sm",style:{color:m.red},role:"alert"},err):null,
    ZZo_h("div",{className:"flex items-center gap-2 flex-wrap"},ZZo_h(Z,{kind:"primary",icon:br,disabled:!dirty||busy,onClick:save},busy?"Saving…":"Save dock settings"),
      dirty?ZZo_h(Z,{kind:"quiet",onClick:()=>{setF(init);setErr("")}},"Undo changes"):ZZo_h("span",{className:"text-xs",style:{color:m.dim}},`Now: ${st.promiseText} \xB7 goal ${st.waitGoalMin} min`))),
    ZZo_h(ZZo_Toasts,{items:toasts,onDismiss:drop}))},

/* ========================== Crew truck flow, office side: jobs, load badges, load plan, photos, manifest, damage snaps ==========================
   Engine contract (DEV.md "Crew truck flow rework"): ZZloadJob / ZZJOBS / zzLoadJob, ZZloadBadges, ZZloadOrder / ZZposSuggest /
   zzLoadPlan, ZZmanifestFor, ZZdmgDrafts, ZZtrail {staff:true}. Photo owners: ship: (shipper reference, office or customer),
   unload:, after:, strap:, bol:, row:<sid>, insp:<sid>. Damage snaps are staff only: no customer screen and no alert until finished. */
/* a load badge: solid circle with the number (never the colour alone) and the PRO next to it */
ZZo_Badge=({b,ref})=>b?ZZo_h("span",{title:`Load ${b.n} (${String(b.name||"").toLowerCase()})${b.ref?" \xB7 "+b.ref:""}`,"data-badge":b.n,style:{display:"inline-flex",alignItems:"center",gap:6,fontWeight:900,whiteSpace:"nowrap",verticalAlign:"middle"}},
  ZZo_h("span",{style:{display:"inline-grid",placeItems:"center",minWidth:26,height:26,padding:"0 5px",borderRadius:13,background:b.color,color:b.fg,fontSize:14,fontWeight:900,lineHeight:1,fontVariantNumeric:"tabular-nums",boxShadow:"0 0 0 1px rgba(0,0,0,.2)"}},b.n),
  ref===!1?null:ZZo_h("span",null,b.ref||`Load ${b.n}`)):null,
/* badges for one truck, worked out once per doc (Nick's load rows ask once per row) */
ZZo_bc={d:null,t:null,v:{}},
ZZo_bdg=(doc,t,sid)=>{if(!doc||!t)return null;if(ZZo_bc.d!==doc||ZZo_bc.t!==t.id)ZZo_bc={d:doc,t:t.id,v:ZZloadBadges(doc,t)};return ZZo_bc.v[sid]||null},
ZZo_bdgEl=(doc,t,sid)=>{let b=ZZo_bdg(doc,t,sid);return b?ZZo_h("span",{style:{marginRight:6}},ZZo_h(ZZo_Badge,{b,ref:!1})):null},
ZZo_POS={nose:["NOSE","front of the trailer"],middle:["MIDDLE","middle of the trailer"],tail:["TAIL","by the doors"]},
ZZo_JOBHELP={unpack:"Break the trailer down: count each load and sort it to its own lane. Inbound jobs follow the loads (East Coast origin or loads that reload).",
  unload:"Count each load and put it away.",
  pack:"Several loads built into one trailer: packing photos the whole time, how it is secured and what is used, then the forklift driver signs a manifest.",
  delivery:"We deliver it: find the load, count, inspect, load it like the shipper did, photo of it strapped, photo of the bills.",
  pickup:"The customer's carrier picks up: find, count, inspect, load it like the shipper did, strapped, bills."},
/* multi-stop load plan draft: {multi, rows:{sid:{stop, pos, auto}}}; a place someone picked (auto false) stays,
   the others follow ZZposSuggest (last stop -> nose, first stop -> tail) */
ZZo_planInit=(L,multi)=>{let rows={},sg=ZZposSuggest(L.map(r=>r.stop??null));L.forEach((r,k)=>{rows[r.sid]={stop:r.stop??null,pos:r.pos||null,auto:!r.pos||r.pos===sg[k]}});return{multi:!!multi,rows}},
ZZo_planSug=(L,rows)=>{let sg=ZZposSuggest(L.map(r=>(rows[r.sid]||{}).stop??null)),o={...rows};L.forEach((r,k)=>{let x=rows[r.sid]||{};if(x.auto!==!1)o[r.sid]={...x,pos:sg[k]||null,auto:!0}});return o},
ZZo_planOn=(L,P,v)=>{if(!v)return{...P,multi:!1};let rows={...P.rows};L.forEach((r,k)=>{let x=rows[r.sid]||{};if(x.stop==null)rows[r.sid]={...x,stop:Math.min(k+1,9)}});return{multi:!0,rows:ZZo_planSug(L,rows)}},
ZZo_planErr=(L,P)=>!P.multi?"":L.some(r=>(P.rows[r.sid]||{}).stop==null)?"Pick a stop for every load.":new Set(L.map(r=>P.rows[r.sid].stop)).size<2?"Give at least one load a different stop, or choose One stop.":"",
ZZo_planOut=(L,P)=>L.map(r=>{let x=P.rows[r.sid]||{};return P.multi?{sid:r.sid,stop:x.stop??null,pos:x.pos||null}:{sid:r.sid,stop:null,pos:null}}),
ZZo_LoadPlan=({t,doc:e,actions:a,toast,busy,once})=>{let[P,setP]=(0,H.useState)(null),[err,setErr]=(0,H.useState)(""),
  L=ZZloadOrder(e,t),open=ZZactive(t),nStops=new Set(L.map(r=>r.stop).filter(v=>v!=null)).size,
  cust=r=>{let c=ZZo_cust(e,r.s.customerId);return c&&c.id!==t.customerId?c.name:""},
  save=()=>{let x=ZZo_planErr(L,P);if(x)return setErr(x);once(async()=>{let r=a.zzLoadPlan(t.id,{multiStop:!!P.multi,loads:ZZo_planOut(L,P)});r&&await r;toast("Load plan saved. The forklift driver sees it in the Load step.");setP(null);setErr("")})};
  if(!L.length)return ZZo_h(ZZo_Sec,{title:"Load plan"},ZZo_h("div",{className:"text-sm",style:{color:m.dim}},"No loads going out on this truck yet."));
  return ZZo_h(ZZo_Sec,{title:`Load plan \xB7 ${t.multiStop&&nStops>1?`${nStops} stops, loading order (nose first)`:"one stop"}`,full:!0},
    P?ZZo_h("div",{className:"space-y-3","data-zz":"plan-edit"},
        ZZo_h(ZZo_Chips,{label:"Stops",value:P.multi?"multi":"one",opts:[["one","One stop"],["multi","More than one stop"]],onChange:k=>{setErr("");setP(ZZo_planOn(L,P,k==="multi"))}}),
        P.multi?ZZo_h("div",{className:"text-xs",style:{color:m.mut}},"Last stop goes in the nose, first stop by the doors. Pick the stop for each load; the place is suggested and can be changed."):null,
        P.multi?L.map(r=>{let x=P.rows[r.sid]||{},c=cust(r);return ZZo_h("div",{key:r.sid,className:"rounded-lg p-2.5 space-y-2",style:{background:m.panel,border:`1px solid ${m.line}`},"data-plan":r.sid},
          ZZo_h("div",{className:"flex items-center gap-2 flex-wrap text-sm"},r.badge?ZZo_h(ZZo_Badge,{b:r.badge}):ZZo_h("b",null,r.s.ref),ZZo_h("span",{style:{color:m.mut}},[`${fe(r.s)} plt`,c].filter(Boolean).join(" \xB7 "))),
          ZZo_h("div",{className:"flex items-end gap-2 flex-wrap"},
            ZZo_h("div",{style:{width:120}},ZZo_h(xe,{label:"Stop"},ZZo_h(zj,{value:x.stop==null?"":String(x.stop),"aria-label":`Stop for ${r.s.ref}`,onChange:v=>{setErr("");let st=v.target.value===""?null:+v.target.value;setP({...P,rows:ZZo_planSug(L,{...P.rows,[r.sid]:{...x,stop:st}})})}},
              ZZo_h("option",{value:""},"Pick"),[...Array(Math.max(2,Math.min(9,L.length)))].map((_,j)=>ZZo_h("option",{key:j,value:String(j+1)},`Stop ${j+1}`))))),
            ZZo_h("div",{style:{minWidth:0}},ZZo_h(ZZo_Group,{label:x.pos&&x.auto!==!1?"Place in the trailer (suggested)":"Place in the trailer"},
              ZZo_h(ZZo_Chips,{label:`Place for ${r.s.ref}`,value:x.pos||"",opts:ZZPOS.map(q=>[q.k,q.label]),onChange:k=>setP({...P,rows:{...P.rows,[r.sid]:{...x,pos:k,auto:!1}}})})))))}):null,
        err?ZZo_h("div",{className:"text-xs",style:{color:m.red},role:"alert"},err):null,
        ZZo_h("div",{className:"flex gap-2 flex-wrap"},ZZo_h(Z,{kind:"primary",icon:br,disabled:busy,onClick:save},"Save load plan"),ZZo_h(Z,{kind:"quiet",onClick:()=>{setP(null);setErr("")}},"Cancel")))
      :ZZo_h(H.Fragment,null,
        t.multiStop?ZZo_h("div",{className:"space-y-1.5","data-zz":"plan-view"},L.map((r,k)=>{let c=cust(r);return ZZo_h("div",{key:r.sid,className:"flex items-center gap-x-2 gap-y-0.5 flex-wrap text-sm pt-1.5","data-plan":r.sid,style:k?{borderTop:`1px solid ${m.line}`}:void 0},
            ZZo_h("span",{className:"text-xs font-bold tabular-nums",style:{color:m.dim,width:18}},k+1),r.badge?ZZo_h(ZZo_Badge,{b:r.badge}):ZZo_h("b",null,r.s.ref),c?ZZo_h("span",{className:"text-xs",style:{color:m.mut}},c):null,
            ZZo_h("span",{style:{flexBasis:"100%",paddingLeft:26}},[r.stop?`Stop ${r.stop}`:"No stop set",r.pos&&ZZo_POS[r.pos]?`${ZZo_POS[r.pos][0]} \u2014 ${ZZo_POS[r.pos][1]}`:"place not set"].join(" \xB7 ")))}))
          :ZZo_h("div",{className:"text-sm",style:{color:m.mut}},`All ${ZZo_plural(L.length,"load")} go to one place.`),
        open?ZZo_h("div",null,ZZo_h(Z,{onClick:()=>setP(ZZo_planInit(L,!!t.multiStop))},t.multiStop?"Change the load plan":"Set stops (more than one stop)")):null))},

/* ========================== Truck sheet extras (_Q) ========================== */
/* pills next to the status pills: check-in code, needs-OK, ETA, promise */
ZZo_Pills=({t,doc,now})=>{if(!t)return null;let code=/^\d{4}$/.test(String(t.code??""))?t.code:null,late=ZZactive(t)&&t.arrivedAt&&!t.workDoneAt&&ZZo_late(doc,t,now),job=ZZloadJob(doc,t),
    snaps=ZZdmgDrafts(doc,t.id).length;
  return ZZo_h(H.Fragment,null,job&&ZZJOBS[job]?ZZo_h(ve,{label:ZZJOBS[job].word,color:m.teal,dot:!1}):null,code?ZZo_h(ve,{label:`Code ${code}`,color:m.orange,dot:!1}):null,
    snaps?ZZo_h(ve,{label:`${ZZo_plural(snaps,"damage snap")} waiting`,color:m.amber}):null,ZZo_needsOk(doc,t)?ZZo_h(ve,{label:"Needs your OK",color:m.amber}):null,
    t.stage==="scheduled"&&t.eta&&t.eta.at?ZZo_h(ve,{label:`ETA ${ZZo_hm(t.eta.at)}`,color:m.blue}):null,late?ZZo_h(ve,{label:`Past the ${ZZo_promShort(ZZS(doc).promiseMin)} promise`,color:m.red}):null)},
ZZo_Sec=({title,children,full})=>ZZo_h("div",{className:"rounded-lg p-3 space-y-2",style:{...ne,...(full?{gridColumn:"1 / -1"}:{}),minWidth:0}},ZZo_h("div",{className:"text-xs font-bold",style:{color:m.mut}},title),children),
/* the sheet grows in two places so Nick's own sections (loads, crew instructions, truck chat) stay near the top:
   part "top" (under the action buttons, E19): what the office acts on now. Before check-in: code + driver link, ETA + Set ETA,
     booking (Confirm time, Check in now), tracking + driver language. After check-in: one clock box (wait, promise), plus the code
     and driver link until the crew starts.
   part "end" (after the truck chat, E31): paperwork photos, securement report, this truck's messages. */
ZZTruckExtra=({t,doc:e,now:n,actions:a,part})=>{
  let[etaOpen,setEtaOpen]=(0,H.useState)(!1),[etaT,setEtaT]=(0,H.useState)(""),[etaNote,setEtaNote]=(0,H.useState)(""),[etaErr,setEtaErr]=(0,H.useState)(""),
    [ask,setAsk]=(0,H.useState)(!1),[res,setRes]=(0,H.useState)(null),[openM,setOpenM]=(0,H.useState)(null),[toasts,toast,drop]=ZZo_useToast(),[busy,once]=ZZo_useOnce(),[allTrail,setAllTrail]=(0,H.useState)(!1),
    tid=t&&t.id,top=part!=="end",end=part!=="top",msgs=(0,H.useMemo)(()=>tid&&end?ZZo_allMsgs(e,Date.now()).filter(q=>q.tid===tid):[],[e,tid,n,end]);
  if(!t)return null;
  let act=ZZactive(t),code=/^\d{4}$/.test(String(t.code??""))?String(t.code):null,st=ZZS(e),lang=ZZLANGS.find(l=>l.k===(t.driverLang||"en")),
    url=ZZsafeUrl(t.trackUrl),eta=t.eta&&t.eta.at?t.eta:null,appt=ZZo_ms(t.scheduledAt),preArr=act&&!t.arrivedAt,showCode=act&&!t.workStartedAt&&!t.workDoneAt,
    setEta=(ms,note)=>once(async()=>{let p=a.zzEta(t.id,{at:ms,source:"office",note:note||""});if(!p){setEtaErr("That ETA could not be saved.");return}await p;
      toast(`ETA set to ${ZZo_when(ms,Date.now())}.`);setEtaOpen(!1);setEtaT("");setEtaNote("");setEtaErr("")}),
    pickEta=()=>{if(!/^\d{1,2}:\d{2}$/.test(etaT))return setEtaErr("Pick a time.");let day=ZZo_today(Date.now()),iso=ZZzonedIso(day,etaT),ms=ZZo_ms(iso);
      if(!isFinite(ms))return setEtaErr("That time does not exist.");if(ms<Date.now()-15*6e4){let nx=new Date(Date.UTC(+day.slice(0,4),+day.slice(5,7)-1,+day.slice(8,10)+1)).toISOString().slice(0,10);ms=ZZo_ms(ZZzonedIso(nx,etaT))}setEta(ms,etaNote)},
    checkIn=()=>once(async()=>{let r=null;try{r=await a.zzKioskIn(t.id,{by:"office"})}catch(x){console.error(x)}setAsk(!1);setRes(r||{failed:!0});
      /* null: the save failed or was refused (zzKioskIn), so the truck is NOT checked in */
      r||toast("The check-in did NOT save. The truck is not checked in. Try again.","bad")}),
    confirm=()=>once(async()=>{let r=a.zzConfirm(t.id);r&&await r;toast("Time confirmed. The “booking confirmed” alert is in the Outbox.")}),
    w=ZZwaitMs(t,n),p=ZZpromise(e,t,n),late=ZZo_late(e,t,n),out=t.direction==="outbound",sec=t.secure&&t.secure.signedAt?t.secure:null,
    who=t.bookedVia==="client"?"Booked by the customer":t.bookedVia==="office"?"Booked by the office":t.bookedVia==="kiosk"||t.checkedInBy==="kiosk"&&!t.scheduledAt?"Walk-in at the kiosk":"",
    /* older trucks carry none of this: say nothing rather than a bare "Booked" */
    bookedLine=who||t.bookedBy||t.createdAt?[who||"Booked",t.bookedBy?`(${t.bookedBy})`:"",t.createdAt?ZZo_when(t.createdAt,n):""].filter(Boolean).join(" "):"",
    resBox=res?ZZo_h("div",{className:"text-sm font-semibold",style:{color:res.failed?m.red:m.green},role:"status"},
      res.failed?"That did not save. Try again.":res.already?`Already checked in${res.dock&&res.dock!==Ee?`, at door ${res.dock}`:res.place?`, #${res.place} in line`:""}.`
        :res.dock&&res.dock!==Ee?`Checked in. Send the driver to door ${res.dock}.`:`Checked in. #${res.place||"?"} in the yard line${res.estMin?`, about ${res.estMin} min`:""}.`):null,
    codeSec=ZZo_h(ZZo_Sec,{title:"Check-in code and driver link"},
      code?ZZo_h(H.Fragment,null,
        ZZo_h("div",{className:"flex items-baseline gap-3"},ZZo_h("span",{className:"text-3xl font-black tabular-nums",style:{color:m.orange,letterSpacing:"0.08em"},"data-code":code},code),
          ZZo_h("span",{className:"text-xs",style:{color:m.mut}},"The driver types this at the kiosk. It is not the company's portal PIN.")),
        ZZo_h(ZZo_CopyBox,{text:ZZetaLink(t),label:preArr?"Driver page: ETA updates and door number":"Driver page: place in line and door number"}))
      :ZZo_h(H.Fragment,null,ZZo_h("div",{className:"text-sm",style:{color:m.mut}},"No check-in code yet. This truck was booked before codes existed."),
          ZZo_h("div",null,ZZo_h(Z,{disabled:busy,onClick:()=>once(async()=>{let r=a.zzEnsureCode(t.id);r&&await r})},"Make a code and driver link")))),
    etaSec=ZZo_h(ZZo_Sec,{title:"ETA"},
      eta?ZZo_h("div",null,ZZo_h("div",{className:"text-xl font-black tabular-nums"},`ETA ${ZZo_when(eta.at,n)}`),
          ZZo_h("div",{className:"text-xs",style:{color:m.mut}},`from ${ZZo_srcName[eta.source]||"an update"}${eta.by?` (${eta.by})`:""}, ${ZZo_ago(eta.updatedAt,n)}${eta.note?` \xB7 "${eta.note}"`:""}`))
        :ZZo_h("div",{className:"text-sm",style:{color:m.mut}},isFinite(appt)?`No ETA yet. Going by the appointment, ${ZZo_when(appt,n)}.`:"No ETA and no appointment time."),
      (eta?ZZo_ms(eta.at):appt)<n?ZZo_h("div",{className:"text-xs font-bold",style:{color:m.red}},`Late: ${ot(n-(eta?ZZo_ms(eta.at):appt))} past the ${eta?"ETA":"appointment"}`):null,
      etaOpen?ZZo_h("div",{className:"space-y-2"},
        ZZo_h("div",{className:"flex gap-1.5 flex-wrap"},[[15,"In 15 min"],[30,"In 30 min"],[60,"In 1 hour"],[120,"In 2 hours"]].map(([mn,l])=>ZZo_h(Z,{key:mn,disabled:busy,onClick:()=>setEta(Date.now()+mn*6e4,etaNote)},l))),
        ZZo_h("div",{className:"flex gap-2 items-end flex-wrap"},ZZo_h("div",{style:{width:140}},ZZo_h(xe,{label:"Or a time (dock time)"},ZZo_h(se,{type:"time",step:60,value:etaT,onChange:x=>{setEtaT(x.target.value);setEtaErr("")},"aria-label":"ETA time"}))),
          ZZo_h("div",{className:"flex-1",style:{minWidth:140}},ZZo_h(xe,{label:"Note (optional)"},ZZo_h(se,{value:etaNote,onChange:x=>setEtaNote(x.target.value),placeholder:"e.g. driver called, traffic"})))),
        etaErr?ZZo_h("div",{className:"text-xs",style:{color:m.red},role:"alert"},etaErr):null,
        ZZo_h("div",{className:"flex gap-2"},ZZo_h(Z,{kind:"primary",disabled:busy,onClick:pickEta},"Save ETA"),ZZo_h(Z,{kind:"quiet",onClick:()=>{setEtaOpen(!1);setEtaErr("")}},"Cancel")))
        :ZZo_h("div",null,ZZo_h(Z,{icon:Fd,onClick:()=>setEtaOpen(!0)},"Set ETA"))),
    bookSec=ZZo_h(ZZo_Sec,{title:"Booking"},
      bookedLine?ZZo_h("div",{className:"text-xs",style:{color:m.mut}},bookedLine):null,
      t.confirmedAt?ZZo_h("div",{className:"text-sm",style:{color:m.green}},`Time confirmed${t.confirmedBy?` by ${t.confirmedBy}`:""}, ${ZZo_when(t.confirmedAt,n)}`)
        :ZZo_needsOk(e,t)?ZZo_h(H.Fragment,null,ZZo_h("div",{className:"text-sm font-semibold",style:{color:m.amber}},"The customer asked for this time. It is not confirmed yet."),
            ZZo_h("div",null,ZZo_h(Z,{kind:"primary",icon:Ze,disabled:busy,onClick:confirm},"Confirm time")))
          :t.stage==="scheduled"?ZZo_h("div",{className:"text-xs",style:{color:m.dim}},"Booked straight onto the schedule. Nothing to confirm."):null,
      t.stage==="scheduled"?ask?ZZo_h("div",{className:"rounded-lg p-2.5 space-y-2",style:{background:m.panel,border:`1px solid ${m.line}`}},
          ZZo_h("div",{className:"text-sm"},`Check in truck ${t.truck||"—"} now, as the kiosk would? It gets the first open door, or a place in the yard line. The “checked in” alert and the driver's door text go to the Outbox.`),
          ZZo_h("div",{className:"flex gap-2 flex-wrap"},ZZo_h(Z,{kind:"primary",disabled:busy,onClick:checkIn},busy?"Checking in…":"Yes, check in"),ZZo_h(Z,{disabled:busy,onClick:()=>setAsk(!1)},"Not now")))
        :ZZo_h("div",null,ZZo_h(Z,{icon:Ca,onClick:()=>{setAsk(!0);setRes(null)}},"Check in now (driver skipped the kiosk)")):null,
      resBox),
    trackSec=ZZo_h(ZZo_Sec,{title:"Tracking and driver"},
      ZZo_h("div",{className:"grid grid-cols-2 gap-2 text-sm"},
        ZZo_h("div",null,ZZo_h("div",{className:"text-[11px]",style:{color:m.mut}},"ETA updates"),ZZo_h("div",{className:"font-semibold"},ZZo_trName[t.tracking]||"Not chosen")),
        ZZo_h("div",null,ZZo_h("div",{className:"text-[11px]",style:{color:m.mut}},"Driver's language"),ZZo_h("div",{className:"font-semibold"},lang?lang.name:"English"))),
      url?ZZo_h(ZZo_CopyBox,{text:url,href:url,label:t.tracking==="samsara"?"Samsara live map link":"Live map link"})
        :t.tracking==="samsara"||t.tracking==="gps"?ZZo_h("div",{className:"text-xs",style:{color:m.amber}},"Live map link not pasted yet."):null),
    clockSec=ZZo_h(ZZo_Sec,{title:t.arrivedAt?"Check-in and promise":"Booking"},
      resBox,
      t.arrivedAt?ZZo_h(H.Fragment,null,
        ZZo_h("div",{className:"text-sm"},`Checked in ${ZZo_when(t.arrivedAt,n)}${t.checkedInBy==="office"?" by the office":t.checkedInBy==="kiosk"?" at the kiosk":""}`),
        w!=null?ZZo_h("div",{className:"text-sm",style:{color:t.workStartedAt?m.mut:ZZtoneColor(ZZtone(w,e))}},t.workStartedAt?`Waited ${ot(w)} for a door`:`Waiting ${ot(w)} \xB7 goal ${st.waitGoalMin} min`):null,
        p.elapsedMin!=null?ZZo_h("div",{className:"text-sm font-semibold",style:{color:p.kept===!0?m.green:late||p.kept===!1?m.red:m.text}},
          p.doneMin!=null?`Done in ${ot(p.doneMin*6e4)}, ${p.kept?"within":"over"} our ${ZZo_promName(st.promiseMin)} promise`:`${ot(p.elapsedMin*6e4)} since check-in \xB7 ${p.leftMin>=0?`${ot(p.leftMin*6e4)} left on the promise`:"past the promise"}`):null)
        :ZZo_h("div",{className:"text-sm",style:{color:m.dim}},t.stage==="cancelled"?"Cancelled before it checked in.":"Never checked in."),
      /* outbound: securement status here too, next to "Release truck" (the full report is at the end of the sheet) */
      out&&t.arrivedAt?ZZo_h("div",{className:"text-sm font-semibold",style:{color:sec?ie(sec.confidence)>=4?m.green:m.amber:t.stage==="done"||t.stage==="departed"?m.red:m.amber}},
        sec?`Secured ${sec.confidence}/5${sec.seal?` \xB7 seal ${sec.seal}`:""} (report below)`:t.stage==="departed"?"Left without a securement report":"Not secured yet. The crew secures it before release."):null,
      bookedLine||lang&&lang.k!=="en"?ZZo_h("div",{className:"text-xs",style:{color:m.mut}},[bookedLine,lang&&lang.k!=="en"?`driver speaks ${lang.name}`:""].filter(Boolean).join(" \xB7 ")):null),
    paperSec=t.arrivedAt||ie(t.paperCount)>0?ZZo_h(ZZo_Sec,{title:`Paperwork${ie(t.paperCount)?` \xB7 ${ZZo_plural(ie(t.paperCount),"photo")}`:""}`},
      ZZo_h(lr,{ownerId:dt.paper(t.id),size:56,empty:"No paperwork scanned yet."}),
      t.paperBy?ZZo_h("div",{className:"text-[11px]",style:{color:m.dim}},`by ${t.paperBy}`):null):null,
    secSec=out||sec?ZZo_h(ZZo_Sec,{title:"Securement"},
      sec?ZZo_h(H.Fragment,null,
        ZZo_h("div",{className:"text-sm font-semibold",style:{color:ie(sec.confidence)>=4?m.green:ie(sec.confidence)===3?m.amber:m.red}},`Secured ${sec.confidence}/5${sec.seal?` \xB7 seal ${sec.seal}`:""}`),
        ZZo_h("div",{className:"text-xs",style:{color:m.mut}},`Signed by ${sec.signedBy||sec.signature||"the crew"}, ${ZZo_when(sec.signedAt,n)}`),
        ZZo_h("div",{className:"text-xs"},ZZGEAR.filter(g=>ie(sec.gear&&sec.gear[g.k]&&sec.gear[g.k].qty)>0).map(g=>`${ie(sec.gear[g.k].qty)} ${ZZo_gearW[g.k][ie(sec.gear[g.k].qty)===1?0:1]} (${sec.gear[g.k].owner==="driver"?"driver's":"ours"})`).join(", ")||"No gear used."),
        (sec.tags||[]).length?ZZo_h("div",{className:"text-xs",style:{color:m.mut}},`Tags: ${sec.tags.join(", ")}`):null,
        sec.note?ZZo_h("div",{className:"text-xs",style:{color:m.mut}},`Note: ${sec.note}`):null,
        sec.photoOwner?ZZo_h("div",{className:"space-y-1"},ZZo_h(lr,{ownerId:sec.photoOwner,size:44,label:`Securing and what's used \xB7 ${ie(sec.photoCount)}`,empty:"not on this device"}),ZZo_h(lr,{ownerId:`sec:${t.id}:seal`,size:44,label:"Seal"}))
          :ZZo_h("div",{className:"space-y-1"},ZZSECSLOTS.map(sl=>ZZo_h(lr,{key:sl.k,ownerId:`sec:${t.id}:${sl.k}`,size:44,label:sl.label}))))
      :ZZo_h("div",{className:"text-sm",style:{color:t.stage==="done"||t.stage==="departed"?m.red:m.amber}},t.stage==="done"||t.stage==="departed"?"No securement report.":"Not secured yet. The crew does this before the truck leaves.")):null,
    msgSec=ZZo_h(ZZo_Sec,{title:`Messages for this truck \xB7 ${msgs.length}`,full:!0},
      msgs.length?ZZo_h("div",{className:"space-y-1.5"},msgs.slice(0,8).map(q=>ZZo_h(ZZo_MsgRow,{key:q.id,q,doc:e,open:openM===q.id,onToggle:()=>setOpenM(openM===q.id?null:q.id),onTruck:null})))
        :ZZo_h("div",{className:"text-sm",style:{color:m.dim}},"No texts or emails for this truck yet."),
      ZZo_h("div",{className:"text-[11px]",style:{color:m.dim}},`Not sent for real yet.${msgs.length>8?` Showing the newest 8 of ${msgs.length}.`:""} The Outbox tab has every message.`)),
    /* ---- crew truck flow (Nick's review): the job, damage snaps, shipper photo, manifest, crew photos, staff trail ---- */
    SH=(e.shipments||[]).filter(Boolean),job=ZZloadJob(e,t),J=job?ZZJOBS[job]:null,autoJob=out?ZZloadJob(e,{...t,loadJob:null}):job,
    ord=ZZloadOrder(e,t),nStops=new Set(ord.map(r=>r.stop).filter(v=>v!=null)).size,
    reloadN=out?0:SH.filter(s=>s.trailerInId===t.id&&be(s)==="sac").length,
    setJob=j=>{if((t.loadJob??null)===j)return;once(async()=>{let r=a.zzLoadJob(t.id,j);if(!r)return;await r;toast(j?`Loading job set to ${ZZJOBS[j].word}. The crew screen follows it.`:`Loading job back to automatic: ${ZZJOBS[autoJob].word}.`)})},
    jobSec=J?ZZo_h(ZZo_Sec,{title:"Loading job"},
      ZZo_h("div",{className:"flex items-baseline gap-2 flex-wrap","data-zz":"job"},ZZo_h("span",{className:"text-lg font-black",style:{color:m.teal}},J.word),
        ZZo_h("span",{className:"text-sm font-semibold"},job==="delivery"||job==="pickup"?`${J.label}${t.multiStop&&nStops>1?` \xB7 ${nStops} stops`:""}`:J.label),
        out&&!t.loadJob?ZZo_h("span",{className:"text-[11px]",style:{color:m.dim}},"worked out from the loads"):null),
      ZZo_h("div",{className:"text-xs",style:{color:m.mut}},ZZo_JOBHELP[job]),
      reloadN?ZZo_h("div",{className:"text-xs font-semibold"},`Reload part: PACK \xB7 ${ZZo_plural(reloadN,"load")} go${reloadN===1?"es":""} back out`):null,
      out&&act?ZZo_h(ZZo_Chips,{label:"Loading job",value:t.loadJob||"auto",opts:[["auto",`Auto (${(ZZJOBS[autoJob]||J).word})`],["pack","Pack"],["delivery","Delivery"],["pickup","Pickup"]],onChange:k=>{busy||setJob(k==="auto"?null:k)}}):null):null,
    snaps=ZZdmgDrafts(e,t.id),
    snapSec=snaps.length?ZZo_h(ZZo_Sec,{title:`Damage snaps waiting for details \xB7 ${snaps.length}`,full:!0},
      ZZo_h("div",{className:"text-xs",style:{color:m.mut}},"The crew took these photos before touching the pallets. They add pallets, what is wrong and the fix price at the count. The customer sees nothing and no alert is queued until then. Wrap-up waits until each one is finished or thrown away."),
      ZZo_h("div",{className:"space-y-2","data-zz":"snaps"},snaps.map(d=>{let b=d.sid?ZZo_bdg(e,t,d.sid):null;return ZZo_h("div",{key:d.id,className:"rounded-lg p-2.5 space-y-1.5",style:{background:m.panel,border:`1px solid ${m.line}`},"data-snap":d.id},
        ZZo_h("div",{className:"flex items-center gap-2 flex-wrap text-sm"},b?ZZo_h(ZZo_Badge,{b}):d.sid?ZZo_h("b",null,d.ref||"Load"):ZZo_h("b",{style:{color:m.amber}},"Load not picked yet"),
          d.customerId&&d.customerId!==t.customerId?ZZo_h("span",{className:"text-xs",style:{color:m.mut}},ZZo_cname(e,{customerId:d.customerId})):null),
        ZZo_h("div",{className:"text-xs",style:{color:m.mut}},[ZZo_plural(d.photoCount,"photo"),d.by?`by ${d.by}`:"",d.at?ZZo_when(d.at,n):"",d.note?`\u201c${d.note}\u201d`:""].filter(Boolean).join(" \xB7 ")),
        ZZo_h(lr,{ownerId:d.photoOwner,size:44,empty:"The photos are on the crew phone that took them."}))}))):null,
    shipN=ie(t.shipperPhotoCount),
    shipSec=out?ZZo_h(ZZo_Sec,{title:`How it came from the shipper${shipN?` \xB7 ${ZZo_plural(shipN,"photo")}`:""}`},
      ZZo_h("div",{className:"text-xs",style:{color:m.mut}},"Reference photo from the dispatcher or the customer. The forklift driver loads it the same way, so the receiver has nothing to complain about."),
      act&&!t.workDoneAt?ZZo_h("div",{"data-zz":"ship"},ZZo_h(Xn,{ownerId:`ship:${t.id}`,canAdd:!0,onCountChange:c=>{c!==shipN&&a.patchTrailer(t.id,{shipperPhotoCount:c})}}))
        :ZZo_h(lr,{ownerId:`ship:${t.id}`,size:56,empty:shipN?`${ZZo_plural(shipN,"photo")} on file, not on this device.`:"No shipper photo was added."})):null,
    mf=ZZmanifestFor(e,t,null),
    mfSec=mf?ZZo_h(ZZo_Sec,{title:`Manifest \xB7 ${ZZo_plural(mf.total,"pallet")} loaded`,full:!0},
        ZZo_h("div",{className:"space-y-1.5","data-zz":"manifest"},mf.lines.map(l=>{let b=l.sid?ZZo_bdg(e,t,l.sid):null,c=ZZo_cust(e,l.customerId),pl=ie(l.planned),ld=ie(l.loaded),off=(l.sid||pl)&&ld!==pl;
          return ZZo_h("div",{key:l.id,className:"rounded-lg px-2.5 py-2 flex items-center gap-2 flex-wrap text-sm",style:{background:m.panel,border:`1px solid ${off?m.amber:m.line}`},"data-line":l.id},
            b?ZZo_h(ZZo_Badge,{b}):ZZo_h("b",null,l.ref||"Extra line"),
            ZZo_h("span",{className:"text-xs",style:{color:m.mut}},[c?c.name:l.sid?"":"Staff only",l.stop?`Stop ${l.stop}`:"",l.pos&&ZZo_POS[l.pos]?ZZo_POS[l.pos][0]:"",l.note?`\u201c${l.note}\u201d`:""].filter(Boolean).join(" \xB7 ")),
            ZZo_h("span",{className:"ml-auto font-black tabular-nums",style:{color:off?m.amber:m.text}},l.sid||pl?`${ld} of ${pl} plt`:`${ld} plt`))})),
        ZZo_h("div",{className:"text-xs",style:{color:m.mut}},`Total ${ZZo_plural(mf.total,"pallet")} (planned ${mf.planned}) \xB7 signed by ${mf.signedBy||"the crew"}${mf.signature&&mf.signature!==mf.signedBy?` ("${mf.signature}")`:""}${mf.signedAt?`, ${ZZo_when(mf.signedAt,n)}`:""}`),
        ZZo_h("div",{className:"text-[11px]",style:{color:m.dim}},"Each customer sees only the lines of their own loads."))
      :job==="pack"&&(out||reloadN)?ZZo_h(ZZo_Sec,{title:"Manifest"},ZZo_h("div",{className:"text-sm",style:{color:t.stage==="done"||t.stage==="departed"?m.amber:m.dim}},t.stage==="done"||t.stage==="departed"?"No manifest was signed for this truck.":"Not signed yet. The forklift driver fills it in at the end of packing.")):null,
    /* crew photos: how many were taken of each kind (photos live on the device that took them in local mode) */
    LIN=SH.filter(s=>s.trailerInId===t.id),LOUT=SH.filter(s=>s.trailerOutId===t.id),
    phRows=[["before",out?"Before":"Before / ticket",t.beforePhotoCount],["unload","Unloading",t.unloadPhotoCount],["after",out?"Packing and loading":"After",t.afterPhotoCount],["strap","Securing and what's used",t.strapPhotoCount],["bol","Bills",t.bolPhotoCount]].filter(r=>ie(r[2])>0),
    perLoad=[...LIN.filter(s=>ie(s.rowPhotoCount)>0).map(s=>[`row:${s.id}`,s,"in the warehouse",ie(s.rowPhotoCount)]),...LOUT.filter(s=>ie(s.inspPhotoCount)>0).map(s=>[`insp:${s.id}`,s,"inspected before loading",ie(s.inspPhotoCount)])],
    phTotal=phRows.reduce((x,r)=>x+ie(r[2]),0)+perLoad.reduce((x,r)=>x+r[3],0),
    photoSec=phTotal||t.workStartedAt?ZZo_h(ZZo_Sec,{title:`Crew photos \xB7 ${phTotal}`},
      phTotal?ZZo_h("div",{className:"space-y-1.5","data-zz":"crew-photos"},
        phRows.map(r=>ZZo_h("div",{key:r[0],"data-ph":r[0]},ZZo_h(lr,{ownerId:`${r[0]}:${t.id}`,size:44,label:`${r[1]} \xB7 ${ie(r[2])}`,empty:"not on this device"}))),
        perLoad.map(r=>{let b=ZZo_bdg(e,t,r[1].id);return ZZo_h("div",{key:r[0],"data-ph":r[0]},ZZo_h(lr,{ownerId:r[0],size:44,label:`${b?b.label:r[1].ref} ${r[2]}`,empty:"not on this device"}))}))
        :ZZo_h("div",{className:"text-sm",style:{color:m.dim}},"No crew photos yet."),
      phTotal?ZZo_h("div",{className:"text-[11px]",style:{color:m.dim}},"Photos are saved where they were taken. In shared mode every staff device sees them."):null):null,
    /* the staff trail: the truck and its customer's loads (ZZtrail), plus the loads of other companies on it (staff see all) */
    trail=end?[...ZZtrail(e,t.id,null,{staff:!0}),...[...LIN,...LOUT].filter((s,k,A)=>A.indexOf(s)===k&&s.customerId&&t.customerId&&s.customerId!==t.customerId).flatMap(s=>ZZtrail(e,t.id,s.id,{staff:!0}))]
      .sort((x,y)=>(ZZo_ms(x.at)||0)-(ZZo_ms(y.at)||0)):[],
    trailSec=trail.length?ZZo_h(ZZo_Sec,{title:`Truck trail (staff view) \xB7 ${trail.length}`,full:!0},
      ZZo_h("div",{className:"space-y-1","data-zz":"trail"},(allTrail?trail:trail.slice(-8)).map((r,k)=>ZZo_h("div",{key:k,className:"text-xs flex gap-2"},ZZo_h("span",{className:"tabular-nums shrink-0",style:{color:m.dim,width:120}},ZZo_when(r.at,n)),
        ZZo_h("span",{style:{minWidth:0}},r.by?ZZo_h("b",null,r.by+": "):null,r.text)))),
      trail.length>8&&!allTrail?ZZo_h("div",null,ZZo_h(Z,{size:"sm",kind:"quiet",onClick:()=>setAllTrail(!0)},`Show all ${trail.length}`)):null,
      ZZo_h("div",{className:"text-[11px]",style:{color:m.dim}},"Shows damage snaps too. The customer's trail leaves them out until they are finished.")):null;
  return ZZo_h(H.Fragment,null,
    top?ZZo_h("div",{className:"grid sm:grid-cols-2 gap-3","data-zz":"truck-extra"},snapSec,
      ...(preArr?[codeSec,etaSec,bookSec,trackSec]:showCode?[clockSec,codeSec]:[ZZo_h("div",{key:"c",style:{gridColumn:"1 / -1",minWidth:0}},clockSec)]),jobSec):null,
    end?ZZo_h("div",{className:"grid sm:grid-cols-2 gap-3","data-zz":"truck-more"},out||reloadN||t.multiStop?ZZo_h(ZZo_LoadPlan,{t,doc:e,actions:a,toast,busy,once}):null,shipSec,mfSec,photoSec,paperSec,secSec,msgSec,trailSec):null,
    ZZo_h(ZZo_Toasts,{items:toasts,onDismiss:drop}))},

/* ========================== TV exit: office PIN ========================== */
ZZo_TvExit=({doc:e,onClose,onExit})=>{let[pin,setPin]=(0,H.useState)(""),[err,setErr]=(0,H.useState)(""),adm=(e&&e.settings&&e.settings.admins)||[],
  go=()=>{if(adm.length&&!adm.some(x=>String(x.pin)===pin)){setErr("That PIN doesn't match an office login.");setPin("");return}
    try{/#tv/i.test(location.hash)&&history.replaceState(null,"",location.pathname+location.search)}catch{}onExit&&onExit()};
  return ZZo_h("div",{onDoubleClick:x=>x.stopPropagation()},ZZo_h(Gt,{open:!0,onClose,title:"Leave the dock board"},
    ZZo_h("div",{className:"space-y-3"},
      ZZo_h("div",{className:"text-sm",style:{color:m.mut}},"Office PIN to exit. Drivers and visitors can't close the board."),
      ZZo_h(se,{type:"password",inputMode:"numeric",autoFocus:!0,value:pin,placeholder:"Office PIN","aria-label":"Office PIN",className:"text-xl tracking-[0.4em] py-4 text-center",
        onChange:x=>{setPin(x.target.value.replace(/\D/g,"").slice(0,6));setErr("")},onKeyDown:x=>x.key==="Enter"&&go()}),
      err?ZZo_h("div",{className:"text-sm text-center",style:{color:m.red},role:"alert"},err):null,
      ZZo_h("div",{className:"flex gap-2"},ZZo_h(Z,{className:"flex-1",onClick:onClose},"Stay on the board"),ZZo_h(Z,{kind:"primary",className:"flex-1",icon:yl,disabled:!pin,onClick:go},"Exit")))))},
