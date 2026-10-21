import {NARO_CHARACTER_POSES} from '../shared/naroCharacter.js';
import {COIN_IMAGE,DIAMOND_IMAGE,DIAMOND_PACK_IMAGES,DUST_IMAGE} from '../shared/art.js';
import {BOX_ART,TIER_ART} from './hubArt.js';
import {COSMETICS} from '../shared/store.js';
import {CONTROL_ICONS} from './controlIcons.js';
export const GAME_ASSET_URLS=[...NARO_CHARACTER_POSES.map(p=>p.image),'/battle-art/go-referee.webp','/battle-art/go-success.webp',COIN_IMAGE,DIAMOND_IMAGE,DUST_IMAGE,...Object.values(DIAMOND_PACK_IMAGES),...Object.values(BOX_ART),...TIER_ART,...Object.values(CONTROL_ICONS),...COSMETICS.filter(e=>(e.type==='emote'||e.type==='profile'||e.type==='board'||e.type==='background')&&e.image.startsWith('/')).map(e=>e.image),
 '/landing/background.jpg','/landing/cards.png','/landing/mascots.png','/landing/cards-mobile.webp','/landing/mascots-mobile.webp',
 '/brand-ui/game-back.png','/brand-ui/panels.png','/brand-ui/ui-icons.png','/brand-ui/start-button.png'
];
const images:HTMLImageElement[]=[],listeners=new Set<(done:number,total:number)=>void>();
let loading:Promise<{failed:number}>|undefined,completed=0,failed=0;
function decode(url:string){return new Promise<void>(resolve=>{const image=new Image();images.push(image);let settled=false;const done=(ok:boolean)=>{if(settled)return;settled=true;if(!ok)failed++;completed++;for(const listener of listeners)listener(completed,GAME_ASSET_URLS.length);resolve()};image.onload=()=>{void image.decode().then(()=>done(true),()=>done(false))};image.onerror=()=>done(false);image.src=url;});}
/** Subscribers share one download and receive cached progress, including when entry warmed images first. */
export function preloadGameAssets(onProgress:(done:number,total:number)=>void=()=>{}){listeners.add(onProgress);onProgress(completed,GAME_ASSET_URLS.length);if(!loading){let next=0;const worker=async()=>{while(next<GAME_ASSET_URLS.length)await decode(GAME_ASSET_URLS[next++])};loading=Promise.all(Array.from({length:Math.min(6,GAME_ASSET_URLS.length)},worker)).then(()=>({failed}));}return loading.finally(()=>listeners.delete(onProgress));}
