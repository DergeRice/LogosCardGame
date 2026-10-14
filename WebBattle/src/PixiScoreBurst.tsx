import {useEffect,useRef} from 'react';
import type {Application,Particle} from 'pixi.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';

export function PixiScoreBurst({beat}:{beat:string}){
 const host=useRef<HTMLSpanElement>(null),currentBeat=useRef(beat),burst=useRef<((beat:string)=>void)|null>(null);
 useEffect(()=>{currentBeat.current=beat;burst.current?.(beat);},[beat]);
 useEffect(()=>{
  const node=host.current;if(!node)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let disposed=false,app:Application|undefined,observer:ResizeObserver|undefined,unwatch=()=>{},visibility=()=>{},resizeFrame=0;
  void (async()=>{
   try{
    const {Application,Particle,ParticleContainer,Texture}=await import('pixi.js');
    if(disposed)return;
    const instance=new Application();app=instance;
    await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:false,autoDensity:true,resolution:pixiResolution(),preference:'webgl',powerPreference:'low-power'});
    if(disposed){instance.destroy(true,{children:true});return;}
    instance.ticker.stop();
    const group=new ParticleContainer({dynamicProperties:{position:true,vertex:true,rotation:true,color:true}}),particles:Particle[]=[];
    for(let i=0;i<(isMobileGraphics()?12:18);i++){const p=new Particle({texture:Texture.WHITE,x:0,y:0,scaleX:2,scaleY:2,rotation:Math.PI/4,tint:i%3===0?0xffdd56:0xffffff,alpha:0});particles.push(p);group.addParticle(p);}
    instance.stage.addChild(group);
    let started=performance.now();
    burst.current=()=>{started=performance.now();if(!document.hidden&&node.dataset.pixi==='ready')instance.ticker.start();};
    let lastWidth=0,lastHeight=0;
    observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(disposed)return;const width=Math.max(1,Math.round(node.clientWidth)),height=Math.max(1,Math.round(node.clientHeight));if(Math.abs(width-lastWidth)<2&&Math.abs(height-lastHeight)<2)return;lastWidth=width;lastHeight=height;instance.renderer.resize(width,height);});});observer.observe(node);
    unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();node.dataset.pixi='lost';});
    node.append(instance.canvas);node.dataset.pixi='ready';
    instance.ticker.maxFPS=isMobileGraphics()?24:30;
    instance.ticker.add(()=>{
     const age=Math.min(1,(performance.now()-started)/650),width=instance.screen.width,height=instance.screen.height;
     for(let i=0;i<particles.length;i++){
      const p=particles[i],angle=i*Math.PI*2/particles.length,distance=(18+i%4*9)*age;
      p.x=width/2+Math.cos(angle)*distance;p.y=height/2+Math.sin(angle)*distance;
      p.alpha=(1-age)*.95;p.scaleX=p.scaleY=Math.max(.5,(2+i%3)*(.7+age));p.rotation=angle+age*2;
     }
     if(age===1)instance.ticker.stop();
    });
    visibility=()=>{if(document.hidden)instance.ticker.stop();else if(performance.now()-started<650&&node.dataset.pixi==='ready')instance.ticker.start();};
    document.addEventListener('visibilitychange',visibility);
    burst.current?.(currentBeat.current);
   }catch{/* CSS sparks remain as a renderer fallback. */}
  })();
  return()=>{disposed=true;burst.current=null;cancelAnimationFrame(resizeFrame);document.removeEventListener('visibilitychange',visibility);unwatch();observer?.disconnect();app?.destroy(true,{children:true});};
 },[]);
 return <span className="pixi-score-burst" ref={host} aria-hidden="true"/>;
}
