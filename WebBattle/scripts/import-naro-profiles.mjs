import sharp from 'sharp';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {join} from 'node:path';
const sourceDir=process.argv[2]??'C:/Users/vlzkc/Downloads';
const sheets=[
 ['열 가지 표정의 야구모자 고양이 스티커_VEVENT',['신남','놀람','웃음','걱정','화남','눈물','어질어질','고민','응원','사랑']],
 ['귀여운 동물 캐릭터 10종 스티커',['화가 아리','서커스 나로','히어로 프로나운','깃털 공주 트랜스','비행 트랜스','의사 애드버프','탐험가 버프','광부 두두','양봉가 아리','로커 나로']],
 ['귀여운 동물 모자 스티커 시트',['꽃갓 아리','꽃갓 나로','탐험모 프로나운','보석 후드 버프','파란 깃털 기사 두두','꽃리본 아리','비행모 버프','곰돌이 모자 두두','마술사 프로나운','숲의 나로']],
 ['귀여운 동물 캐릭터 스티커 시트',['학사모 아리','탐정 나로','왕관 프로나운','분홍 공주 트랜스','월계관 트랜스','간호사 애드버프','닌자 버프','귀마개 두두','화관 아리','왕자 나로']],
 ['귀여운 동물 캐릭터 모자 컬렉션',['공주 베일 아리','별마법사 나로','깃털모 프로나운','황금 날개 트랜스','카우보이 트랜스','요리사 애드버프','고글 버프',null,null,'해적 버프']],
 ['귀여운 동물 머리 스티커 10종',['꽃베일 아리','달마법사 나로','공룡 후드 버프','빨간 모자 아리','비행사 버프','요리사 두두','대왕 버프','붉은 깃털 기사 나로','꽃잎 화관 아리','해적 프로나운']],
 ['귀여운 동물 스티커 아이콘 그리드',['보석 왕관 아리','빨간 리본 아리',null,'은빛 기사 나로','황금 왕관 프로나운','신사 프로나운','나뭇잎 버프','빨간 스카프 버프','프로펠러 모자 두두','선원 두두']],
];
// The fifth profile sheet has touching outlines. Find a narrow transparent seam
// between the heads rather than using a rectangular grid through ears and hats.
function seam(data,w,h,center){const left=Math.round(center-65),size=131,prev=new Float64Array(size),parents=new Int16Array(h*size);for(let x=0;x<size;x++)prev[x]=0;for(let y=0;y<h;y++){const next=new Float64Array(size);for(let x=0;x<size;x++){let best=x;for(const n of [x-1,x+1])if(n>=0&&n<size&&prev[n]+.2<prev[best])best=n;next[x]=prev[best]+data[(y*w+left+x)*4+3]**2+Math.abs(x-65)*.03;parents[y*size+x]=best;}prev.set(next);}let x=prev.indexOf(Math.min(...prev));const result=new Int16Array(h);for(let y=h-1;y>=0;y--){result[y]=left+x;x=parents[y*size+x];}return result;}
await mkdir('public/characters/naro-v2',{recursive:true});await mkdir('public/profiles/accessories',{recursive:true});await mkdir('.runtime',{recursive:true});
const manifest=[],profiles=[],poses=[],tiles=[];
for(let sheet=0;sheet<sheets.length;sheet++){
 const [stem,names]=sheets[sheet],source=join(sourceDir,stem+'.png'),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),w=info.width,h=info.height,n=w*h;
 const labels=new Int16Array(n).fill(-1),seen=new Uint8Array(n),parts=[],bodies=[];
 for(let k=0;k<n;k++){
  if(seen[k]||data[k*4+3]<100)continue;const pixels=[k];seen[k]=1;let sx=0,sy=0,x0=w,y0=h,x1=0,y1=0;
  for(let at=0;at<pixels.length;at++){const i=pixels[at],x=i%w,y=(i/w)|0;sx+=x;sy+=y;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);for(const j of [i-w,i+w,...(x?[i-1]:[]),...(x<w-1?[i+1]:[])])if(j>=0&&j<n&&!seen[j]&&data[j*4+3]>=100){seen[j]=1;pixels.push(j);}}
  const cx=sx/pixels.length,cy=sy/pixels.length,cell=(cy>h*.53?5:0)+Math.min(4,Math.floor(cx/w*5)),part={pixels,cell,x0,x1,y0,y1,cx,cy};parts.push(part);if(pixels.length>30000)bodies.push(part);
 }
 const seams=sheet===5?[seam(data,w,480,w/5),seam(data,w,480,w*2/5),seam(data,w,480,w*3/5),seam(data,w,480,w*4/5)]:undefined;
 for(const part of parts){let cell=part.cell;if(part.pixels.length<=30000){const distance=b=>Math.hypot(Math.max(b.x0-part.cx,0,part.cx-b.x1),Math.max(b.y0-part.cy,0,part.cy-b.y1));cell=bodies.reduce((best,b)=>distance(b)<distance(best)?b:best).cell;}for(const i of part.pixels){const y=(i/w)|0,x=i%w;labels[i]=seams&&part.cy<h*.53&&y<480?seams.reduce((col,s)=>col+(x>=s[y]?1:0),0):cell;}}
 // Preserve original antialiasing/soft edges by growing labels only through
 // nontransparent source pixels; no colour-key removal or regenerated artwork.
 const queue=new Int32Array(n);let tail=0;for(let i=0;i<n;i++)if(labels[i]>=0)queue[tail++]=i;
 for(let at=0;at<tail;at++){const i=queue[at],x=i%w;for(const j of [i-w,i+w,...(x?[i-1]:[]),...(x<w-1?[i+1]:[])])if(j>=0&&j<n&&labels[j]<0&&data[j*4+3]>0){labels[j]=labels[i];queue[tail++]=j;}}
 for(let cell=0;cell<10;cell++){
  const name=names[cell];if(!name)continue;const layer=Buffer.alloc(data.length);for(let i=0;i<n;i++)if(labels[i]===cell)data.copy(layer,i*4,i*4,i*4+4);
  const id=sheet===0?String(cell+1).padStart(2,'0'):`${String(sheet).padStart(2,'0')}-${String(cell+1).padStart(2,'0')}`,path=sheet===0?`public/characters/naro-v2/${id}.webp`:`public/profiles/accessories/${id}.webp`;
  try{await access(path);throw Error('Refusing to overwrite '+path);}catch(e){if(e.code!=='ENOENT')throw e;}
  const buffer=await sharp(layer,{raw:{width:w,height:h,channels:4}}).trim({threshold:5}).resize(480,480,{fit:'contain',background:'#00000000'}).extend({top:16,bottom:16,left:16,right:16,background:'#00000000'}).webp({lossless:true,effort:6}).toBuffer();await writeFile(path,buffer);
  const item={id:sheet===0?'naro-pose-'+id:'profile-accessory-'+id,type:'profile',name:sheet===0?'나로 '+name:name,image:path.replace(/^public/,'')};if(sheet===0)poses.push(({id:item.id,name:item.name,image:item.image}));else profiles.push(item);
  manifest.push({source,sheet,cell,name,path,width:512,height:512,bytes:buffer.length});tiles.push({input:await sharp(buffer).resize(150,150).png().toBuffer(),left:(tiles.length%10)*156+3,top:Math.floor(tiles.length/10)*176+3});
 }
}
await writeFile('shared/accessoryProfiles.ts','// User supplied accessory portraits, excluding the blue dinosaur. Generated by import-naro-profiles.mjs.\nexport const ACCESSORY_PROFILES='+JSON.stringify(profiles,null,2)+' as const;\n');
await writeFile('shared/naroCharacter.ts','// Home character poses are separate from the existing Naro emotes.\nexport const NARO_CHARACTER_POSES='+JSON.stringify(poses,null,2)+';\n');
await writeFile('.runtime/v127-asset-import.json',JSON.stringify(manifest,null,2));
await sharp({create:{width:1560,height:Math.ceil(tiles.length/10)*176,channels:4,background:'#eee9dc'}}).composite(tiles).png().toFile('.runtime/v127-contact.png');
console.log(JSON.stringify({poses:poses.length,profiles:profiles.length,bytes:manifest.reduce((sum,m)=>sum+m.bytes,0)}));
