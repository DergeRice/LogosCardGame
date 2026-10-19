import {boxArt} from './hubArt.js';
import {useEffect,useRef} from 'react';
import type {Application} from 'pixi.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';
export function PixiLootBox({box,onOpened}:{box:string;onOpened:()=>void}){
 const host=useRef<HTMLDivElement>(null),callback=useRef(onOpened);callback.current=onOpened;
 useEffect(()=>{
  const node=host.current;if(!node)return;let disposed=false,finished=false,app:Application|undefined,initialized=false,unwatch=()=>{},visibility=()=>{},fallbackTimer:ReturnType<typeof setTimeout>|undefined;
  const finish=()=>{if(!disposed&&!finished){finished=true;callback.current()}};
  const watchdog=setTimeout(finish,2800);
  const fallback=()=>{if(disposed||finished)return;node.dataset.renderer='fallback';fallbackTimer=setTimeout(finish,1100)};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)fallbackTimer=setTimeout(finish,80);
  else void(async()=>{
   try{
    const {Application,Assets,Sprite,Graphics}=await import('pixi.js');if(disposed||finished)return;
    const instance=new Application();app=instance;await instance.init({width:360,height:230,backgroundAlpha:0,antialias:true,autoDensity:true,resolution:pixiResolution(),preference:'webgl',powerPreference:'low-power'});initialized=true;
    if(disposed||finished){instance.destroy(true,{children:true});app=undefined;return;}
    instance.ticker.stop();const texture=await Assets.load(boxArt(box));if(disposed||finished){instance.destroy(true,{children:true});app=undefined;return;}
    const sprite=new Sprite(texture);sprite.anchor.set(.5);sprite.position.set(180,118);sprite.width=200;sprite.height=200;const scale=sprite.scale.clone();instance.stage.addChild(sprite);
    const particles=Array.from({length:isMobileGraphics()?18:28},(_,i)=>{const p=new Graphics().roundRect(-3,-3,6+i%3,6+i%3,2).fill(i%3===0?0xffffff:0xf4cb65);p.alpha=0;instance.stage.addChild(p);return p});
    let elapsed=0;node.dataset.renderer='pixi';node.dataset.phase='shaking';node.append(instance.canvas);instance.ticker.maxFPS=isMobileGraphics()?24:30;
    instance.ticker.add(t=>{
     elapsed+=Math.min(70,t.deltaMS);const opening=elapsed<650;
     if(opening){const shake=Math.sin(elapsed/26)*(2+elapsed/100);sprite.x=180+shake;sprite.rotation=Math.sin(elapsed/34)*.07;sprite.scale.set(scale.x*(1+elapsed/6500),scale.y*(1+elapsed/6500));}
     else{node.dataset.phase='burst';const age=Math.min(1,(elapsed-650)/450);sprite.alpha=Math.max(0,1-age*2);sprite.rotation=0;sprite.scale.set(scale.x*(1.1+age*.4),scale.y*(1.1+age*.4));particles.forEach((p,i)=>{const angle=i*2.39996,distance=20+age*(60+i%5*14);p.position.set(180+Math.cos(angle)*distance,110+Math.sin(angle)*distance);p.rotation=age*3+i;p.alpha=(1-age)*.95;p.scale.set(1+age)});if(age===1){instance.ticker.stop();finish()}}
    });
    unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();fallback()});visibility=()=>{if(document.hidden)instance.ticker.stop();else if(!finished&&node.dataset.renderer==='pixi')instance.ticker.start()};document.addEventListener('visibilitychange',visibility);visibility();
   }catch{fallback()}
  })();
  return()=>{disposed=true;clearTimeout(watchdog);clearTimeout(fallbackTimer);document.removeEventListener('visibilitychange',visibility);unwatch();if(initialized)app?.destroy(true,{children:true})};
 },[box]);
 return <div className="pixi-loot-opening" ref={host} aria-label="상자가 흔들린 뒤 열립니다"><img className="loot-opening-fallback" src={boxArt(box)} alt="" draggable={false}/></div>;
}
