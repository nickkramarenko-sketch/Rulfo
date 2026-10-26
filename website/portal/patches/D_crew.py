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
    ('D12',
     r'tJ=({s:e,doc:t,actions:a,now:r,openShipment:n,startOpen:o})=>{',
     r'tJ=({s:e,doc:t,actions:a,now:r,openShipment:n,startOpen:o})=>{let[zd,zdS]=(0,H.useState)(!1),[zno,znoS]=(0,H.useState)(e.qc?.note||"");',
     'tJ: state for the damage modal (zd: false | "save" | "add") and the count note.'),

    ('D13',
     r'B=()=>{let O=u||(C===0?"Good":C<0?"Short":"Over");a.crewSaveReceiving(e.id,{counted:l===""?null:ie(l),condition:O,rewrap:ie(O==="Damaged"?d:e.rewrapPallets),row:M?p:""}),g(!1)}',
     r'B=(zf,zi)=>{let O=u||(C===0?"Good":C<0?"Short":"Over");if(O==="Damaged"&&zf!==!0&&ZZd_needDmg(e)){zdS("save");return}a.crewSaveReceiving(e.id,{counted:l===""?null:ie(l),condition:O,rewrap:ie(O==="Damaged"?ZZd_rewrap(e,d,zi):e.rewrapPallets),row:M?p:"",...C!==0&&l!==""?{note:zno.trim()}:{}}),g(!1)}',
     'tJ save: Damaged with no open photo report opens ZZDmg first; the count note goes to crewSaveReceiving; '
     'rewrap priced in the photo report is not billed a second time through rewrapPallets.'),

    ('D14',
     r'A&&(0,i.jsx)(ZQ,{s:e,doc:t,onClose:()=>y(!1)',
     r'zd&&(0,i.jsx)(ZZDmg,{s:e,doc:t,actions:a,pallets:Math.max(1,ie(d)),onClose:()=>zdS(!1),onSaved:zi=>{let z2=zd;zdS(!1);z2==="save"&&B(!0,zi)}}),A&&(0,i.jsx)(ZQ,{s:e,doc:t,onClose:()=>y(!1)',
     'tJ: mount ZZDmg; after a save from the Save button the count is saved too (crewSaveReceiving).'),

    ('D15',
     r'u==="Damaged"&&(0,i.jsxs)("div",{className:"flex items-center gap-3 pt-1"',
     r'u==="Damaged"&&(0,i.jsx)(ZZd_DmgList,{s:e,rw:!0,onAdd:()=>zdS("add")}),u==="Damaged"&&(0,i.jsxs)("div",{className:"flex items-center gap-3 pt-1"',
     'tJ Damaged block: this load\'s photo damage reports with their photos, a button for another report, and (when a report '
     'already prices rewrap) a line saying the old "Rewrap how many?" stepper is not charged again.'),

    # ---------------- damage report (ZZDmg) from the outbound pull card ----------------
    ('D16',
     r'ZZPull=({s:U,r,tid,hot})=>{',
     r'ZZPull=({s:U,r,tid,hot,doc:zdoc})=>{let[znote,znoteS]=(0,H.useState)("");',
     'ZZPull: takes doc (zdoc) and keeps the count note.'),

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

    ('D19',
     r'(0,i.jsx)(ZZPull,{s:U,r,tid:l.id,hot:!0},U.id)',
     r'(0,i.jsx)(ZZPull,{s:U,r,tid:l.id,hot:!0,doc:t},U.id)',
     'ZZPull call site 1 (loads the dispatcher wants on): pass doc.'),

    ('D20',
     r'(0,i.jsx)(ZZPull,{s:U,r,tid:l.id,hot:!1},U.id)',
     r'(0,i.jsx)(ZZPull,{s:U,r,tid:l.id,hot:!1,doc:t},U.id)',
     'ZZPull call site 2 (pull from the floor): pass doc.'),

    # ---------------- secure the load ----------------
    ('D21',
     r'(0,i.jsxs)(hm,{n:Xe("photos"),title:"Photo log"',
     r'zn&&(0,i.jsx)(ZZSecure,{t:l,doc:t,actions:r,n:Xe("secure"),open:Nc("secure"),onOpen:()=>Oc("secure"),done:zs,onNext:()=>P(null)}),(0,i.jsxs)(hm,{n:Xe("photos"),title:R("Photo log")',
     'nJ: the "Secure the load" section (ZZSecure) before Photo log, for trucks that need it. The Photo log title goes through R().'),

    ('D23',
     r'He=!b&&Y.length>0,',
     r'He=!b&&Y.length>0,zs=!!l.secure?.signedAt&&ie(l.secure?.confidence)>1,zn=!!ZZFLAGS.secureStep&&(!b||q.length>0||x.reload>0),',
     'nJ step flags: zs = secured (signed and rated above 1), zn = this truck needs the step (outbound, or inbound with a reload).'),

    ('D24',
     r'{k:"load",done:He},{k:"photos",done:ph}',
     r'{k:"load",done:He},...zn?[{k:"secure",done:zs}]:[],{k:"photos",done:ph}',
     'Outbound steps: load, secure, photos.'),

    ('D25',
     r'[{k:"reload",done:oe}]:[]',
     r'[{k:"reload",done:oe},...zn?[{k:"secure",done:zs}]:[]]:[]',
     'Inbound with a reload: reload, secure.'),

    ('D27',
     r'(0,i.jsx)(Z,{kind:"good",size:"lg",className:"w-full",icon:Ze,disabled:Tc&&!g.trim(),onClick:Qj,children:"Send to dispatch"',
     r'zn&&!zs&&(0,i.jsx)(ZZd_SecureFirst,{t:l,onGo:()=>{d(!1),P("secure")}}),(0,i.jsx)(Z,{kind:"good",size:"lg",className:"w-full",icon:Ze,disabled:Tc&&!g.trim()||zn&&!zs,onClick:Qj,children:"Send to dispatch"',
     'Wrap-up: "Send to dispatch" waits until the load is secured, with a "Secure the load first" box and a button that goes there.'),

    ('D28',
     r'ux&&h.trim()&&(Ye.sealOut=h.trim().toUpperCase())',
     r'ux&&(h.trim()||l.secure?.seal)&&(Ye.sealOut=(h.trim()||l.secure?.seal||"").toUpperCase())',
     'Wrap-up: the seal comes from the secure report when the box is left empty.'),

    ('D29',
     r'onClick:()=>{A(""),d(!0)}',
     r'onClick:()=>{A(""),v(zv=>zv||l.secure?.seal||l.sealOut||""),d(!0)}',
     'Opening wrap-up fills in the seal from the secure report (or the saved outbound seal); a seal already typed is kept.'),

    ('D30',
     r'["BOL",nb?l.billsNA?"N/A"',
     r'...zn?[[R("Secured"),zs?`${ie(l.secure?.confidence)}/5`:l.secure?.signedAt?R("Not safe"):R("not yet"),zs?m.text:m.red]]:[],["BOL",nb?l.billsNA?"N/A"',
     'Wrap-up summary: a "Secured 4/5" row for trucks that need the step.'),

    ('D31',
     r'fQ={receive:"Received"',
     r'fQ={damage:"Reported damage",secure:"Secured the load",receive:"Received"',
     'Touch labels: damage and secure (load trail, "Who touched it").'),
]
