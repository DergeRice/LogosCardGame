import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
// Keep the user-supplied artwork, transparent background and aspect ratio.
const input=process.argv[2]??join(homedir(),'Downloads'),out='public/cosmetics/emotes';
const files=[['06_05_14-1','인사'],['06_05_15-2','응원'],['06_05_15-3','화남'],['06_05_17-4','놀람'],['06_05_17-5','고민'],['06_05_18-6','눈물'],['06_05_19-7','사랑'],['06_05_20-8','부끄러움'],['06_05_21-9','하품'],['06_05_22-10','최고']];
await mkdir(out,{recursive:true});
for(const [suffix,name] of files)await sharp(join(input,`ChatGPT 이미지 2026년 10월 20일 오후 ${suffix}.png`)).trim({threshold:8}).resize(480,480,{fit:'contain',background:'#00000000'}).extend({top:16,bottom:16,left:16,right:16,background:'#00000000'}).webp({lossless:true,effort:6}).toFile(join(out,`점박이 ${name}.webp`));
console.log('Imported 10 spotted mascot emotes, 512px transparent WebP.');
