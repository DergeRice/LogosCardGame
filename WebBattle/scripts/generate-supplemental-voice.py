"""Generate/verify a scoped offline sentence supplement using the existing Kokoro voice."""
import importlib.util,json,os,time
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('catalog',ROOT/'scripts/generate-kokoro-catalog.py')
catalog=importlib.util.module_from_spec(spec);spec.loader.exec_module(catalog)
def initialize():
    catalog.initialize(str(ROOT/'.runtime/kokoro-python'),None,'cpu',str(ROOT/'public/audio/sentences'))
def render(item):
    return catalog.render(item)
if __name__=='__main__':
    rows=json.loads((ROOT/'docs/supplemental-voice-v1.json').read_text(encoding='utf-8'))['entries']
    rows.sort(key=lambda e:e['key']!='reported-exact-plural')
    started=time.monotonic();entries=[]
    with ProcessPoolExecutor(max_workers=2,initializer=initialize) as executor:
        for e in executor.map(render,rows):
            entries.append(e)
            if len(entries)%10==0 or len(entries)==len(rows):print(f'{len(entries)}/{len(rows)}, {time.monotonic()-started:.1f}s',flush=True)
    path=ROOT/'public/audio/sentences/manifest.json';manifest=json.loads(path.read_text(encoding='utf-8'))
    merged={e['text']:e for e in manifest['entries']}
    for e in entries:merged[e['text']]={k:v for k,v in e.items() if k!='posKey'}
    manifest['entries']=list(merged.values());temp=path.with_suffix('.tmp');temp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');os.replace(temp,path)
    print(f'Verified {len(entries)} complete MP3s, {sum(e["bytes"] for e in entries)} bytes. Paid API calls: 0.',flush=True)
