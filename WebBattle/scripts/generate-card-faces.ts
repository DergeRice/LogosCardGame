import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {CATALOG,VARIANTS} from '../shared/rules.js';
import {ART} from '../src/theme.js';

// Extract exact source pixels once. Lossless WebP prevents another JPEG encode
// and lets the browser scale each face directly, without atlas offsets.
const output=join(process.cwd(),'public','cards');
await mkdir(output,{recursive:true});
const faces=[...Object.entries(CATALOG),...Object.entries(VARIANTS)].filter(([name])=>!name.startsWith('to-infinitive'));
// Match the printed card outline; remove the JPEG sheet behind its corners.
const mask=Buffer.from(`<svg width="${ART.crop.width}" height="${ART.crop.height}"><rect width="${ART.crop.width}" height="${ART.crop.height}" rx="44" ry="44" fill="white"/></svg>`);
for(const [name,face] of faces){
 const source=join(process.cwd(),'assets-source',`CardImage${face.sheet}.jpg`);
 const left=ART.columns[face.col]+ART.crop.x,top=ART.rows[face.row]+ART.crop.y;
 const filename=join(output,`${name}.webp`);
 await sharp(source).extract({left,top,width:ART.crop.width,height:ART.crop.height}).composite([{input:mask,blend:'dest-in'}]).webp({lossless:true,effort:5}).toFile(filename);
}
// The four supplied To-infinitive cards are extracted from their source sheet.
// Keep the source checked in so the lossless game faces can be regenerated.
const toSheet=join(process.cwd(),'assets-source','ToInfinitive4.png');
const toFaces=[
 ['to-infinitive',13],
 ['to-infinitive-plus2',511],
 ['to-infinitive-x2',1010],
 ['to-infinitive-div2',1508]
] as const;
const toCrop={top:64,width:488,height:710};
const toMask=Buffer.from(`<svg width="488" height="693"><rect width="488" height="693" rx="44" ry="44" fill="white"/></svg>`);
for(const [name,left] of toFaces){
 const filename=join(output,`${name}.webp`);
 await sharp(toSheet).extract({...toCrop,left}).ensureAlpha().composite([{input:toMask,blend:'dest-in'}]).resize(488,693,{fit:'fill'}).webp({lossless:true,effort:5}).toFile(filename);
}
console.log(`Generated ${faces.length+toFaces.length} card faces to ${output}`);
