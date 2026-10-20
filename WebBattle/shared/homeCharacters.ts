import {NARO_CHARACTER_POSES} from './naroCharacter.js';
import {characterName} from './characterNames.js';
import {NARO_EMOTES} from './emotes.js';
import {EXTRA_COSMETICS} from './cosmetic-resources.js';
const art=[...NARO_EMOTES,...EXTRA_COSMETICS.filter(c=>c.type==='emote')];
function character(id:string,name:string,ids:string[]){
 const poses=ids.map(id=>{const item=art.find(c=>c.id===id);if(!item)throw Error(`Missing character pose: ${id}`);return {id:item.id,name:characterName(item.name),image:item.image};});
 return {id,type:'character' as const,name:characterName(name),image:poses[0].image,poses};
}
const series=(name:string,poses:string[])=>poses.map(p=>'emote-'+name+' '+p);
export const HOME_CHARACTERS=[
 {id:'character-naro-solo',type:'character' as const,name:'나로',image:NARO_CHARACTER_POSES[0].image,poses:NARO_CHARACTER_POSES},
 character('character-hamster','햄스터',series('햄스터',['인사','응원','화남','어질어질','놀람','부끄러움','하품','사랑','고민','눈물'])),
 character('character-dog','강아지',series('강아지',['최고','기쁨','화남','놀람','걱정','도발','고민','하품','사랑','응원'])),
 character('character-spotted','점박이',series('점박이',['인사','응원','화남','놀람','고민','눈물','사랑','부끄러움','하품','최고'])),
 character('character-rabbit','토끼',series('토끼',['인사','신남','화남','놀람','눈물','고민','사랑','부끄러움','하품','응원'])),
 character('character-pink-monkey','분홍원숭이',series('분홍원숭이',['인사','응원','신남','화남','놀람','눈물','고민','사랑','부끄러움','하품'])),
 character('character-horse','말',series('말',['미소','사랑','인사','고민','부끄러움','신남','놀람','화남','눈물','하품'])),
 character('character-king','왕',series('왕',['인사','응원','화남','놀람','눈물','고민','사랑','부끄러움','하품','최고'])),
 character('character-hans','한스 대왕',series('한스 대왕',['인사','응원','화남','놀람','눈물','고민','사랑','부끄러움','하품','최고'])),
];
