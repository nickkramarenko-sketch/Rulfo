# Stream C (kiosk + driver ETA page) patches for build2.py.  PATCHES = [(id, old, new, why), ...]
# Every `old` must occur exactly once in base/portal.base.html (build2 checks). Raw strings: the minified code keeps
# escapes as literal text. Plan: PLAN.md section 3.C. The screens themselves live in kiosk-source.js.

PATCHES = [
    ('C01',
     r'a==="driver"?ae((0,i.jsx)(XQ,{doc:e,now:p,actions:z,onExit:G})):a==="tv"?ae((0,i.jsx)(lJ,{doc:e,now:p,onExit:G})):null',
     r'a==="driver"?ae((0,i.jsx)(ZZFLAGS.kiosk2?ZZKiosk:XQ,{doc:e,now:p,actions:z,onExit:ZZk_exit(G)}))'
     r':a==="eta"?ae((0,i.jsx)(ZZEta,{doc:e,now:p,actions:z,code:n,onExit:G}))'
     r':a==="tv"?ae((0,i.jsx)(lJ,{doc:e,now:p,onExit:ZZk_exit(G)})):null',
     'Route chain: the kiosk is the new ZZKiosk when ZZFLAGS.kiosk2 is on (read at render time; the old XQ stays as the '
     'fallback); new route "eta" opens the driver page ZZEta for the code; leaving the kiosk or the TV clears a '
     '#kiosk / #tv / #eta hash first, so the sign-in page does not open it again.'),

    ('C02',
     r'(0,H.useEffect)(()=>{try{let o=JSON.parse(localStorage.getItem("cd6:session")||"null");if(o&&o.role){if(o.role==="office"&&admins.some(x=>x.name===o.office))return go(o);',
     r'(0,H.useEffect)(()=>{try{let h0=String(location.hash||"").replace(/^#/,""),e0=/^eta(\d{4})$/i.exec(h0);'
     r'if(e0)return t("eta",e0[1]);'
     r'if(/^kiosk$/i.test(h0)){save({role:"driver"});return t("driver")}'
     r'if(/^tv$/i.test(h0)){save({role:"tv"});return t("tv")}}catch{}'
     r'try{let o=JSON.parse(localStorage.getItem("cd6:session")||"null");if(o&&o.role){'
     r'if(o.role==="driver"||o.role==="tv")return t(o.role);'
     r'if(o.role==="office"&&admins.some(x=>x.name===o.office))return go(o);',
     'Sign-in mount: links first (#eta1234 opens the driver page; #kiosk and #tv open and remember the kiosk / TV), then '
     'a remembered kiosk or TV session (a tablet reload stays put), then the existing office / crew / customer restore.'),

    ('C03',
     r'()=>t("driver")',
     r'()=>{save({role:"driver"});t("driver")}',
     'Stations "Open driver check-in": remember the kiosk, so a tablet reload stays on it (staff exit forgets it).'),

    ('C04',
     r'()=>t("tv")',
     r'()=>{save({role:"tv"});t("tv")}',
     'Stations "Open the dock board": remember the TV, so a reload stays on it (leaving the board forgets it).'),
]
