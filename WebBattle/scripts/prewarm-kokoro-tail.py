import importlib.util,json,time,hashlib,shutil,os
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('c',ROOT/'scripts/generate-kokoro-catalog.py');c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
def init():c.initialize(str(ROOT/'.runtime/kokoro-python'),None,'cpu',str(ROOT/'.runtime/kokoro-tail'))
def render(row):
 key=hashlib.sha256(('kokoro-v1.0/af_heart/1.0/'+row['english']).encode()).hexdigest()[:20];name='kokoro-afheart-v1/'+key+'.mp3';target=ROOT/'.runtime/kokoro-expanded'/name;cache=ROOT/'.runtime/kokoro-tail'/name
 if target.exists() and not cache.exists():shutil.copyfile(target,cache)
 e=c.render(row);progress=json.loads((ROOT/'.runtime/kokoro-expanded/progress.json').read_text(encoding='utf-8'))
 # Never race the GPU writer. Only prewarm files at least 200 rows ahead.
 if row['_index']>progress['done']+200 and not target.exists():
  temp=target.with_suffix('.cpu-stage');shutil.copyfile(cache,temp);os.replace(temp,target)
 return e
if __name__=='__main__':
 data=json.loads((ROOT/'.runtime/kokoro-missing-sentences.json').read_text(encoding='utf-8'));priority={'actual-audio-failure':0,'actual-played-POS':1};rows=sorted(data['rows'],key=lambda e:(priority.get(e['source'],2),e['english']));rows=[{**r,'_index':i} for i,r in enumerate(rows)][-4000:];start=time.monotonic()
 with ProcessPoolExecutor(max_workers=4,initializer=init) as pool:
  for i,e in enumerate(pool.map(render,rows,chunksize=4),1):
   if i%100==0 or i==len(rows):
    report={'tailPrepared':i,'total':len(rows),'elapsedSeconds':round(time.monotonic()-start,1)};(ROOT/'.runtime/kokoro-expanded/tail-progress.json').write_text(json.dumps(report),encoding='utf-8');print(json.dumps(report),flush=True)
