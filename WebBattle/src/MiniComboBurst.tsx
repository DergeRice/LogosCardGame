import {useEffect,useRef,useState} from 'react';
import type {Application,Graphics} from 'pixi.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';

export function MiniComboBurst({serial}:{serial:number}){
 const host=useRef<HTMLSpanElement>(null),fire=useRef<()=>void>(()=>{}),latest=useRef(serial),[fallback,setFallback]=useState(false);
 latest.current=serial;
 useEffect(()=>{if(serial>0)fire.current();},[serial]);
 useEffect(()=>{
  const node=host.current;if(!node)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let disposed=false,app:Application|undefined,unwatch=()=>{},lastBurst=0;
  type Spark={view:Graphics;x:number;y:number;vx:number;vy:number;age:number;duration:number;spin:number};
  const sparks:Spark[]=[];
  void (async()=>{
   try{
    const {Application,Graphics}=await import('pixi.js');if(disposed)return;
    const instance=new Application();app=instance;
    await instance.init({width:280,height:130,backgroundAlpha:0,antialias:false,autoDensity:true,resolution:pixiResolution(),preference:'webgl',powerPreference:'low-power'});
    if(disposed){instance.destroy(true,{children:true});return;}
    instance.ticker.stop();instance.ticker.maxFPS=isMobileGraphics()?30:45;
    const colors=[0xffe070,0xffad65,0xffffff,0x8addff,0xff8cbd];
    fire.current=()=>{
     if(disposed||document.hidden)return;
     for(const spark of sparks)spark.view.destroy();sparks.length=0;
     const count=isMobileGraphics()?24:32;
     for(let i=0;i<count;i++){
      const angle=(i/count)*Math.PI*2+(Math.random()-.5)*.2,speed=4+Math.random()*3;
      const view=new Graphics();
      if(i%3===0)view.rect(-3,-3,6,6).fill(colors[i%colors.length]);
      else view.circle(0,0,2+Math.random()*2).fill(colors[i%colors.length]);
      view.position.set(140,65);instance.stage.addChild(view);
      sparks.push({view,x:140,y:65,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-1.1,age:0,duration:300+Math.random()*160,spin:(Math.random()-.5)*.22});
     }
     instance.ticker.start();
    };
    instance.ticker.add(ticker=>{
     const step=Math.min(ticker.deltaMS,40)/16.67;
     for(let i=sparks.length-1;i>=0;i--){
      const spark=sparks[i];spark.age+=ticker.deltaMS;
      if(spark.age>=spark.duration){spark.view.destroy();sparks.splice(i,1);continue;}
      spark.x+=spark.vx*step;spark.y+=spark.vy*step;spark.vy+=.13*step;
      spark.view.position.set(spark.x,spark.y);spark.view.rotation+=spark.spin*step;spark.view.alpha=1-spark.age/spark.duration;
     }
     if(!sparks.length)instance.ticker.stop();
    });
    const visibility=()=>{if(document.hidden)instance.ticker.stop();else if(sparks.length)instance.ticker.start();};
    document.addEventListener('visibilitychange',visibility);
    unwatch=()=>{document.removeEventListener('visibilitychange',visibility);};
    const stopOnLoss=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();node.dataset.renderer='fallback';setFallback(true);});
    const priorUnwatch=unwatch;unwatch=()=>{priorUnwatch();stopOnLoss();};
    node.append(instance.canvas);node.dataset.renderer='pixi';
    if(latest.current>lastBurst){lastBurst=latest.current;fire.current();}
   }catch{if(!disposed){node.dataset.renderer='fallback';setFallback(true);}}
  })();
  return()=>{disposed=true;fire.current=()=>{};unwatch();app?.destroy(true,{children:true});};
 },[]);
 return <span className="mini-combo-burst" ref={host} aria-hidden="true">{fallback&&serial>0&&<span key={serial} className="mini-combo-fallback">✦ ✦ ✦</span>}</span>;
}
