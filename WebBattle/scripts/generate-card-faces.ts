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
// New grammar faces are drawn as vector art; original JPEG cells remain untouched
// so an in-progress match containing a legacy Very card can still render it.
function toInfinitiveArt(bonus:boolean){
 const badge=bonus?'<rect x="344" y="20" width="116" height="62" rx="29" fill="#f9b536" stroke="#8a5526" stroke-width="4"/><text x="402" y="63" text-anchor="middle" font-size="37" font-weight="800" fill="#603b1b">+3</text>':'<circle cx="421" cy="52" r="32" fill="#f9b536" stroke="#8a5526" stroke-width="4"/><text x="421" y="63" text-anchor="middle" font-size="34" font-weight="800" fill="#603b1b">1</text>';
 return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="488" height="693" viewBox="0 0 488 693">
 <defs><pattern id="checks" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#de8526"/><rect width="16" height="16" fill="#f9b04d"/><rect x="16" y="16" width="16" height="16" fill="#f9b04d"/></pattern><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#d7eedf"/><stop offset="1" stop-color="#9bd0c3"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-opacity=".2"/></filter></defs>
 <rect width="488" height="693" rx="42" fill="url(#checks)"/><rect x="16" y="17" width="456" height="80" rx="35" fill="#fffdf7" stroke="#a66a2f" stroke-width="3"/><path d="M66 31l25 25-25 25-25-25z" fill="#e89012"/><text x="244" y="73" text-anchor="middle" font-family="Arial,sans-serif" font-size="52" fill="#293e31">TO</text>${badge}
 <rect x="33" y="125" width="422" height="394" rx="29" fill="url(#sky)" stroke="#416b61" stroke-width="4"/><circle cx="355" cy="224" r="77" fill="#fff8da" opacity=".72"/><path d="M63 442c87-41 158-41 229-7 58 27 115 33 163 10v74H33z" fill="#6aaf86"/><path d="M93 422c55-30 113-30 166-2 68 35 118 40 177 11" fill="none" stroke="#317e72" stroke-width="14" stroke-linecap="round"/>
 <g filter="url(#shadow)"><rect x="92" y="205" width="304" height="174" rx="25" fill="#fffdf7" stroke="#5a8169" stroke-width="5"/><text x="244" y="276" text-anchor="middle" font-family="Arial,sans-serif" font-size="50" font-weight="800" fill="#315b51">to + verb</text><path d="M146 313h178" stroke="#e3a043" stroke-width="7" stroke-linecap="round"/><text x="244" y="349" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" fill="#4c6556">I want to learn.</text></g>
 <circle cx="112" cy="163" r="10" fill="#f9c766"/><circle cx="392" cy="461" r="13" fill="#fff3b0"/>
 <rect x="16" y="536" width="456" height="140" rx="29" fill="#fffdf7" stroke="#a66a2f" stroke-width="3"/><text x="244" y="592" text-anchor="middle" font-family="Arial,sans-serif" font-size="43" fill="#293e31">TO INFINITIVE</text><text x="244" y="635" text-anchor="middle" font-family="Arial,sans-serif" font-size="27" fill="#4b6055">to + base verb</text>
 </svg>`);
}
for(const bonus of [false,true]){
 const name=bonus?'to-infinitive-plus3':'to-infinitive';
 await sharp(toInfinitiveArt(bonus)).webp({lossless:true,effort:5}).toFile(join(output,`${name}.webp`));
}
console.log(`Generated ${faces.length+2} card faces to ${output}`);
