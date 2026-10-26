# Stream A (engine + storage) patches for build2.py.  PATCHES = [(id, old, new, why), ...]
# Every `old` must occur exactly once in base/portal.base.html (build2 checks). Raw strings: the minified
# code keeps escapes such as \u2014 and \xB7 as literal text. Plan: PLAN.md sections 1.6, 2.6 and 3.A.
# A01's new text carries @@SYNC_SOURCE@@, which build2 replaces with sync-source.js.

PATCHES = [
    # ---------------- storage (1.6) ----------------
    ('A01',
     r'var Xj=e=>"cdweb:"+e;',
     '@@SYNC_SOURCE@@\n' + r'var Xj=e=>"cdweb:"+e;',
     'Insert sync-source.js (ZZsync, ZZModeBadge) as a statement block before the storage shim.'),

    ('A02',
     r'window.storage={get:async e=>{let t=null;try{t=localStorage.getItem(Xj(e))}catch{}if(t===null)throw new Error("absent");return{value:t}},set:async(e,t)=>{localStorage.setItem(Xj(e),t)}};',
     r'window.ZZlocal={get:async e=>{let t=null;try{t=localStorage.getItem(Xj(e))}catch{}if(t===null)throw new Error("absent");return{value:t}},set:async(e,t)=>{localStorage.setItem(Xj(e),t)}};'
     r'window.storage={get:async(e,t)=>ZZsync.mode!=="local"&&String(e).startsWith("cd6:photos:")?ZZsync.photoGet(e):window.ZZlocal.get(e,t),'
     r'set:async(e,t,a)=>{let p=String(e).startsWith("cd6:photos:");if(ZZsync.mode!=="local"&&p)return ZZsync.photoSet(e,t);let r;try{r=await window.ZZlocal.set(e,t,a)}catch(x){ZZsync.failed(x,p?"photo":"doc");throw x}ZZsync.ok(p?"photo":"doc");return r}};'
     r'window.ZZready=ZZsync.start().catch(x=>(console.error("ZZsync.start failed",x),ZZsync.mode));',
     'Shim: the original object becomes window.ZZlocal; window.storage routes photo keys to ZZsync in shared mode; a failed save (storage full) raises the cd6:sync banner; window.ZZready = ZZsync.start().'),

    ('A03',
     r'var gA=async()=>{try{',
     r'var gA=async()=>{if(ZZsync.mode!=="local")return ZZsync.read();try{',
     'gA read: shared mode (db, and db-offline look-only) reads the live copy and skips the ZZt10 demo injection; local mode unchanged.'),

    ('A04',
     r'yA=async e=>(await window.storage.set(Rj,JSON.stringify(e),!0),e)',
     r'yA=async e=>(ZZsync.mode!=="local"?await ZZsync.write(e):await window.storage.set(Rj,JSON.stringify(e),!0),e)',
     'yA write: shared mode writes through ZZsync.write (which refuses changes while offline or look-only, so nothing lands on this device by mistake); local mode unchanged.'),

    ('A05',
     r'let t=await gA()||tx()',
     r'let t=await gA()||ZZsync.fresh()',
     'bQ: never seed a demo over shared data (ZZsync.fresh throws in shared mode; tx() in local mode).'),

    ('A34',
     r'.catch(t=>(console.error("commit failed",t),null)),uA)',
     r'.catch(t=>(console.error("commit failed",t),ZZsync.failed(t,"doc"),null)),uA)',
     'bQ failure: show it in the red banner instead of failing silently.'),

    ('A06',
     r'let E=await gA();if(!E)E=tx(),await yA(E);',
     r'await window.ZZready;let E=await gA();if(!E)E=await ZZsync.seed(),E&&await yA(E);',
     'RA first load: wait for ZZsync.start; seed through ZZsync.seed (local mode: tx(), as today).'),

    ('A07',
     r'(0,H.useEffect)(()=>{let P=setInterval(async()=>{let E=await gA();E&&t(x=>x&&E.rev===x.rev?x:E)},5e3);return()=>clearInterval(P)},[]);',
     r'(0,H.useEffect)(()=>{let P=setInterval(async()=>{let E=await gA();E&&t(x=>x&&E.rev===x.rev?x:E)},5e3),'
     r'Q=async()=>{let E=await gA();E&&t(E)},W=ev=>{let d=ev&&ev.detail;d&&typeof d.text==="string"&&y(d.text)};'
     r'window.addEventListener("cd6:remote",Q);window.addEventListener("cd6:sync",W);'
     r'return()=>{clearInterval(P);window.removeEventListener("cd6:remote",Q);window.removeEventListener("cd6:sync",W)}},[]);',
     'RA refresh: keep the 5 s poll; also re-read on cd6:remote and show cd6:sync text in the existing red banner.'),

    ('A08',
     r'ae=P=>(0,i.jsxs)("div",{style:{background:m.bg,minHeight:"100vh",color:m.text},children:[A&&(0,i.jsx)("div",{className:"px-4 py-2 text-sm text-center",style:{background:"rgba(255,77,77,0.14)",color:m.red},children:A})',
     r'ae=P=>(0,i.jsxs)("div",{style:{background:m.bg,minHeight:"100vh",color:m.text},children:[(0,i.jsx)(ZZModeBadge,{role:a}),window.__ZZTEST?(0,i.jsx)(ZZa_probe,{doc:e,actions:z,role:a}):null,A&&(0,i.jsx)("div",{className:"px-4 py-2 text-sm text-center",style:{background:"rgba(255,77,77,0.14)",color:m.red},"data-zz":"banner",children:a==="driver"?ZZa_kioskBanner(A):A})',
     'Page wrapper: mode badge first (office and crew only); the test probe renders only when the test harness sets window.__ZZTEST; '
     'on the kiosk (role driver) the red save banner ends with "Please see the office." instead of a staff instruction (ZZa_kioskBanner).'),

    # ---------------- actions (2.5, 2.6) ----------------
    ('A09',
     r'zzReq:P=>S(x=>(x.zzRequests=[...(x.zzRequests||[]),P]',
     r'...ZZacts({S,C,M,N,L,B,w}),zzReq:P=>S(x=>(x.zzRequests=[...(x.zzRequests||[]),P]',
     'Actions object: spread the new zz actions (engine-source.js ZZacts); existing actions keep their names.'),

    ('A10',
     r'S(T=>{let k=Ce();if(D.direction==="outbound"&&b.length)',
     r'S(T=>{if(D.id&&T.trailers.some(q=>q.id===D.id))return null;let k=D.id||Ce();if(D.direction==="outbound"&&b.length)',
     'addTrailer: the booking form can choose the truck id (D.id); a second submit with the same id adds nothing.'),

    ('A11',
     r'...D,carrier:q,customerId:_,needsMatch:!1}]',
     r'...D,carrier:q,customerId:_,needsMatch:!1,id:k,code:ZZokCode(T,D.code),createdAt:D.createdAt||ye(Date.now())}]',
     'addTrailer: every new truck gets a unique 4-digit check-in code and createdAt (and keeps id k even if D.id is blank).'),

    ('A12',
     r'po:$.po||"",loadNotes:$.loadNotes||"",bol:$.bol||""})',
     r'po:$.po||"",loadNotes:$.loadNotes||"",bol:$.bol||"",weight:ie($.weight),pieces:ie($.pieces),stackable:$.stackable===!0||$.stackable===!1?$.stackable:null,hazmat:!!$.hazmat,seq:X})',
     'addTrailer load mapping: copy weight, pieces, stackable, hazmat and seq (row order) onto each load.'),

    ('A37',
     r'X.scanCount=$.scans.length),X));T.shipments=[...T.shipments,...Y];',
     r'X.scanCount=$.scans.length),X));Y.forEach((q2,i2)=>{q2.seq=i2});T.shipments=[...T.shipments,...Y];',
     'addTrailer: renumber seq 0..n-1 after empty rows are dropped, so the unload order has no gaps.'),

    ('A13',
     r'dest:E.lane==="reno"?"Reno, NV":E.lane==="sac"?"Sacramento, CA":""});x.shipments=[...x.shipments,T];',
     r'dest:String(E.dest||"").trim()||(E.lane==="reno"?"Reno, NV":E.lane==="sac"?"Sacramento, CA":""),weight:ie(E.weight),pieces:ie(E.pieces),stackable:E.stackable===!0||E.stackable===!1?E.stackable:null,hazmat:!!E.hazmat,'
     r'po:String(E.po||"").trim(),bol:String(E.bol||"").trim(),loadNotes:String(E.notes??E.loadNotes??"").trim(),seq:x.shipments.filter(k=>k.trailerInId===P).reduce((n,k,j)=>Math.max(n,ie(k.seq??j,j)+1),0)});x.shipments=[...x.shipments,T];',
     'zzAddLoad: copy weight, pieces, stackable, hazmat, po, bol, loadNotes (from notes), destination and seq (after the loads already on the truck).'),

    ('A14',
     r'checkIn:async P=>{let E=null;return await S(x=>{let b=x.trailers.find(k=>k.id===P),D=x.trailers.filter(k=>k.id!==P&&k.dock',
     r'checkIn:async P=>{let E=null;return await S(x=>{let b=x.trailers.find(k=>k.id===P);'
     r'if(!b||b.arrivedAt||b.stage==="departed"||b.stage==="cancelled"){E={already:!0,dock:b?.dock||null,truck:b?.truck||"—",trailer:b?.trailer||"—",afterHours:!1,trailerId:P};return null}'
     r'let D=x.trailers.filter(k=>k.id!==P&&k.dock',
     'checkIn: never checks in twice; a truck already checked in (or gone) returns {already:true} and nothing is written.'),

    ('A15',
     r'id:k,carrier:Y,driver:P.driver,phone:P.phone||P.newAccount?.phone||"",',
     r'code:ZZnewCode(x),driverLang:P.driverLang||"en",checkedInBy:"kiosk",id:k,carrier:Y,driver:P.driver,phone:P.phone||P.newAccount?.phone||"",',
     'checkInWalkup: walk-in trucks get a check-in code, the driver language and checkedInBy kiosk.'),

    ('A16',
     r'V.openedBy!=="Office"?{...V,resolved:!0',
     r'V.openedBy!=="Office"&&!V.photoOwner&&!V.answer?{...V,resolved:!0',
     'crewSaveReceiving: a recount no longer auto-closes a damage report that has photos or a customer answer.'),

    # ---------------- sign-in, demo, rates, outbox (2.6) ----------------
    ('A17',
     r'quick=xs=>xs.length?J("details"',
     r'quick=xs=>xs.length&&e.settings?.showLogins===!0?J("details"',
     'Sign-in: the test-mode "open an account without a PIN" list (it lists office logins) shows only when settings.showLogins === true.'),

    ('A36',
     r'kind:e.settings?.showLogins===!1?"ghost":"primary",onClick:()=>t.setShowLogins(e.settings?.showLogins===!1),children:e.settings?.showLogins===!1?"Show it":"Hide it"',
     r'kind:e.settings?.showLogins===!0?"primary":"ghost",onClick:()=>t.setShowLogins(e.settings?.showLogins!==!0),children:e.settings?.showLogins===!0?"Hide it":"Show it"',
     'Setup "Logins card on the sign-in page" button follows the new rule (off unless switched on), so Nick can switch it on in one tap.'),

    ('A18',
     r'ZZt10=e=>{if(!e||e.zzT10||!Array.isArray(e.shipments))return e;',
     r'ZZt10=e=>{if(!e||e.zzT10||e.demoCleared||!Array.isArray(e.shipments))return e;',
     'ZZt10: a cleared demo (demoCleared) does not come back.'),

    ('A19',
     r'nx={std:3,lg:6,crate:7.5,storageIn:8,storageOut:8,storageMonthly:24,afterHours:100,rewrap:15,laborHour:120}',
     r'nx={std:3,lg:6,crate:7.5,storageIn:8,storageOut:8,storageMonthly:24,afterHours:100,rewrap:15,laborHour:120,newPallet:20}',
     'Rate defaults: add newPallet 20 (the replacement pallet price ZZEst already uses).'),

    ('A20',
     r'a.sort((c,d)=>d.ts-c.ts)},hQ=',
     r'ZZmsgs(e,t).forEach(x2=>a.push(x2)),a.sort((c,d)=>d.ts-c.ts)},hQ=',
     'Outbox builder pQ: add the worked-out messages for the new events (ZZmsgs); the existing ones are unchanged.'),

    # ---------------- photos ----------------
    ('A32',
     r'r=a.filter(n=>!n.at||Date.now()-new Date(n.at).getTime()<SQ)',
     r'r=/^(dmg|sec):/.test(e)?a:a.filter(n=>!n.at||Date.now()-new Date(n.at).getTime()<SQ)',
     'Photo purge: damage (dmg:) and securement (sec:) photos are kept past 30 days.'),

    ('A33',
     r'console.error("photo save failed",a)',
     r'console.error("photo save failed",a),ZZsync.failed(a,"photo")',
     'Photo save failure: show it in the red banner instead of only a console line.'),

    # ---------------- integration fixes ----------------
    ('A38',
     r'ie(e.rewrapPallets)>0){let u=ie(e.rewrapPallets);n.push({code:"REWRAP"',
     r'ie(e.rewrapPallets)>0&&!ZZrewrapBilled(e)){let u=ie(e.rewrapPallets);n.push({code:"REWRAP"',
     'Im (charges): rewrap already billed through an approved damage estimate ("Damage: Rewrap ..." adjustment) is not billed a second time from rewrapPallets.'),

    ('A39',
     r'`Counted ${X} against ${fe(k)} on the BOL`} \u2014 ${B()} at the door`',
     r'`Counted ${X} against ${fe(k)} on the BOL${(z9=>z9?": "+z9:"")(String((I!==void 0?I:k.qc?.note)??"").trim())}`} \u2014 ${B()} at the door`',
     'crewSaveReceiving: a Short / Over exception note carries the crew\'s reason (qc.note), so the office bell and the customer see why.'),

    # ---------------- polish (readability, honest words, tap targets) ----------------
    ('A40',
     r'ps=({title:e,sub:t,onBack:a,right:r,now:n})=>(0,i.jsxs)("div",{className:"sticky top-0 z-30 zzhd",style:{background:"#0F3B44",color:"#fff"},children:[(0,i.jsx)(us,{h:4}),',
     r'ps=({title:e,sub:t,onBack:a,right:r,now:n})=>(0,i.jsxs)("div",{className:"sticky top-0 z-30 zzhd",style:{background:"#0F3B44",color:"#fff"},children:[(0,i.jsx)(us,{h:4}),(0,i.jsx)("style",{children:ZZhdCSS()}),',
     'Staff header (office): the bell list opens inside the white-text header, so on the light theme its text was white on white. ZZhdCSS gives it the theme colours (the crew screen already had this fix).'),

    ('A41',
     r'''"These are worked out live from what's on the dock \u2014 nothing here can be stale. Phone push and text messages to drivers need a real backend; that's on the list."''',
     r'''e==="client"?"Worked out from the trucks and loads in your portal. Texts and emails are not switched on yet.":"These are worked out live from what's on the dock \u2014 nothing here can be stale. Phone push and text messages to drivers need a real backend; that's on the list."''',
     'Bell footnote: customers are told what the list really is (their portal, no texts yet) instead of "live from the dock", which is not true on the public link. Staff keep Nick\'s text.'),

    ('A42',
     r'(0,i.jsx)("button",{onClick:t,"aria-label":"Close",className:"p-1 rounded",style:{color:m.mut},children:(0,i.jsx)(dn,{size:20})})',
     r'(0,i.jsx)("button",{onClick:t,"aria-label":"Close",className:"p-2.5 -m-1.5 rounded",style:{color:m.mut},children:(0,i.jsx)(dn,{size:20})})',
     'Sheet close (X): a 40 px tap target instead of 28 px (gloves, phones); the negative margin keeps the header the same size.'),
    ('A43',
     r'J("div",{style:{marginTop:18,fontSize:14,padding:"10px 14px",borderRadius:4,background:"#FFF4E6",color:"#8A4A12",border:"1px solid #F2D2A8"}},"Test mode is on: each sign-in page has a list to open any account without a PIN. Turn this off before going live.")',
     r'e.settings?.showLogins===!0?J("div",{style:{marginTop:18,fontSize:14,padding:"10px 14px",borderRadius:4,background:"#FFF4E6",color:"#8A4A12",border:"1px solid #F2D2A8"}},"Test mode is on: each sign-in page has a list to open any account without a PIN. Turn this off before going live."):null',
     'Staff page: the "Test mode is on" warning shows only while the test-mode list is really on (settings.showLogins, A17), so it never says test mode is on when it is off.'),
]
