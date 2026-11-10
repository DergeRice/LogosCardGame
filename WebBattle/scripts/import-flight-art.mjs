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
// Blend the lower river into the first rows, so the land loops upright.
const land=await sharp(join(source,'land.png')).removeAlpha().raw().toBuffer({resolveWithObject:true});
const overlap=240,tileHeight=land.info.height-overlap,channels=land.info.channels,landBytes=Buffer.alloc(land.info.width*tileHeight*channels);
for(let y=0;y<tileHeight;y++)for(let x=0;x<land.info.width;x++)for(let channel=0;channel<channels;channel++){
 const index=(y*land.info.width+x)*channels+channel;
 if(y>=overlap){landBytes[index]=land.data[index];continue;}
 const lower=((y+tileHeight)*land.info.width+x)*channels+channel,blend=y/(overlap-1);
 landBytes[index]=Math.round(land.data[lower]*(1-blend)+land.data[index]*blend);
}
await sharp(landBytes,{raw:{width:land.info.width,height:tileHeight,channels}}).webp({quality:88,effort:5}).toFile(join(target,'land.webp'));
const planeFrames=[];
for(let frame=0;frame<16;frame++)planeFrames.push({input:await sharp(planeGif,{page:frame}).resize(200,200).png().toBuffer(),left:frame%4*200,top:Math.floor(frame/4)*200});
await sharp({create:{width:800,height:800,channels:4,background:'#00000000'}}).composite(planeFrames).webp({quality:86,effort:5}).toFile(join(target,'plane-banking.webp'));
await sharp(planeFrames[0].input).webp({quality:86,effort:5}).toFile(join(target,'plane.webp'));
// These illustrations were composed as whole transparent side layers. Fading
// their ends allows an upright copy to take over without slicing a building.
for(const sheet of ['objects','clouds']){
 const input=await sharp(join(source,`${sheet}.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width,height,channels}=input.info,fade=sheet==='clouds'?220:170;
 for(let y=0;y<height;y++){
  const opacity=Math.min(1,y/fade,(height-1-y)/fade);
  for(let x=0;x<width;x++)input.data[(y*width+x)*channels+3]=Math.round(input.data[(y*width+x)*channels+3]*opacity);
 }
 await sharp(input.data,{raw:{width,height,channels}}).webp({quality:85,effort:5}).toFile(join(target,`${sheet}-layer.webp`));
}
console.log('Imported seamless upright flight land, whole object/cloud layers and a 16-frame plane');
