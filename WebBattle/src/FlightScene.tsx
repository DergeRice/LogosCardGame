import {useEffect,useRef,useState} from 'react';
import type {Application} from 'pixi.js';
import type {FlightPublicChallenge} from '../shared/flightGame.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';

type Props={challenge:FlightPublicChallenge;speed:number;progress:number;planeX:number;coinResolved:boolean;hazardResolved:boolean};
export function FlightScene({challenge,speed,progress,planeX,coinResolved,hazardResolved}:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef({challenge,speed,progress,planeX,coinResolved,hazardResolved}),[fallback,setFallback]=useState(false);
 live.current={challenge,speed,progress,planeX,coinResolved,hazardResolved};
 useEffect(()=>{
  const node=host.current;if(!node)return;
  let disposed=false,app:Application|undefined,observer:ResizeObserver|undefined,unwatch=()=>{},cleanupVisibility=()=>{};
  void (async()=>{
   try{
    const {Application,Graphics,Text,Assets,Sprite}=await import('pixi.js');if(disposed)return;
    const instance=new Application();app=instance;
    await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:true,autoDensity:true,resolution:pixiResolution(),preference:'webgl',powerPreference:'low-power'});
    if(disposed){instance.destroy(true,{children:true});return;}
    const art=new Graphics(),labels=(['left','right'] as const).map(()=>new Text({text:'',style:{fontFamily:'Arial, "Malgun Gothic", sans-serif',fontSize:28,fontWeight:'900',fill:0xffffff,align:'center'}}));
    instance.stage.addChild(art,...labels);node.append(instance.canvas);node.dataset.renderer='pixi';
    let planeSprite:InstanceType<typeof Sprite>|undefined;
    void Assets.load('/flight/plane.png').then(texture=>{if(!disposed){planeSprite=new Sprite(texture);planeSprite.anchor.set(.5);instance.stage.addChild(planeSprite);}}).catch(()=>{ /* Vector plane remains available if the sprite is offline. */ });
    instance.ticker.maxFPS=isMobileGraphics()?30:45;
    let stripe=0;
    instance.ticker.add(tick=>{
     const w=instance.screen.width,h=instance.screen.height,step=Math.min(tick.deltaMS,50)/16.67,info=live.current;
     stripe=(stripe+step*.016*info.speed)%1;
     const landscape=w>h,gateY=h*((landscape?.34:.28)+Math.min(1,Math.max(0,info.progress))*(landscape?.48:.54)),planeY=h*.82,gateW=w*.36,gateH=Math.max(16,Math.min(28,h*.04));
     art.clear();
     art.rect(0,0,w,h).fill(0x103d68);
     art.rect(w*.045,0,w*.91,h).fill(0x286d9a);
     art.rect(w*.045,0,3,h).fill({color:0xc7e7f7,alpha:.65});art.rect(w*.955,0,3,h).fill({color:0xc7e7f7,alpha:.65});
     for(let i=0;i<22;i++){const y=((i/22+stripe*(i%3===0?1.3:.7))%1)*h,x=w*(.08+((i*37)%83)/100);art.roundRect(x,y,2+(i%3)*2,12+(i%5)*8,3).fill({color:i%4===0?0xbaf3ff:0xffffff,alpha:.12+(i%3)*.08});}
     for(let i=0;i<6;i++){const y=((i/6+stripe*.35)%1)*h,x=w*(.13+((i*43)%73)/100);art.ellipse(x,y,26+(i%3)*18,5+(i%2)*3).fill({color:0xc5edff,alpha:.075});}
     for(let i=0;i<8;i++){const y=((i/8+stripe)%1)*h;art.roundRect(w*.497,y,w*.006,Math.max(12,h*.028),3).fill({color:0xd7f5ff,alpha:.3});}
     art.roundRect(w*.5-3,gateY-h*.12,6,h*.24,3).fill(0xe8f7ff).stroke({width:2,color:0x4aa9d5});
     for(const [index,lane] of (['left','right'] as const).entries()){
      const cx=w*(index===0?.275:.725),value=info.challenge[lane];
      art.roundRect(cx-gateW/2,gateY-gateH/2,gateW,gateH,5).fill(0x75d8fa).stroke({width:3,color:0xffffff});
      art.roundRect(cx-gateW/2,gateY-gateH/2-8,6,gateH+16,3).fill(0xffffff);
      art.roundRect(cx+gateW/2-6,gateY-gateH/2-8,6,gateH+16,3).fill(0xffffff);
      if(labels[index].text!==value)labels[index].text=value;
      const fontSize=Math.max(17,Math.min(38,w*.072,h*.075));if(labels[index].style.fontSize!==fontSize)labels[index].style.fontSize=fontSize;
      labels[index].anchor.set(.5,1);labels[index].position.set(cx,gateY-gateH/2-9);
     }
     if(info.challenge.hazardLane&&!info.hazardResolved&&info.progress>=.12&&info.progress<=.37){
      const cx=w*(info.challenge.hazardLane==='left'?.275:.725),cy=h*(.44+(info.progress-.12)*1.52),r=Math.min(23,w*.055,h*.05);
      art.circle(cx,cy,r*1.5).fill({color:0xff697c,alpha:.16});art.circle(cx,cy,r).fill(0xd73957).stroke({width:3,color:0xffc6cc});
      art.roundRect(cx-r*.85,cy-3,r*1.7,6,3).fill(0xffe5e6);art.roundRect(cx-3,cy-r*.85,6,r*1.7,3).fill(0xffe5e6);
     }
     if(info.challenge.coinLane&&!info.coinResolved&&info.progress>=.37&&info.progress<=.72){
      const cx=w*(info.challenge.coinLane==='left'?.275:.725),cy=h*(.52+(info.progress-.37)*.858),radius=Math.min(18,w*.05,h*.04);
      art.circle(cx,cy,radius*1.55).fill({color:0xffdb69,alpha:.2});art.circle(cx,cy,radius).fill(0xffd458).stroke({width:3,color:0xfff4ba});
      art.circle(cx,cy,radius*.57).stroke({width:2,color:0xd49524});
     }
     const px=w*info.planeX,u=Math.max(.45,Math.min(1.5,w/360,h/300));
     art.ellipse(px,planeY+30*u,37*u,12*u).fill({color:0x092c4a,alpha:.28});
     if(planeSprite){const size=Math.min(190,Math.max(130,Math.min(w*.45,h*.3)));planeSprite.width=size;planeSprite.height=size*planeSprite.texture.height/planeSprite.texture.width;planeSprite.position.set(px,planeY);}
     else{art.moveTo(px,planeY-39*u).lineTo(px+10*u,planeY+2*u).lineTo(px+36*u,planeY+14*u).lineTo(px+36*u,planeY+24*u).lineTo(px+8*u,planeY+18*u).lineTo(px+6*u,planeY+35*u).lineTo(px-6*u,planeY+35*u).lineTo(px-8*u,planeY+18*u).lineTo(px-36*u,planeY+24*u).lineTo(px-36*u,planeY+14*u).lineTo(px-10*u,planeY+2*u).closePath().fill(0xfffaf0).stroke({width:3*u,color:0x174976});art.roundRect(px-8*u,planeY-13*u,16*u,29*u,7*u).fill(0x20a8df).stroke({width:2,color:0x126998});art.circle(px,planeY-24*u,5*u).fill(0xffd158);art.moveTo(px-7*u,planeY+33*u).lineTo(px,planeY+(49+stripe*5)*u).lineTo(px+7*u,planeY+33*u).closePath().fill({color:0xffcf77,alpha:.8});}
    });
    const visible=()=>{if(document.hidden)instance.ticker.stop();else if(node.dataset.renderer==='pixi')instance.ticker.start();};document.addEventListener('visibilitychange',visible);cleanupVisibility=()=>document.removeEventListener('visibilitychange',visible);
    unwatch=watchContextLoss(instance.canvas,()=>{instance.ticker.stop();node.dataset.renderer='fallback';setFallback(true);});
    observer=new ResizeObserver(()=>{if(!disposed)instance.renderer.resize(Math.max(1,node.clientWidth),Math.max(1,node.clientHeight));});observer.observe(node);
    if(document.hidden)instance.ticker.stop();
   }catch{if(!disposed){node.dataset.renderer='fallback';setFallback(true);}}
  })();
  return()=>{disposed=true;observer?.disconnect();cleanupVisibility();unwatch();app?.destroy(true,{children:true});};
 },[]);
 return <div className="flight-scene" ref={host} aria-hidden="true">{fallback&&<><div className="flight-fallback-gates" style={{top:`${28+Math.min(1,Math.max(0,progress))*54}%`}}><span>{challenge.left}</span><span>{challenge.right}</span></div>{challenge.hazardLane&&!hazardResolved&&progress>=.12&&progress<=.37&&<span className="flight-hazard-fallback" style={{left:challenge.hazardLane==='left'?'27.5%':'72.5%',top:`${(44+(progress-.12)*152)}%`}}/>}{challenge.coinLane&&!coinResolved&&progress>=.37&&progress<=.72&&<span className="flight-coin-fallback" style={{left:challenge.coinLane==='left'?'27.5%':'72.5%',top:`${(52+(progress-.37)*85.8)}%`}}/>}<span className="flight-plane-fallback" style={{left:`${planeX*100}%`}}/></>}</div>;
}
