import {COIN_IMAGE} from '../shared/art.js';
import {useEffect,useRef,type RefObject} from 'react';
import type {Application} from 'pixi.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';

export function PixiResultGold({origin,target,onArrival}:{origin:RefObject<HTMLDivElement|null>;target:RefObject<HTMLDivElement|null>;onArrival:()=>void}){
 const host=useRef<HTMLDivElement>(null),callback=useRef(onArrival);callback.current=onArrival;
 useEffect(()=>{
  const node=host.current;if(!node)return;
  let disposed=false,done=false,initialized=false,app:Application|undefined,unwatch=()=>{},visibility=()=>{};
  let fallbackTimer:ReturnType<typeof setTimeout>|undefined;
  const finish=()=>{if(disposed||done)return;done=true;callback.current()};
  const fallback=()=>{if(disposed||done)return;node.dataset.renderer='fallback';fallbackTimer=setTimeout(finish,750)};
  // Renderer failure must never block game navigation.
  const watchdog=setTimeout(finish,2400);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)fallbackTimer=setTimeout(finish,80);
  else void(async()=>{
   try{
    const {Application,Assets,Sprite}=await import('pixi.js');if(disposed||done)return;
    const instance=new Application();app=instance;
    await instance.init({width:node.clientWidth||1,height:node.clientHeight||1,backgroundAlpha:0,antialias:true,autoDensity:true,resolution:pixiResolution(),preference:'webgl',powerPreference:'low-power'});initialized=true;
    if(disposed||done){instance.destroy(true,{children:true});app=undefined;return;}
    const texture=await Assets.load(COIN_IMAGE);if(disposed||done){instance.destroy(true,{children:true});app=undefined;return;}
    node.append(instance.canvas);node.dataset.renderer='pixi';instance.ticker.maxFPS=isMobileGraphics()?30:45;
    const coins=Array.from({length:isMobileGraphics()?18:28},(_,i)=>{const coin=new Sprite(texture);coin.anchor.set(.5);coin.scale.set((12+i%3*2)/texture.width);coin.alpha=0;instance.stage.addChild(coin);return coin});
    let elapsed=0;
    instance.ticker.add(t=>{
     elapsed+=Math.min(t.deltaMS,60);
     const bounds=node.getBoundingClientRect(),a=origin.current?.getBoundingClientRect(),b=target.current?.getBoundingClientRect();if(!a||!b){finish();return;}
     const sx=a.x+a.width/2-bounds.x,sy=a.y+a.height/2-bounds.y,tx=b.x+Math.min(b.width*.25,90)-bounds.x,ty=b.y+b.height/2-bounds.y;
     coins.forEach((coin,i)=>{
      const age=Math.max(0,elapsed-i*13),burst=Math.min(1,age/260),travel=Math.max(0,Math.min(1,(age-300)/620)),ease=travel*travel*(3-2*travel),angle=i*2.39996;
      const bx=sx+Math.cos(angle)*(35+i%5*12)*burst,by=sy+Math.sin(angle)*(25+i%4*10)*burst;
      coin.x=bx+(tx-bx)*ease;coin.y=by+(ty-by)*ease-Math.sin(travel*Math.PI)*60;coin.alpha=travel===1?0:Math.min(1,age/60);coin.scale.set((12+i%3*2)/texture.width*(1-travel*.4));
     });
     if(elapsed>=920+(coins.length-1)*13){instance.ticker.stop();finish()}
    });
    unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();fallback()});
    visibility=()=>{if(document.hidden)instance.ticker.stop();else if(!done)instance.ticker.start()};document.addEventListener('visibilitychange',visibility);visibility();
   }catch{fallback()}
  })();
  return()=>{disposed=true;clearTimeout(watchdog);clearTimeout(fallbackTimer);document.removeEventListener('visibilitychange',visibility);unwatch();if(initialized)app?.destroy(true,{children:true})};
 },[origin,target]);
 return <div ref={host} className="result-gold-fx" aria-hidden="true"><span className="gold-fallback"><img src={COIN_IMAGE} alt="" width="28" height="28"/></span></div>;
}
