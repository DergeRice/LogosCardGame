import {useEffect,useRef} from 'react';
import type {Application,Particle,Texture} from 'pixi.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';

export function PixiEmbers({level}:{level:number}){
 const host=useRef<HTMLSpanElement>(null),levelRef=useRef(level);levelRef.current=level;
 useEffect(()=>{
  const node=host.current;if(!node)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let ownedTexture:Texture|undefined;let disposed=false,app:Application|undefined,observer:ResizeObserver|undefined,cleanupVisibility=()=>{},unwatch=()=>{},resizeFrame=0;
  void (async()=>{
   try{
    const {Application,Particle,ParticleContainer,Texture}=await import('pixi.js');
    if(disposed)return;
    const instance=new Application();app=instance;
    await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:false,autoDensity:true,resolution:pixiResolution(),preference:'webgl',powerPreference:'low-power'});
    if(disposed){instance.destroy(true,{children:true});return;}
    instance.ticker.stop();
    const glow=document.createElement('canvas');glow.width=32;glow.height=64;const painter=glow.getContext('2d')!;
    painter.scale(1,2);const gradient=painter.createRadialGradient(16,22,0,16,18,17);gradient.addColorStop(0,'#fff5aaff');gradient.addColorStop(.25,'#ffd24ce0');gradient.addColorStop(.6,'#ff6a2470');gradient.addColorStop(1,'#ff320000');painter.fillStyle=gradient;painter.fillRect(0,0,32,32);
    const flameTexture=ownedTexture=Texture.from(glow),group=new ParticleContainer({dynamicProperties:{position:true,vertex:true,color:true}}),particles:Particle[]=[];
    for(let i=0;i<(isMobileGraphics()?14:28);i++){const p=new Particle({texture:flameTexture,x:0,y:0,scaleX:.5,scaleY:.5,alpha:0});particles.push(p);group.addParticle(p);}
    instance.stage.addChild(group);
    let lastWidth=0,lastHeight=0;
    const resize=()=>{const width=Math.max(1,Math.round(node.clientWidth)),height=Math.max(1,Math.round(node.clientHeight));if(Math.abs(width-lastWidth)<2&&Math.abs(height-lastHeight)<2)return;lastWidth=width;lastHeight=height;instance.renderer.resize(width,height);};
    unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();node.dataset.pixi='lost';});
    node.append(instance.canvas);node.dataset.pixi='ready';instance.ticker.maxFPS=isMobileGraphics()?15:20;
    let time=0;
    instance.ticker.add(ticker=>{
     time+=Math.min(ticker.deltaMS,100)/1000;
     const w=instance.screen.width,h=instance.screen.height,speed=.28+levelRef.current*.12;
     for(let i=0;i<particles.length;i++){
      const p=particles[i],phase=(time*speed+i*.233)%1;
      p.x=w*((i*.61803398875)%1)+Math.sin(time+i)*w*.018;p.y=h*(1.05-phase*.95);
      p.alpha=Math.sin(phase*Math.PI)*(.3+levelRef.current*.2);
      p.scaleX=.35+(i%3)*.15+phase*.2;p.scaleY=.6+(i%4)*.2+phase*.3;
     }
    });
    const visibility=()=>{if(document.hidden)instance.ticker.stop();else if(node.dataset.pixi==='ready')instance.ticker.start();};document.addEventListener('visibilitychange',visibility);
    if(!document.hidden)instance.ticker.start();
    observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(!disposed)resize();});});observer.observe(node);
    cleanupVisibility=()=>document.removeEventListener('visibilitychange',visibility);
   }catch{/* Static CSS background remains available when WebGL is unavailable. */}
  })();
  return()=>{disposed=true;cancelAnimationFrame(resizeFrame);cleanupVisibility();unwatch();observer?.disconnect();app?.destroy(true,{children:true});ownedTexture?.destroy(true);};
 },[]);
 return <span className="pixi-embers" ref={host} aria-hidden="true"/>;
}
