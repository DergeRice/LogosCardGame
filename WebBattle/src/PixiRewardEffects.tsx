import {useEffect,useRef,type RefObject} from 'react';import type {Application} from 'pixi.js';
import {LOOT_TIERS,revealPlan} from '../shared/lootReveal.js';import type {LootReward} from '../shared/store.js';import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';
export function PixiRewardEffects({grid,rewards,starts,revealed}:{grid:RefObject<HTMLDivElement|null>;rewards:LootReward[];starts:Record<number,number>;revealed:Set<number>}){
 const drawRef=useRef<(()=>void)|null>(null),host=useRef<HTMLDivElement>(null),state=useRef({starts,revealed});state.current={starts,revealed};
 useEffect(()=>{drawRef.current?.()},[starts,revealed]);
 useEffect(()=>{
  const node=host.current,table=grid.current;if(!node||!table)return;let disposed=false,ready=false,initialized=false,app:Application|undefined,unwatch=()=>{},visibility=()=>{},observer:ResizeObserver|undefined;const plan=revealPlan(rewards),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fallback=()=>{if(disposed)return;node.dataset.renderer='fallback';node.parentElement!.dataset.effects='fallback';app?.ticker.stop();};
  const watchdog=setTimeout(()=>{if(!ready)fallback()},3500);
  void(async()=>{try{
   const {Application,Container,Graphics}=await import('pixi.js');if(disposed)return;const instance=new Application();app=instance;await instance.init({width:node.clientWidth||1,height:node.clientHeight||1,backgroundAlpha:0,antialias:true,autoDensity:true,resolution:pixiResolution(true),preference:'webgl',powerPreference:'low-power'});initialized=true;if(disposed){instance.destroy(true,{children:true});app=undefined;return;}
   const cards=rewards.map((_,i)=>{const group=new Container(),halo=new Graphics();group.addChild(halo);instance.stage.addChild(group);return {group,halo,button:table.querySelectorAll<HTMLButtonElement>('.reward-flip')[i]};});
   const layout=()=>{instance.renderer.resize(Math.max(1,node.clientWidth),Math.max(1,node.clientHeight));};observer=new ResizeObserver(layout);observer.observe(node);node.append(instance.canvas);node.dataset.renderer='pixi';node.parentElement!.dataset.effects='pixi';ready=true;clearTimeout(watchdog);instance.ticker.maxFPS=isMobileGraphics()?24:30;
   const draw=()=>{const bounds=node.getBoundingClientRect();cards.forEach(({group,halo,button},i)=>{
    const p=plan[i],shown=state.current.revealed.has(i),at=state.current.starts[i],age=at===undefined?-1:Math.max(0,performance.now()-at),active=age>=0&&age<p.reveal,stage=age<0?p.tier:Math.min(p.tier,Math.floor(age/260));group.visible=!shown;if(!button)return;
    button.dataset.revealStage=String(stage);button.style.setProperty('--loot-color',`#${LOOT_TIERS[stage].color.toString(16).padStart(6,'0')}`);
    button.style.translate=!shown&&!reduced&&active?`${Math.sin(age/23)*(1+stage*.6)}px 0`:'';button.style.rotate=!shown&&!reduced&&active?`${Math.sin(age/31)*(.8+stage*.5)}deg`:'';
    halo.clear();if(shown)return;const r=button.getBoundingClientRect();group.position.set(r.x-bounds.x+r.width/2,r.y-bounds.y+r.height/2);
    if(p.tier>=2)for(let ring=3;ring>=1;ring--)halo.roundRect(-r.width/2-ring*2,-r.height/2-ring*2,r.width+ring*4,r.height+ring*4,12).stroke({color:LOOT_TIERS[stage].color,width:3+ring*2,alpha:.10+(active?.03:0)});
   });};
   drawRef.current=()=>{if(node.dataset.renderer==='pixi')draw()};instance.ticker.add(draw);unwatch=watchContextLoss(instance.canvas,fallback);visibility=()=>{if(document.hidden||reduced||node.dataset.renderer!=='pixi')instance.ticker.stop();else instance.ticker.start();};document.addEventListener('visibilitychange',visibility);visibility();draw();
  }catch{fallback()}})();
  return()=>{disposed=true;clearTimeout(watchdog);observer?.disconnect();document.removeEventListener('visibilitychange',visibility);unwatch();drawRef.current=null;if(initialized)app?.destroy(true,{children:true});};
 },[grid,rewards]);
 return <div className="pixi-reward-effects" ref={host} aria-hidden="true"/>;
}
