import sharp from 'sharp';import {mkdir,writeFile} from 'node:fs/promises';
// Preserve protruding ears/effects, remove the separate captions; never rotate or distort.
const emotes=[['mistake',0,105,318,400],['angry',318,105,301,400],['surprise',619,105,303,400],['taunt',922,105,294,400],['think',1216,105,320,400],['hello',0,535,321,395],['thanks',321,535,299,395],['yawn',620,535,301,395],['cheer',921,535,294,395],['love',1215,535,321,395]];
const icons=[['show-cards',25,200,275,280],['hand-cards',310,200,340,280],['card',1000,200,210,280],['emote-chat',1230,200,306,280],['home',20,555,290,280],['ranking',325,555,310,280],['friends',645,555,300,280],['shop',960,555,285,280],['profile',1250,555,280,280]];
// Separate alpha-connected artwork before cropping: adjacent ears/effects overlap cell bounds.
const {data,info}=await sharp('assets-source/Emotes10.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const seen=new Uint8Array(info.width*info.height),layers=Array.from({length:10},()=>Buffer.alloc(data.length));
const centers=[174,465,768,1060,1368];
for(let k=0;k<seen.length;k++){
 if(seen[k]||data[k*4+3]<12)continue;
 const todo=[k];seen[k]=1;let sumX=0,sumY=0;
 for(let at=0;at<todo.length;at++){const i=todo[at],x=i%info.width,y=Math.floor(i/info.width);sumX+=x;sumY+=y;
  for(const j of [i-info.width,i+info.width,...(x?[i-1]:[]),...(x<info.width-1?[i+1]:[])])if(j>=0&&j<seen.length&&!seen[j]&&data[j*4+3]>=12){seen[j]=1;todo.push(j)}
 }
 const cy=sumY/todo.length;
 // Printed captions are separate alpha components below each row of characters.
 if((cy>438&&cy<520)||cy>855)continue;
 const row=cy>520?1:0,cx=sumX/todo.length;
 const nearest=centers.reduce((best,x,i)=>Math.abs(x-cx)<Math.abs(centers[best]-cx)?i:best,0);
 for(const i of todo){const x=i%info.width;const col=row===1&&todo.length>100000?(x<323?0:1):nearest;data.copy(layers[row*5+col],i*4,i*4,i*4+4)}
}
await mkdir('public/emotes/naro',{recursive:true});
for(let i=0;i<emotes.length;i++)await sharp(layers[i],{raw:{width:info.width,height:info.height,channels:4}}).trim({threshold:5}).resize(480,480,{fit:'contain',background:'#00000000'}).extend({top:16,bottom:16,left:16,right:16,background:'#00000000'}).png().toFile('public/emotes/naro/'+emotes[i][0]+'.png');
await mkdir('public/icons/controls',{recursive:true});
for(const [name,left,top,width,height] of icons)await sharp(await sharp('assets-source/UIIcons.png').extract({left,top,width,height}).toBuffer()).trim({threshold:8}).resize(480,480,{fit:'contain',background:'#00000000'}).extend({top:16,bottom:16,left:16,right:16,background:'#00000000'}).png().toFile('public/icons/controls/'+name+'.png');
await writeFile('public/emotes/naro/README.md','User supplied Naro sheet: assets-source/Emotes10.png. Alpha-connected components (with a contact boundary for hello/thanks) in scripts/import-naro-art.mjs; printed captions removed; transparent 512px contain; no stretching.');
console.log('10 emotes + 9 icons, 512px transparent PNG. Number-3 icon excluded.');
