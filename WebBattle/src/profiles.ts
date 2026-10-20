import {BASIC_PROFILES,COLLECTIBLE_PROFILES} from '../shared/profiles.js';
let preload:Promise<void>|undefined;
export function preloadProfiles(){return preload??=Promise.all([...BASIC_PROFILES,...COLLECTIBLE_PROFILES].map(p=>new Promise<void>(resolve=>{const image=new Image();image.onload=()=>{void image.decode().catch(()=>{}).then(()=>resolve())};image.onerror=()=>resolve();image.src=p.image;}))).then(()=>{});}
