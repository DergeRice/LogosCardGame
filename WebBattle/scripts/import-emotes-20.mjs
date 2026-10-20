import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
// Deterministic crop/resize only: preserve the supplied illustrations and alpha.
const input=process.argv[2]??join(homedir(),'Downloads');
const out='public/cosmetics/emotes';await mkdir(out,{recursive:true});
const hamsters=[
 ['04_38_40-1','햄스터 인사'],['04_38_41-2','햄스터 응원'],
 ['04_38_42-3','햄스터 화남'],['04_38_42-4','햄스터 어질어질'],
 ['04_38_43-5','햄스터 놀람'],['04_38_44-6','햄스터 부끄러움'],
 ['04_38_45-7','햄스터 하품'],['04_38_46-8','햄스터 사랑'],
 ['04_38_46-9','햄스터 고민'],['04_38_47-10','햄스터 눈물'],
];
async function save(image,name){await image.trim({threshold:8}).resize(480,480,{fit:'contain',background:'#00000000'}).extend({top:16,bottom:16,left:16,right:16,background:'#00000000'}).webp({lossless:true,effort:6}).toFile(join(out,name+'.webp'));}
for(const [suffix,name]of hamsters)await save(sharp(join(input,`ChatGPT 이미지 2026년 10월 20일 오후 ${suffix}.png`)),name);
const sheet=join(input,'귀여운 강아지 마스코트 스티커 시트.png');
const crops=[
 ['강아지 최고',0,40,335,450],['강아지 기쁨',335,40,295,450],
 ['강아지 화남',630,40,310,450],['강아지 놀람',940,40,305,450],
 ['강아지 걱정',1245,40,291,450],
 ['강아지 도발',0,520,334,435],['강아지 고민',334,520,297,435],
 ['강아지 하품',631,520,290,435],['강아지 사랑',921,520,306,435],
 ['강아지 응원',1227,520,309,435],
];
// Artwork bounding boxes overlap: isolate alpha-connected components instead
// of cutting through the neighbouring dog's pompom, cape or ears.
const {data,info}=await sharp(sheet).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const visited=new Uint8Array(info.width*info.height),layers=crops.map(()=>Buffer.alloc(data.length));
const centers=[[170,476,774,1074,1382],[175,472,767,1064,1366]];
for(let seed=0;seed<visited.length;seed++){
 if(visited[seed]||data[seed*4+3]<16)continue;
 const queue=[seed];visited[seed]=1;let sx=0,sy=0;
 for(let at=0;at<queue.length;at++){
  const i=queue[at],x=i%info.width,y=Math.floor(i/info.width);sx+=x;sy+=y;
  for(const j of [i-info.width,i+info.width,...(x?[i-1]:[]),...(x<info.width-1?[i+1]:[])])if(j>=0&&j<visited.length&&!visited[j]&&data[j*4+3]>=16){visited[j]=1;queue.push(j);}
 }
 if(queue.length<8)continue;
 const cx=sx/queue.length,cy=sy/queue.length,row=cy>500?1:0;
 let col=centers[row].reduce((best,x,i)=>Math.abs(x-cx)<Math.abs(centers[row][best]-cx)?i:best,0);
 // Detached yellow cheer rays sit to the left of the cheer dog's centre.
 if(row===1&&queue.length<5000&&cx>1190)col=4;
 for(const i of queue)data.copy(layers[row*5+col],i*4,i*4,i*4+4);
}
for(let i=0;i<crops.length;i++)await save(sharp(layers[i],{raw:{width:info.width,height:info.height,channels:4}}),crops[i][0]);
await writeFile(join(out,'README.md'),'# 감정표현20종\n\n사용자가 제공한 햄스터10장과 강아지5열×2행 시트10개를 분리했습니다. 원본 Downloads 파일은 변경하지 않습니다.512×512 투명 lossless WebP, 비율 유지 및16px 여백. 생성: `node scripts/import-emotes-20.mjs [원본 폴더]`. 파일명은 상품ID에 사용되므로 출시 후 유지합니다. 기존 기본6종 지급은 유지하며 새20종은 상자/별가루200 교환 상품입니다.\n');
console.log('Imported 20 emotes, 512px transparent lossless WebP.');
