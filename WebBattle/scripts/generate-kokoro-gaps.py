"""Resumable offline Kokoro gap generation. Input is a measured audit, not a claimed full language."""
import importlib.util,json,os,time,gzip
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('catalog',ROOT/'scripts/generate-kokoro-catalog.py');c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
def init():c.initialize(str(ROOT/'.runtime/kokoro-python'),str(ROOT/'.runtime/kokoro-gpu'),'cuda',str(ROOT/'.runtime/kokoro-v72'))
def render(row):return c.render(row)
if __name__=='__main__':
 source=ROOT/'.runtime/v72-missing-sentences.json';rows=json.loads(source.read_text(encoding='utf-8') if source.exists() else gzip.decompress((ROOT/'docs/audio-audit/kokoro-gaps-v72-input.json.gz').read_bytes()))['rows'];out=ROOT/'.runtime/kokoro-v72';out.mkdir(exist_ok=True);entries=[];start=time.monotonic()
 with ProcessPoolExecutor(max_workers=4,initializer=init) as pool:
  for entry in pool.map(render,rows,chunksize=4):
   entries.append(entry)
   if len(entries)%100==0 or len(entries)==len(rows):
    status={'done':len(entries),'total':len(rows),'bytes':sum(e['bytes'] for e in entries),'characters':sum(len(e['text']) for e in entries),'failures':0,'elapsedSeconds':round(time.monotonic()-start,1)}
    (out/'progress.json').write_text(json.dumps(status),encoding='utf-8');temp=out/'manifest.tmp';temp.write_text(json.dumps({'version':1,'engine':'Kokoro-82M v1.0','voice':'af_heart','speed':1,'complete':len(entries)==len(rows),'entries':entries},ensure_ascii=False),encoding='utf-8');os.replace(temp,out/'manifest.json');print(json.dumps(status),flush=True)
