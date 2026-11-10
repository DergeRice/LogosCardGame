import {useEffect,useRef,useState} from 'react';
import type {Application} from 'pixi.js';
import type {FlightPublicChallenge} from '../shared/flightGame.js';
import {descendingFlightTile} from '../shared/flightVisual.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';

type Props={challenge:FlightPublicChallenge;speed:number;progress:number;planeX:number};
const OBJECT_ART=['tree-a','house-a','tree-b','rocks-a','tree-c','rocks-b','tree-d','house-b','tree-e','house-c','tree-f'].map(name=>`/flight/objects/${name}.webp`);
const CLOUD_ART=['cloud-a','cloud-b','cloud-c','cloud-d'].map(name=>`/flight/clouds/${name}.webp`);
const FLIGHT_ART=['/flight/land.webp',...OBJECT_ART,...CLOUD_ART,'/flight/gate.webp','/flight/plane-banking.webp','/flight/plane.webp'];
let artPromise:Promise<unknown[]>|undefined;
export function preloadFlightArt(){return artPromise??=import('pixi.js').then(({Assets})=>Promise.all(FLIGHT_ART.map(path=>Assets.load(path)))).catch(error=>{artPromise=undefined;throw error;});}

export function FlightScene({challenge,speed,progress,planeX}:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef({challenge,speed,progress,planeX}),[fallback,setFallback]=useState(true);
 live.current={challenge,speed,progress,planeX};
 useEffect(()=>{
  const node=host.current;if(!node)return;node.dataset.renderer='fallback';
  let disposed=false,app:Application|undefined,observer:ResizeObserver|undefined,unwatch=()=>{},cleanupVisibility=()=>{};
  void (async()=>{
   try{
    const {Application,Container,Graphics,Rectangle,Sprite,Text,Texture}=await import('pixi.js');if(disposed)return;
    const instance=new Application();app=instance;
    await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:true,autoDensity:true,resolution:pixiResolution(),preference:'webgl',powerPreference:'low-power'});
    if(disposed){instance.destroy(true,{children:true});return;}
    const art=await preloadFlightArt(),landTexture=art[0],objectTextures=art.slice(1,1+OBJECT_ART.length),cloudTextures=art.slice(1+OBJECT_ART.length,1+OBJECT_ART.length+CLOUD_ART.length),gateTexture=art.at(-3),planeSheet=art.at(-2);
    if(disposed){instance.destroy(true,{children:true});return;}
    const land=Array.from({length:3},()=>new Sprite(landTexture));
    const objects=objectTextures.map(texture=>{const sprite=new Sprite(texture);sprite.anchor.set(.5);return sprite;});
    const clouds=cloudTextures.map(texture=>{const sprite=new Sprite(texture);sprite.anchor.set(.5);sprite.alpha=.44;return sprite;});
    const halves=[0,1].map(index=>new Texture({source:gateTexture.source,frame:new Rectangle(index*1086,160,1086,370)}));
    const planeFrames=Array.from({length:16},(_,index)=>new Texture({source:planeSheet.source,frame:new Rectangle(index%4*200,Math.floor(index/4)*200,200,200)}));
    const makeGate=()=>{
     const group=new Container(),panels=halves.map(texture=>new Sprite(texture)),divider=new Graphics(),labels=halves.map(()=>new Text({text:'',style:{fontFamily:'Arial, "Malgun Gothic", sans-serif',fontSize:26,fontWeight:'900',fill:0x123a60,stroke:{color:0xeaffff,width:4},align:'center'}})),stageLabel=new Text({text:'',style:{fontFamily:'Arial, "Malgun Gothic", sans-serif',fontSize:18,fontWeight:'900',fill:0xffffff,stroke:{color:0x17476b,width:5},align:'center'}});
     panels.forEach(panel=>panel.anchor.set(.5));labels.forEach(label=>label.anchor.set(.5));stageLabel.anchor.set(.5,1);
     group.addChild(...panels,divider,...labels,stageLabel);
     return {group,panels,divider,labels,stageLabel};
    };
    const outgoing=makeGate(),current=makeGate(),engine=new Graphics(),plane=new Sprite(planeFrames[0]);plane.anchor.set(.5);
    instance.stage.addChild(...land,...objects,...clouds,outgoing.group,current.group,engine,plane);
    node.append(instance.canvas);node.dataset.renderer='pixi';setFallback(false);
    instance.ticker.maxFPS=isMobileGraphics()?30:45;
    let scroll=0,lastId=live.current.challenge.id,lastY=-.22,lastPlaneX=.5,bankDirection=0,bankUntil=0,outAt=-1,outFrom=.83,outWords={left:'',right:'',stage:'past'};
    const drawGate=(gate:ReturnType<typeof makeGate>,w:number,h:number,y:number,words:{left:string;right:string;stage:string})=>{
     const gateH=Math.max(48,Math.min(94,h*.115)),gateWidth=w*.47;
     gate.group.y=y*h;
     gate.panels.forEach((panel,index)=>{panel.width=gateWidth;panel.height=gateH;panel.position.set(w*(index===0?.265:.735),0);});
     gate.divider.clear().roundRect(w*.5-2,-gateH*.47,4,gateH*.94,2).fill({color:0x145889,alpha:.75});
     gate.labels.forEach((label,index)=>{const value=index===0?words.left:words.right;if(label.text!==value)label.text=value;label.style.fontSize=Math.max(15,Math.min(31,w*.067,gateH*.36));label.position.set(w*(index===0?.265:.735),-gateH*.02);});
     const stage=words.stage==='participle'?'과거분사':'과거형';if(gate.stageLabel.text!==stage)gate.stageLabel.text=stage;gate.stageLabel.style.fontSize=Math.max(14,Math.min(21,w*.045));gate.stageLabel.position.set(w*.5,-gateH*.55-4);gate.stageLabel.visible=y*h>Math.max(61,gateH*.7);
    };
    instance.ticker.add(tick=>{
     const w=instance.screen.width,h=instance.screen.height,info=live.current;
     scroll+=Math.min(tick.deltaMS,50)*info.speed*.058;
     const cover=Math.max(w/1024,h/1536),tileH=1536*cover,baseX=(w-1024*cover)/2,baseY=(h-tileH)/2;
     land.forEach((sprite,j)=>{const {top,flipped}=descendingFlightTile(scroll*.6,tileH,baseY,j-1);sprite.scale.set(cover,flipped?-cover:cover);sprite.position.set(baseX,top+(flipped?tileH:0));});
     const objectPeriod=Math.max(h*2.5,900),objectWidth=Math.min(w*.36,Math.max(92,h*.29));
     objects.forEach((sprite,j)=>{sprite.width=objectWidth*(j%3===0?.92:1);sprite.height=sprite.width*sprite.texture.height/sprite.texture.width;const side=j%2===0?-1:1,x=w*(side<0?.11:.89)+side*(j%3-1)*w*.025;sprite.position.set(x,((j/objects.length*objectPeriod+scroll*.88)%objectPeriod)-objectWidth*.65);});
     const cloudPeriod=Math.max(h*2.1,740),cloudWidth=Math.min(w*.7,Math.max(145,h*.48));
     clouds.forEach((sprite,j)=>{sprite.width=cloudWidth*(j%2===0?1:.78);sprite.height=sprite.width*sprite.texture.height/sprite.texture.width;sprite.position.set(w*(j%2===0?.09:.91),((j/clouds.length*cloudPeriod+scroll*1.08)%cloudPeriod)-cloudWidth*.7);});
     if(info.challenge.id!==lastId){outWords={left:current.labels[0].text,right:current.labels[1].text,stage:current.stageLabel.text==='과거분사'?'participle':'past'};outFrom=Math.max(.75,lastY);outAt=performance.now();lastId=info.challenge.id;}
     const p=Math.max(0,Math.min(1.25,info.progress)),y=-.22+p*1.05;lastY=y;
     drawGate(current,w,h,y,info.challenge);current.group.visible=info.progress>=0;
     const elapsed=performance.now()-outAt;
     outgoing.group.visible=outAt>=0&&elapsed<650;
     if(outgoing.group.visible){drawGate(outgoing,w,h,outFrom+elapsed/650*.38,outWords);outgoing.group.alpha=1-elapsed/650;}
     const size=Math.min(90,Math.max(44,Math.min(w*.22,h*.15)));plane.width=size;plane.height=size;plane.position.set(w*info.planeX,h*.83);
     const now=performance.now();if(Math.abs(info.planeX-lastPlaneX)>.012){bankDirection=info.planeX<lastPlaneX?-1:1;bankUntil=now+360;}lastPlaneX=info.planeX;
     const banked=now<bankUntil,bankState=banked?(bankDirection<0?'left':'right'):'straight';if(node.dataset.bank!==bankState)node.dataset.bank=bankState;
     const frame=banked?(bankDirection<0?4:12)+Math.floor(now/90)%4:0;if(plane.texture!==planeFrames[frame])plane.texture=planeFrames[frame];
     engine.clear();for(let i=0;i<3;i++){const flicker=(scroll*.1+i*9)%16;engine.circle(w*info.planeX+(i-1)*size*.1,h*.83+size*.39+flicker,size*(.045+i*.012)).fill({color:i===1?0xffd975:0x9bedff,alpha:.55-flicker*.025});}
    });
    const visible=()=>{if(document.hidden)instance.ticker.stop();else if(node.dataset.renderer==='pixi')instance.ticker.start();};document.addEventListener('visibilitychange',visible);cleanupVisibility=()=>document.removeEventListener('visibilitychange',visible);
    unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();node.dataset.renderer='fallback';setFallback(true);});
    observer=new ResizeObserver(()=>{if(!disposed)instance.renderer.resize(Math.max(1,node.clientWidth),Math.max(1,node.clientHeight));});observer.observe(node);
    if(document.hidden)instance.ticker.stop();
   }catch{if(!disposed){node.dataset.renderer='fallback';setFallback(true);}}
  })();
  return()=>{disposed=true;observer?.disconnect();cleanupVisibility();unwatch();app?.destroy(true,{children:true});};
 },[]);
 return <div className="flight-scene" ref={host} aria-hidden="true">{fallback&&<>{OBJECT_ART.slice(0,6).map((art,index)=><span key={art} className="flight-fallback-object" style={{left:index%2===0?'2%':'76%',top:`${index*18-20}%`,backgroundImage:`url('${art}')`,animationDelay:`-${index*1.4}s`}}/>)}{CLOUD_ART.map((art,index)=><span key={art} className="flight-fallback-cloud" style={{left:index%2===0?'-5%':'65%',top:`${index*29-25}%`,backgroundImage:`url('${art}')`,animationDelay:`-${index*2.3}s`}}/>)}{progress>=0&&<div className="flight-fallback-gates" style={{top:`${Math.max(-22,-22+Math.min(1.25,progress)*105)}%`}}><b className="flight-fallback-stage">{challenge.stage==='past'?'과거형':'과거분사'}</b><span>{challenge.left}</span><span>{challenge.right}</span></div>}<span className="flight-plane-fallback" style={{left:`${planeX*100}%`}}/></>}</div>;
}
