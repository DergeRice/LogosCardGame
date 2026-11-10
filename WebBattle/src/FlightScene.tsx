import {useEffect,useRef,useState} from 'react';
import type {Application} from 'pixi.js';
import type {FlightPublicChallenge} from '../shared/flightGame.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';

type Props={challenge:FlightPublicChallenge;speed:number;progress:number;planeX:number;coinResolved:boolean;hazardResolved:boolean};
const FLIGHT_ART=['/flight/land.webp','/flight/objects.webp','/flight/clouds.webp','/flight/gate.webp','/flight/plane.webp','/currency/coin.webp'];
let artPromise:Promise<unknown[]>|undefined;
export function preloadFlightArt(){return artPromise??=import('pixi.js').then(({Assets})=>Promise.all(FLIGHT_ART.map(path=>Assets.load(path)))).catch(error=>{artPromise=undefined;throw error;});}
export function FlightScene({challenge,speed,progress,planeX,coinResolved,hazardResolved}:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef({challenge,speed,progress,planeX,coinResolved,hazardResolved}),[fallback,setFallback]=useState(true);
 live.current={challenge,speed,progress,planeX,coinResolved,hazardResolved};
 useEffect(()=>{
  const node=host.current;if(!node)return;node.dataset.renderer='fallback';
  let disposed=false,app:Application|undefined,observer:ResizeObserver|undefined,unwatch=()=>{},cleanupVisibility=()=>{};
  void (async()=>{
   try{
    const {Application,Graphics,Rectangle,Sprite,Text,Texture}=await import('pixi.js');if(disposed)return;
    const instance=new Application();app=instance;
    await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:true,autoDensity:true,resolution:pixiResolution(),preference:'webgl',powerPreference:'low-power'});
    if(disposed){instance.destroy(true,{children:true});return;}
    const [landTexture,objectTexture,cloudTexture,gateTexture,planeTexture,coinTexture]=await preloadFlightArt();
    if(disposed){instance.destroy(true,{children:true});return;}
    const land=new Sprite(landTexture),objects=new Sprite(objectTexture),clouds=new Sprite(cloudTexture);
    const rock=new Sprite(new Texture({source:objectTexture.source,frame:new Rectangle(824,35,200,180)}));rock.anchor.set(.5);
    const coin=new Sprite(coinTexture);coin.anchor.set(.5);
    const gates=(['left','right'] as const).map((_,index)=>new Sprite(new Texture({source:gateTexture.source,frame:new Rectangle(index*1086,160,1086,370)})));
    gates.forEach(gate=>gate.anchor.set(.5));
    const divider=new Graphics(),labels=(['left','right'] as const).map(()=>new Text({text:'',style:{fontFamily:'Arial, "Malgun Gothic", sans-serif',fontSize:26,fontWeight:'900',fill:0x123a60,stroke:{color:0xeaffff,width:4},align:'center'}}));
    labels.forEach(label=>label.anchor.set(.5));
    const plane=new Sprite(planeTexture);plane.anchor.set(.5);
    instance.stage.addChild(land,objects,rock,coin,...gates,divider,...labels,clouds,plane);
    node.append(instance.canvas);node.dataset.renderer='pixi';setFallback(false);
    instance.ticker.maxFPS=isMobileGraphics()?30:45;
    let scroll=0;
    instance.ticker.add(tick=>{
     const w=instance.screen.width,h=instance.screen.height,info=live.current;
     scroll=(scroll+Math.min(tick.deltaMS,50)*info.speed*.015)%h;
     const cover=Math.max(w/1024,h/1536),baseX=(w-1024*cover)/2,baseY=(h-1536*cover)/2;
     for(const sprite of [land,objects,clouds]){sprite.scale.set(cover);sprite.position.set(baseX,baseY);}
     objects.y+=Math.sin(scroll/h*Math.PI*2)*h*.012;
     clouds.y+=Math.sin(scroll/h*Math.PI*2)*h*.026;clouds.alpha=.62;
     const p=Math.min(1,Math.max(0,info.progress)),laneX=(side:'left'|'right')=>w*(side==='left'?.275:.725),planeY=h*.83;
     const gateY=h*(.18+p*.65),gateH=Math.max(48,Math.min(94,h*.115)),gateWidth=w*.47;
     gates.forEach((gate,index)=>{gate.visible=info.progress>=0;gate.width=gateWidth;gate.height=gateH;gate.position.set(w*(index===0?.265:.735),gateY);});
     divider.clear();if(info.progress>=0)divider.roundRect(w*.5-2,gateY-gateH*.47,4,gateH*.94,2).fill({color:0x145889,alpha:.75});
     labels.forEach((label,index)=>{label.visible=info.progress>=0;const value=info.challenge[index===0?'left':'right'];if(label.text!==value)label.text=value;label.style.fontSize=Math.max(15,Math.min(31,w*.067,gateH*.36));label.position.set(w*(index===0?.265:.735),gateY-gateH*.02);});
     const showRock=Boolean(info.challenge.hazardLane&&!info.hazardResolved&&p>=.1&&p<=.4);
     rock.visible=showRock;if(showRock){const size=Math.min(64,w*.17,h*.13);rock.width=size;rock.height=size*.83;rock.position.set(laneX(info.challenge.hazardLane!),h*(.07+(p-.1)*3.04));}
     const showCoin=Boolean(info.challenge.coinLane&&!info.coinResolved&&p>=.4&&p<=.73);
     coin.visible=showCoin;if(showCoin){const size=Math.min(42,w*.1,h*.075);coin.width=size;coin.height=size;coin.position.set(laneX(info.challenge.coinLane!),h*(.05+(p-.4)*2.6));}
     const size=Math.min(90,Math.max(44,Math.min(w*.22,h*.15)));plane.width=size;plane.height=size;plane.position.set(w*info.planeX,planeY);
    });
    const visible=()=>{if(document.hidden)instance.ticker.stop();else if(node.dataset.renderer==='pixi')instance.ticker.start();};document.addEventListener('visibilitychange',visible);cleanupVisibility=()=>document.removeEventListener('visibilitychange',visible);
    unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();node.dataset.renderer='fallback';setFallback(true);});
    observer=new ResizeObserver(()=>{if(!disposed)instance.renderer.resize(Math.max(1,node.clientWidth),Math.max(1,node.clientHeight));});observer.observe(node);
    if(document.hidden)instance.ticker.stop();
   }catch{if(!disposed){node.dataset.renderer='fallback';setFallback(true);}}
  })();
  return()=>{disposed=true;observer?.disconnect();cleanupVisibility();unwatch();app?.destroy(true,{children:true});};
 },[]);
 return <div className="flight-scene" ref={host} aria-hidden="true">{fallback&&<>{progress>=0&&<div className="flight-fallback-gates" style={{top:`${18+Math.min(1,Math.max(0,progress))*65}%`}}><span>{challenge.left}</span><span>{challenge.right}</span></div>}{challenge.hazardLane&&!hazardResolved&&progress>=.1&&progress<=.4&&<span className="flight-hazard-fallback" style={{left:challenge.hazardLane==='left'?'27.5%':'72.5%',top:`${7+(progress-.1)*304}%`}}/>}{challenge.coinLane&&!coinResolved&&progress>=.4&&progress<=.73&&<span className="flight-coin-fallback" style={{left:challenge.coinLane==='left'?'27.5%':'72.5%',top:`${5+(progress-.4)*260}%`}}/>}<span className="flight-plane-fallback" style={{left:`${planeX*100}%`}}/></>}</div>;
}
