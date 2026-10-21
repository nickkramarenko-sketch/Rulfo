import os,re,sys,shutil,json
SRC,R=sys.argv[1],sys.argv[2]
shutil.rmtree(R,ignore_errors=True);shutil.copytree(SRC,R)
for dp,_,fs in os.walk(R):
    for f in fs:
        if not f.endswith('.html'):continue
        p=os.path.join(dp,f);depth=os.path.relpath(p,R).count('/');up='../'*depth
        def fx(m):
            u=m.group(2);path,_,rest=u.partition('?');path,_,frag=path.partition('#')
            t=path.lstrip('/')
            if t=='' or t.endswith('/'):t+='index.html'
            return '%s="%s%s%s%s"'%(m.group(1),up,t,('?'+rest) if rest else '',('#'+frag) if frag else '')
        s=re.sub(r'(href|src|action)="(/[^"/][^"]*|/)"',fx,open(p).read())
        open(p,'w').write(s)
files={os.path.relpath(os.path.join(dp,f),R):os.path.join(dp,f) for dp,_,fs in os.walk(R) for f in fs if os.path.relpath(os.path.join(dp,f),R)!='index.html'}
json.dump(files,open(R+'_files.json','w'))
print(len(files))
