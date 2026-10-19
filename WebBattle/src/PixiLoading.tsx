import {useEffect,useRef} from 'react';
import type {Application} from 'pixi.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';
import './loading-cards.css';

export function PixiLoading({progress}:{progress:number}){
 const host=useRef<HTMLDivElement>(null),latest=useRef(progress),update=useRef<((value:number)=>void)|null>(null);
 useEffect(()=>{latest.current=progress;update.current?.(progress)},[progress]);
 useEffect(()=>{
  const node=host.current;if(!node)return;
  let disposed=false,initialized=false,app:Application|undefined,unwatch=()=>{},visibility=()=>{};
  void(async()=>{
   try{
    const {Application,Graphics}=await import('pixi.js');if(disposed)return;
    const instance=new Application();app=instance;
    await instance.init({width:180,height:240,backgroundAlpha:0,antialias:true,autoDensity:true,resolution:pixiResolution(true),preference:'webgl',powerPreference:'low-power'});initialized=true;
    if(disposed){instance.destroy(true,{children:true});return;}
    instance.ticker.stop();instance.ticker.maxFPS=isMobileGraphics()?24:30;
    const backs=new Graphics().roundRect(38,25,124,196,15).fill(0xb7d1e6).roundRect(28,18,124,196,15).fill(0xd8e5ee);
    const base=new Graphics().roundRect(18,10,124,196,15).fill(0xe8eaf0).roundRect(18,10,124,196,15).stroke({width:3,color:0x33475c});
    const front=new Graphics().roundRect(18,10,124,196,15).fill(0x76b7f3).roundRect(25,17,110,182,10).stroke({width:2,color:0xc9e5ff}).poly([80,75,91,96,112,108,91,120,80,141,69,120,48,108,69,96]).fill(0xffffff);
    const mask=new Graphics();front.mask=mask;instance.stage.addChild(backs,base,front,mask);
    let displayed=latest.current,target=latest.current;
    const draw=()=>{mask.clear().rect(12,208-202*displayed/100,140,202*displayed/100).fill(0xffffff);instance.renderer.render(instance.stage)};
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    update.current=value=>{target=value;if(reduced){displayed=value;draw()}else if(!document.hidden)instance.ticker.start()};
    instance.ticker.add(t=>{displayed=Math.min(target,displayed+Math.max(.3,(target-displayed)*Math.min(1,t.deltaMS/85)));draw();if(target-displayed<.1){displayed=target;draw();instance.ticker.stop()}});
    node.append(instance.canvas);node.dataset.renderer='pixi';draw();
    unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();update.current=null;node.dataset.renderer='fallback'});
    visibility=()=>{if(document.hidden)instance.ticker.stop();else if(displayed<target&&node.dataset.renderer==='pixi')instance.ticker.start()};document.addEventListener('visibilitychange',visibility);visibility();
   }catch{if(!disposed)node.dataset.renderer='fallback'}
  })();
  return()=>{disposed=true;update.current=null;document.removeEventListener('visibilitychange',visibility);unwatch();if(initialized)app?.destroy(true,{children:true})};
 },[]);
 return <div className="card-loading-art" ref={host} aria-hidden="true"><div className="loading-card-placeholder"><i/><b style={{clipPath:`inset(${100-progress}% 0 0 0)`}}>✦</b></div></div>;
}
