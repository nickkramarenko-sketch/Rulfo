cd "$(dirname "$0")" && python3 - "$1" <<'PY'
import sys
s=open(sys.argv[1]).read(); z=open('customer-portal-source.js').read().strip()
def once(old,new):
    global s
    assert s.count(old)==1,(old[:60],s.count(old)); s=s.replace(old,new)
once(',KQ=({doc:e,now:t,actions:a,onExit:r,openShipment:n',','+z+'KQ=({doc:e,now:t,actions:a,onExit:r,openShipment:n')
once('a==="client"?ae((0,i.jsx)(KQ,{','a==="client"?ae((0,i.jsx)(ZZCP,{')
once('children:b.note}),d&&!b.resolved&&(0,i.jsx)(Z,{size:"sm",kind:"good",className:"mt-2",icon:Ze,onClick:()=>l.resolveException(e.id,b.id),children:"Mark resolved"})',
     'children:b.note}),d&&b.kind==="Damage"&&(0,i.jsx)(ZZEst,{s:e,x:b,rates:r,actions:l}),d&&!b.resolved&&(0,i.jsx)(Z,{size:"sm",kind:"good",className:"mt-2",icon:Ze,onClick:()=>l.resolveException(e.id,b.id),children:"Mark resolved"})')
open('portal.html','w').write(s)
a=s.index('<script>\n(()=>{'); b=s.index('</script>',a); open('/tmp/app-check.js','w').write(s[a+8:b])
PY
node --check /tmp/app-check.js && echo SYNTAX_OK
