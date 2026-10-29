# Stream B (customer portal) patches for build2.py.  PATCHES = [(id, old, new, why), ...]
# Everything else for stream B lives in customer-portal-source.js. Plan: PLAN.md section 3.B (anchor B01).
# Raw strings: the minified code keeps escapes such as — as literal text.

PATCHES = [
    ('B01',
     # load screen MQ, "Who touched it": the touches list and the corrections list right after it
     r'[...e.touches||[]].reverse().map(b=>(0,i.jsxs)("div",{className:"flex items-baseline gap-2 text-sm",children:[(0,i.jsx)("span",{className:"tabular-nums text-xs w-16 shrink-0",style:{color:m.dim},children:at(b.at)}),'
     r'(0,i.jsx)("span",{className:"font-bold shrink-0",style:{color:m.orange},children:b.who}),(0,i.jsx)("span",{style:{color:m.mut},children:fQ[b.what]||b.what})]},b.id)),'
     r'(e.corrections||[]).slice().reverse().map(b=>(0,i.jsxs)("div",{className:"flex items-baseline gap-2 text-sm",children:[(0,i.jsx)("span",{className:"tabular-nums text-xs w-16 shrink-0",style:{color:m.dim},children:at(b.at)})',
     r'[...e.touches||[]].reverse().map(b=>(0,i.jsxs)("div",{className:"flex items-baseline gap-2 text-sm",children:[(0,i.jsx)("span",{className:"tabular-nums text-xs w-28 shrink-0",style:{color:m.dim},children:ge(b.at)}),'
     r'(0,i.jsx)("span",{className:"font-bold shrink-0",style:{color:m.orange},children:b.who}),(0,i.jsx)("span",{style:{color:m.mut},children:fQ[b.what]||b.what})]},b.id)),'
     r'(e.corrections||[]).slice().reverse().map(b=>(0,i.jsxs)("div",{className:"flex items-baseline gap-2 text-sm",children:[(0,i.jsx)("span",{className:"tabular-nums text-xs w-28 shrink-0",style:{color:m.dim},children:ge(b.at)})',
     'Load screen "Who touched it": show the date and time (ge) instead of the time only (at), for touches and corrections, in a column wide enough for "Oct 26, 2:40 PM".'),
]
