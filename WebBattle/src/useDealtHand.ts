import {useEffect,useRef,useState} from 'react';
import type {RoomView} from '../shared/rules.js';

// Track server-owned cards, not field selections: returning a card never redeals it.
export function useDealtHand(room:RoomView|null){
 const seen=useRef(new Set<string>()),match=useRef(''),timers=useRef<ReturnType<typeof setTimeout>[]>([]);
 const [visible,setVisible]=useState<Set<string>>(new Set()),[arriving,setArriving]=useState<Set<string>>(new Set());
 useEffect(()=>{
  if(!room){timers.current.forEach(clearTimeout);timers.current=[];seen.current.clear();match.current='';setVisible(new Set());setArriving(new Set());return;}
  const changed=match.current!==room.matchId;
  if(changed){timers.current.forEach(clearTimeout);timers.current=[];seen.current.clear();match.current=room.matchId;setVisible(new Set());setArriving(new Set());}
  const fresh=room.hand.filter(c=>!seen.current.has(c.id));
  fresh.forEach(c=>seen.current.add(c.id));
  if(changed&&room.phase==='battle'){setVisible(new Set(room.hand.map(c=>c.id)));return;}
  fresh.forEach((card,i)=>{
   timers.current.push(setTimeout(()=>{
    setVisible(old=>new Set([...old,card.id]));setArriving(old=>new Set([...old,card.id]));
    timers.current.push(setTimeout(()=>setArriving(old=>{const n=new Set(old);n.delete(card.id);return n;}),560));
   },100+i*220));
  });
 },[room?.matchId,room?.handVersion,room===null]);
 useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
 return {visible,arriving};
}
