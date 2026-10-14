import {useEffect,useRef,useState} from 'react';
import type {Application,Particle,Sprite} from 'pixi.js';

const desktopAssets=['/landing/cards.png','/landing/title.png','/landing/mascots.png'];
const mobileAssets=['/landing/cards-mobile.webp','/landing/title-mobile.webp','/landing/mascots-mobile.webp'];
const easeOut=(t:number)=>1-(1-t)**3;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));

export function PixiLanding({onReady}:{onReady:()=>void}){
 const host=useRef<HTMLDivElement>(null),[fallback,setFallback]=useState(false);
 const assets=matchMedia('(max-width:480px) and (orientation:portrait)').matches?mobileAssets:desktopAssets;
 useEffect(()=>{
  const node=host.current;if(!node)return;
  let cancelled=false,app:Application|undefined,observer:ResizeObserver|undefined;
  void (async()=>{
   try{
    const {Application,Assets,Sprite,Particle,ParticleContainer,Texture}=await import('pixi.js');
    if(cancelled)return;
    const instance=new Application();app=instance;
    await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:false,autoDensity:true,resolution:Math.min(devicePixelRatio||1,1.5),preference:'webgl',powerPreference:'low-power'});
    if(cancelled){instance.destroy(true,{children:true});return;}
    const textures=await Promise.all(assets.map(path=>Assets.load(path)));
    if(cancelled){instance.destroy(true,{children:true});return;}
    const [cards,title,mascots]=textures.map(texture=>new Sprite(texture));
    cards.anchor.set(0);title.anchor.set(.5);mascots.anchor.set(.5);
    instance.stage.addChild(cards,title,mascots);
    const sparks=new ParticleContainer({dynamicProperties:{position:true,vertex:true,rotation:true,color:true}});
    const particles:Particle[]=[];
    for(let i=0;i<24;i++){
     const particle=new Particle({texture:Texture.WHITE,x:0,y:0,scaleX:3,scaleY:3,rotation:Math.PI/4,tint:i%3===0?0xffef9e:0xffd34b,alpha:0});
     particles.push(particle);sparks.addParticle(particle);
    }
    instance.stage.addChild(sparks);
    const layout=()=>{
     const size=Math.max(1,node.clientWidth);instance.renderer.resize(size,size);
     cards.width=size;cards.height=size;cards.position.set(0,0);
     title.width=size*.62;title.height=title.width*textures[1].height/textures[1].width;title.position.set(size*.5,size*(.18+.31*textures[1].height/textures[1].width));
     const portrait=matchMedia('(max-width:480px) and (orientation:portrait)').matches;
     mascots.width=size*(portrait ? .516 : .43);mascots.height=mascots.width;mascots.position.set(size*.5,size*(portrait ? .663 : .565));
    };
    layout();observer=new ResizeObserver(()=>{layout();instance.ticker.start();requestAnimationFrame(()=>{if(!cancelled&&performance.now()-started>3800)instance.ticker.stop();});});observer.observe(node);
    node.append(instance.canvas);node.dataset.pixi='ready';onReady();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,started=performance.now();
    instance.ticker.maxFPS=30;
    instance.ticker.add(()=>{
     const time=reduced?4000:performance.now()-started,size=instance.screen.width;
     cards.alpha=clamp((time-300)/850);
     const titleT=clamp((time-1120)/850),titleEase=easeOut(titleT);
     title.alpha=titleT;title.y=size*(.18+.31*textures[1].height/textures[1].width)+size*.13*(1-titleEase)-Math.sin(titleT*Math.PI)*size*.018;title.scale.set((size*.62/textures[1].width)*(.72+.28*titleEase));
     const mascotT=clamp((time-1850)/800),bounce=1+Math.sin(mascotT*Math.PI)*.11;
     const portrait=matchMedia('(max-width:480px) and (orientation:portrait)').matches;
     mascots.alpha=mascotT;mascots.scale.set((size*(portrait ? .516 : .43)/textures[2].width)*(.42+.58*easeOut(mascotT))*bounce);
     for(let i=0;i<particles.length;i++){
      const p=particles[i],age=clamp((time-550-i*68)/900),angle=i*2.39996;
      p.x=size*(.5+Math.cos(angle)*(.16+.24*age));p.y=size*(.48+Math.sin(angle)*(.12+.23*age));
      p.alpha=age>0&&age<1?Math.sin(age*Math.PI)*.9:0;p.scaleX=p.scaleY=Math.max(1,size*.008*(1-age*.7));p.rotation=angle+age*2;
     }
     if(time>3900)instance.ticker.stop();
    });
   }catch{if(!cancelled){setFallback(true);onReady();}}
  })();
  return()=>{cancelled=true;observer?.disconnect();app?.destroy(true,{children:true});};
 },[onReady]);
 return <div className={`landing-art ${fallback?'landing-art-fallback':''}`} ref={host} aria-hidden="true">
  {fallback&&<><img className="landing-cards" src={assets[0]} alt=""/><img className="landing-title" src={assets[1]} alt=""/><img className="landing-mascots" src={assets[2]} alt=""/></>}
 </div>;
}
