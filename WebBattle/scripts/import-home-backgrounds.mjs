import sharp from 'sharp';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {join} from 'node:path';
const directory=process.argv[2];
if(!directory)throw Error('Usage: node scripts/import-home-backgrounds.mjs <source directory>');
const names=['하얀 성채의 안뜰','빛나는 보랏빛 마법의 숲','햇살 가득한 빈 교실','햇살 스미는 마법학원 도서관','구름 왕국의 아이보리 정원','고리 행성이 빛나는 우주 전망대','달빛 수정 호수의 고요한 밤','가을 아카데미의 따뜻한 교정길','수중 마법 돔 광장','별빛 마법학교 강당'];
await mkdir('public/cosmetics/backgrounds',{recursive:true});await mkdir('.runtime',{recursive:true});
const manifest=[],tiles=[];
for(const [index,name]of names.entries()){
 const source=join(directory,`${name}-${index+1}.png`),path=`public/cosmetics/backgrounds/${name}.webp`;
 try{await access(path);throw Error('Already exists: '+path);}catch(e){if(e.code!=='ENOENT')throw e;}
 const image=await sharp(source).webp({quality:90,effort:6}).toBuffer(),meta=await sharp(image).metadata();
 await writeFile(path,image);manifest.push({source,path,width:meta.width,height:meta.height,bytes:image.length});
 tiles.push({input:await sharp(image).resize(240,240,{fit:'contain'}).toBuffer(),left:index%5*248+4,top:Math.floor(index/5)*248+4});
}
await writeFile('.runtime/v120-asset-import.json',JSON.stringify(manifest,null,2));
await sharp({create:{width:1240,height:496,channels:3,background:'#fff'}}).composite(tiles).png().toFile('.runtime/v120-backgrounds-contact.png');
console.log(JSON.stringify({files:manifest.length,bytes:manifest.reduce((n,m)=>n+m.bytes,0),dimensions:manifest.map(m=>[m.width,m.height])}));
