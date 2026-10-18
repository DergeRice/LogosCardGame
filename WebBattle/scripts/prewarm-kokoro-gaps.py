import importlib.util,json,time,hashlib,shutil,os,argparse
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('c',ROOT/'scripts/generate-kokoro-catalog.py');c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
def init():c.initialize(str(ROOT/'.runtime/kokoro-python'),None,'cpu',str(ROOT/'.runtime/kokoro-tail-v72'))
def render(row):
 key=hashlib.sha256(('kokoro-v1.0/af_heart/1.0/'+row['english']).encode()).hexdigest()[:20];name='kokoro-afheart-v1/'+key+'.mp3';target=ROOT/'.runtime/kokoro-v72'/name;cache=ROOT/'.runtime/kokoro-tail-v72'/name
 if target.exists() and not cache.exists():shutil.copyfile(target,cache)
 e=c.render(row)
 for attempt in range(10):
  try:progress=json.loads((ROOT/'.runtime/kokoro-v72/progress.json').read_text(encoding='utf-8'));break
  except (json.JSONDecodeError,FileNotFoundError):time.sleep(.01)
 else:return e
 # Never race the GPU writer. Only prewarm files at least 200 rows ahead.
 if row['_index']>progress['done']+200 and not target.exists():
  temp=target.with_suffix('.cpu-stage');shutil.copyfile(cache,temp);os.replace(temp,target)
 return e
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--start',type=int,default=-12000);parser.add_argument('--end',type=int);parser.add_argument('--reverse',action='store_true');parser.add_argument('--progress',default='tail-progress.json');args=parser.parse_args()
 data=json.loads((ROOT/'.runtime/v72-missing-sentences.json').read_text(encoding='utf-8'));rows=[{**r,'_index':i} for i,r in enumerate(data['rows'])][args.start:args.end];rows=rows[::-1] if args.reverse else rows;start=time.monotonic()
 with ProcessPoolExecutor(max_workers=8,initializer=init) as pool:
  for i,e in enumerate(pool.map(render,rows,chunksize=4),1):
   if i%100==0 or i==len(rows):
    report={'prepared':i,'total':len(rows),'elapsedSeconds':round(time.monotonic()-start,1)};(ROOT/'.runtime/kokoro-v72'/args.progress).write_text(json.dumps(report),encoding='utf-8');print(json.dumps(report),flush=True)
