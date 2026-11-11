import {memo,useEffect,useRef,useState} from 'react';
import type {Application} from 'pixi.js';
import type {FlightPublicChallenge} from '../shared/flightGame.js';
import {descendingFlightTile,flightGateCenterY} from '../shared/flightVisual.js';
import {pixiResolution,watchContextLoss} from './pixiRuntime.js';
import type {FlightImpactKind} from './flightFeedback.js';

type Props={challenge:FlightPublicChallenge;speed:number;startsAt:number;serverOffset:number;planeX:number;word:string;showWord:boolean;impact?:{at:number;kind:FlightImpactKind};speedUpAt?:number;crashStartedAt?:number;onReady:(challengeId:number)=>void};
const FLIGHT_ART=['/flight/land.webp','/flight/objects-layer.webp','/flight/clouds-layer.webp','/flight/gate.webp','/flight/plane-banking.webp','/flight/plane.webp'];
let artPromise:Promise<unknown[]>|undefined;
export function preloadFlightArt(){return artPromise??=import('pixi.js').then(({Assets})=>Promise.all(FLIGHT_ART.map(path=>Assets.load(path)))).catch(error=>{artPromise=undefined;throw error;});}

function FlightSceneView({challenge,speed,startsAt,serverOffset,planeX,word,showWord,impact,speedUpAt,crashStartedAt,onReady}:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef({challenge,speed,startsAt,serverOffset,planeX,word,showWord,impact,speedUpAt,crashStartedAt,onReady}),[fallback,setFallback]=useState(true),[fallbackClock,setFallbackClock]=useState(Date.now()),fallbackReady=useRef(false),readyIds=useRef(new Set<number>());
 const previous=useRef({challenge,startsAt}),outgoing=useRef<{challenge:FlightPublicChallenge;startsAt:number}[]>([]);
 if(previous.current.challenge.id!==challenge.id){outgoing.current.push(previous.current);previous.current={challenge,startsAt};}
 live.current={challenge,speed,startsAt,serverOffset,planeX,word,showWord,impact,speedUpAt,crashStartedAt,onReady};
 useEffect(()=>{if(!fallback)return;const timer=setInterval(()=>setFallbackClock(Date.now()),50);return()=>clearInterval(timer);},[fallback]);
 useEffect(()=>{if(!fallback||!fallbackReady.current||!challenge.awaitingReady||readyIds.current.has(challenge.id))return;const frame=requestAnimationFrame(()=>{readyIds.current.add(challenge.id);live.current.onReady(challenge.id);});return()=>cancelAnimationFrame(frame);},[fallback,challenge.id,challenge.awaitingReady]);
 useEffect(()=>{
  const node=host.current;if(!node)return;node.dataset.renderer='fallback';
  let disposed=false,fallbackCommitted=false,app:Application|undefined,observer:ResizeObserver|undefined,unwatch=()=>{},cleanupVisibility=()=>{};
  const signalReady=(id:number)=>{if(!disposed&&!readyIds.current.has(id)){readyIds.current.add(id);live.current.onReady(id);}};
  const fallbackTimer=window.setTimeout(()=>{fallbackCommitted=true;fallbackReady.current=true;signalReady(live.current.challenge.id);},1100);
  void (async()=>{
   try{
    const {Application,Container,Graphics,Rectangle,Sprite,Text,Texture}=await import('pixi.js');if(disposed)return;
    const instance=new Application();app=instance;
    await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:false,autoDensity:true,resolution:pixiResolution(),preference:'webgl'});
    if(disposed||fallbackCommitted){instance.destroy(true,{children:true});app=undefined;return;}
    const [landTexture,objectTexture,cloudTexture,gateTexture,planeSheet]=await preloadFlightArt();
    if(disposed||fallbackCommitted){instance.destroy(true,{children:true});app=undefined;return;}
    const land=Array.from({length:3},()=>new Sprite(landTexture));
    const objectHalves=[0,1].map(index=>new Texture({source:objectTexture.source,frame:new Rectangle(index*512,0,512,1536)}));
    const objects=objectHalves.map(texture=>Array.from({length:3},()=>new Sprite(texture)));
    const clouds=Array.from({length:3},()=>{const sprite=new Sprite(cloudTexture);sprite.alpha=.5;return sprite;});
    // Crop only the transparent outer margin. Each lane gets the complete gate.
    const wholeGate=new Texture({source:gateTexture.source,frame:new Rectangle(139,212,1895,295)});
    const planeFrames=Array.from({length:16},(_,index)=>new Texture({source:planeSheet.source,frame:new Rectangle(index%4*200,Math.floor(index/4)*200,200,200)}));
    const makeGate=()=>{
     const group=new Container(),panels=[new Sprite(wholeGate),new Sprite(wholeGate)],labels=[0,1].map(()=>new Text({text:'',style:{fontFamily:'Arial, "Malgun Gothic", sans-serif',fontSize:26,fontWeight:'900',fill:0x123a60,stroke:{color:0xeaffff,width:4},align:'center'}}));
     panels.forEach(panel=>panel.anchor.set(.5));labels.forEach(label=>label.anchor.set(.5));
     group.addChild(...panels,...labels);
     return {group,panels,labels,layoutWidth:0,layoutHeight:0};
    };
    let current=makeGate(),gateId=live.current.challenge.id,currentWave={challenge:live.current.challenge,startsAt:live.current.startsAt};const departing:{gate:ReturnType<typeof makeGate>;wave:typeof currentWave}[]=[];
    const plane=new Sprite(planeFrames[0]);plane.anchor.set(.5);
    const planeWord=new Text({text:'',style:{fontFamily:'Arial, "Malgun Gothic", sans-serif',fontSize:22,fontWeight:'900',fill:0xffffff,stroke:{color:0x12354a,width:5},align:'center'}});planeWord.anchor.set(.5,0);
    const impactFlash=new Graphics();impactFlash.visible=false;
    const speedBurst=new Graphics(),speedText=new Text({text:'Speed Up!',style:{fontFamily:'Arial, sans-serif',fontSize:42,fontWeight:'900',fill:0xffe665,stroke:{color:0x164973,width:7},align:'center'}});speedText.anchor.set(.5);speedText.visible=false;speedBurst.visible=false;
    instance.stage.addChild(...land,...objects.flat(),...clouds,current.group,plane,planeWord,impactFlash,speedBurst,speedText);
    node.append(instance.canvas);node.dataset.renderer='pixi';setFallback(false);
    clearTimeout(fallbackTimer);
    instance.ticker.maxFPS=60;
    let scroll=0,scrollSpeed=live.current.speed,lastPlaneX=.5,bankDirection=0,bankUntil=0;
    const readyScheduled=new Set<number>();
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let layoutW=0,layoutH=0,landH=0,landY=0,objectHeight=0,objectStride=0,objectY=0,cloudHeight=0,cloudStride=0,cloudY=0;
    const drawGate=(gate:ReturnType<typeof makeGate>,w:number,h:number,y:number,words:{left:string;right:string;stage:string})=>{
     const gateH=Math.max(37,Math.min(65,h*.09)),gateWidth=w*.49;
     gate.group.y=y;
     if(gate.layoutWidth!==w||gate.layoutHeight!==h){
      gate.layoutWidth=w;gate.layoutHeight=h;
      gate.panels.forEach((panel,index)=>{panel.width=gateWidth;panel.height=gateH;panel.position.set(w*(index===0?.25:.75),0);});
      gate.labels.forEach((label,index)=>{label.style.fontSize=Math.max(15,Math.min(31,w*.067));label.position.set(w*(index===0?.25:.75),-gateH*.83);});
     }
     gate.labels.forEach((label,index)=>{const value=index===0?words.left:words.right;if(label.text!==value)label.text=value;});
    };
    instance.ticker.add(tick=>{
     const w=instance.screen.width,h=instance.screen.height,info=live.current;
     if(info.challenge.id!==gateId){departing.push({gate:current,wave:currentWave});current=makeGate();instance.stage.addChildAt(current.group,instance.stage.getChildIndex(plane));gateId=info.challenge.id;}
     currentWave={challenge:info.challenge,startsAt:info.startsAt};
     scrollSpeed+=(info.speed-scrollSpeed)*Math.min(1,tick.deltaMS/350);
     scroll+=Math.min(tick.deltaMS,100)*scrollSpeed*.058;
     if(w!==layoutW||h!==layoutH){
      layoutW=w;layoutH=h;
      const landCover=Math.max(w/landTexture.width,h/landTexture.height),landX=(w-landTexture.width*landCover)/2;
      landH=landTexture.height*landCover;landY=(h-landH)/2;
      land.forEach(sprite=>{sprite.scale.set(landCover);sprite.x=landX;});
      const objectScale=Math.min(w/1024,h/500);objectHeight=1536*objectScale;objectStride=objectHeight;objectY=Math.min(0,(h-objectHeight)/2);
      objects.forEach((row,side)=>row.forEach(sprite=>{sprite.scale.set(objectScale);sprite.x=side===0?0:w-512*objectScale;}));
      const cloudCover=w<h?w/cloudTexture.width:Math.max(w/cloudTexture.width,h/cloudTexture.height),cloudX=(w-cloudTexture.width*cloudCover)/2;
      cloudHeight=cloudTexture.height*cloudCover;cloudStride=cloudHeight;cloudY=Math.min(0,(h-cloudHeight)/2);
      clouds.forEach(sprite=>{sprite.scale.set(cloudCover);sprite.x=cloudX;});
      planeWord.style.fontSize=Math.max(17,Math.min(25,w*.055));
      impactFlash.clear().rect(0,0,w,h).fill(0xffffff);
      const radius=Math.min(w,h)*.105;speedBurst.clear();for(let ray=0;ray<12;ray++){const angle=ray*Math.PI/6;speedBurst.moveTo(Math.cos(angle)*radius,Math.sin(angle)*radius).lineTo(Math.cos(angle)*radius*1.45,Math.sin(angle)*radius*1.45).stroke({width:Math.max(3,radius*.1),color:ray%2?0xffdc4a:0xffffff,cap:'round'});}speedText.style.fontSize=Math.max(26,Math.min(48,w*.105));
     }
     land.forEach((sprite,j)=>{const {top}=descendingFlightTile(scroll*.6,landH,landY,j-1);sprite.visible=top<h&&top+landH>0;if(sprite.visible)sprite.y=top;});
     objects.forEach(row=>row.forEach((sprite,j)=>{const {top}=descendingFlightTile(scroll*.82,objectStride,objectY,j-1);sprite.visible=top<h&&top+objectHeight>0;if(sprite.visible)sprite.y=top;}));
     clouds.forEach((sprite,j)=>{const {top}=descendingFlightTile(scroll*1.06,cloudStride,cloudY,j-1);sprite.visible=top<h&&top+cloudHeight>0;if(sprite.visible)sprite.y=top;});
     const gateH=Math.max(37,Math.min(65,h*.09)),planeSize=Math.min(90,Math.max(44,Math.min(w*.22,h*.15))),nowServer=Date.now()+info.serverOffset;
     const y=flightGateCenterY(nowServer,info.startsAt,info.challenge.deadline,h,gateH,planeSize);
     drawGate(current,w,h,y,info.challenge);current.group.visible=y<h+gateH*2;
     if(info.challenge.awaitingReady&&!readyIds.current.has(info.challenge.id)&&!readyScheduled.has(info.challenge.id)){
      const id=info.challenge.id;readyScheduled.add(id);requestAnimationFrame(()=>{readyScheduled.delete(id);if(live.current.challenge.id===id)signalReady(id);});
     }
     for(let i=departing.length-1;i>=0;i--){const {gate,wave}=departing[i],oldY=flightGateCenterY(nowServer,wave.startsAt,wave.challenge.deadline,h,gateH,planeSize);
      if(oldY>h+gateH*2){instance.stage.removeChild(gate.group);gate.group.destroy({children:true});departing.splice(i,1);}else drawGate(gate,w,h,oldY,wave.challenge);
     }
     const crash=info.crashStartedAt!==undefined,crashProgress=crash?Math.max(0,Math.min(1,(Date.now()-info.crashStartedAt!)/1500)):0;
     const shrink=crash?Math.max(.03,1-crashProgress*crashProgress*.97):1,planeY=h*.83+crashProgress*crashProgress*h*.17;
     const targetSize=planeSize*shrink;if(plane.width!==targetSize){plane.width=targetSize;plane.height=targetSize;}plane.position.set(w*info.planeX,planeY);plane.rotation=crashProgress*Math.PI*5;plane.alpha=1-crashProgress*.95;
     const wordText=info.showWord?`${info.word[0].toUpperCase()+info.word.slice(1)}의 ${info.challenge.stage==='past'?'과거형':'과거분사'}`:'';if(planeWord.text!==wordText)planeWord.text=wordText;
     planeWord.visible=info.showWord&&!crash&&y<h*.83-planeSize*.48;planeWord.position.set(w*.5,Math.min(y+gateH*.58,planeY-planeSize*.68));
     const now=performance.now();if(!crash&&Math.abs(info.planeX-lastPlaneX)>.012){bankDirection=info.planeX<lastPlaneX?-1:1;bankUntil=now+360;}lastPlaneX=info.planeX;
     const banked=!crash&&now<bankUntil,bankState=banked?(bankDirection<0?'left':'right'):'straight';if(node.dataset.bank!==bankState)node.dataset.bank=bankState;
     const frame=banked?(bankDirection<0?4:12)+Math.floor(now/90)%4:0;if(plane.texture!==planeFrames[frame])plane.texture=planeFrames[frame];
     const impactElapsed=info.impact?Date.now()-info.impact.at:Infinity,impactProgress=Math.max(0,Math.min(1,impactElapsed/360));
     if(info.impact&&impactElapsed>=0&&impactProgress<1){
      const decay=(1-impactProgress)**2,shake=!reducedMotion&&info.impact.kind==='collision',force=8;
      instance.stage.position.set(shake?Math.sin(impactElapsed*.12)*force*decay:0,shake?Math.cos(impactElapsed*.17)*force*.65*decay:0);
      impactFlash.visible=true;impactFlash.tint=info.impact.kind==='collision'?0xff6673:0xffe6a0;impactFlash.alpha=(reducedMotion ? .08 : .24)*decay;
     }else{instance.stage.position.set(0,0);impactFlash.visible=false;}
     const speedElapsed=info.speedUpAt===undefined?Infinity:Date.now()-info.speedUpAt,speedProgress=Math.max(0,Math.min(1,speedElapsed/1000));
     speedText.visible=speedBurst.visible=speedElapsed>=0&&speedProgress<1;if(speedText.visible){const fade=Math.min(1,speedElapsed/110)*(1-speedProgress)**.65;speedText.position.set(w*.5,h*.29);speedText.alpha=fade;speedText.scale.set(.55+speedProgress*.65);speedBurst.position.set(w*.5,h*.29);speedBurst.alpha=fade*.9;speedBurst.rotation=speedProgress*.55;speedBurst.scale.set(.75+speedProgress*.65);}
    });
    const visible=()=>{if(document.hidden)instance.ticker.stop();else if(node.dataset.renderer==='pixi')instance.ticker.start();};document.addEventListener('visibilitychange',visible);cleanupVisibility=()=>document.removeEventListener('visibilitychange',visible);
    unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();node.dataset.renderer='fallback';fallbackReady.current=true;setFallback(true);});
    observer=new ResizeObserver(()=>{if(disposed)return;const width=Math.max(1,node.clientWidth),height=Math.max(1,node.clientHeight);if(width!==instance.screen.width||height!==instance.screen.height)instance.renderer.resize(width,height);});observer.observe(node);
    if(document.hidden)instance.ticker.stop();
   }catch{if(!disposed){node.dataset.renderer='fallback';setFallback(true);clearTimeout(fallbackTimer);fallbackReady.current=true;signalReady(live.current.challenge.id);}}
  })();
  return()=>{disposed=true;clearTimeout(fallbackTimer);observer?.disconnect();cleanupVisibility();unwatch();app?.destroy(true,{children:true});};
 },[]);
 const h=host.current?.clientHeight??600,w=host.current?.clientWidth??390,gateH=Math.max(37,Math.min(65,h*.09)),planeSize=Math.min(90,Math.max(44,Math.min(w*.22,h*.15))),now=fallbackClock+serverOffset;
 const fallbackGates=[...outgoing.current,{challenge,startsAt}].filter(wave=>flightGateCenterY(now,wave.startsAt,wave.challenge.deadline,h,gateH,planeSize)<h+gateH*2);
 outgoing.current=fallbackGates.filter(wave=>wave.challenge.id!==challenge.id);
 const currentGateY=flightGateCenterY(now,startsAt,challenge.deadline,h,gateH,planeSize);
 return <div className={`flight-scene${crashStartedAt!==undefined?' is-crashing':''}${impact?' is-impact-'+impact.kind:''}`} ref={host} data-word={showWord?word:''} data-stage-word={showWord?`${word[0].toUpperCase()+word.slice(1)}의 ${challenge.stage==='past'?'과거형':'과거분사'}`:''} data-gate-id={challenge.id} data-gate-y={Math.round(currentGateY)} data-impact={impact?.kind??''} data-speed-up={speedUpAt!==undefined?'true':'false'} aria-hidden="true">{fallback&&<><span className="flight-fallback-object-layer"/><span className="flight-fallback-cloud-layer"/>{fallbackGates.map(wave=><div key={wave.challenge.id} className="flight-fallback-gates" style={{top:`${flightGateCenterY(now,wave.startsAt,wave.challenge.deadline,h,gateH,planeSize)/h*100}%`}}><span>{wave.challenge.left}</span><span>{wave.challenge.right}</span></div>)}{showWord&&currentGateY<h*.83-planeSize*.48&&<span className="flight-plane-word-fallback" style={{left:'50%',top:`${Math.min(currentGateY+gateH*.58,h*.83-planeSize*.68)/h*100}%`}}>{word[0].toUpperCase()+word.slice(1)}의 {challenge.stage==='past'?'과거형':'과거분사'}</span>}<span className="flight-plane-fallback" style={{left:`${planeX*100}%`}}/>{speedUpAt!==undefined&&<span className="flight-speed-up-fallback">Speed Up!</span>}</>}</div>;
}
export const FlightScene=memo(FlightSceneView);
