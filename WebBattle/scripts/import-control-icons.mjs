import sharp from 'sharp';
import {mkdir,stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {resolve,join} from 'node:path';
const input=resolve(process.argv[2]??join(homedir(),'Downloads')),output=resolve('public/icons/controls');
await mkdir(output,{recursive:true});
for(const [source,name]of [['Show.png','show'],['Card Hand.png','card-hand'],['CardIcon.png','card-count'],['Chat.png','chat']]){
 const path=join(input,source),target=join(output,name+'.png'),original=await sharp(path).metadata();
 await sharp(path).resize(512,512,{fit:'contain',kernel:'lanczos3',background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toFile(target);
 const resized=await sharp(target).metadata();if(resized.width!==512||resized.height!==512||!resized.hasAlpha)throw Error('Invalid icon output: '+name);
 console.log(JSON.stringify({source,original:`${original.width}x${original.height}`,file:name+'.png',size:'512x512',transparent:true,bytes:(await stat(target)).size}));
}
