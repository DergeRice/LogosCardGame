import sharp from 'sharp';import {mkdir,writeFile,access} from 'node:fs/promises';import {join} from 'node:path';
const directory=process.argv[2];if(!directory)throw Error('Usage: node scripts/import-hans-emotes.mjs <source directory>');
const inputs=[['25-1','인사'],['26-2','응원'],['28-3','화남'],['30-4','놀람'],['32-5','눈물'],['34-6','고민'],['36-7','사랑'],['37-8','부끄러움'],['51-9','하품'],['53-10','최고']],manifest=[],tiles=[];
await mkdir('public/cosmetics/emotes',{recursive:true});await mkdir('.runtime',{recursive:true});
for(const [index,[suffix,pose]]of inputs.entries()){
 const source=join(directory,`ChatGPT 이미지 2026년 10월 20일 오후 07_43_${suffix}.png`),path=`public/cosmetics/emotes/한스 대왕 ${pose}.webp`;
 try{await access(path);throw Error('Already exists: '+path);}catch(e){if(e.code!=='ENOENT')throw e;}
 const buffer=await sharp(source).trim({threshold:8}).resize(480,480,{fit:'contain',background:'#00000000'}).extend({top:16,bottom:16,left:16,right:16,background:'#00000000'}).webp({lossless:true,effort:6}).toBuffer();await writeFile(path,buffer);manifest.push({source,path,width:512,height:512,bytes:buffer.length});
 tiles.push({input:await sharp(buffer).resize(200,200).toBuffer(),left:index%5*208+4,top:Math.floor(index/5)*208+4});
}
await writeFile('.runtime/v121-asset-import.json',JSON.stringify(manifest,null,2));await sharp({create:{width:1040,height:416,channels:4,background:'#eee9dc'}}).composite(tiles).png().toFile('.runtime/v121-hans-contact.png');console.log(JSON.stringify({files:manifest.length,bytes:manifest.reduce((n,m)=>n+m.bytes,0)}));
