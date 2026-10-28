# Stream D (forklift crew) patches for build2.py.  PATCHES = [(id, old, new, why), ...]
# Every `old` occurs exactly once in base/portal.base.html (build2 checks). Plan: PLAN.md section 3.D.
# The minified code keeps escapes such as \xB7 and backslash-u-2014 as literal text. To write a literal
# backslash-u escape here, write ~u (for example ~u2014); U() turns it into the real backslash text.
# The components and helpers these patches call (ZZDmg, ZZSecure, ZZDoorLbl, ZZd_*) live in crew-source.js.


def U(s):
    return s.replace('~u', chr(92) + 'u')


PATCHES = [
    # ---------------- wait clocks (xj truck card, nJ title card, crew bell) ----------------
    ('D01',
     r'A=Kn(e,r),y=km(`truck:${e.id}`',
     r'zw=ZZd_waitOnly(e,r),A=Kn(e,r),y=km(`truck:${e.id}`',
     'xj truck card: wait clock zw (ms since check-in while the truck is not started yet, else null). xj props: a=doc, r=now.'),

    ('D02',
     r'v&&(0,i.jsx)(ve,{label:R("just arrived"),color:m.orange})',
     r'v&&(0,i.jsx)(ve,{label:R("just arrived"),color:m.orange}),zw!=null&&(0,i.jsx)(ZZd_Pill,{t:e,doc:a,now:r})',
     'xj: after the "just arrived" pill, a "#1 in line · Waiting 34m · goal 30" pill coloured by ZZtone.'),

    ('D03',
     r'rail:v?m.orange:e.stage==="working"?m.green:A>An?m.red:Ki[e.stage]',
     r'rail:v?m.orange:e.stage==="working"?m.green:A>An||zw!=null&&ZZtone(zw,a)==="bad"?m.red:Ki[e.stage]',
     'xj rail: red when the wait is at or over the goal.'),

    ('D04',
     r'(ie(l.paperCount)>0||it.length>0)&&(0,i.jsx)("div",{className:"mt-3 pt-3 space-y-1.5"',
     r'(0,i.jsx)(ZZd_Clock,{t:l,doc:t,now:a,size:17,line:!0}),(ie(l.paperCount)>0||it.length>0)&&(0,i.jsx)("div",{className:"mt-3 pt-3 space-y-1.5"',
     'nJ title card: a full-width line under the door and title with the wait clock against the goal, or '
     '"Working 22m · 1h 4m left on the 2-hour promise" while working. (The plan anchor l.workStartedBy sits mid-line and the '
     'title column is narrow on a phone, so the line goes under the whole row instead.)'),

    ('D05',
     r'if(e==="crew"&&(f.filter(h=>h.arrivedAt&&h.stage!=="done").forEach(h=>o(`arrived:${h.id}`',
     r'if(e==="crew"&&(ZZd_waitOver(t,a).forEach(w2=>o(w2.id,w2.ts,"bad",w2.text,{trailer:w2.tid})),f.filter(h=>h.arrivedAt&&h.stage!=="done").forEach(h=>o(`arrived:${h.id}`',
     'Crew bell (mQ): a waitover:<tid> alert (red) for every truck not started past the wait goal.'),

    # ---------------- door picker ----------------
    ('D06',
     r'(0,i.jsx)("div",{className:"grid grid-cols-5 gap-1.5",children:[...Gi,Ee].map(U=>{let ft=X.includes(U)&&U!==Ee;return(0,i.jsx)("button",{disabled:ft&&l.dock!==U,onClick:()=>{r.assignDock(l.id,l.dock===U?null:U),G(!1)},className:"py-3 rounded-lg text-sm font-black transition active:scale-95 disabled:opacity-25",style:l.dock===U?{background:m.orange,color:"#0A0A0A"}:{...ne,color:ft?m.dim:m.text},children:U},U)})}),(0,i.jsx)("div",{className:"text-xs mt-2",style:{color:m.dim},children:R("Dimmed doors',
     r'(0,i.jsx)("div",{className:"grid gap-1.5",style:{gridTemplateColumns:"repeat(auto-fill,minmax(max(96px,calc((100% - 24px) / 5)),1fr))"},children:[...Gi,Ee].map(U=>{let ft=X.includes(U)&&U!==Ee;return(0,i.jsx)("button",{disabled:ft&&l.dock!==U,onClick:()=>{r.assignDock(l.id,l.dock===U?null:U),G(!1)},"data-door":U,className:"py-2 px-1 rounded-lg text-sm font-black transition active:scale-95 disabled:opacity-50 min-w-0",style:{minHeight:64,...(l.dock===U?{background:m.orange,color:"#0A0A0A"}:{...ne,color:m.text})},children:(0,i.jsx)(ZZDoorLbl,{door:U,doc:t,now:a,self:l})},U)})}),(0,i.jsx)("div",{className:"text-xs mt-2",style:{color:m.dim},children:R("Dimmed doors',
     'Door picker: busy doors show who is there (ZZDoorLbl: door, short company, clock); dimmed style opacity-25 -> opacity-50; '
     '3 columns on a phone so the labels fit, 5 on a wider screen as before (inline grid: the compiled CSS has no sm:grid-cols-5); '
     '64 px tall buttons (gloves).'),

    # ---------------- counting ----------------
    ('D08',
     r'C!==0&&l!==""&&(0,i.jsxs)("div",{className:"text-sm font-bold",style:{color:m.amber},children:[C<0?R("Short"):R("Over")," ",Math.abs(C)]})',
     r'C!==0&&l!==""&&(0,i.jsxs)("div",{className:"text-sm font-bold",style:{color:m.amber},children:[C<0?R("Short"):R("Over")," ",Math.abs(C)]}),C!==0&&l!==""&&(0,i.jsx)(ZZd_Note,{value:zno,onChange:znoS,short:C<0,n:Math.abs(C),out:!1})',
     'tJ count card: when the count does not match the BOL, a note is required (saved as qc.note through crewSaveReceiving).'),

    ('D33',
     r'icon:br,disabled:!S&&L,onClick:B,children:R("Save")',
     r'icon:br,disabled:!S&&L&&zno===(e.qc?.note||"")||C!==0&&l!==""&&!zno.trim(),onClick:B,children:R("Save")',
     'tJ Save: stays disabled while the count is off and the note is empty; a changed note alone also counts as a change.'),

    ('D09',
     U(r'kind:ok?"good":"primary",className:"flex-1",onClick:()=>{r.patchShipment(U.id,{pullCount:ie(c),pullCountAt:ye(Date.now())}),so(!0)},children:ok?"Count confirmed ~u2713":off?"Confirm "+ie(c)+" (not "+w+")":"Count is correct"'),
     U(r'kind:ok?"good":"primary",className:"flex-1",disabled:!ok&&off&&!!zdoc&&!znote.trim(),onClick:()=>{if(off&&zdoc&&!znote.trim())return;r.patchShipment(U.id,{pullCount:ie(c),pullCountAt:ye(Date.now())}),off&&zdoc&&!ok&&ZZd_pullExc(U,r,ie(c),w,znote),so(!0)},children:ok?R("Count confirmed ~u2713"):off?ZZd_f("Confirm {n} (not {w})",{n:ie(c),w}):R("Count is correct")'),
     'ZZPull (outbound): a count that does not match needs a note, and confirming it opens a Short or Over report (addException) once '
     '(a second tap on "Count confirmed" does not open another). Button text goes through R().'),

    ('D34',
     U(r'''ok&&off&&(0,i.jsx)("div",{className:"text-xs font-bold",style:{color:m.amber},children:"Count doesn't match the paperwork ~u2014 dispatch will see it."})'''),
     U(r'''off&&!ok&&zdoc&&(0,i.jsx)(ZZd_Note,{value:znote,onChange:znoteS,short:ie(c)<w,n:Math.abs(ie(c)-w),out:!0}),ok&&off&&(0,i.jsx)("div",{className:"text-xs font-bold",style:{color:m.amber},children:R("Count doesn't match the paperwork ~u2014 dispatch will see it.")})'''),
     'ZZPull: the required note box for a count that does not match (shown until the count is confirmed).'),

    ('D10',
     r'T=t.shipments.filter(U=>U.trailerInId===l.id),k=T.filter(U=>!U.receivedAt)',
     r'T=ZZd_bySeq(t.shipments.filter(U=>U.trailerInId===l.id)),k=T.filter(U=>!U.receivedAt)',
     'nJ: loads on the truck follow seq (the same order as ir), so "Next off the truck" follows the unload order.'),

    ('D11',
     U(r'children:[t.ref,t.po?` \xB7 ${t.po}`:"",t.commodity?` \xB7 ${t.commodity}`:""," \xB7 ",$e(t)]'),
     U(r'children:[t.ref,t.po?` \xB7 ${t.po}`:"",t.commodity?` \xB7 ${t.commodity}`:""," \xB7 ",$e(t),(0,i.jsx)(ZZd_LoadPills,{s:t})]'),
     'Load row (dA): pieces, weight, Hazmat (red pill) and Do not stack (amber pill).'),

    ('D35',
     U(r'children:[$e(U),U.dest?` ~u2192 ${U.dest}`:""]'),
     U(r'children:[$e(U),U.dest?` ~u2192 ${U.dest}`:"",(0,i.jsx)(ZZd_LoadPills,{s:U})]'),
     'ZZPull load header: the same pills (Hazmat, Do not stack, pieces, weight) before the crew loads it.'),

    # ---------------- damage report (ZZDmg) from the count card ----------------
    ('D13',
     r'B=()=>{let O=u||(C===0?"Good":C<0?"Short":"Over");a.crewSaveReceiving(e.id,{counted:l===""?null:ie(l),condition:O,rewrap:ie(O==="Damaged"?d:e.rewrapPallets),row:M?p:""}),g(!1)}',
     r'B=(zf,zi)=>{let O=u||(C===0?"Good":C<0?"Short":"Over");if(O==="Damaged"&&zf!==!0&&ZZd_needDmg(e)){zdS("save");return}a.crewSaveReceiving(e.id,{counted:l===""?null:ie(l),condition:O,rewrap:ie(O==="Damaged"?ZZd_rewrap(e,d,zi):e.rewrapPallets),row:M?p:"",...C!==0&&l!==""?{note:zno.trim()}:{}}),g(!1)}',
     'tJ save: Damaged with no open photo report opens ZZDmg first; the count note goes to crewSaveReceiving; '
     'rewrap priced in the photo report is not billed a second time through rewrapPallets.'),

    ('D15',
     r'u==="Damaged"&&(0,i.jsxs)("div",{className:"flex items-center gap-3 pt-1"',
     r'u==="Damaged"&&(0,i.jsx)(ZZd_DmgList,{s:e,rw:!0,onAdd:()=>zdS("add")}),u==="Damaged"&&(0,i.jsxs)("div",{className:"flex items-center gap-3 pt-1"',
     'tJ Damaged block: this load\'s photo damage reports with their photos, a button for another report, and (when a report '
     'already prices rewrap) a line saying the old "Rewrap how many?" stepper is not charged again.'),

    # ---------------- damage report (ZZDmg) from the outbound pull card ----------------
    ('D17',
     U(r'''children:sent?(0,i.jsx)("div",{className:"text-sm font-bold",style:{color:m.red},children:"Damage reported ~u2014 dispatch was told."}):dm?(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(se,{value:nt,onChange:e=>sn(e.target.value),placeholder:"What's damaged? e.g. 2 pallets crushed on the corner"})'''),
     U(r'''children:zdoc?(0,i.jsx)(ZZd_PullDmg,{s:U,doc:zdoc,actions:r,open:dm,setOpen:sd}):sent?(0,i.jsx)("div",{className:"text-sm font-bold",style:{color:m.red},children:"Damage reported ~u2014 dispatch was told."}):dm?(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(se,{value:nt,onChange:e=>sn(e.target.value),placeholder:"What's damaged? e.g. 2 pallets crushed on the corner"})'''),
     'ZZPull: "Damage? Report it" opens ZZDmg (photos, kinds, fix lines) and lists this load\'s reports. '
     'The old text-only box (D18 text, unchanged) stays as the fallback when doc is missing.'),

    ('D36',
     r'style:{color:m.mut},children:"lane"})',
     r'style:{color:m.mut},children:R("lane")})',
     'ZZPull: "lane" through R().'),

    ('D37',
     r'children:"1. Count"}',
     r'children:R("1. Count")}',
     'ZZPull: "1. Count" through R().'),

    ('D38',
     r'children:"2. Photo"}',
     r'children:R("2. Photo")}',
     'ZZPull: "2. Photo" through R().'),

    ('D39',
     r'children:ok?pc?"3. Load it":"3. Load it (no photo)":"Confirm the count first"}',
     r'children:ok?pc?R("3. Load it"):R("3. Load it (no photo)"):R("Confirm the count first")}',
     'ZZPull: the load button text through R().'),

    # ---------------- secure the load ----------------
    ('D28',
     r'ux&&h.trim()&&(Ye.sealOut=h.trim().toUpperCase())',
     r'ux&&(h.trim()||l.secure?.seal)&&(Ye.sealOut=(h.trim()||l.secure?.seal||"").toUpperCase())',
     'Wrap-up: the seal comes from the secure report when the box is left empty.'),

    ('D29',
     r'onClick:()=>{A(""),d(!0)}',
     r'onClick:()=>{A(""),v(zv=>zv||l.secure?.seal||l.sealOut||""),d(!0)}',
     'Opening wrap-up fills in the seal from the secure report (or the saved outbound seal); a seal already typed is kept.'),

    ('D31',
     r'fQ={receive:"Received"',
     r'fQ={damage:"Reported damage",secure:"Secured the load",receive:"Received"',
     'Touch labels: damage and secure (load trail, "Who touched it").'),

    # ---------------- crew truck flow rework (Nick's review, Oct 28): jobs, badges, steps, photos ----------------
    ('D12',
     U(r'''tJ=({s:e,doc:t,actions:a,now:r,openShipment:n,startOpen:o})=>{'''),
     U(r'''tJ=({s:e,doc:t,actions:a,now:r,openShipment:n,startOpen:o,zb})=>{let[zd,zdS]=(0,H.useState)(!1),[zno,znoS]=(0,H.useState)(e.qc?.note||"");'''),
     'tJ: state for the damage modal (zd: false | "save" | "add") and the count note; zb = this load\'s badge on the truck screen.'),

    ('D14',
     U(r'''A&&(0,i.jsx)(ZQ,{s:e,doc:t,onClose:()=>y(!1)'''),
     U(r'''zd&&(0,i.jsx)(ZZDmg,{s:e,doc:t,actions:a,pallets:Math.max(1,ie(d)),snap:zd==="save"?ZZd_snapOf(e):null,onClose:()=>zdS(!1),onSaved:zi=>{let z2=zd;zdS(!1);z2==="save"&&B(!0,zi)}}),A&&(0,i.jsx)(ZQ,{s:e,doc:t,onClose:()=>y(!1)'''),
     'tJ: mount ZZDmg; after a save from the Save button the count is saved too (crewSaveReceiving). When the load has a damage snap waiting for details, Damaged + Save finishes that snap (zzDamageFinish) instead of starting a second report.'),

    ('D16',
     U(r'''ZZPull=({s:U,r,tid,hot})=>{'''),
     U(r'''ZZPull=({s:U,r,tid,hot,doc:zdoc,zb})=>{let[znote,znoteS]=(0,H.useState)("");'''),
     'ZZPull: takes doc (zdoc), the load badge (zb) and keeps the count note.'),

    ('D23',
     U(r'''He=!b&&Y.length>0,'''),
     U(r'''He=!b&&Y.length>0,zs=!!l.secure?.signedAt&&ie(l.secure?.confidence)>1,zn=!!ZZFLAGS.secureStep&&(!b||q.length>0||x.reload>0),ZB=ZZloadBadges(t,l),ZJ=ZZloadJob(t,l)||(b?"unload":"pickup"),ZD=ZZdmgDrafts(t,l.id),'''),
     'nJ step flags: zs = secured (signed and rated above 1), zn = this truck needs the step (outbound, or inbound with a reload); ZB = the colour + number badge of every load on this truck, ZJ = the job (unpack / unload / pack / delivery / pickup), ZD = damage snaps on this truck still waiting for details.'),

    ('D27',
     U(r'''(0,i.jsx)(Z,{kind:"good",size:"lg",className:"w-full",icon:Ze,disabled:Tc&&!g.trim(),onClick:Qj,children:"Send to dispatch"'''),
     U(r'''(0,i.jsx)(ZZd_WrapBlock,{l,Wt,ZD,zn,zs,ZJ,onGo:U=>{d(!1),P(U)}}),(0,i.jsx)(Z,{kind:"good",size:"lg",className:"w-full",icon:Ze,disabled:Tc&&!g.trim()||ZZd_wrapStop({l,Wt,ZD,zn,zs}).length>0,onClick:Qj,children:"Send to dispatch"'''),
     'Wrap-up: "Send to dispatch" waits until nothing blocks it: damage snaps finished or thrown away, the load secured / strapped, the manifest signed (pack), at least 1 packing / loadout photo, the bills photo (delivery, pickup). Each block has a button to its step.'),

    ('D30',
     U(r'''["Photos",l.photosNA?"N/A":ie(l.afterPhotoCount)?`${ie(l.afterPhotoCount)}`:"none yet",ph?m.text:m.amber],["BOL",nb?l.billsNA?"N/A"'''),
     U(r'''...ZZd_wrapRows({l,t,b,ZJ,T,Wt,zn,zs,ZD}),["BOL",nb?l.billsNA?"N/A"'''),
     'Wrap-up summary: the photo log row is gone; rows for unloading photos, warehouse photos, packing / loadout photos, inspect photos, Secured / Strapped, Manifest, Bills and damage photos still to finish, for the steps this job has.'),

    ('D40',
     U(r'''Wt=b?[...nb?[{k:"seal",done:he}]:[],{k:"before",done:bf},{k:"off",done:Q},...q.length||x.reload?[{k:"reload",done:oe}]:[],{k:"photos",done:ph},{k:"wrap",done:l.stage==="done"}]:[...nb?[{k:"seal",done:he}]:[],{k:"load",done:He},{k:"photos",done:ph},{k:"wrap",done:l.stage==="done"}]'''),
     U(r'''Wt=ZZd_steps({l,b,ZJ,nb,he,bf,T,k,q,Y,F,x,Et,oe,zs,zn,ZD})'''),
     'nJ steps per job (ZZd_steps): UNPACK / UNLOAD = [paperwork] photo before, unload, sort-count-verify [, reload, secure, manifest], wrap; PACK = [paperwork] pack, secure, manifest, wrap; DELIVERY / PICKUP = [paperwork] find, count, inspect, load it up, strapped, bills, wrap. The photo log step is gone.'),

    ('D41',
     U(r'''(0,i.jsxs)("div",{className:"rounded-lg p-3 space-y-2",style:{background:m.raised,border:`1px solid ${ZK.c}`,borderLeft:`6px solid ${ZK.c}`,boxShadow:"0 6px 16px rgba(0,0,0,0.45)"},children:[(0,i.jsxs)("div",{className:"flex items-center justify-between gap-2",children:[(0,i.jsx)("span",{className:"text-lg font-black tracking-wide",style:{color:ZK.c},children:ZK.label}),(0,i.jsxs)("span",{className:"text-sm font-black",style:{color:m.orange},children:["Door ",l.dock||"~u2014"]})]}),(0,i.jsx)("div",{className:"text-base font-bold leading-snug",children:ox(l,t.shipments)}),I.length>0&&(0,i.jsx)("div",{className:"flex gap-1.5 flex-wrap",children:I.map(U=>(0,i.jsxs)("span",{className:"text-xs font-bold rounded-md px-2 py-1",style:{background:m.panel,color:m.text},children:["Load ",U.n," \xB7 ",U.s.ref," \xB7 ",U.plt," plt \xB7 ",be(U.s)==="sac"?`~u2192 ${U.s.dest||"California"}`:U.s.row?`lane ${U.s.row}`:U.s.dest||"floor"]},U.s.id))})]})'''),
     U(r'''(0,i.jsx)(ZZd_JobCard,{t:l,doc:t,job:ZJ,ZB})'''),
     'nJ: the "CONSOLIDATED TRAILER / FOR DELIVERY" card becomes the job card: the job in big words, the task in plain words ("4 loads to break down ..."), the reload part, the office\'s instructions and every load\'s colour + number badge.'),

    ('D42',
     U(r'''b&&(0,i.jsxs)(hm,{n:Xe("off"),title:ZK.k==="pu"?"Unload, count, put away":"Unload, sort, count, verify",done:Q,open:Nc("off"),onOpen:()=>Oc("off"),hint:T.length===0?R("Nothing listed on this trailer yet."):`${_.length} ${R("of")} ${T.length} ${R("loads off")}${Et||_.length===0?"":` \xB7 ${_.filter(U=>!U.qc?.condition).length} ${R("to count")}`}`,children:[(0,i.jsx)("div",{className:"mt-2 rounded-lg px-3 py-2 text-sm font-bold",style:{background:"rgba(255,194,75,0.12)",color:m.amber},children:"One load per lane. Every load gets its own lane ~u2014 no sharing."}),Nm?(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)("div",{className:"pt-2 text-xs font-bold",style:{color:m.orange},children:R("Next off the truck")}),(0,i.jsx)(dA,{n:I.find(U=>U.s.id===Nm.id)?.n,s:Nm,action:(0,i.jsxs)(Z,{kind:"primary",size:"lg",className:"w-full",icon:Ze,onClick:()=>{r.receive(Nm.id)},children:[R("Receive")," \xB7 ",R("it's off, count it next")]})}),k.length>1&&(0,i.jsxs)("div",{className:"text-xs",style:{color:m.dim},children:[R("Then"),": ",k.slice(1).map(U=>`${R("Load")} ${I.find(ft=>ft.s.id===U.id)?.n} \xB7 ${fe(U)} plt`).join(" \xB7 ")]})]}):T.length>0?(0,i.jsxs)("div",{className:"pt-2 text-sm font-bold",style:{color:m.green},children:[R("Everything is off the truck.")," ",R(Et?"All counted.":"Finish the counts below.")]}):null,_.length>0&&(0,i.jsx)("div",{className:"text-xs font-bold pt-1",style:{color:m.mut},children:"Off the truck ~u2014 count, condition, lane"}),[..._].reverse().map((U,ft)=>(0,i.jsx)(tJ,{s:U,doc:t,actions:r,now:a,openShipment:o,startOpen:ft===0&&!U.qc?.condition},U.id)),(0,i.jsx)("div",{className:"pt-1",style:{borderTop:`1px solid ${m.line}`},children:S?(0,i.jsx)(aJ,{t:l,onCancel:()=>C(!1),onSave:U=>{r.addLoadOffTruck(l.id,U),C(!1)}}):(0,i.jsx)(Z,{size:"sm",icon:wa,onClick:()=>C(!0),children:R("Something came off that's not on this list")})})]}),b&&(q.length>0||x.reload>0)&&(0,i.jsxs)(hm,{n:Xe("reload"),title:R("Put back on ~u2192 California"),done:oe,open:Nc("reload"),onOpen:()=>Oc("reload"),hint:`${q.filter(U=>U.reloadedAt).length} ${R("of")} ${T.filter(U=>be(U)==="sac").length} ${R("back on")} \xB7 ${x.reload} plt`,children:[(0,i.jsx)("div",{className:"pt-2 text-xs",style:{color:m.mut},children:R("In the order listed. Read how each one wants to be loaded.")}),T.filter(U=>be(U)==="sac").map(U=>(0,i.jsx)(dA,{n:I.find(ft=>ft.s.id===U.id)?.n,s:U,sub:U.reloadedAt?(0,i.jsxs)("div",{className:"mt-1 space-y-1.5",children:[(0,i.jsxs)("div",{className:"text-xs",style:{color:m.green},children:[R("On the truck")," \xB7 ",U.reloadedBy," ",at(U.reloadedAt)]}),(0,i.jsx)("div",{className:"text-xs font-bold",children:R("Photo \xB7 loaded")}),(0,i.jsx)(Xn,{ownerId:dt.loaded(U.id),canAdd:!0,onCountChange:ft=>r.notePhotos(U.id,ft,"loaded")})]}):U.receivedAt?null:(0,i.jsx)("div",{className:"text-xs mt-1",style:{color:m.amber},children:R("Not off the truck yet")}),action:U.receivedAt&&(U.reloadedAt?(0,i.jsx)(Z,{size:"sm",onClick:()=>r.markReloaded(U.id,!1),children:R("Take back off")}):(0,i.jsx)(Z,{kind:"primary",size:"lg",className:"w-full",icon:Ca,onClick:()=>r.markReloaded(U.id,!0),children:R("It's back on the truck")}))},U.id))]}),!b&&(0,i.jsxs)(hm,{n:Xe("load"),title:"Find, count, photo, load",done:He,open:Nc("load"),onOpen:()=>Oc("load"),hint:`${Y.reduce((U,ft)=>U+fe(ft),0)} plt ${R("on the truck")} \xB7 ${Y.length} ${R("loads")}`,children:[(0,i.jsx)("div",{className:"mt-2 rounded-lg px-3 py-2 text-sm font-bold",style:{background:"rgba(78,161,255,0.12)",color:m.blue},children:"Find the pallets, count them, photo them, then load. See damage? Report it before it goes on."}),Y.length>0&&(0,i.jsx)("div",{className:"pt-2 text-xs font-bold",style:{color:m.mut},children:R("On the truck")}),Y.map((U,ft)=>(0,i.jsx)(dA,{n:ft+1,s:U,sub:(0,i.jsxs)("div",{className:"mt-1.5",children:[(0,i.jsx)("div",{className:"text-xs font-bold",children:R("Photo \xB7 loaded")}),(0,i.jsx)(Xn,{ownerId:dt.loaded(U.id),canAdd:!0,onCountChange:$o=>r.notePhotos(U.id,$o,"loaded")})]}),action:(0,i.jsx)(Z,{size:"sm",onClick:()=>r.unload(U.id),children:R("Take off")})},U.id)),F.length>0&&(0,i.jsxs)("div",{className:"text-xs font-bold pt-1",style:{color:m.blue},children:[R("Dispatcher wants these on \xB7 pull first")," \xB7 ",F.length]}),F.map(U=>(0,i.jsx)(ZZPull,{s:U,r,tid:l.id,hot:!0},U.id)),(0,i.jsx)("div",{className:"text-xs font-bold pt-1",style:{color:m.mut},children:R("Pull from the floor")}),$.length===0?(0,i.jsx)("div",{className:"text-sm",style:{color:m.dim},children:R("Nothing on the floor is ready for this truck.")}):$.map(U=>(0,i.jsx)(ZZPull,{s:U,r,tid:l.id,hot:!1},U.id))]}),(0,i.jsxs)(hm,{n:Xe("photos"),title:"Photo log",done:ph,open:Nc("photos"),onOpen:()=>Oc("photos"),hint:l.photosNA?"N/A ~u2014 no photos":ie(l.afterPhotoCount)>0?`${ie(l.afterPhotoCount)} photos`:b?"After it's all off ~u2014 shoot everything on the dock":"After it's loaded ~u2014 shoot the load in the trailer",children:[(0,i.jsx)("div",{className:"pt-2 text-sm",style:{color:m.mut},children:b?"Once everything is unloaded and counted, photo every load in its lane. Nothing to shoot? Mark N/A.":"Once it's all loaded, photo the freight in the trailer before the doors close. Nothing to shoot? Mark N/A."}),(0,i.jsx)(Xn,{ownerId:`after:${l.id}`,canAdd:!0,onCountChange:U=>r.patchTrailer(l.id,{afterPhotoCount:U,photosNA:!1})}),(0,i.jsxs)("div",{className:"flex gap-2",children:[(0,i.jsx)(Z,{kind:"primary",size:"lg",className:"flex-1",icon:Ze,disabled:!ie(l.afterPhotoCount),onClick:()=>P(null),children:"Photos done ~u2014 next"}),(0,i.jsx)(Z,{size:"lg",className:"flex-1",onClick:()=>{r.patchTrailer(l.id,{photosNA:!0}),P(null)},children:"No photos ~u2014 N/A"})]})]}),'''),
     U(r'''(0,i.jsx)(ZZd_Flow,{l,t,now:a,r,o,b,T,k,_,q,Y,F,$,x,I,P,Xe,Nc,Oc,Wt,zs,ZB,ZJ,ZD}),'''),
     'nJ: the unload / reload / load / photo log sections become ZZd_Flow (crew-source.js), which renders the steps of the job between "Photo before" and "Wrap up" with Nick\'s own parts inside (next-off row, Receive, count card, off-list load, reload buttons, pull card, Take off). Replaces the old D19 / D20 (ZZPull call sites) and D21 (Secure before Photo log).'),

    ('D43',
     U(r'''(0,i.jsx)(ve,{label:ZK.label,color:ZK.c,dot:!1}),'''),
     U(r''''''),
     'nJ title card: the old kind pill goes (the big line under it now says the job).'),

    ('D44',
     U(r'''(0,i.jsx)("div",{className:"text-xl font-black leading-tight",children:b?(0,i.jsxs)(i.Fragment,{children:[I.length," ",I.length===1?R("load"):R("loads")," \xB7 ",x.unload," ",R("pallets off")]}):(0,i.jsxs)(i.Fragment,{children:[R("Load")," ",x.load," ",R("pallets")]})})'''),
     U(r'''null'''),
     'nJ title card: "4 loads · 60 pallets off" confused people ("I\'m just taking 60 pallets off"); the line goes. The job is named '
     'in big words at the very top of the card instead (D62) and the job card says the task in plain words.'),

    ('D62',
     U(r'''(0,i.jsxs)(de,{className:"p-4",rail:K?m.green:m.orange,children:['''),
     U(r'''(0,i.jsxs)(de,{className:"p-4",rail:K?m.green:m.orange,children:[(0,i.jsx)(ZZd_JobTitle,{t:l,doc:t,job:ZJ}),'''),
     'nJ title card: the job in big words across the top: "UNPACK · Consolidated trailer (inbound)", "PACK · Consolidated trailer", '
     '"DELIVERY · to <receiver>" or "DELIVERY · 2 stops", "PICKUP · customer\'s carrier".'),

    ('D45',
     U(r'''(ZK.k==="con"?"Manifest ~u2014 ":"On this truck ~u2014 ")+I.length+(I.length===1?" load \xB7 ":" loads \xB7 ")+x.unload+" plt"'''),
     U(r'''ZZd_f(I.length===1?"Loads on this truck — 1 load · {p} pallets":"Loads on this truck — {n} loads · {p} pallets",{n:I.length,p:x.unload})'''),
     'nJ title card: the load list header no longer says "Manifest" (the manifest is the new signed list of what went in).'),

    ('D46',
     U(r'''(0,i.jsxs)("span",{className:"font-black shrink-0",children:[R("Load")," ",U.n]})'''),
     U(r'''(0,i.jsx)(ZZd_Badge,{b:ZB[U.s.id],n:U.n,sm:!0})'''),
     'nJ title card loads: the colour + number badge with the PRO instead of "Load 1".'),

    ('D47',
     U(r'''children:[R("Load")," ",I.find(ft=>ft.s.id===U.id)?.n," \xB7 ",U.ref]'''),
     U(r'''children:[(0,i.jsx)(ZZd_Badge,{b:ZB[U.id],n:I.find(ft=>ft.s.id===U.id)?.n,sm:!0})]'''),
     'Paperwork step, dispatcher scans: the load badge.'),

    ('D48',
     U(r'''children:[R("Load")," ",I.find(Xi=>Xi.s.id===Ye.id)?.n," \xB7 ",Ye.ref," \xB7 ",fe(Ye)," plt ~u2014 "'''),
     U(r'''children:[(0,i.jsx)(ZZd_Badge,{b:ZB[Ye.id],n:I.find(Xi=>Xi.s.id===Ye.id)?.n,sm:!0})," \xB7 ",fe(Ye)," plt ~u2014 "'''),
     'Wrap-up "Before you complete": the load badge.'),

    ('D51',
     U(r'''!Tt&&(0,i.jsx)("span",{className:"text-xs font-bold opacity-70",children:R("not all counted")})'''),
     U(r'''!Tt&&(0,i.jsx)("span",{className:"text-xs font-bold opacity-70",children:ZZd_left(Wt)})'''),
     'Bottom bar: "Wrap up & send" says how many steps are left ("2 steps to go"), not "not all counted" (wrong for loading jobs).'),

    ('D52',
     U(r'''children:[(0,i.jsx)("span",{className:"font-black tabular-nums",children:e.ref}),'''),
     U(r'''children:[zb&&(0,i.jsx)(ZZd_Badge,{b:zb,sm:!0,noRef:!0}),(0,i.jsx)("span",{className:"font-black tabular-nums",children:e.ref}),(0,i.jsx)(ZZd_SnapPill,{s:e}),'''),
     'Count card header: the load badge, and a red pill while a damage snap on this load waits for its details.'),

    ('D53',
     U(r'''(0,i.jsxs)("div",{className:"space-y-2 pt-1",children:[(0,i.jsxs)("div",{className:"flex items-baseline gap-2",children:[(0,i.jsx)("span",{className:"text-[11px] font-black rounded-full w-5 h-5 inline-flex items-center justify-center",style:{background:m.raised,color:m.orange},children:"1"}),(0,i.jsx)("span",{className:"text-sm font-bold",children:R("Photo \xB7 off the truck")}),!e.photoCount&&(0,i.jsx)("span",{className:"text-xs",style:{color:N?m.amber:m.dim},children:R(N?"photograph it before the driver leaves":"on the dock, whole load")})]}),(0,i.jsx)(Xn,{ownerId:dt.off(e.id),canAdd:!0,onCountChange:O=>a.notePhotos(e.id,O,"off")})]}),'''),
     U(r'''(0,i.jsx)(ZZd_LoadSnaps,{s:e,doc:t,actions:a}),'''),
     'Count card: the "Photo · off the truck / on the dock, whole load" box goes (Nick: one photo per load, where it is left in the warehouse). In its place: this load\'s damage snaps with "Finish this damage report".'),

    ('D54',
     U(r'''children:"2"}),(0,i.jsx)("span",{className:"text-sm font-bold",children:R("Count")})'''),
     U(r'''children:"1"}),(0,i.jsx)("span",{className:"text-sm font-bold",children:R("Count")})'''),
     'Count card: Count is now step 1.'),

    ('D55',
     U(r'''children:"3"}),(0,i.jsx)("span",{className:"text-sm font-bold",children:R("Condition")})'''),
     U(r'''children:"2"}),(0,i.jsx)("span",{className:"text-sm font-bold",children:R("Condition")})'''),
     'Count card: Condition is now step 2.'),

    ('D56',
     U(r'''children:"4"}),(0,i.jsx)("span",{className:"text-sm font-bold",children:"Lane it went to (one load per lane)"})'''),
     U(r'''children:"3"}),(0,i.jsx)("span",{className:"text-sm font-bold",children:R("Lane it went to (one load per lane)")})'''),
     'Count card: the lane is now step 3 (and goes through R()).'),

    ('D57',
     U(r'''(p||e.row)&&(0,i.jsxs)("div",{className:"pt-1 space-y-2",children:[(0,i.jsxs)("div",{className:"text-sm font-bold",children:["Photo \xB7 in the lane"," ",(0,i.jsx)("span",{className:"text-xs font-normal",style:{color:m.dim},children:(p||e.row).toUpperCase()})]}),(0,i.jsx)(Xn,{ownerId:dt.row(e.id),canAdd:!0,onCountChange:O=>a.notePhotos(e.id,O,"row")})]})'''),
     U(r'''(0,i.jsx)(ZZd_WhPhoto,{s:e,actions:a,row:p||e.row})'''),
     'Count card step 4: the ONE photo per load, "Photo of the load left in the warehouse" (Nick\'s row:<sid> photos, notePhotos row), always shown for a load that stays (not only after a lane is picked).'),

    ('D58',
     U(r'''children:[U.ref," \xB7 ",w," plt"]'''),
     U(r'''children:[zb?(0,i.jsx)(ZZd_Badge,{b:zb,sm:!0}):U.ref," \xB7 ",w," plt"]'''),
     'Pull card header: the load badge (loads planned on this truck).'),

    ('D59',
     U(r'''dA=({n:e,s:t,action:a,sub:r})=>'''),
     U(r'''dA=({n:e,s:t,action:a,sub:r,zb})=>'''),
     'Load row (dA): takes the load badge.'),

    ('D60',
     U(r'''(0,i.jsxs)("div",{className:"text-[10px] font-bold",style:{color:m.mut},children:[R("Load")," ",e]})'''),
     U(r'''zb?(0,i.jsx)("div",{style:{display:"flex",justifyContent:"center",marginBottom:4},children:(0,i.jsx)(ZZd_Badge,{b:zb,noRef:!0})}):(0,i.jsxs)("div",{className:"text-[10px] font-bold",style:{color:m.mut},children:[R("Load")," ",e]})'''),
     'Load row (dA): the badge number in its colour instead of "Load 1" (the PRO is on the row).'),

    ('D61',
     U(r'''fix it in step ",Xe(b?"off":"load")'''),
     U(r'''fix it in step ",Xe(b?"verify":"pack")'''),
     'Wrap-up: two loads in one lane are fixed in "Sort, count, verify" now.'),

]
