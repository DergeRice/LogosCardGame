import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
type Preview={id:string;index:number|null;toHand:boolean};
export function useCardDrag(enabled:boolean,selected:string[],move:(id:string,index:number)=>void,returnCard:(id:string)=>void){
 const board=useRef<HTMLElement>(null), handZone=useRef<HTMLDivElement>(null);
 const [preview,setPreview]=useState<Preview|null>(null);
 const live=useRef({enabled,selected,move,returnCard});live.current={enabled,selected,move,returnCard};
 const gesture=useRef<{id:string;pointer:number;x:number;y:number;active:boolean;index:number|null;toHand:boolean}|null>(null);
 const suppressClick=useRef(false);
 const cancel=()=>{gesture.current=null;setPreview(null);};
 useEffect(()=>{
  const pointerMove=(e:PointerEvent)=>{
   const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;
   if(!live.current.enabled){cancel();return;}
   if(!g.active && Math.hypot(e.clientX-g.x,e.clientY-g.y)<8)return;
   g.active=true;suppressClick.current=true;e.preventDefault();
   const area=board.current,r=area?.getBoundingClientRect(),h=handZone.current?.getBoundingClientRect();
   g.toHand=Boolean(h&&e.clientX>=h.left&&e.clientX<=h.right&&e.clientY>=h.top&&e.clientY<=h.bottom);
   g.index=null;
   if(!g.toHand&&area&&r&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){
    const elements=[...area.querySelectorAll<HTMLElement>('[data-field-id]')].filter(el=>el.dataset.fieldId!==g.id);
    g.index=elements.length;
    for(let i=0;i<elements.length;i++){const b=elements[i].getBoundingClientRect();if(e.clientY<b.bottom&&(e.clientY<b.top||e.clientX<b.left+b.width/2)){g.index=i;break;}}
   }
   setPreview({id:g.id,index:g.index,toHand:g.toHand});
   // Permit touch dragging between the below-fold hand and field.
   if(e.clientY<70)window.scrollBy(0,-18);else if(e.clientY>innerHeight-70)window.scrollBy(0,18);
  };
  const end=(e:PointerEvent)=>{const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;if(g.active&&live.current.enabled){if(g.index!==null)live.current.move(g.id,g.index);else if(g.toHand&&live.current.selected.includes(g.id))live.current.returnCard(g.id);}cancel();};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')cancel();};
  window.addEventListener('pointermove',pointerMove,{passive:false});window.addEventListener('pointerup',end);window.addEventListener('pointercancel',cancel);window.addEventListener('keydown',escape);window.addEventListener('blur',cancel);
  return()=>{window.removeEventListener('pointermove',pointerMove);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',escape);window.removeEventListener('blur',cancel);};
 },[]);
 useEffect(()=>{if(!enabled)cancel();},[enabled]);
 function start(e:ReactPointerEvent<HTMLElement>,id:string){if(!enabled||e.button!==0||!e.isPrimary)return;suppressClick.current=false;gesture.current={id,pointer:e.pointerId,x:e.clientX,y:e.clientY,active:false,index:null,toHand:false};e.currentTarget.setPointerCapture(e.pointerId);}
 function click(action:()=>void){if(suppressClick.current){suppressClick.current=false;return;}if(live.current.enabled)action();}
 return{board,handZone,preview,start,click};
}
