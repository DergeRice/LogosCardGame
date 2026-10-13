import {unlockGameAudio} from './exampleAudio.js';
let primed=false;
let primer:SpeechSynthesisUtterance|null=null;
/** Call synchronously inside a trusted click/touch event, before delayed examples. */
export function primeSpeech(){
 unlockGameAudio();
 if(primed||typeof speechSynthesis==='undefined'||typeof SpeechSynthesisUtterance==='undefined')return;
 if(speechSynthesis.speaking)return;
 try{
  speechSynthesis.getVoices();
  primer=new SpeechSynthesisUtterance('.');primer.lang='en-US';primer.volume=0;
  primer.onend=()=>{primer=null};
  primer.onerror=e=>{if(e.error==='not-allowed')primed=false;primer=null};
  primed=true;speechSynthesis.speak(primer);speechSynthesis.resume();
 }catch{primed=false;primer=null;}
}
