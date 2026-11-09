import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {VERB_CATEGORIES} from '../shared/miniGame.js';

const temp=resolve('.runtime/mini-audio'),output=resolve('public/audio/mini');
mkdirSync(temp,{recursive:true});mkdirSync(resolve(output,'clips'),{recursive:true});
const words=[...new Set(VERB_CATEGORIES.flatMap(category=>category.words))];
writeFileSync(resolve(temp,'words.json'),JSON.stringify(words));
execFileSync('powershell',['-NoProfile','-ExecutionPolicy','Bypass','-File',resolve('scripts/generate-example-audio.ps1'),'-WordsPath',resolve(temp,'words.json'),'-OutputDirectory',temp],{stdio:'inherit'});

const clips:Record<string,string>={};
for(const word of words){
 const bytes=readFileSync(resolve(temp,word+'.wav'));
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE'||bytes.length<1000)throw Error('Invalid recorded clip: '+word);
 const file=createHash('sha256').update(word).digest('hex').slice(0,16)+'.wav';
 writeFileSync(resolve(output,'clips',file),bytes);
 clips[word]=file;
}
writeFileSync(resolve(output,'manifest-v2.json'),JSON.stringify({version:2,voice:'Microsoft Zira Desktop en-US',clips}));
console.log(`${words.length} locally recorded mini-game clips`);
