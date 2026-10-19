import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
type Preview={id:string;index:number|null;toHand:boolean;toTrash:boolean};
type Gesture={id:string;pointer:number;x:number;y:number;lastX:number;lastY:number;active:boolean;touch:boolean;swipe:boolean;scrollStart:number;scroller:HTMLElement|null;fromField:boolean;holdReady:boolean;holdTimer:ReturnType<typeof setTimeout>|undefined;index:number|null;toHand:boolean;toTrash:boolean;trashOnly:boolean;target:HTMLElement;capture:HTMLElement|null;oldTouchAction:string};
export function useCardDrag(enabled:boolean,selected:string[],move:(id:string,index:number)=>void,returnCard:(id:string)=>void,discard:(id:string)=>void){
 const board=useRef<HTMLElement>(null),handZone=useRef<HTMLDivElement>(null),trashZone=useRef<HTMLDivElement>(null);
 const [preview,setPreview]=useState<Preview|null>(null),[holdingId,setHoldingId]=useState<string|null>(null);
 const live=useRef({enabled,selected,move,returnCard,discard});live.current={enabled,selected,move,returnCard,discard};
 const gesture=useRef<Gesture|null>(null),suppressClick=useRef(false),frame=useRef(0);
 const cancel=()=>{cancelAnimationFrame(frame.current);frame.current=0;const g=gesture.current;gesture.current=null;if(g){clearTimeout(g.holdTimer);g.target.style.touchAction=g.oldTouchAction;try{if(g.capture?.hasPointerCapture(g.pointer))g.capture.releasePointerCapture(g.pointer)}catch{}}setPreview(null);setHoldingId(null)};
 useEffect(()=>{
  const capture=(g:Gesture)=>{const host=g.scroller??g.target;try{host.setPointerCapture(g.pointer);g.capture=host}catch{}};
  const update=(g:Gesture)=>{
   const x=g.lastX,y=g.lastY,area=board.current,r=area?.getBoundingClientRect(),h=handZone.current?.getBoundingClientRect(),t=trashZone.current?.getBoundingClientRect();
   const inside=(b:DOMRect|undefined)=>Boolean(b&&x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom);
   g.toTrash=inside(t);g.toHand=!g.toTrash&&!g.trashOnly&&inside(h);g.index=null;
   if(!g.toTrash&&!g.trashOnly&&!g.toHand&&area&&r&&(g.fromField||inside(r))){
    // Re-read positions as the lane scrolls; cached pre-scroll slots select the wrong card.
    const slots=[...area.querySelectorAll<HTMLElement>('[data-field-id]')].filter(el=>el.dataset.fieldId!==g.id).map(el=>el.getBoundingClientRect());
    g.index=slots.findIndex(b=>x<b.left+b.width/2);if(g.index<0)g.index=slots.length;
   }
   setPreview(old=>old&&old.id===g.id&&old.index===g.index&&old.toHand===g.toHand&&old.toTrash===g.toTrash?old:{id:g.id,index:g.index,toHand:g.toHand,toTrash:g.toTrash});
  };
  let previousTime=0;
  const scroll=(time:number)=>{
   const g=gesture.current;if(!g?.active||!live.current.enabled){frame.current=0;return;}
   const area=board.current,v=window.visualViewport,left=v?.offsetLeft??0,width=v?.width??innerWidth,edge=width*.2;
   const direction=g.lastX<left+edge?-Math.min(1,(left+edge-g.lastX)/edge):g.lastX>left+width-edge?Math.min(1,(g.lastX-(left+width-edge))/edge):0;
   const dt=previousTime?Math.min(40,time-previousTime):16;previousTime=time;
   if(area&&!g.trashOnly&&!g.toHand&&!g.toTrash&&direction){area.scrollLeft+=direction*650*dt/1000;update(g);}
   frame.current=requestAnimationFrame(scroll);
  };
  const pointerMove=(e:PointerEvent)=>{
   const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;if(!live.current.enabled){cancel();return;}
   g.lastX=e.clientX;g.lastY=e.clientY;
   if(g.touch&&(g.swipe||!g.holdReady)){if(g.swipe||Math.hypot(e.clientX-g.x,e.clientY-g.y)>8){clearTimeout(g.holdTimer);g.swipe=true;suppressClick.current=true;if(g.scroller)g.scroller.scrollLeft=g.scrollStart-(e.clientX-g.x);e.preventDefault();}return;}
   if(!g.active&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<(g.touch?7:8))return;
   if(!g.active){g.active=true;capture(g);previousTime=0;frame.current=requestAnimationFrame(scroll);}
   setHoldingId(null);suppressClick.current=true;e.preventDefault();update(g);
  };
  const end=(e:PointerEvent)=>{const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;if(g.active&&live.current.enabled){g.lastX=e.clientX;g.lastY=e.clientY;update(g);if(g.toTrash)live.current.discard(g.id);else if(g.index!==null)live.current.move(g.id,g.index);else if(g.toHand&&live.current.selected.includes(g.id))live.current.returnCard(g.id);}cancel()};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')cancel()};
  const pointerCancel=(e:PointerEvent)=>{if(gesture.current?.pointer===e.pointerId)cancel()};
  window.addEventListener('pointermove',pointerMove,{passive:false});window.addEventListener('pointerup',end);window.addEventListener('pointercancel',pointerCancel);window.addEventListener('keydown',escape);window.addEventListener('blur',cancel);
  return()=>{cancel();window.removeEventListener('pointermove',pointerMove);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',pointerCancel);window.removeEventListener('keydown',escape);window.removeEventListener('blur',cancel)};
 },[]);
 useEffect(()=>{if(!enabled)cancel()},[enabled]);
 function start(e:ReactPointerEvent<HTMLElement>,id:string,trashOnly=false){
  if(!enabled||e.button!==0||!e.isPrimary)return;cancel();suppressClick.current=false;
  const touch=e.pointerType==='touch',scroller=e.currentTarget.closest<HTMLElement>('.pointer-field,.hand-spread');
  const next:Gesture={id,pointer:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,active:false,touch,swipe:false,scroller,fromField:Boolean(e.currentTarget.closest('.pointer-field')),scrollStart:scroller?.scrollLeft??0,holdReady:!touch,holdTimer:undefined,index:null,toHand:false,toTrash:false,trashOnly,target:e.currentTarget,capture:null,oldTouchAction:e.currentTarget.style.touchAction};gesture.current=next;
  if(touch)next.holdTimer=setTimeout(()=>{if(gesture.current===next){next.holdReady=true;next.target.style.touchAction='none';suppressClick.current=true;try{const host=next.scroller??next.target;host.setPointerCapture(next.pointer);next.capture=host}catch{}setHoldingId(id)}},140);
 }
 function click(action:()=>void){if(suppressClick.current){suppressClick.current=false;return;}if(live.current.enabled)action()}
 return{board,handZone,trashZone,preview,holdingId,start,click};
}
