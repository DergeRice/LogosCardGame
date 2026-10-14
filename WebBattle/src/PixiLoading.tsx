import {useEffect,useRef,useState} from 'react';
import type {Application} from 'pixi.js';
import {pixiResolution,watchContextLoss} from './pixiRuntime.js';

export function PixiLoading(){
 const host=useRef<HTMLDivElement>(null),[fallback,setFallback]=useState(false);
 useEffect(()=>{
  const node=host.current;if(!node)return;
  let disposed=false,initialized=false,app:Application|undefined,unwatch=()=>{},visible=()=>{};
  void (async()=>{
   try{
    const {Application,Assets,Sprite}=await import('pixi.js');
    const instance=new Application();app=instance;
    await instance.init({width:240,height:240,backgroundAlpha:0,antialias:true,autoDensity:true,resolution:pixiResolution(true),preference:'webgl',powerPreference:'low-power'});initialized=true;
    if(disposed){instance.destroy(true,{children:true});return;}
    instance.ticker.stop();const texture=await Assets.load('/brand-ui/loading.png');
    if(disposed){instance.destroy(true,{children:true});return;}
    const sprite=new Sprite(texture);sprite.anchor.set(.5);sprite.position.set(120,120);sprite.width=200;sprite.height=200;instance.stage.addChild(sprite);
    let time=0;instance.ticker.maxFPS=30;instance.ticker.add(ticker=>{time+=Math.min(ticker.deltaMS,100);const cycle=time%3000,spin=cycle<2050?0:Math.min(1,(cycle-2050)/520);sprite.y=120+Math.sin(time/390)*9;sprite.rotation=spin*2*Math.PI;sprite.scale.set((200/texture.width)*(1+Math.sin(time/280)*.025));});
    node.append(instance.canvas);unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();setFallback(true);});
    visible=()=>{if(document.hidden)instance.ticker.stop();else instance.ticker.start();};document.addEventListener('visibilitychange',visible);visible();
   }catch{if(!disposed)setFallback(true);}
  })();
  return()=>{disposed=true;document.removeEventListener('visibilitychange',visible);unwatch();if(initialized)app?.destroy(true,{children:true});};
 },[]);
 return <div className={`preload-mascot ${fallback?'preload-mascot-fallback':''}`} ref={host} aria-hidden="true">{fallback&&<img src="/brand-ui/loading.png" alt=""/>}</div>;
}
