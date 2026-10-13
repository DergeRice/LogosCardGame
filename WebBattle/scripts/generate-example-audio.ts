import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {EXAMPLE_AUDIO_WORDS} from '../shared/example-audio.js';
const temp=resolve('.runtime/example-audio'),output=resolve('public/audio/examples');mkdirSync(temp,{recursive:true});mkdirSync(output,{recursive:true});
const words=[...new Set(EXAMPLE_AUDIO_WORDS)];writeFileSync(resolve(temp,'words.json'),JSON.stringify(words));
execFileSync('powershell',['-NoProfile','-ExecutionPolicy','Bypass','-File',resolve('scripts/generate-example-audio.ps1'),'-WordsPath',resolve(temp,'words.json'),'-OutputDirectory',temp],{stdio:'inherit'});
const chunks:Buffer[]=[],segments:Record<string,{start:number;length:number}>={};let samples=0,sampleRate=0;
for(const word of words){
 const wav=readFileSync(resolve(temp,word+'.wav'));let data:Buffer|undefined;
 for(let i=12;i+8<=wav.length;){const size=wav.readUInt32LE(i+4),type=wav.toString('ascii',i,i+4);if(type==='fmt '){if(wav.readUInt16LE(i+8)!==1||wav.readUInt16LE(i+10)!==1||wav.readUInt16LE(i+22)!==16)throw Error('Expected mono PCM16');const rate=wav.readUInt32LE(i+12);if(sampleRate&&rate!==sampleRate)throw Error('Mixed sample rates');sampleRate=rate;}if(type==='data')data=wav.subarray(i+8,i+8+size);i+=8+size+(size%2);}
 if(!data)throw Error('Missing speech data: '+word);let first=0,last=data.length/2-1;while(first<last&&Math.abs(data.readInt16LE(first*2))<80)first++;while(last>first&&Math.abs(data.readInt16LE(last*2))<80)last--;first=Math.max(0,first-Math.floor(sampleRate*.018));last=Math.min(data.length/2-1,last+Math.floor(sampleRate*.035));const clip=data.subarray(first*2,(last+1)*2);if(clip.length<1000)throw Error('Empty speech: '+word);
 segments[word]={start:samples,length:clip.length/2};samples+=clip.length/2;chunks.push(clip);
}
const pcm=Buffer.concat(chunks),header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(sampleRate,24);header.writeUInt32LE(sampleRate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
writeFileSync(resolve(output,'voice-v1.wav'),Buffer.concat([header,pcm]));writeFileSync(resolve(output,'manifest-v1.json'),JSON.stringify({version:1,sampleRate,voice:'Microsoft Zira Desktop en-US',segments}));console.log(`${words.length} words, ${(pcm.length/1024).toFixed(0)} KiB, ${sampleRate} Hz`);
