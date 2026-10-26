# Stream E (office) patches for build2.py.  PATCHES = [(id, old, new, why), ...]
# Every `old` occurs exactly once in base/portal.base.html (build2 checks). Raw strings: the minified code keeps
# escapes such as — and \xB7 as literal text. Plan: PLAN.md section 3.E. The components live in office-source.js.
# Not done on purpose: E14 (Yard as the default office tab; Board stays first, as today) and E11 (the Outbox inside
# Setup stays as it is; it now also lists the queued Friday summaries through E10).
# Beyond the plan's list (all inside screens stream E owns): E16/E17 hand the doc to the door map, E19 + E31 split the truck
# sheet extras (top: what to act on now; end: paperwork, securement, messages after Nick's truck chat), E20 marks office
# bookings as office-made and confirmed, E21-E30 + E32 are TV board fixes (PIN hint, yard # and colors, phone layout without
# sideways scroll, truck number never cut off). Icons: Outbox uses Ct (file-text) and Gear qd (refresh) because the plan's
# un (send) and Sa (package) are already the Chat and History tab icons.

PATCHES = [
    # ---------------- tabs and content ----------------
    ('E01',
     r'{k:"crew",label:"Crew",icon:bi},{k:"settings",label:"Setup",icon:uu}]',
     r'{k:"yard",label:"Yard",icon:cu},{k:"outbox",label:"Outbox",icon:Ct},{k:"gear",label:"Gear",icon:qd},{k:"crew",label:"Crew",icon:bi},{k:"settings",label:"Setup",icon:uu}]',
     'Office tabs: Yard (timer), Outbox (file-text) and Gear (refresh-cw) before Crew. Icons differ from Chat (send) and History (package).'),

    ('E02',
     r'children:[l==="crew"&&(0,i.jsx)(ZZCrewOffice,{doc:e,now:t,actions:a,openShipment:n}),',
     r'children:[l==="yard"&&(0,i.jsx)(ZZYard,{doc:e,now:t,actions:a,openShipment:n,openTrailer:v}),'
     r'l==="outbox"&&(0,i.jsx)(ZZOutbox,{doc:e,now:t,actions:a,openShipment:n,openTrailer:v}),'
     r'l==="gear"&&(0,i.jsx)(ZZGearOffice,{doc:e,now:t,actions:a,openShipment:n,openTrailer:v,officeUser:o}),'
     r'l==="crew"&&(0,i.jsx)(ZZCrewOffice,{doc:e,now:t,actions:a,openShipment:n}),',
     'Office content: the three new tabs. Tapping a truck opens the existing truck sheet (_Q) through the office setter v.'),

    ('E03',
     r'className:"max-w-7xl mx-auto flex",children:e.map(r=>(0,i.jsxs)("button",{onClick:()=>a(r.k),className:"flex-1 py-2.5 flex flex-col items-center gap-1 transition",style:{color:t===r.k?m.orange:m.mut}',
     r'className:"max-w-7xl mx-auto flex"+(e.length>8?" overflow-x-auto":""),style:e.length>8?ZZo_tabShade():void 0,children:e.map(r=>(0,i.jsxs)("button",{onClick:()=>a(r.k),className:"flex-1 py-2.5 flex flex-col items-center gap-1 transition"+(e.length>8?" px-1":""),style:{color:t===r.k?m.orange:m.mut,...(e.length>8?{minWidth:58,flexShrink:0}:{})}',
     'Bottom tab bar PA: with more than 8 tabs (office has 11) each tab keeps 58 px, the bar scrolls inside itself and a soft shadow shows at the edge that has more tabs (a part of the next tab peeks in). Bars with 8 tabs or fewer are byte-for-byte as before.'),

    # ---------------- board ----------------
    ('E05',
     r'["Trucks on time",le.length?',
     r'["Arrived on time",le.length?',
     'KPI label: "Arrived on time" (arrival against the appointment), so it is not mistaken for the unload promise.'),

    ('E16',
     r',OQ=({trailers:e,now:t,onTap:a,big:r})=>{',
     r',OQ=({trailers:e,now:t,onTap:a,big:r,doc:zzD})=>{',
     'Door map OQ takes the doc (for the promise and wait goal settings).'),

    ('E06',
     r'd=c>2*Nt;return(0,i.jsxs)("button",{onClick:()=>u&&a?.(u)',
     r'd=ZZo_late(zzD,u,t);return(0,i.jsxs)("button",{onClick:()=>u&&a?.(u),title:u&&d?"Past our promise":void 0',
     'Door map OQ: a door is red when its truck is past the promise (ZZpromise, from check-in) instead of a fixed 2 h at the door.'),

    ('E22',
     r'o.map(s=>(0,i.jsxs)("button",{onClick:()=>a?.(s),className:"px-2 py-1 rounded text-xs font-bold active:scale-95",style:{background:m.panel,border:`1px solid ${m.line}`,color:m.amber}',
     r'ZZo_byArr(o).map(s=>(0,i.jsxs)("button",{onClick:()=>a?.(s),className:"px-2 py-1 rounded text-xs font-bold active:scale-95",style:{background:m.panel,border:`1px solid ${m.line}`,color:ZZtoneColor(ZZtone(ZZwaitMs(s,t),zzD))}',
     'Door map yard chips: in check-in order, coloured by the wait goal (green, amber at 75%, red at the goal).'),

    ('E17',
     r'(0,i.jsx)(OQ,{trailers:A,now:t,onTap:F=>v(F)})',
     r'(0,i.jsx)(OQ,{trailers:A,now:t,onTap:F=>v(F),doc:e})',
     'Board: pass the doc to the door map.'),

    ('E20',
     r'onSave:F=>{a.addTrailer(F),p(!1)}',
     r'onSave:F=>{a.addTrailer({...F,bookedVia:F.bookedVia||"office",bookedBy:F.bookedBy||o||"Office",confirmedAt:F.confirmedAt||ye(Date.now()),confirmedBy:F.confirmedBy||o||"Office"}),p(!1)}',
     'Office "Book a truck": record bookedVia office / bookedBy and mark the time confirmed (the office set it), so it never waits for an OK.'),

    # ---------------- outbox and setup ----------------
    ('E10',
     r'o=(0,H.useMemo)(()=>pQ(e,Date.now()),[e])',
     r'o=(0,H.useMemo)(()=>[...pQ(e,Date.now()),...ZZobx(e)].sort((c,d)=>d.ts-c.ts),[e])',
     'Existing outbox qQ (Setup) also lists the stored messages (queued Friday summaries).'),

    ('E12',
     r'(0,i.jsxs)(de,{className:"p-4",children:[(0,i.jsx)("div",{className:"font-bold",children:"Crew on the floor"})',
     r'(0,i.jsx)(ZZDockSet,{doc:e,actions:t,admin:a}),typeof ZZSyncCard!=="undefined"?(0,i.jsx)(ZZSyncCard,{doc:e,actions:t,admin:a}):null,'
     r'(0,i.jsxs)(de,{className:"p-4",children:[(0,i.jsx)("div",{className:"font-bold",children:"Crew on the floor"})',
     'Setup: the dock promise / wait goal / prices card (zzSettings) before "Crew on the floor", then the shared-data card when stream A1 defines it.'),

    # ---------------- truck sheet ----------------
    ('E13',
     r'children:[(0,i.jsx)(ve,{label:ds[y.stage],color:Ki[y.stage]}),(0,i.jsx)(ve,{label:y.direction,color:m.mut,dot:!1})',
     r'children:[(0,i.jsx)(ve,{label:ds[y.stage],color:Ki[y.stage]}),(0,i.jsx)(ve,{label:y.direction,color:m.mut,dot:!1}),(0,i.jsx)(ZZo_Pills,{t:y,doc:t,now:a})',
     'Truck sheet _Q: pills next to the status pills (check-in code, needs your OK, ETA, past the promise).'),

    ('E19',
     r'children:"Edit booking"})]}),h&&(0,i.jsx)(Gt,{open:!0,onClose:()=>v(!1),title:',
     r'children:"Edit booking"})]}),(0,i.jsx)(ZZTruckExtra,{t:y,doc:t,now:a,actions:r,role:n,part:"top"}),h&&(0,i.jsx)(Gt,{open:!0,onClose:()=>v(!1),title:',
     'Truck sheet _Q: ZZTruckExtra (top part) under the action buttons. Before check-in: code + driver link, ETA + Set ETA, Confirm time, Check in now, tracking, language. After: one clock box.'),

    ('E31',
     r'onSend:O=>r.sendTrailerChat(y.id,n,O)})]})]})})}',
     r'onSend:O=>r.sendTrailerChat(y.id,n,O)})]}),(0,i.jsx)(ZZTruckExtra,{t:y,doc:t,now:a,actions:r,role:n,part:"end"})]})})}',
     'Truck sheet _Q: paperwork photos, securement report and this truck\'s messages at the end, after the truck chat, so Nick\'s loads, instructions and chat stay near the top.'),

    # ---------------- office bell ----------------
    ('E15',
     r'f.filter(h=>h.stage==="scheduled"&&(h.notes||"").includes("Requested by customer"))',
     r'f.filter(h=>h.stage==="scheduled"&&!h.confirmedAt&&(h.bookedVia==="client"&&!c.find(v=>v.id===h.customerId)?.dispatch||(h.notes||"").includes("Requested by customer")))',
     'Office bell: "requested a slot" for customer bookings without confirmedAt (old bookings keep the notes check); confirming clears it.'),

    # ---------------- TV board ----------------
    ('E26',
     r'className:"ml-auto text-5xl font-black tabular-nums",children:at(t)',
     r'className:"ml-auto font-black tabular-nums",style:{fontSize:"clamp(1.5rem,7vw,3rem)",lineHeight:1,whiteSpace:"nowrap"},children:at(t)',
     'TV clock: same 3rem size on a big screen, smaller on a phone so it stays on one line.'),

    ('E08',
     r'let r=e.trailers.filter(v=>v.dock&&v.stage!=="departed"&&v.stage!=="cancelled"),n=e.trailers.filter(v=>v.dock===Ee&&v.stage!=="departed"&&v.stage!=="cancelled"),',
     r'let[zzTv,zzTvSet]=(0,H.useState)(!1),r=e.trailers.filter(v=>v.dock&&v.stage!=="departed"&&v.stage!=="cancelled"),n=ZZo_byArr(e.trailers.filter(v=>v.dock===Ee&&v.stage!=="departed"&&v.stage!=="cancelled")),',
     'TV board: the yard list in check-in order (and the state for the PIN exit).'),

    ('E09',
     r'onDoubleClick:a,children:[(0,i.jsx)(us,{h:6}),',
     r'onDoubleClick:()=>{Date.now()-ZZo_tv.closed>700&&zzTvSet(!0)},children:[zzTv?(0,i.jsx)(ZZo_TvExit,{doc:e,onClose:()=>{ZZo_tv.closed=Date.now(),zzTvSet(!1)},onExit:a}):null,(0,i.jsx)(us,{h:6}),',
     'TV exit: double-click asks for an office PIN (settings.admins), then clears #tv and exits.'),

    ('E23',
     r'(0,i.jsx)("div",{className:"grid grid-cols-4 gap-3",children:Gi.map(v=>{',
     r'(0,i.jsx)("div",{className:"grid grid-cols-2 lg:grid-cols-4 gap-3",children:Gi.map(v=>{',
     'TV doors: 4 across on a big screen (1024 px and up, as today), 2 across on a phone so the board no longer scrolls sideways.'),

    ('E27',
     r'className:"flex-1 p-6 grid lg:grid-cols-3 gap-6"',
     r'className:"flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6"',
     'TV: the one-column phone layout keeps its columns inside the screen (grid-cols-1 = minmax(0,1fr)); big screens unchanged.'),

    ('E28',
     r'className:"px-6 pb-6 grid lg:grid-cols-2 gap-6"',
     r'className:"px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6"',
     'TV "On the floor" / "Coming up": same fix, long company names truncate instead of pushing the page sideways at 390 px.'),

    ('E29',
     r'className:"flex items-baseline justify-between",children:[(0,i.jsx)("div",{className:"text-5xl font-black leading-none",style:{color:g?m.orange:m.dim},children:v',
     r'className:"flex items-baseline justify-between",style:{flexWrap:"wrap",columnGap:"0.5rem"},children:[(0,i.jsx)("div",{className:"font-black leading-none",style:{color:g?m.orange:m.dim,fontSize:"clamp(2rem,9vw,3rem)"},children:v',
     'TV door number: 3rem on a big screen as today, a little smaller on a phone so the door clock fits next to it. The door and its clock never touch ("D31h 20m"): a long clock moves under the door number instead of running into it or out of the card.'),

    ('E30',
     r'className:"text-2xl font-black tabular-nums",style:{color:y?m.red:m.green},children:ot(A)',
     r'className:"text-2xl font-black tabular-nums whitespace-nowrap",style:{color:y?m.red:m.green,marginLeft:"auto"},children:ot(A)',
     'TV door clock stays on one line ("1h 5m"), at the right edge (also when it moves under the door number).'),

    ('E07',
     r'y=A>2*Nt',
     r'y=ZZo_late(e,g,t)',
     'TV doors: red when the truck is past the promise, same rule as the door map.'),

    ('E24',
     r'children:n.length===0?(0,i.jsx)("div",{style:{color:m.dim},children:"Empty"}):n.map(v=>(0,i.jsxs)("div",{className:"rounded-lg p-3 flex items-center gap-3",style:ne,children:[(0,i.jsx)("span",{className:"text-xl font-black",children:v.truck})',
     r'children:n.length===0?(0,i.jsx)("div",{style:{color:m.dim},children:"Empty"}):n.map((v,zzI)=>(0,i.jsxs)("div",{className:"rounded-lg p-3 flex items-center gap-3",style:ne,children:[(0,i.jsx)("span",{className:"text-xl font-black tabular-nums shrink-0",style:{color:m.amber},children:"#"+(zzI+1)}),(0,i.jsx)("span",{className:"text-xl font-black",children:v.truck})',
     'TV yard list: #1, #2 ... in front of each truck.'),

    ('E25',
     r'className:"ml-auto tabular-nums font-bold shrink-0",style:{color:m.amber},children:ot(t-new Date(v.arrivedAt||t).getTime())',
     r'className:"ml-auto tabular-nums font-bold shrink-0",style:{color:ZZtoneColor(ZZtone(ZZwaitMs(v,t),e))},children:ot(t-new Date(v.arrivedAt||t).getTime())',
     'TV yard list: wait clock coloured by the wait goal.'),

    ('E32',
     r'className:"text-2xl font-bold truncate",children:g.truck',
     r'className:"text-2xl font-bold truncate shrink-0",style:{maxWidth:"100%"},children:g.truck',
     'TV doors: the truck number never gets cut off ("W." for W1, also in today\'s board); the driver name next to it shortens instead.'),

    ('E21',
     r'children:"Double-click anywhere to exit"',
     r'children:"Double-click anywhere to exit \xB7 office PIN"',
     'TV footer hint mentions the PIN.'),
]
