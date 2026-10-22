import sharp from 'sharp';
import {access,mkdir} from 'node:fs/promises';
import path from 'node:path';

// The numbered PNGs follow the non-metadata entry order in the user's archive.
// The source zip uses damaged legacy filename encoding, so its names are not stable IDs.
export const names=[
 '햇살_광장','은하_소용돌이','강철_격납고','청록_연구실','모래_유적',
 '심야_우주선','청록_기관실','고대_석길','황금_사막','산호_바다',
 '민트_물결','라벤더_정원','복숭아_타일','햇살_석판','꽃잎_테라조',
 '분홍_물결','살구_꽃길','푸른_비단','하늘_방울','가을_린넨',
 '풀빛_정원','비취_석판','황금_석판','레몬_물결','벚꽃_안개',
 '꿀빛_정원','노을_꽃길','숲속_원목','민트_체크','산호_대리석',
 '황금_마루','별빛_밤하늘','모래_물결','이끼_석판','구름_산책',
 '장미_쿠션','레몬_타일','호두_원목','아이보리_린넨','사막_양피지',
 '햇살_양피지','금빛_액자','수정_빙판','붉은_벽돌','보랏빛_궁전',
 '청록_호수','남색_액자','고대_모자이크','단풍_원목','파스텔_대리석',
];

const sourceDir=process.argv[2];
if(!sourceDir)throw Error('Usage: node scripts/import-boards-50.mjs <numbered PNG directory>');
const destination=path.resolve('public/cosmetics/boards');
await mkdir(destination,{recursive:true});
for(const [index,name] of names.entries()){
 const input=path.join(sourceDir,`${String(index+1).padStart(2,'0')}.png`);
 const output=path.join(destination,`${name}.webp`);
 try{await access(output);throw Error(`Refusing to overwrite ${output}`);}catch(error){if(error.code!=='ENOENT')throw error;}
 const info=await sharp(input).metadata();
 if(info.width!==1850||info.height!==850)throw Error(`Unexpected source size: ${input} ${info.width}×${info.height}`);
 const saved=await sharp(input).webp({quality:90,effort:6}).toFile(output);
 if(saved.width!==info.width||saved.height!==info.height)throw Error(`Changed dimensions: ${name}`);
 console.log(`${index+1}/50 ${name} ${saved.size} bytes`);
}
