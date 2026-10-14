import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
type Preview={id:string;index:number|null;toHand:boolean;toTrash:boolean};
export function useCardDrag(enabled:boolean,selected:string[],move:(id:string,index:number)=>void,returnCard:(id:string)=>void,discard:(id:string)=>void){
 const board=useRef<HTMLElement>(null), handZone=useRef<HTMLDivElement>(null),trashZone=useRef<HTMLDivElement>(null);
 const [preview,setPreview]=useState<Preview|null>(null);
 const [holdingId,setHoldingId]=useState<string|null>(null);
 const live=useRef({enabled,selected,move,returnCard,discard});live.current={enabled,selected,move,returnCard,discard};
 const gesture=useRef<{id:string;pointer:number;x:number;y:number;active:boolean;touch:boolean;holdReady:boolean;holdTimer:ReturnType<typeof setTimeout>|undefined;index:number|null;toHand:boolean;toTrash:boolean;trashOnly:boolean;target:HTMLElement;slots:DOMRect[]}|null>(null);
 const suppressClick=useRef(false);
 const cancel=()=>{if(gesture.current?.holdTimer)clearTimeout(gesture.current.holdTimer);gesture.current=null;setPreview(null);setHoldingId(null);};
 useEffect(()=>{
  const pointerMove=(e:PointerEvent)=>{
   const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;
   if(!live.current.enabled){cancel();return;}
   if(g.touch&&!g.holdReady){if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>8){suppressClick.current=true;cancel();}return;}
   if(!g.active && Math.hypot(e.clientX-g.x,e.clientY-g.y)<(g.touch?7:8))return;
   if(!g.active)g.slots=[...(board.current?.querySelectorAll<HTMLElement>('[data-field-id]')??[])].filter(el=>el.dataset.fieldId!==g.id).map(el=>el.getBoundingClientRect());
   g.active=true;setHoldingId(null);suppressClick.current=true;e.preventDefault();
   const area=board.current,r=area?.getBoundingClientRect(),h=handZone.current?.getBoundingClientRect();
   const trash=trashZone.current?.getBoundingClientRect();g.toTrash=Boolean(trash&&e.clientX>=trash.left&&e.clientX<=trash.right&&e.clientY>=trash.top&&e.clientY<=trash.bottom);
   g.toHand=!g.toTrash&&!g.trashOnly&&Boolean(h&&e.clientX>=h.left&&e.clientX<=h.right&&e.clientY>=h.top&&e.clientY<=h.bottom);
   g.index=null;
   if(!g.toTrash&&!g.trashOnly&&!g.toHand&&area&&r&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){
    g.index=g.slots.length;
    for(let i=0;i<g.slots.length;i++){const b=g.slots[i];if(e.clientY<b.bottom&&(e.clientY<b.top||e.clientX<b.left+b.width/2)){g.index=i;break;}}
   }
   setPreview({id:g.id,index:g.index,toHand:g.toHand,toTrash:g.toTrash});
  };
  const end=(e:PointerEvent)=>{const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;if(g.active&&live.current.enabled){const t=trashZone.current?.getBoundingClientRect();if(t&&e.clientX>=t.left&&e.clientX<=t.right&&e.clientY>=t.top&&e.clientY<=t.bottom)live.current.discard(g.id);else if(g.index!==null)live.current.move(g.id,g.index);else if(g.toHand&&live.current.selected.includes(g.id))live.current.returnCard(g.id);}cancel();};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')cancel();};
  window.addEventListener('pointermove',pointerMove,{passive:false});window.addEventListener('pointerup',end);window.addEventListener('pointercancel',cancel);window.addEventListener('keydown',escape);window.addEventListener('blur',cancel);
  return()=>{window.removeEventListener('pointermove',pointerMove);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',escape);window.removeEventListener('blur',cancel);};
 },[]);
 useEffect(()=>{if(!enabled)cancel();},[enabled]);
 function start(e:ReactPointerEvent<HTMLElement>,id:string,trashOnly=false){if(!enabled||e.button!==0||!e.isPrimary)return;suppressClick.current=false;const touch=e.pointerType==='touch';const next={id,pointer:e.pointerId,x:e.clientX,y:e.clientY,active:false,touch,holdReady:!touch,holdTimer:undefined as ReturnType<typeof setTimeout>|undefined,index:null,toHand:false,toTrash:false,trashOnly,target:e.currentTarget,slots:[]};gesture.current=next;if(touch)next.holdTimer=setTimeout(()=>{if(gesture.current===next){next.holdReady=true;suppressClick.current=true;try{next.target.setPointerCapture(next.pointer);}catch{}setHoldingId(id);}},260);else e.currentTarget.setPointerCapture(e.pointerId);}
 function click(action:()=>void){if(suppressClick.current){suppressClick.current=false;return;}if(live.current.enabled)action();}
 return{board,handZone,trashZone,preview,holdingId,start,click};
}
