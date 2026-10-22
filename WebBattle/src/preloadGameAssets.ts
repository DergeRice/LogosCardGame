import {NARO_CHARACTER_POSES} from '../shared/naroCharacter.js';
import {COIN_IMAGE,DIAMOND_IMAGE,DIAMOND_PACK_IMAGES,DUST_IMAGE} from '../shared/art.js';
import {BOX_ART,TIER_ART} from './hubArt.js';
import {COSMETICS} from '../shared/store.js';
import {CONTROL_ICONS} from './controlIcons.js';
export const GAME_ASSET_URLS=[...new Set([...NARO_CHARACTER_POSES.map(p=>p.image),'/battle-art/go-referee.webp','/battle-art/go-success.webp',COIN_IMAGE,DIAMOND_IMAGE,DUST_IMAGE,...Object.values(DIAMOND_PACK_IMAGES),...Object.values(BOX_ART),...TIER_ART,...Object.values(CONTROL_ICONS),...COSMETICS.filter(e=>(e.type==='emote'||e.type==='profile')&&e.image.startsWith('/')).map(e=>e.image),
 '/landing/background.jpg','/landing/cards.png','/landing/mascots.png','/landing/cards-mobile.webp','/landing/mascots-mobile.webp',
 '/brand-ui/game-back.png','/brand-ui/panels.png','/brand-ui/ui-icons.png','/brand-ui/start-button.png'
])];
const listeners=new Set<(done:number,total:number)=>void>();
let loading:Promise<{failed:number}>|undefined,completed=0,failed=0;
async function preload(url:string){try{const response=await fetch(url,{cache:'force-cache'});await response.blob();if(!response.ok)failed++;}catch{failed++;}completed++;for(const listener of listeners)listener(completed,GAME_ASSET_URLS.length);}
/** Subscribers share one download and receive cached progress, including when entry warmed images first. */
export function preloadGameAssets(onProgress:(done:number,total:number)=>void=()=>{}){listeners.add(onProgress);onProgress(completed,GAME_ASSET_URLS.length);if(!loading){let next=0;const worker=async()=>{while(next<GAME_ASSET_URLS.length)await preload(GAME_ASSET_URLS[next++])};const workers=navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches?2:6;loading=Promise.all(Array.from({length:Math.min(workers,GAME_ASSET_URLS.length)},worker)).then(()=>({failed}));}return loading.finally(()=>listeners.delete(onProgress));}
