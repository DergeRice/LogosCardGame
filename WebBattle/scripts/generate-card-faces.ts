import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {CATALOG,VARIANTS} from '../shared/rules.js';
import {ART} from '../src/theme.js';

// Extract exact source pixels once. Lossless WebP prevents another JPEG encode
// and lets the browser scale each face directly, without atlas offsets.
const output=join(process.cwd(),'public','cards');
await mkdir(output,{recursive:true});
const faces=[...Object.entries(CATALOG),...Object.entries(VARIANTS)];
// Match the printed card outline; remove the JPEG sheet behind its corners.
const mask=Buffer.from(`<svg width="${ART.crop.width}" height="${ART.crop.height}"><rect width="${ART.crop.width}" height="${ART.crop.height}" rx="44" ry="44" fill="white"/></svg>`);
for(const [name,face] of faces){
 const source=join(process.cwd(),'assets-source',`CardImage${face.sheet}.jpg`);
 const left=ART.columns[face.col]+ART.crop.x,top=ART.rows[face.row]+ART.crop.y;
 const filename=join(output,`${name}.webp`);
 await sharp(source).extract({left,top,width:ART.crop.width,height:ART.crop.height}).composite([{input:mask,blend:'dest-in'}]).webp({lossless:true,effort:5}).toFile(filename);
}
console.log(`Extracted ${faces.length} original card faces to ${output}`);
