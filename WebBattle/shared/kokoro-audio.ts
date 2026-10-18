import {normalizeSpeechText} from './chirp-audio.js';
/** Stable public MP3 key shared by the recording catalog and browser lookup. */
export async function kokoroObjectKey(text:string):Promise<string>{
 const input=new TextEncoder().encode('kokoro-v1.0/af_heart/1.0/'+normalizeSpeechText(text));
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',input)),v=>v.toString(16).padStart(2,'0')).join('');
 return 'kokoro-afheart-v1/'+sha.slice(0,20)+'.mp3';
}
