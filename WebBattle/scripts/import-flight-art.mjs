import sharp from 'sharp';
import {copyFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';

const source=join('assets-source','flight'),target=join('public','flight');
await mkdir(source,{recursive:true});
await mkdir(target,{recursive:true});
const originals=[
 ['clouds.png','codex-clipboard-4fc07890-3c65-4b47-ad05-1518f612f27d.png'],
 ['objects.png','codex-clipboard-c8e60a63-3260-43c3-b037-0570ae747047.png'],
 ['land.png','codex-clipboard-332bde9e-c004-4be0-a726-f4cb29f05ea5.png'],
];
for(const [name,clipboard] of originals){
 const path=join(source,name);
 try{await sharp(path).metadata();}catch{await copyFile(join(process.env.LOCALAPPDATA,'Temp',clipboard),path);}
}
const planeGif=join(source,'airplane_banking.gif');
try{await sharp(planeGif,{animated:true}).metadata();}catch{await copyFile(join(process.env.USERPROFILE,'Downloads','airplane_banking.gif'),planeGif);}
await sharp(join(source,'land.png')).webp({quality:86,effort:5}).toFile(join(target,'land.webp'));
const planeFrames=[];
for(let frame=0;frame<16;frame++)planeFrames.push({input:await sharp(planeGif,{page:frame}).resize(200,200).png().toBuffer(),left:frame%4*200,top:Math.floor(frame/4)*200});
await sharp({create:{width:800,height:800,channels:4,background:'#00000000'}}).composite(planeFrames).webp({quality:86,effort:5}).toFile(join(target,'plane-banking.webp'));
await sharp(planeFrames[0].input).webp({quality:86,effort:5}).toFile(join(target,'plane.webp'));
const crops={
 objects:[
  ['tree-a',0,0,390,390],['house-a',0,380,390,260],['tree-b',0,620,390,390],
  ['rocks-a',0,1010,390,270],['tree-c',0,1270,390,266],
  ['rocks-b',620,0,404,205],['tree-d',620,190,404,350],['house-b',620,530,404,280],
  ['tree-e',620,790,404,310],['house-c',620,1090,404,185],['tree-f',620,1250,404,286],
 ],
 clouds:[
  ['cloud-a',0,0,600,650],['cloud-b',0,880,600,656],
  ['cloud-c',720,65,304,260],['cloud-d',500,300,524,780],
 ],
};
for(const [sheet,items] of Object.entries(crops)){
 await mkdir(join(target,sheet),{recursive:true});
 for(const [name,left,top,width,height] of items){
  const image=sharp(join(source,`${sheet}.png`)).extract({left,top,width,height}).trim({background:'#00000000',threshold:3});
  await image.resize({width:Math.min(width,380),withoutEnlargement:true}).webp({quality:84,effort:5}).toFile(join(target,sheet,`${name}.webp`));
 }
}
console.log('Imported flight land, 11 upright objects, 4 clouds and a 16-frame plane');
