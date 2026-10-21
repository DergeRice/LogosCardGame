import {mkdir} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import sharp from 'sharp';

const root=resolve(import.meta.dirname,'..');
const source=resolve(root,'public/brand-ui/loading.png');
const storeIcon=resolve(root,'docs/store-assets/app-icon-512.png');
const sizes={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};

async function icon(size){
 const mascot=Math.round(size*.84);
 return sharp({create:{width:size,height:size,channels:4,background:'#146b48'}})
  .composite([{input:await sharp(source).resize(mascot,mascot,{fit:'contain'}).png().toBuffer(),left:Math.round((size-mascot)/2),top:Math.round((size-mascot)/2)}])
  .png({compressionLevel:9}).toBuffer();
}

await mkdir(dirname(storeIcon),{recursive:true});
await sharp(await icon(512)).png({compressionLevel:9}).toFile(storeIcon);
for(const [density,size] of Object.entries(sizes)){
 const output=resolve(root,`android/app/src/main/res/mipmap-${density}/ic_launcher.png`);
 const roundOutput=resolve(root,`android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`);
 const foregroundOutput=resolve(root,`android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`);
 await sharp(await icon(size)).toFile(output);
 await sharp(await icon(size)).toFile(roundOutput);
 await sharp(source).resize(Math.round(size*.86),Math.round(size*.86),{fit:'contain'}).png({compressionLevel:9}).toFile(foregroundOutput);
}
console.log('Android launcher and Play Store icon generated from brand mascot.');
