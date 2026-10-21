import {useEffect,useRef} from 'react';
import type {Application,Particle} from 'pixi.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';

/** A short, capped Pixi burst that runs only once when a victory result opens. */
export function PixiResultCelebration(){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const node=host.current;if(!node||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let disposed=false,app:Application|undefined,unwatch=()=>{},visibility=()=>{};
  void(async()=>{try{
   const {Application,Particle,ParticleContainer,Texture}=await import('pixi.js');
   if(disposed)return;
   const instance=new Application();app=instance;
   await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:false,autoDensity:true,resolution:pixiResolution(),preference:'webgl',powerPreference:'low-power'});
   if(disposed){instance.destroy(true,{children:true});return;}
   const group=new ParticleContainer({dynamicProperties:{position:true,vertex:true,rotation:true,color:true}}),particles:Particle[]=[];
   const count=isMobileGraphics()?30:52;
   for(let i=0;i<count;i++){const p=new Particle({texture:Texture.WHITE,x:0,y:0,scaleX:3,scaleY:3,rotation:0,tint:[0xffd54a,0xff8b75,0x78ccff,0xffffff][i%4],alpha:0});particles.push(p);group.addParticle(p);}
   instance.stage.addChild(group);node.append(instance.canvas);node.dataset.pixi='ready';
   instance.ticker.maxFPS=isMobileGraphics()?24:30;
   let elapsed=0;
   instance.ticker.add(ticker=>{
    elapsed+=Math.min(ticker.deltaMS,100);const t=Math.max(0,Math.min(1,(elapsed-320)/1150)),w=instance.screen.width,h=instance.screen.height;
    for(let i=0;i<particles.length;i++){
     const p=particles[i],originX=w*(.2+(i%5)*.15),originY=h*(.27+(i%3)*.13),angle=(i*2.3999632297)+(i%3)*.45,velocity=Math.min(w,h)*(.18+(i%7)*.018),age=Math.max(0,Math.min(1,(t-i%5*.025)/.78));
     p.x=originX+Math.cos(angle)*velocity*age;p.y=originY+Math.sin(angle)*velocity*age+age*age*h*.18;
     p.alpha=age===0?0:Math.sin(age*Math.PI)*.96;p.scaleX=p.scaleY=1.7+(i%4)*.75*(1-age*.45);p.rotation=angle+age*8;
    }
    if(t===1)instance.ticker.stop();
   });
   visibility=()=>{if(document.hidden)instance.ticker.stop();};document.addEventListener('visibilitychange',visibility);
  }catch{/* CSS celebration remains available if WebGL is unavailable. */}})();
  return()=>{disposed=true;document.removeEventListener('visibilitychange',visibility);unwatch();app?.destroy(true,{children:true});};
 },[]);
 return <div ref={host} className="pixi-result-celebration" aria-hidden="true"/>;
}
