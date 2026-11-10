import {useEffect,useRef,useState} from 'react';
import type {Application} from 'pixi.js';
import type {FlightPublicChallenge} from '../shared/flightGame.js';
import {descendingFlightTile} from '../shared/flightVisual.js';
import {pixiResolution,watchContextLoss} from './pixiRuntime.js';

type Props={challenge:FlightPublicChallenge;speed:number;progress:number;startsAt:number;serverOffset:number;planeX:number};
const FLIGHT_ART=['/flight/land.webp','/flight/objects-layer.webp','/flight/clouds-layer.webp','/flight/gate.webp','/flight/plane-banking.webp','/flight/plane.webp'];
let artPromise:Promise<unknown[]>|undefined;
export function preloadFlightArt(){return artPromise??=import('pixi.js').then(({Assets})=>Promise.all(FLIGHT_ART.map(path=>Assets.load(path)))).catch(error=>{artPromise=undefined;throw error;});}

export function FlightScene({challenge,speed,progress,startsAt,serverOffset,planeX}:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef({challenge,speed,progress,startsAt,serverOffset,planeX}),[fallback,setFallback]=useState(true);
 live.current={challenge,speed,progress,startsAt,serverOffset,planeX};
 useEffect(()=>{
  const node=host.current;if(!node)return;node.dataset.renderer='fallback';
  let disposed=false,app:Application|undefined,observer:ResizeObserver|undefined,unwatch=()=>{},cleanupVisibility=()=>{};
  void (async()=>{
   try{
    const {Application,Container,Rectangle,Sprite,Text,Texture}=await import('pixi.js');if(disposed)return;
    const instance=new Application();app=instance;
    await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:false,autoDensity:true,resolution:pixiResolution(),preference:'webgl'});
    if(disposed){instance.destroy(true,{children:true});return;}
    const [landTexture,objectTexture,cloudTexture,gateTexture,planeSheet]=await preloadFlightArt();
    if(disposed){instance.destroy(true,{children:true});return;}
    const land=Array.from({length:3},()=>new Sprite(landTexture));
    const objectHalves=[0,1].map(index=>new Texture({source:objectTexture.source,frame:new Rectangle(index*512,0,512,1536)}));
    const objects=objectHalves.map(texture=>Array.from({length:3},()=>new Sprite(texture)));
    const clouds=Array.from({length:3},()=>{const sprite=new Sprite(cloudTexture);sprite.alpha=.5;return sprite;});
    // Crop only the transparent outer margin. Each lane gets the complete gate.
    const wholeGate=new Texture({source:gateTexture.source,frame:new Rectangle(139,212,1895,295)});
    const planeFrames=Array.from({length:16},(_,index)=>new Texture({source:planeSheet.source,frame:new Rectangle(index%4*200,Math.floor(index/4)*200,200,200)}));
    const makeGate=()=>{
     const group=new Container(),panels=[new Sprite(wholeGate),new Sprite(wholeGate)],labels=[0,1].map(()=>new Text({text:'',style:{fontFamily:'Arial, "Malgun Gothic", sans-serif',fontSize:26,fontWeight:'900',fill:0x123a60,stroke:{color:0xeaffff,width:4},align:'center'}})),stageLabel=new Text({text:'',style:{fontFamily:'Arial, "Malgun Gothic", sans-serif',fontSize:18,fontWeight:'900',fill:0xffffff,stroke:{color:0x17476b,width:5},align:'center'}});
     panels.forEach(panel=>panel.anchor.set(.5));labels.forEach(label=>label.anchor.set(.5));stageLabel.anchor.set(.5,1);
     group.addChild(...panels,...labels,stageLabel);
     return {group,panels,labels,stageLabel,layoutWidth:0,layoutHeight:0};
    };
    let current=makeGate(),gateId=live.current.challenge.id;const plane=new Sprite(planeFrames[0]);plane.anchor.set(.5);
    instance.stage.addChild(...land,...objects.flat(),...clouds,current.group,plane);
    node.append(instance.canvas);node.dataset.renderer='pixi';setFallback(false);
    instance.ticker.maxFPS=60;
    let scroll=0,lastPlaneX=.5,bankDirection=0,bankUntil=0;
    const drawGate=(gate:ReturnType<typeof makeGate>,w:number,h:number,y:number,words:{left:string;right:string;stage:string})=>{
     const gateH=Math.max(37,Math.min(65,h*.09)),gateWidth=w*.49;
     gate.group.y=y*h;
     if(gate.layoutWidth!==w||gate.layoutHeight!==h){
      gate.layoutWidth=w;gate.layoutHeight=h;
      gate.panels.forEach((panel,index)=>{panel.width=gateWidth;panel.height=gateH;panel.position.set(w*(index===0?.25:.75),0);});
      gate.labels.forEach((label,index)=>{label.style.fontSize=Math.max(15,Math.min(31,w*.067));label.position.set(w*(index===0?.25:.75),-gateH*.83);});
      gate.stageLabel.style.fontSize=Math.max(14,Math.min(21,w*.045));gate.stageLabel.position.set(w*.5,-gateH*1.3-4);
     }
     gate.labels.forEach((label,index)=>{const value=index===0?words.left:words.right;if(label.text!==value)label.text=value;});
     const stage=words.stage==='participle'?'과거분사':'과거형';if(gate.stageLabel.text!==stage)gate.stageLabel.text=stage;gate.stageLabel.visible=y*h>Math.max(61,gateH*.7);
    };
    instance.ticker.add(tick=>{
     const w=instance.screen.width,h=instance.screen.height,info=live.current;
     if(info.challenge.id!==gateId){instance.stage.removeChild(current.group);current.group.destroy({children:true});current=makeGate();instance.stage.addChildAt(current.group,instance.stage.getChildIndex(plane));gateId=info.challenge.id;}
     scroll+=Math.min(tick.deltaMS,50)*info.speed*.058;
     const landCover=Math.max(w/landTexture.width,h/landTexture.height),landH=landTexture.height*landCover,landX=(w-landTexture.width*landCover)/2,landY=(h-landH)/2;
     land.forEach((sprite,j)=>{const {top}=descendingFlightTile(scroll*.6,landH,landY,j-1);sprite.visible=top<h&&top+landH>0;if(sprite.visible){sprite.scale.set(landCover);sprite.position.set(landX,top);}});
     const objectScale=Math.min(w/1024,h/500),objectHeight=1536*objectScale,objectStride=(1536-170)*objectScale,objectY=Math.min(0,(h-objectHeight)/2);
     objects.forEach((row,side)=>row.forEach((sprite,j)=>{const {top}=descendingFlightTile(scroll*.82,objectStride,objectY,j-1);sprite.visible=top<h&&top+objectHeight>0;if(sprite.visible){sprite.scale.set(objectScale);sprite.position.set(side===0?0:w-512*objectScale,top);}}));
     const cloudCover=w<h?w/cloudTexture.width:Math.max(w/cloudTexture.width,h/cloudTexture.height),cloudHeight=cloudTexture.height*cloudCover,cloudStride=(cloudTexture.height-220)*cloudCover,cloudX=(w-cloudTexture.width*cloudCover)/2,cloudY=Math.min(0,(h-cloudHeight)/2);
     clouds.forEach((sprite,j)=>{const {top}=descendingFlightTile(scroll*1.06,cloudStride,cloudY,j-1);sprite.visible=top<h&&top+cloudHeight>0;if(sprite.visible){sprite.scale.set(cloudCover);sprite.position.set(cloudX,top);}});
     const duration=Math.max(1,info.challenge.deadline-info.startsAt),p=Math.max(0,Math.min(1.25,(Date.now()+info.serverOffset-info.startsAt)/duration));
     const gateH=Math.max(48,Math.min(94,h*.115)),planeSize=Math.min(90,Math.max(44,Math.min(w*.22,h*.15)));
     const startY=-gateH*.6/h,contactY=.83-(planeSize+gateH)/(2*h),y=startY+p*(contactY-startY);
     drawGate(current,w,h,y,info.challenge);current.group.visible=info.progress>=0;
     const size=planeSize;plane.width=size;plane.height=size;plane.position.set(w*info.planeX,h*.83);
     const now=performance.now();if(Math.abs(info.planeX-lastPlaneX)>.012){bankDirection=info.planeX<lastPlaneX?-1:1;bankUntil=now+360;}lastPlaneX=info.planeX;
     const banked=now<bankUntil,bankState=banked?(bankDirection<0?'left':'right'):'straight';if(node.dataset.bank!==bankState)node.dataset.bank=bankState;
     const frame=banked?(bankDirection<0?4:12)+Math.floor(now/90)%4:0;if(plane.texture!==planeFrames[frame])plane.texture=planeFrames[frame];
    });
    const visible=()=>{if(document.hidden)instance.ticker.stop();else if(node.dataset.renderer==='pixi')instance.ticker.start();};document.addEventListener('visibilitychange',visible);cleanupVisibility=()=>document.removeEventListener('visibilitychange',visible);
    unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();node.dataset.renderer='fallback';setFallback(true);});
    observer=new ResizeObserver(()=>{if(!disposed)instance.renderer.resize(Math.max(1,node.clientWidth),Math.max(1,node.clientHeight));});observer.observe(node);
    if(document.hidden)instance.ticker.stop();
   }catch{if(!disposed){node.dataset.renderer='fallback';setFallback(true);}}
  })();
  return()=>{disposed=true;observer?.disconnect();cleanupVisibility();unwatch();app?.destroy(true,{children:true});};
 },[]);
 return <div className="flight-scene" ref={host} aria-hidden="true">{fallback&&<><span className="flight-fallback-object-layer"/><span className="flight-fallback-cloud-layer"/>{progress>=0&&<div className="flight-fallback-gates" style={{top:`${Math.max(-22,-22+Math.min(1.25,progress)*105)}%`}}><b className="flight-fallback-stage">{challenge.stage==='past'?'과거형':'과거분사'}</b><span>{challenge.left}</span><span>{challenge.right}</span></div>}<span className="flight-plane-fallback" style={{left:`${planeX*100}%`}}/></>}</div>;
}
