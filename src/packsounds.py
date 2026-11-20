#!/usr/bin/env python3
"""Kullanım: python3 packsounds.py <klasör>  -> v5parts/samples.js üretir.
Klasördeki dosya adları: <ses_adı>_<numara>.(ogg|mp3|wav)  örn: stepKnight_grass_1.ogg, zHurt_m_2.mp3, fireLoop_1.ogg"""
import sys,os,base64,json,re,collections
d=sys.argv[1]; out=collections.defaultdict(list); mime={'ogg':'audio/ogg','mp3':'audio/mpeg','wav':'audio/wav'}
for f in sorted(os.listdir(d)):
    m=re.match(r'(.+?)(?:_\d+)?\.(ogg|mp3|wav)$',f)
    if m: out[m.group(1)].append('data:%s;base64,%s'%(mime[m.group(2)],base64.b64encode(open(os.path.join(d,f),'rb').read()).decode()))
open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'v5parts','samples.js'),'w').write('window.__SMP='+json.dumps(out)+';')
print({k:len(v) for k,v in out.items()})
