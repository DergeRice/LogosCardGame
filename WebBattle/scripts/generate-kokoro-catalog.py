"""Resumable offline canonical Kokoro pack; never deployed to user devices."""
import argparse,hashlib,json,os,sys,time,shutil
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
ROOT=Path(__file__).resolve().parent.parent
VOICE=None;SF=None;NP=None;OUT=None

def initialize(packages,gpu_packages,provider,output):
 global VOICE,SF,NP,OUT
 sys.path.insert(0,str(Path(packages).resolve()))
 if gpu_packages:sys.path.insert(0,str(Path(gpu_packages).resolve()))
 import numpy as np,soundfile as sf,onnxruntime as ort
 from kokoro_onnx import Kokoro
 ort.set_default_logger_severity(3)
 NP=np;SF=sf;OUT=Path(output);(OUT/'kokoro-afheart-v1').mkdir(parents=True,exist_ok=True)
 if provider=='cuda':ort.preload_dlls(directory='')
 options=ort.SessionOptions();options.log_severity_level=3;options.intra_op_num_threads=1;options.inter_op_num_threads=1
 class FloatSpeedSession(ort.InferenceSession):
  def run(self,names,inputs,*args,**kwargs):
   inputs=dict(inputs);inputs['speed']=np.asarray(inputs['speed'],dtype=np.float32)
   return super().run(names,inputs,*args,**kwargs)
 providers=['CUDAExecutionProvider','CPUExecutionProvider'] if provider=='cuda' else ['CPUExecutionProvider']
 session=FloatSpeedSession(str(ROOT/'.runtime/kokoro/kokoro-v1.0.onnx'),sess_options=options,providers=providers)
 if provider=='cuda' and 'CUDAExecutionProvider' not in session.get_providers():raise RuntimeError('CUDA did not initialize; choose CPU explicitly')
 VOICE=Kokoro.from_session(session,str(ROOT/'.runtime/kokoro/voices-v1.0.bin'))

def render(item):
 text=item['english'];key=hashlib.sha256(('kokoro-v1.0/af_heart/1.0/'+text).encode()).hexdigest()[:20]
 name=f'kokoro-afheart-v1/{key}.mp3';target=OUT/name
 if not target.exists():
  previous=ROOT/'public/audio/sentences'/name
  if previous.exists():shutil.copyfile(previous,target)
  else:
   samples,rate=VOICE.create(text,voice='af_heart',speed=1.0,lang='en-us')
   if not NP.isfinite(samples).all() or NP.max(NP.abs(samples))<.02:raise RuntimeError('Silent synthesis: '+text)
   SF.write(str(target)+'.tmp',samples,rate,format='MP3',bitrate_mode='CONSTANT');os.replace(str(target)+'.tmp',target)
 decoded,rate=SF.read(target,dtype='float32');duration=len(decoded)/rate;peak=float(NP.max(NP.abs(decoded)))
 if rate!=24000 or not NP.isfinite(decoded).all() or not .3<duration<20 or peak<.02:raise RuntimeError('Invalid recording: '+text)
 data=target.read_bytes()
 return dict(posKey=item['key'],text=text,file=name,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),duration=round(duration,3),peak=round(peak,4),sampleRate=rate)

def main():
 p=argparse.ArgumentParser();p.add_argument('--packages',default='.runtime/kokoro-python');p.add_argument('--gpu-packages');p.add_argument('--provider',choices=['cpu','cuda'],default='cpu');p.add_argument('--workers',type=int,default=6);p.add_argument('--limit',type=int);p.add_argument('--output',default='.runtime/kokoro-catalog');args=p.parse_args()
 rows=[json.loads(line) for line in (ROOT/'docs/one-example-per-pos/examples.jsonl').read_text(encoding='utf-8').splitlines()]
 rows=[r for r in rows if r['availableInCurrentDeck']]
 if len(rows)!=24155 or len({r['key'] for r in rows})!=len(rows):raise RuntimeError('Canonical catalog changed; re-audit scope before generating')
 if args.limit:rows=rows[:args.limit]
 output=Path(args.output).resolve();output.mkdir(parents=True,exist_ok=True)
 initargs=(args.packages,args.gpu_packages,args.provider,str(output));entries=[];start=time.monotonic()
 executor=None
 if args.workers==1:initialize(*initargs);results=map(render,rows)
 else:executor=ProcessPoolExecutor(max_workers=args.workers,initializer=initialize,initargs=initargs);results=executor.map(render,rows,chunksize=5)
 try:
  for e in results:
   entries.append(e)
   if len(entries)%100==0 or len(entries)==len(rows):
    status=dict(done=len(entries),total=len(rows),elapsedSeconds=round(time.monotonic()-start,1),bytes=sum(x['bytes'] for x in entries))
    (output/'progress.json').write_text(json.dumps(status),encoding='utf-8');print(json.dumps(status),flush=True)
  manifest=dict(version=1,engine='Kokoro-82M v1.0',voice='af_heart',speed=1.0,canonicalIndex=0,complete=not bool(args.limit),entries=entries)
  temp=output/'manifest.tmp';temp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');os.replace(temp,output/'manifest.json')
 finally:
  if executor:executor.shutdown(wait=True,cancel_futures=True)
if __name__=='__main__':main()
