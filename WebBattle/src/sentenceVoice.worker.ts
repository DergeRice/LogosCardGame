import {predict} from '@diffusionstudio/vits-web';
// A separate worker keeps phonemization and neural inference off the game thread.
const scope=self as unknown as {onmessage:((event:MessageEvent<string>)=>void)|null;postMessage:(value:unknown)=>void};
scope.onmessage=async event=>{
 try{
  const text=event.data.trim();if(!text||text.length>600)throw Error('Invalid sentence length');
  const wav=await predict({text,voiceId:'en_US-ljspeech-medium'},progress=>scope.postMessage({type:'progress',loaded:progress.loaded,total:progress.total}));
  scope.postMessage({type:'audio',wav});
 }catch(error){scope.postMessage({type:'error',message:error instanceof Error?error.message:'Speech synthesis failed'});}
};
