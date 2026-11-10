import {useEffect,useRef,useState} from 'react';
import type {Application} from 'pixi.js';
import type {FlightPublicChallenge,FlightLane} from '../shared/flightGame.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';

type Props={challenge:FlightPublicChallenge;speed:number;selected:FlightLane|null};
export function FlightScene({challenge,speed,selected}:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef({challenge,speed,selected}),[fallback,setFallback]=useState(false);live.current={challenge,speed,selected};
 useEffect(()=>{
  const node=host.current;if(!node)return;
  let disposed=false,app:Application|undefined,observer:ResizeObserver|undefined,unwatch=()=>{},cleanupVisibility=()=>{};
  void (async()=>{
   try{
    const {Application,Graphics}=await import('pixi.js');if(disposed)return;
    const instance=new Application();app=instance;
    await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:true,autoDensity:true,resolution:pixiResolution(),preference:'webgl',powerPreference:'low-power'});
    if(disposed){instance.destroy(true,{children:true});return;}
    const art=new Graphics();instance.stage.addChild(art);node.append(instance.canvas);node.dataset.renderer='pixi';
    instance.ticker.maxFPS=isMobileGraphics()?30:45;
    let phase=0,planeX=.5;
    instance.ticker.add(tick=>{
     const w=instance.screen.width,h=instance.screen.height,step=Math.min(tick.deltaMS,50)/16.67,info=live.current;
     phase=(phase+step*.014*info.speed)%1;
     const target=info.selected==='left'?.27:info.selected==='right'?.73:.5;planeX+=(target-planeX)*Math.min(1,.22*step);
     art.clear();
     // Perspective runway and moving stripes.
     art.moveTo(w*.44,h*.12).lineTo(w*.56,h*.12).lineTo(w*1.04,h).lineTo(-w*.04,h).closePath().fill({color:0x477db6,alpha:.64});
     art.moveTo(w*.47,h*.12).lineTo(w*.53,h*.12).lineTo(w*.92,h).lineTo(w*.08,h).closePath().fill({color:0x285c94,alpha:.82});
     for(let i=0;i<9;i++){const t=(i/9+phase)%1,y=h*(.13+t*t*.89),half=w*(.012+t*.02);art.roundRect(w/2-half,y,half*2,2+t*8,3).fill({color:0xc7f4ff,alpha:.35+t*.5});}
     for(let i=0;i<6;i++){const t=(i/6+phase*.6)%1,y=h*(.1+t*.8),x=w*((i%2===0?.08:.82)+Math.sin(i*8)*.08);art.circle(x,y,7+t*15).fill({color:0xffffff,alpha:.12});}
     // Two gate arches remain in the same lanes as the accessible DOM choices.
     for(const [index,lane] of (['left','right'] as const).entries()){
      const cx=w*(index===0?.27:.73),gateW=w*.34,top=h*.25,bottom=h*.61;
      const color=info.challenge.kind==='approach'?(info.challenge[lane]==='코인'?0xffd46a:0xff8d8d):0x8ce2f1;
      art.roundRect(cx-gateW/2,top,gateW,bottom-top,16).stroke({width:5,color,alpha:.92});
      art.roundRect(cx-gateW/2-5,bottom-8,gateW+10,13,7).fill({color,alpha:.9});
      art.roundRect(cx-gateW/2+3,top+6,gateW-6,8,5).fill({color:0xffffff,alpha:.45});
      if(info.challenge.kind==='approach'){
       if(info.challenge[lane]==='코인'){art.circle(cx,top+26,13).fill(0xffd254);art.circle(cx,top+26,8).stroke({width:2,color:0xfff3b4});}
       else{art.moveTo(cx-13,top+37).lineTo(cx,top+12).lineTo(cx+13,top+37).closePath().fill(0xf57777);}
      }
     }
     // The plane is a Pixi sprite-like vector, not a tappable control.
     const px=w*planeX,py=h*.75,unit=Math.min(1,h/250);
     art.moveTo(px,py-36*unit).lineTo(px+9*unit,py+4*unit).lineTo(px+34*unit,py+16*unit).lineTo(px+34*unit,py+27*unit).lineTo(px+7*unit,py+19*unit).lineTo(px+5*unit,py+38*unit).lineTo(px-5*unit,py+38*unit).lineTo(px-7*unit,py+19*unit).lineTo(px-34*unit,py+27*unit).lineTo(px-34*unit,py+16*unit).lineTo(px-9*unit,py+4*unit).closePath().fill(0xfffdf4).stroke({width:Math.max(1,3*unit),color:0x24548c});
     art.roundRect(px-6*unit,py-12*unit,12*unit,24*unit,6*unit).fill(0x3db9e2);art.circle(px,py-17*unit,5*unit).fill(0xffd36d);
     for(let i=0;i<3;i++)art.circle(px+(i-1)*5*unit,py+(45+i*8+phase*10)*unit,(2+i)*unit).fill({color:0xe8f8ff,alpha:.65-i*.15});
    });
    const visible=()=>{if(document.hidden)instance.ticker.stop();else if(node.dataset.renderer==='pixi')instance.ticker.start();};document.addEventListener('visibilitychange',visible);cleanupVisibility=()=>document.removeEventListener('visibilitychange',visible);
    unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();node.dataset.renderer='fallback';setFallback(true);});
    observer=new ResizeObserver(()=>{if(!disposed)instance.renderer.resize(Math.max(1,node.clientWidth),Math.max(1,node.clientHeight));});observer.observe(node);
    if(document.hidden)instance.ticker.stop();
   }catch{if(!disposed){node.dataset.renderer='fallback';setFallback(true);}}
  })();
  return()=>{disposed=true;observer?.disconnect();cleanupVisibility();unwatch();app?.destroy(true,{children:true});};
 },[]);
 return <div className="flight-scene" ref={host} aria-hidden="true">{fallback&&<span className="flight-plane-fallback">✈</span>}</div>;
}
