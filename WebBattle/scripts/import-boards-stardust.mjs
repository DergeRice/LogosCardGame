import sharp from 'sharp';import {mkdir,writeFile,access} from 'node:fs/promises';import {join} from 'node:path';
const [dustSource,boardsDirectory]=process.argv.slice(2);if(!dustSource||!boardsDirectory)throw Error('Usage: node scripts/import-boards-stardust.mjs <dust.png> <boards directory>');
await mkdir('public/cosmetics/boards',{recursive:true});await mkdir('.runtime',{recursive:true});
async function save(path,data){try{await access(path);throw Error('Already exists: '+path)}catch(e){if(e.code!=='ENOENT')throw e;}await writeFile(path,data);}
const manifest=[],dust=await sharp(dustSource).trim({background:'#00000000',threshold:1}).resize(480,480,{fit:'contain',background:'#00000000'}).extend({top:16,bottom:16,left:16,right:16,background:'#00000000'}).webp({lossless:true,effort:6}).toBuffer();await save('public/hub/art/stardust.webp',dust);manifest.push({source:dustSource,path:'public/hub/art/stardust.webp',bytes:dust.length});
const sources=['01_우주선','02_칠판','03_흰벽돌','04_마법도서관','05_하늘성채','06_벚꽃밤','07_사막시장','08_아늑한방','09_설원','10_수중세계'],tiles=[];
for(const [index,stem]of sources.entries()){
 const source=join(boardsDirectory,stem+'.png'),{data,info}=await sharp(source).removeAlpha().raw().toBuffer({resolveWithObject:true});let height=info.height;
 // Remove only the near-white separator at the bottom of the supplied sheet cuts.
 for(let y=Math.floor(info.height*.93);y<info.height-2;y++){let white=0;for(let x=0;x<info.width;x++){const i=(y*info.width+x)*3;if(Math.min(data[i],data[i+1],data[i+2])>235)white++;}if(white/info.width>.9){height=y-2;break;}}
 const name=stem.replace(/^\d+_/,''),path='public/cosmetics/boards/'+name+'.webp',image=await sharp(source).extract({left:0,top:0,width:info.width,height}).webp({quality:90,effort:6}).toBuffer();await save(path,image);manifest.push({source,path,width:info.width,height,removedBottom:info.height-height,bytes:image.length});tiles.push({input:await sharp(image).resize(384,176,{fit:'contain',background:'#f5f0e7'}).toBuffer(),left:(index%2)*400+8,top:Math.floor(index/2)*184+4});
}
await sharp({create:{width:800,height:920,channels:4,background:'#f5f0e7'}}).composite(tiles).png().toFile('.runtime/v119-boards-contact.png');await writeFile('.runtime/v119-asset-import.json',JSON.stringify(manifest,null,2));console.log(JSON.stringify({files:manifest.length,bytes:manifest.reduce((n,r)=>n+r.bytes,0),boards:manifest.slice(1).map(r=>({path:r.path,removedBottom:r.removedBottom}))}));
