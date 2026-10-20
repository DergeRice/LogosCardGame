import {characterName} from './characterNames.js';
export const BASIC_PROFILES=[
 {id:'profile-basic-rabbit',type:'profile',name:'아리 얼굴',image:'/profiles/basic/rabbit.webp',basic:true},
 {id:'profile-basic-naro',type:'profile',name:'나로 얼굴',image:'/profiles/basic/naro.webp',basic:true},
 {id:'profile-basic-dog',type:'profile',name:'프로나운 얼굴',image:'/profiles/basic/dog.webp',basic:true},
 {id:'profile-basic-spotted',type:'profile',name:'버프 얼굴',image:'/profiles/basic/spotted.webp',basic:true},
 {id:'profile-basic-hamster',type:'profile',name:'두두 얼굴',image:'/profiles/basic/hamster.webp',basic:true},
] as const;
export const COLLECTIBLE_PROFILES=[
 ['rabbit-wink','윙크 토끼'],['naro-smile','웃는 나로'],['dog-cool','멋쟁이 강아지'],['spotted-laugh','신난 점박이'],['hamster-wink','윙크 햄스터'],
 ['rabbit-happy','행복한 토끼'],['naro-cool','멋쟁이 나로'],['dog-love','사랑에 빠진 강아지'],['spotted-cool','멋쟁이 점박이'],['hamster-cool','멋쟁이 햄스터'],
].map(([id,name])=>({id:'profile-'+id,type:'profile' as const,name:characterName(name),image:'/profiles/collectible/'+id+'.webp'}));
/** Stable fallback for older saves, bots and example ranking rows. */
export function basicProfile(seed:string){let hash=0;for(const c of seed)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;return BASIC_PROFILES[hash%BASIC_PROFILES.length].id;}
