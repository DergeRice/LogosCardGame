import argparse,importlib.util,json,os,time
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('catalog',ROOT/'scripts/generate-kokoro-catalog.py');c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
def init():c.initialize(str(ROOT/'.runtime/kokoro-python'),str(ROOT/'.runtime/kokoro-gpu'),'cuda',str(ROOT/'.runtime/kokoro-expanded'))
def render(row):return c.render(row)
if __name__=='__main__':
 source=json.loads((ROOT/'.runtime/kokoro-missing-sentences.json').read_text(encoding='utf-8'));priority={'actual-audio-failure':0,'actual-played-POS':1};rows=sorted(source['rows'],key=lambda e:(priority.get(e['source'],2),e['english']));out=ROOT/'.runtime/kokoro-expanded';out.mkdir(exist_ok=True);start=time.monotonic();entries=[]
 with ProcessPoolExecutor(max_workers=2,initializer=init) as pool:
  for row,e in zip(rows,pool.map(render,rows,chunksize=4)):
   e['source']=row['source'];entries.append(e)
   if len(entries)%100==0 or len(entries)==len(rows):
    report={'done':len(entries),'total':len(rows),'elapsedSeconds':round(time.monotonic()-start,1),'bytes':sum(x['bytes'] for x in entries),'failures':0};(out/'progress.json').write_text(json.dumps(report),encoding='utf-8');temp=out/'manifest.tmp';temp.write_text(json.dumps({'version':1,'engine':'Kokoro-82M v1.0','voice':'af_heart','speed':1,'complete':len(entries)==len(rows),'entries':entries},ensure_ascii=False),encoding='utf-8');os.replace(temp,out/'manifest.json');print(json.dumps(report),flush=True)
