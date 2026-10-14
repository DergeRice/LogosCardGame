import {createHash, sign} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {CHIRP_VOICE, normalizeSpeechText} from '../shared/chirp-audio.js';
import {SENTENCE_EXAMPLES} from '../shared/sentence-examples.js';

const output=resolve('public/audio/chirp');
const manifestPath=join(output,'manifest.json');
const execute=process.argv.includes('--execute');
const budget=Number(process.env.CHIRP_CHAR_BUDGET??0);
if(!Number.isSafeInteger(budget)||budget<0)throw Error('CHIRP_CHAR_BUDGET must be a nonnegative integer');
const file=process.env.CHIRP_SENTENCES_FILE;
const extra=file?readFileSync(resolve(file),'utf8').split(/\r?\n/).map(line=>{
 if(!line.trim())return '';
 if(line.trimStart().startsWith('{'))return (JSON.parse(line) as {english?:string;text?:string}).english??(JSON.parse(line) as {text?:string}).text??'';
 return line;
}):[];
const texts=[...new Set([...SENTENCE_EXAMPLES.map(x=>x.english),'Run!',...extra].map(normalizeSpeechText).filter(Boolean))];
const idFor=(text:string)=>createHash('sha256').update(text).digest('hex').slice(0,16);
const entries=texts.map(text=>({text,id:idFor(text),characters:[...text].length}));
mkdirSync(output,{recursive:true});
const existing=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')) as {ids?:string[]}:{};
const ids=new Set((existing.ids??[]).filter(id=>existsSync(join(output,id.slice(0,2),`${id}.mp3`))));
const missing=entries.filter(entry=>!ids.has(entry.id));
let selected:{text:string;id:string;characters:number}[]=[];
let characters=0;
for(const entry of missing){if(characters+entry.characters>budget)break;selected.push(entry);characters+=entry.characters;}
const allCharacters=missing.reduce((sum,entry)=>sum+entry.characters,0);
console.log(JSON.stringify({voice:CHIRP_VOICE,totalSentences:entries.length,existingFiles:ids.size,missingFiles:missing.length,missingCharacters:allCharacters,estimatedFullCostUSD:Number((allCharacters*.00003).toFixed(2)),budgetCharacters:budget,selectedFiles:selected.length,selectedCharacters:characters,estimatedSelectedCostUSD:Number((characters*.00003).toFixed(2)),mode:execute?'execute':'dry-run'},null,2));
if(!execute)process.exit(0);
if(!budget||!selected.length)throw Error('No sentences selected. Set CHIRP_CHAR_BUDGET before --execute.');
const credentialsPath=process.env.GOOGLE_APPLICATION_CREDENTIALS;
if(!credentialsPath)throw Error('GOOGLE_APPLICATION_CREDENTIALS must point to a service account JSON file.');
const credentials=JSON.parse(readFileSync(resolve(credentialsPath),'utf8')) as {client_email:string;private_key:string;token_uri:string};
if(!credentials.client_email||!credentials.private_key||!credentials.token_uri)throw Error('Invalid service account credentials.');
const persist=()=>writeFileSync(manifestPath,JSON.stringify({version:1,voice:CHIRP_VOICE,ids:[...ids].sort()})+'\n');
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function accessToken(){
 const now=Math.floor(Date.now()/1000);
 const encoded=(value:object)=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const body=`${encoded({alg:'RS256',typ:'JWT'})}.${encoded({iss:credentials.client_email,scope:'https://www.googleapis.com/auth/cloud-platform',aud:credentials.token_uri,iat:now,exp:now+3600})}`;
 const assertion=`${body}.${sign('RSA-SHA256',Buffer.from(body),credentials.private_key).toString('base64url')}`;
 const response=await fetch(credentials.token_uri,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
 if(!response.ok)throw Error(`Google OAuth failed: HTTP ${response.status}`);
 return (await response.json() as {access_token:string}).access_token;
}
let token=await accessToken(),tokenAt=Date.now();
for(let i=0;i<selected.length;i++){
 const entry=selected[i];
 if(Date.now()-tokenAt>45*60*1000){token=await accessToken();tokenAt=Date.now();}
 let audio:string|undefined;
 for(let attempt=0;attempt<5;attempt++){
  const response=await fetch('https://texttospeech.googleapis.com/v1/text:synthesize',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({input:{text:entry.text},voice:{languageCode:'en-US',name:CHIRP_VOICE},audioConfig:{audioEncoding:'MP3',speakingRate:0.9}})});
  if(response.ok){audio=(await response.json() as {audioContent:string}).audioContent;break;}
  const detail=await response.text();
  if(![429,500,502,503,504].includes(response.status)||attempt===4)throw Error(`Google TTS failed for ${entry.id}: HTTP ${response.status} ${detail.slice(0,300)}`);
  await sleep(1000*2**attempt);
 }
 if(!audio)throw Error(`Google TTS returned no audio for ${entry.id}`);
 const directory=join(output,entry.id.slice(0,2));mkdirSync(directory,{recursive:true});
 writeFileSync(join(directory,`${entry.id}.mp3`),Buffer.from(audio,'base64'));
 ids.add(entry.id);
 if((i+1)%25===0||i===selected.length-1){persist();console.log(`Generated ${i+1}/${selected.length}`);}
 await sleep(500); // Stay below Chirp 3 HD's 200 requests/minute project quota.
}
