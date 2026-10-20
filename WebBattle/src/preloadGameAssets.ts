import {BOX_ART,TIER_ART} from './hubArt.js';
import {COSMETICS} from '../shared/store.js';
import {CONTROL_ICONS} from './controlIcons.js';
export const GAME_ASSET_URLS=[...Object.values(BOX_ART),...TIER_ART,...Object.values(CONTROL_ICONS),...COSMETICS.filter(e=>(e.type==='emote'||e.type==='profile')&&e.image.startsWith('/')).map(e=>e.image),
 '/landing/background.jpg','/landing/cards.png','/landing/mascots.png','/landing/cards-mobile.webp','/landing/mascots-mobile.webp',
 '/brand-ui/game-back.png','/brand-ui/panels.png','/brand-ui/ui-icons.png','/brand-ui/start-button.png'
];
const images:HTMLImageElement[]=[],listeners=new Set<(done:number,total:number)=>void>();
let loading:Promise<{failed:number}>|undefined,completed=0,failed=0;
function decode(url:string){return new Promise<void>(resolve=>{const image=new Image();images.push(image);let settled=false;const done=(ok:boolean)=>{if(settled)return;settled=true;if(!ok)failed++;completed++;for(const listener of listeners)listener(completed,GAME_ASSET_URLS.length);resolve()};image.onload=()=>{void image.decode().then(()=>done(true),()=>done(false))};image.onerror=()=>done(false);image.src=url;});}
/** Subscribers share one download and receive cached progress, including when entry warmed images first. */
export function preloadGameAssets(onProgress:(done:number,total:number)=>void=()=>{}){listeners.add(onProgress);onProgress(completed,GAME_ASSET_URLS.length);loading??=Promise.all(GAME_ASSET_URLS.map(decode)).then(()=>({failed}));return loading.finally(()=>listeners.delete(onProgress));}
