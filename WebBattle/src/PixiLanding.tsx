import {useEffect,useRef,useState} from 'react';
import type {Application,Particle,Sprite} from 'pixi.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';

const desktopAssets=['/landing/cards.png','/landing/title.png','/landing/mascots.png'];
const mobileAssets=['/landing/cards-mobile.webp','/landing/title-mobile.webp','/landing/mascots-mobile.webp'];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const spring=(t:number)=>1-Math.exp(-5*t)*Math.cos(2.5*Math.PI*t);

export function PixiLanding({onReady,showTitle=true}:{onReady:()=>void;showTitle?:boolean}){
 const host=useRef<HTMLDivElement>(null),[fallback,setFallback]=useState(false);
 const assets=isMobileGraphics()?mobileAssets:desktopAssets;
 useEffect(()=>{
  const node=host.current;if(!node)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){setFallback(true);onReady();return;}
  let cancelled=false,app:Application|undefined,observer:ResizeObserver|undefined,unwatch=()=>{},resizeFrame=0,visibility=()=>{};
  void (async()=>{
   try{
    const {Application,Assets,Sprite,Particle,ParticleContainer,Texture}=await import('pixi.js');
    if(cancelled)return;
    const instance=new Application();app=instance;
    await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:false,autoDensity:true,resolution:pixiResolution(true),preference:'webgl',powerPreference:'low-power'});
    if(cancelled){instance.destroy(true,{children:true});return;}
    instance.ticker.stop();
    const textures=await Promise.all(assets.map(path=>Assets.load(path)));
    if(cancelled){instance.destroy(true,{children:true});return;}
    const [cards,title,mascots]=textures.map(texture=>new Sprite(texture));
    cards.anchor.set(0);title.anchor.set(.5);mascots.anchor.set(.5);
    instance.stage.addChild(cards,...(showTitle?[title]:[]),mascots);
    const sparks=new ParticleContainer({dynamicProperties:{position:true,vertex:true,rotation:true,color:true}});
    const particles:Particle[]=[];
    for(let i=0;i<(isMobileGraphics()?16:24);i++){
     const particle=new Particle({texture:Texture.WHITE,x:0,y:0,scaleX:3,scaleY:3,rotation:Math.PI/4,tint:i%3===0?0xffef9e:0xffd34b,alpha:0});
     particles.push(particle);sparks.addParticle(particle);
    }
    instance.stage.addChild(sparks);
    let lastSize=0,portrait=matchMedia('(max-width:480px) and (orientation:portrait)').matches,titleWidth=0,titleY=0,mascotWidth=0;
    const layout=()=>{
     const size=Math.max(1,Math.round(node.clientWidth));if(Math.abs(size-lastSize)<2)return;lastSize=size;instance.renderer.resize(size,size);
     portrait=matchMedia('(max-width:480px) and (orientation:portrait)').matches;
     const cardSize=size*(portrait?1.1:1);cards.width=cardSize;cards.height=cardSize;cards.position.set((size-cardSize)/2,(size-cardSize)/2);
     titleWidth=size*.62*(portrait?1.2:1);titleY=size*(portrait?.16:.18)+titleWidth*.5*textures[1].height/textures[1].width;title.width=titleWidth;title.height=titleWidth*textures[1].height/textures[1].width;title.position.set(size*.5,titleY);
     mascotWidth=size*(portrait?.516*1.1:.43);mascots.width=mascotWidth;mascots.height=mascotWidth;mascots.position.set(size*.5,size*(portrait?.64:.565));
    };
    layout();observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(!cancelled)layout();});});observer.observe(node);
    unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();node.dataset.pixi='lost';setFallback(true);});
    node.append(instance.canvas);node.dataset.pixi='ready';onReady();
    let elapsed=0;
    instance.ticker.maxFPS=30;
    instance.ticker.add(ticker=>{
     elapsed+=Math.min(ticker.deltaMS,100);
     const time=elapsed,size=instance.screen.width;
     cards.alpha=clamp((time-150)/425);
     const titleT=clamp((time-560)/425),titlePop=spring(titleT);
     if(showTitle){title.alpha=clamp(titleT*2);title.y=titleY+size*.22*(1-titlePop);title.scale.set((titleWidth/textures[1].width)*(.45+.55*titlePop));}
     const mascotT=clamp((time-925)/400),mascotPop=spring(mascotT);
     mascots.alpha=clamp(mascotT*2);mascots.scale.set((mascotWidth/textures[2].width)*(.25+.75*mascotPop));
     for(let i=0;i<particles.length;i++){
      const p=particles[i],age=clamp((time-275-i*34)/450),angle=i*2.39996;
      p.x=size*(.5+Math.cos(angle)*(.16+.24*age));p.y=size*(.48+Math.sin(angle)*(.12+.23*age));
      p.alpha=age>0&&age<1?Math.sin(age*Math.PI):0;p.scaleX=p.scaleY=Math.max(1,size*.012*(1-age*.7));p.rotation=angle+age*2;
     }
     if(time>1950)instance.ticker.stop();
    });
    visibility=()=>{if(document.hidden)instance.ticker.stop();else if(elapsed<1950&&node.dataset.pixi==='ready')instance.ticker.start();};
    document.addEventListener('visibilitychange',visibility);
    if(document.hidden)visibility();else instance.ticker.start();
   }catch{if(!cancelled){setFallback(true);onReady();}}
  })();
  return()=>{cancelled=true;cancelAnimationFrame(resizeFrame);document.removeEventListener('visibilitychange',visibility);unwatch();observer?.disconnect();app?.destroy(true,{children:true});};
 },[onReady]);
 return <div className={`landing-art ${fallback?'landing-art-fallback':''}`} ref={host} aria-hidden="true">
  {fallback&&<><img className="landing-cards" src={assets[0]} alt=""/>{showTitle&&<img className="landing-title" src={assets[1]} alt=""/>}<img className="landing-mascots" src={assets[2]} alt=""/></>}
 </div>;
}
