import {KokoroTTS} from 'kokoro-js';
import {env} from '@huggingface/transformers';
// One WASM worker, no SharedArrayBuffer/isolation requirement and no game-thread inference.
env.allowLocalModels=false;
if(env.backends.onnx.wasm){env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;}
let model:Promise<KokoroTTS>|undefined,queue=Promise.resolve();const cancelled=new Set<string>();
self.onmessage=(event:MessageEvent<{id:string;text:string;type?:string}>)=>{const {id,text,type}=event.data;if(type==='cancel'){cancelled.add(id);return;}
 queue=queue.then(async()=>{if(cancelled.delete(id))return;self.postMessage({id,type:'started'});try{
  if(!text||text.length>600)throw Error('Invalid sentence length');
  model??=KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{dtype:'q8',device:'wasm'}).catch(error=>{model=undefined;throw error});
  const tts=await model;if(cancelled.delete(id))return;const audio=await tts.generate(text,{voice:'af_heart',speed:1});
  const wav=audio.toWav();self.postMessage({id,wav}, {transfer:[wav]});
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}});
};
