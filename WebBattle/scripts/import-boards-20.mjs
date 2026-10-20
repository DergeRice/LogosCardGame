import sharp from 'sharp';
import {mkdir,writeFile,access} from 'node:fs/promises';
import path from 'node:path';

// Explicit mappings preserve released filenames and cosmetic IDs.
const entries=[['27-1','딸기크림'],['28-2','조개해변'],['28-3','공책'],['29-4','달빛연못'],['29-5','베이커리'],['30-6','비오는창가'],['31-7','은하수'],['31-8','초록피크닉'],['32-9','네온아케이드'],['33-10','크리스마스'],['43-1','민트책상'],['44-2','대나무'],['44-3','구름하늘'],['45-4','리본공방'],['46-5','음악실'],['46-6','도토리숲'],['47-7','커피대리석'],['47-8','장난감'],['48-9','별빛천문대'],['49-10','가을양피지']];
const sourceDir=process.argv[2]??'C:/Users/vlzkc/Downloads';
await mkdir('.runtime',{recursive:true});
const manifest=[],tiles=[];
for(const [suffix,name] of entries){
 const source=path.join(sourceDir,`ChatGPT 이미지 2026년 10월 21일 오전 06_10_${suffix}.png`),dest=`public/cosmetics/boards/${name}.webp`;
 try{await access(dest);throw new Error(`Refusing to overwrite ${dest}`);}catch(e){if(e.code!=='ENOENT')throw e;}
 const input=await sharp(source).metadata();
 const info=await sharp(source).webp({quality:90,effort:6}).toFile(dest);
 if(info.width!==input.width||info.height!==input.height)throw new Error(`Changed dimensions: ${name}`);
 manifest.push({source,path:dest,width:info.width,height:info.height,bytes:info.size});
 const thumb=await sharp(dest).resize(370,170,{fit:'contain'}).png().toBuffer();
 tiles.push({input:thumb,left:(tiles.length%4)*370,top:Math.floor(tiles.length/4)*170});
}
await writeFile('.runtime/v125-asset-import.json',JSON.stringify(manifest,null,2));
await sharp({create:{width:1480,height:850,channels:3,background:'#fff'}}).composite(tiles).png().toFile('.runtime/v125-boards-contact.png');
console.log(JSON.stringify({files:manifest.length,dimensions:manifest.map(m=>[m.width,m.height]),bytes:manifest.reduce((n,m)=>n+m.bytes,0)}));
