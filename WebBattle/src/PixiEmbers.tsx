import {useEffect,useRef} from 'react';
import type {Application,Particle} from 'pixi.js';

export function PixiEmbers({level}:{level:number}){
 const host=useRef<HTMLSpanElement>(null),levelRef=useRef(level);levelRef.current=level;
 useEffect(()=>{
  const node=host.current;if(!node)return;
  let disposed=false,app:Application|undefined,observer:ResizeObserver|undefined,cleanupVisibility=()=>{};
  void (async()=>{
   try{
    const {Application,Particle,ParticleContainer,Texture}=await import('pixi.js');
    if(disposed)return;
    const instance=new Application();app=instance;
    await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:false,autoDensity:true,resolution:Math.min(devicePixelRatio||1,1.5),preference:'webgl',powerPreference:'low-power'});
    if(disposed){instance.destroy(true,{children:true});return;}
    const group=new ParticleContainer({dynamicProperties:{position:true,vertex:true,color:true}}),particles:Particle[]=[];
    for(let i=0;i<12;i++){const p=new Particle({texture:Texture.WHITE,x:0,y:0,scaleX:2,scaleY:2,rotation:Math.PI/4,tint:i%3===0?0xffd05e:0xff7938,alpha:0});particles.push(p);group.addParticle(p);}
    instance.stage.addChild(group);
    const resize=()=>instance.renderer.resize(Math.max(1,node.clientWidth),Math.max(1,node.clientHeight));
    node.append(instance.canvas);node.dataset.pixi='ready';instance.ticker.maxFPS=20;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    instance.ticker.add(()=>{
     const w=instance.screen.width,h=instance.screen.height,time=reduced?0:performance.now()/1000,speed=.28+levelRef.current*.12;
     for(let i=0;i<particles.length;i++){
      const p=particles[i],phase=(time*speed+i*.233)%1;
      p.x=w*((i*.61803398875)%1)+Math.sin(time+i)*w*.018;p.y=h*(1.05-phase*.55);
      p.alpha=reduced ? .45 : Math.sin(phase*Math.PI)*(.25+levelRef.current*.16);
      p.scaleX=p.scaleY=1.5+(i%3)+phase*1.3;
     }
     if(reduced)instance.ticker.stop();
    });
    const visibility=()=>{if(document.hidden)instance.ticker.stop();else instance.ticker.start();};document.addEventListener('visibilitychange',visibility);
    if(document.hidden)instance.ticker.stop();
    observer=new ResizeObserver(()=>{resize();if(reduced){instance.ticker.start();requestAnimationFrame(()=>instance.ticker.stop());}});observer.observe(node);
    cleanupVisibility=()=>document.removeEventListener('visibilitychange',visibility);
   }catch{/* Static CSS background remains available when WebGL is unavailable. */}
  })();
  return()=>{disposed=true;cleanupVisibility();observer?.disconnect();app?.destroy(true,{children:true});};
 },[]);
 return <span className="pixi-embers" ref={host} aria-hidden="true"/>;
}
