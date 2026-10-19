export const NARO_EMOTES=[
 {id:'emote-mistake',type:'emote',name:'실수',image:'/emotes/naro/mistake.png',basic:false,dustOnly:true},
 {id:'emote-angry',type:'emote',name:'화남',image:'/emotes/naro/angry.png',basic:true},
 {id:'emote-surprise',type:'emote',name:'놀람',image:'/emotes/naro/surprise.png',basic:true},
 {id:'emote-taunt',type:'emote',name:'도발',image:'/emotes/naro/taunt.png',basic:false,dustOnly:true},
 {id:'emote-think',type:'emote',name:'고민 중',image:'/emotes/naro/think.png',basic:true},
 {id:'emote-hello',type:'emote',name:'인사',image:'/emotes/naro/hello.png',basic:true},
 {id:'emote-thanks',type:'emote',name:'감사',image:'/emotes/naro/thanks.png',basic:true},
 {id:'emote-yawn',type:'emote',name:'하품',image:'/emotes/naro/yawn.png',basic:false,dustOnly:true},
 {id:'emote-cheer',type:'emote',name:'응원',image:'/emotes/naro/cheer.png',basic:true},
 {id:'emote-love',type:'emote',name:'사랑',image:'/emotes/naro/love.png',basic:false,dustOnly:true},
] as const;
export const DUST_EMOTE_IDS=['emote-mistake','emote-taunt','emote-yawn','emote-love'];
export const BASIC_EMOTES=NARO_EMOTES.filter(e=>e.basic);
export const DEFAULT_EMOTE_SLOTS=['emote-hello','emote-cheer','emote-surprise','emote-think'];
export type EmoteSlots=(string|null)[];
export function emoteSlots(save:{emotes?:EmoteSlots;emote?:string;owned:string[]}):EmoteSlots{
 const input=save.emotes??[save.emote??DEFAULT_EMOTE_SLOTS[0],...DEFAULT_EMOTE_SLOTS.filter(id=>id!==save.emote)].slice(0,4),seen=new Set<string>();
 return Array.from({length:4},(_,i)=>{const id=input[i];if(typeof id!=='string'||!save.owned.includes(id)||seen.has(id))return null;seen.add(id);return id});
}
export type EmotionEvent='hello'|'mistake'|'robbed'|'surpassed'|'lead'|'scored'|'exchange'|'waiting'|'longWait';
const preferences:Record<EmotionEvent,string[]>={hello:['hello','love','cheer'],mistake:['mistake','think','angry'],robbed:['angry','surprise','mistake'],surpassed:['surprise','angry','think'],lead:['taunt','cheer','love'],scored:['cheer','love','taunt'],exchange:['thanks','love','cheer'],waiting:['think','yawn'],longWait:['yawn','think']};
export const AI_EMOTE_LOADOUTS=[['hello','think','mistake','cheer'],['hello','angry','surprise','thanks'],['hello','taunt','yawn','love']].map(list=>list.map(id=>'emote-'+id));
export function aiEmote(event:EmotionEvent,loadout:readonly string[]){return preferences[event].map(id=>'emote-'+id).find(id=>loadout.includes(id));}
