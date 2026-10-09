import {useEffect,useState} from 'react';
import type {Kind} from '../shared/rules.js';
type Profiles=Partial<Record<Kind,string>>;
let cached:Profiles={};
const request=fetch('/profiles/manifest.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}).catch(()=>({})).then((p:Profiles)=>{cached=p;return p});
let preload:Promise<void>|undefined;
export function preloadProfiles(){return preload??=request.then(async p=>{await Promise.all(Object.values(p).map(src=>new Promise<void>(resolve=>{const image=new Image();image.onload=()=>{void image.decode().catch(()=>{}).then(()=>resolve())};image.onerror=()=>resolve();image.src=src!})))})}
export function useProfileImage(kind:Kind){
 const [profiles,setProfiles]=useState<Profiles>(cached);
 useEffect(()=>{let active=true;void request.then(p=>{if(active)setProfiles(p)});return()=>{active=false}},[]);
 return profiles[kind];
}
