import {useEffect,useRef,useState} from 'react';
import type {Application} from 'pixi.js';
import type {FlightPublicChallenge} from '../shared/flightGame.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';

type Props={challenge:FlightPublicChallenge;speed:number;progress:number;planeX:number};
export function FlightScene({challenge,speed,progress,planeX}:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef({challenge,speed,progress,planeX}),[fallback,setFallback]=useState(false);
 live.current={challenge,speed,progress,planeX};
 useEffect(()=>{
  const node=host.current;if(!node)return;
  let disposed=false,app:Application|undefined,observer:ResizeObserver|undefined,unwatch=()=>{},cleanupVisibility=()=>{};
  void (async()=>{
   try{
    const {Application,Graphics,Text}=await import('pixi.js');if(disposed)return;
    const instance=new Application();app=instance;
    await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:true,autoDensity:true,resolution:pixiResolution(),preference:'webgl',powerPreference:'low-power'});
    if(disposed){instance.destroy(true,{children:true});return;}
    const art=new Graphics(),labels=(['left','right'] as const).map(()=>new Text({text:'',style:{fontFamily:'Arial, "Malgun Gothic", sans-serif',fontSize:28,fontWeight:'900',fill:0x163b59,align:'center'}}));
    instance.stage.addChild(art,...labels);node.append(instance.canvas);node.dataset.renderer='pixi';
    instance.ticker.maxFPS=isMobileGraphics()?30:45;
    let stripe=0;
    instance.ticker.add(tick=>{
     const w=instance.screen.width,h=instance.screen.height,step=Math.min(tick.deltaMS,50)/16.67,info=live.current;
     stripe=(stripe+step*.016*info.speed)%1;
     const gateY=h*(-.2+Math.min(1,Math.max(0,info.progress))*1.02),planeY=h*.82,gateW=w*.36,gateH=Math.max(16,Math.min(28,h*.04));
     art.clear();
     art.rect(0,0,w,h).fill(0x2b628b);
     art.rect(w*.055,0,w*.89,h).fill(0x3c83ad);
     art.rect(w*.055,0,3,h).fill({color:0xe0f6ff,alpha:.85});art.rect(w*.945,0,3,h).fill({color:0xe0f6ff,alpha:.85});
     for(let i=0;i<8;i++){const y=((i/8+stripe)%1)*h;art.roundRect(w*.495,y,w*.01,Math.max(11,h*.045),3).fill({color:0xc9ecf6,alpha:.38});}
     art.rect(w*.5-2,gateY-h*.15,4,h*.3).fill({color:0xe6f7ff,alpha:.9});
     for(const [index,lane] of (['left','right'] as const).entries()){
      const cx=w*(index===0?.275:.725),value=info.challenge[lane],isCoin=value==='코인',isObstacle=value==='장애물',color=isCoin?0xffd458:isObstacle?0xff7776:0xb9efff;
      art.roundRect(cx-gateW/2,gateY-gateH/2,gateW,gateH,5).fill({color,alpha:.95}).stroke({width:3,color:0xffffff});
      labels[index].text=isCoin||isObstacle?'':value;
      labels[index].style.fontSize=Math.max(12,Math.min(29,w*.056,h*.14));labels[index].style.fill=isObstacle?0xffe0dd:0xffffff;
      labels[index].anchor.set(.5,1);labels[index].position.set(cx,gateY-gateH/2-9);
      if(isCoin){art.circle(cx,gateY-h*.09,Math.min(21,w*.055)).fill(0xffd253).stroke({width:3,color:0xfff2a8});art.circle(cx,gateY-h*.09,Math.min(11,w*.027)).stroke({width:3,color:0xe5a435});}
      if(isObstacle){const size=Math.min(20,w*.05);art.moveTo(cx,gateY-h*.09-size).lineTo(cx+size,gateY-h*.09+size).lineTo(cx-size,gateY-h*.09+size).closePath().fill(0xf15d62).stroke({width:2,color:0xffd5d5});}
     }
     const px=w*info.planeX,u=Math.max(.45,Math.min(1.5,w/360,h/240));
     art.ellipse(px,planeY+30*u,37*u,12*u).fill({color:0x092c4a,alpha:.28});
     art.moveTo(px,planeY-39*u).lineTo(px+10*u,planeY+2*u).lineTo(px+36*u,planeY+14*u).lineTo(px+36*u,planeY+24*u).lineTo(px+8*u,planeY+18*u).lineTo(px+6*u,planeY+35*u).lineTo(px-6*u,planeY+35*u).lineTo(px-8*u,planeY+18*u).lineTo(px-36*u,planeY+24*u).lineTo(px-36*u,planeY+14*u).lineTo(px-10*u,planeY+2*u).closePath().fill(0xfffaf0).stroke({width:3*u,color:0x174976});
     art.roundRect(px-8*u,planeY-13*u,16*u,29*u,7*u).fill(0x20a8df).stroke({width:2,color:0x126998});
     art.circle(px,planeY-24*u,5*u).fill(0xffd158);
     art.moveTo(px-7*u,planeY+33*u).lineTo(px,planeY+(49+stripe*5)*u).lineTo(px+7*u,planeY+33*u).closePath().fill({color:0xffcf77,alpha:.8});
    });
    const visible=()=>{if(document.hidden)instance.ticker.stop();else if(node.dataset.renderer==='pixi')instance.ticker.start();};document.addEventListener('visibilitychange',visible);cleanupVisibility=()=>document.removeEventListener('visibilitychange',visible);
    unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();node.dataset.renderer='fallback';setFallback(true);});
    observer=new ResizeObserver(()=>{if(!disposed)instance.renderer.resize(Math.max(1,node.clientWidth),Math.max(1,node.clientHeight));});observer.observe(node);
    if(document.hidden)instance.ticker.stop();
   }catch{if(!disposed){node.dataset.renderer='fallback';setFallback(true);}}
  })();
  return()=>{disposed=true;observer?.disconnect();cleanupVisibility();unwatch();app?.destroy(true,{children:true});};
 },[]);
 return <div className="flight-scene" ref={host} aria-hidden="true">{fallback&&<><div className="flight-fallback-gates" style={{top:`${-20+Math.min(1,Math.max(0,progress))*102}%`}}><span>{challenge.left}</span><span>{challenge.right}</span></div><span className="flight-plane-fallback" style={{left:`${planeX*100}%`}}/></>}</div>;
}
