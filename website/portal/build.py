import sys,os
D=os.path.dirname(os.path.abspath(__file__))
src=sys.argv[1]; out=sys.argv[2]
s=open(src).read(); z=open(os.path.join(D,'customer-portal-source.js')).read().strip(); c=open(os.path.join(D,'crew-source.js')).read().strip()
def once(old,new):
    global s
    assert s.count(old)==1,(old[:70],s.count(old)); s=s.replace(old,new)
# customer portal
once(',KQ=({doc:e,now:t,actions:a,onExit:r,openShipment:n',','+z+c+'KQ=({doc:e,now:t,actions:a,onExit:r,openShipment:n')
once('a==="client"?ae((0,i.jsx)(KQ,{','a==="client"?ae((0,i.jsx)(ZZCP,{')
once('children:b.note}),d&&!b.resolved&&(0,i.jsx)(Z,{size:"sm",kind:"good",className:"mt-2",icon:Ze,onClick:()=>l.resolveException(e.id,b.id),children:"Mark resolved"})',
     'children:b.note}),d&&b.kind==="Damage"&&(0,i.jsx)(ZZEst,{s:e,x:b,rates:r,actions:l}),d&&!b.resolved&&(0,i.jsx)(Z,{size:"sm",kind:"good",className:"mt-2",icon:Ze,onClick:()=>l.resolveException(e.id,b.id),children:"Mark resolved"})')
# forklift crew
once('a==="crew"?ae((0,i.jsx)(iJ,{','a==="crew"?ae((0,i.jsx)(ZZCrew,{')
once('className:"sticky z-20 rounded-lg p-3 space-y-2 max-h-[45vh] overflow-y-auto",style:{top:58,','className:"rounded-lg p-3 space-y-2",style:{')
once('[(0,i.jsx)(Ze,{size:20}),"Wrap up & send",!Tt&&(0,i.jsxs)("span",{className:"text-xs font-bold opacity-70",children:["\\xB7 ",R("not all counted")]})]',
     '[(0,i.jsx)(Ze,{size:20}),(0,i.jsxs)("span",{style:{display:"flex",flexDirection:"column",lineHeight:1.15,textAlign:"left"},children:[R("Wrap up & send"),!Tt&&(0,i.jsx)("span",{className:"text-xs font-bold opacity-70",children:R("not all counted")})]})]')
once('disabled:!Se,onClick:()=>r.crewStart(l.id),children:R(Se?"Start \\u2014 put this truck in progress":"Give it a door first")',
     'onClick:()=>Se?r.crewStart(l.id):G(!0),children:R(Se?"Start \\u2014 put this truck in progress":"Pick a door for this truck")')
once('addTrailer:P=>{let{lines:E=[],customerName:x,pickupIds:b=[],...D}=P',
  'zzAddLoad:(P,E)=>S(x=>{let b=x.trailers.find(k=>k.id===P);if(!b||b.stage!=="scheduled")return null;let T=gm({ref:(E.ref||"").trim()||`${b.truck||"TRK"}-${x.shipments.filter(k=>k.trailerInId===P).length+1}`,customerId:b.customerId||null,trailerInId:P,lane:E.lane||"reno",service:E.lane==="other"?"storage":"crossdock",units:In(E.units),dest:E.lane==="reno"?"Reno, NV":E.lane==="sac"?"Sacramento, CA":""});x.shipments=[...x.shipments,T];return C(x,L(),"schedule",`Added ${T.ref} (${$e(T)}) to truck ${b.truck||"\\u2014"}`)}),zzRemoveLoad:P=>S(x=>{let s=x.shipments.find(k=>k.id===P);if(!s||s.receivedAt)return null;x.shipments=x.shipments.filter(k=>k.id!==P);return C(x,L(),"schedule",`Removed ${s.ref} from its truck`)}),addTrailer:P=>{let{lines:E=[],customerName:x,pickupIds:b=[],...D}=P')
open(out,'w').write(s)
a=s.index('<script>\n(()=>{'); b=s.index('</script>',a); open('/tmp/app-check.js','w').write(s[a+8:b])
print('ok',len(s))
