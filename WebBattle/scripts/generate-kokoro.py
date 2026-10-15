"""Offline Kokoro sentence pack. No paid API or browser synthesis.
python scripts/generate-kokoro.py --packages .runtime/kokoro-python
Models: see docs/SENTENCE-VOICE.md. Existing files are decoded and verified before reuse.
"""
import argparse, hashlib, json, os, sys, time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--packages');p.add_argument('--limit',type=int);args=p.parse_args()
if args.packages: sys.path.insert(0,str(Path(args.packages).resolve()))
import numpy as np
import soundfile as sf
import onnxruntime as ort
from kokoro_onnx import Kokoro
root=Path(__file__).resolve().parent.parent
model=root/'.runtime/kokoro';output=root/'public/audio/sentences';folder='kokoro-afheart-v1'
(output/folder).mkdir(exist_ok=True)
source=json.loads((output/'manifest.json').read_text(encoding='utf-8'))
texts=list(dict.fromkeys(e['text'] for e in source['entries']))
options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
class FloatSpeedSession(ort.InferenceSession):
    # kokoro-onnx 0.4.9 sends int32 for the official v1.0 export's float speed input.
    def run(self, names, inputs, *args, **kwargs):
        inputs=dict(inputs);inputs['speed']=np.asarray(inputs['speed'],dtype=np.float32)
        return super().run(names,inputs,*args,**kwargs)
session=FloatSpeedSession(str(model/'kokoro-v1.0.onnx'),sess_options=options,providers=['CPUExecutionProvider'])
voice=Kokoro.from_session(session,str(model/'voices-v1.0.bin'))
entries=[];start=time.monotonic()
for i,text in enumerate(texts[:args.limit]):
    key=hashlib.sha256(('kokoro-v1.0/af_heart/1.0/'+text).encode()).hexdigest()[:20]
    name=f'{folder}/{key}.mp3';target=output/name
    if not target.exists():
        samples,rate=voice.create(text,voice='af_heart',speed=1.0,lang='en-us')
        if not np.isfinite(samples).all() or np.max(np.abs(samples))<.02: raise RuntimeError('Silent/invalid synthesis: '+text)
        sf.write(str(target)+'.tmp',samples,rate,format='MP3',bitrate_mode='CONSTANT')
        os.replace(str(target)+'.tmp',target)
    decoded,rate=sf.read(target,dtype='float32')
    duration=len(decoded)/rate;peak=float(np.max(np.abs(decoded)))
    if not np.isfinite(decoded).all() or not .3<duration<25 or peak<.02:raise RuntimeError('Invalid audio: '+text)
    data=target.read_bytes()
    entries.append(dict(text=text,file=name,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),duration=round(duration,3),peak=round(peak,4),sampleRate=rate))
    if (i+1)%20==0 or i+1==len(texts[:args.limit]):
        print(f'Kokoro {i+1}/{len(texts[:args.limit])}, elapsed {time.monotonic()-start:.1f}s',flush=True)
        (model/'progress.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8')
if not args.limit:
    manifest=dict(version=2,engine='Kokoro-82M v1.0',voice='af_heart',speed=1.0,sentenceLevel=True,entries=entries)
    temp=output/'manifest.kokoro.tmp';temp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');os.replace(temp,output/'manifest.json')
print(f'Generated/verified {len(entries)} whole sentences, {sum(e["bytes"] for e in entries)/1048576:.2f} MiB. Paid API calls: 0.',flush=True)
