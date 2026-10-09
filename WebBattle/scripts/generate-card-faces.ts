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
for(const [name,face] of faces){
 const source=join(process.cwd(),'assets-source',`CardImage${face.sheet}.jpg`);
 const left=ART.columns[face.col]+ART.crop.x,top=ART.rows[face.row]+ART.crop.y;
 const filename=join(output,`${name}.webp`);
 await sharp(source).extract({left,top,width:ART.crop.width,height:ART.crop.height}).webp({lossless:true,effort:5}).toFile(filename);
}
console.log(`Extracted ${faces.length} original card faces to ${output}`);
