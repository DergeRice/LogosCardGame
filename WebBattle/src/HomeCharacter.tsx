import {useEffect,useRef,useState} from 'react';
import type {Application,Sprite} from 'pixi.js';
import {homeCharacterLayout} from './homeCharacterLayout.js';
import {HOME_CHARACTERS} from '../shared/homeCharacters.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';
import {isUnityWebView} from './unityWebView.js';
import './home-character.css';

export function HomeCharacter({character,speech,onInteract}:{character:{id:string;name:string;image:string};speech?:{text:string;serial:number};onInteract:()=>void}){
 const poses=HOME_CHARACTERS.find(c=>c.id===character.id)?.poses??[{image:character.image,name:character.name,id:character.id}];
 const [index,setIndex]=useState(0),[renderer,setRenderer]=useState('loading'),host=useRef<HTMLDivElement>(null),imageRef=useRef<HTMLImageElement>(null),source=poses[index%poses.length];
 const sourceRef=useRef(source.image),loadRef=useRef<((url:string)=>Promise<void>)|null>(null),pressed=useRef(-Infinity);sourceRef.current=source.image;
 const speechRef=useRef(speech),speakRef=useRef<(()=>void)|null>(null);speechRef.current=speech;
 useEffect(()=>{speakRef.current?.()},[speech?.serial]);
 useEffect(()=>{void loadRef.current?.(source.image)},[source.image]);
 useEffect(()=>{const image=imageRef.current,stage=host.current?.parentElement?.parentElement;if(!image||!stage)return;const sync=()=>{if(!image.naturalWidth)return;const layout=homeCharacterLayout(stage.clientWidth,stage.clientHeight,image.naturalWidth,image.naturalHeight,matchMedia('(orientation:portrait) and (max-width:750px)').matches,matchMedia('(orientation:landscape) and (max-height:540px)').matches);Object.assign(image.style,{width:layout.width+'px',height:layout.height+'px',left:layout.x-layout.width/2+'px',top:layout.head+'px',right:'auto',bottom:'auto',transform:'none'});stage.style.setProperty('--home-head-y',layout.head+'px');};image.addEventListener('load',sync);const observer=new ResizeObserver(sync);observer.observe(stage);sync();return()=>{image.removeEventListener('load',sync);observer.disconnect()};},[source.image]);
 useEffect(()=>{
  const node=host.current;if(!node)return;
  if(isUnityWebView()){setRenderer('fallback');return;}
  let disposed=false,initialized=false,app:Application|undefined,sprite:Sprite|undefined,sequence=0,elapsed=0,failed=false,unwatch=()=>{},observer:ResizeObserver|undefined;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),landscapeMedia=matchMedia('(orientation:landscape) and (max-height:540px)'),portraitMedia=matchMedia('(orientation:portrait) and (max-width:750px)');
  const fallback=()=>{if(disposed)return;failed=true;app?.ticker?.stop();setRenderer('fallback')};
  const nativeReady=()=>{if(isUnityWebView())fallback()};
  window.addEventListener('logos-native-ready',nativeReady);
  const watchdog=setTimeout(fallback,3000);
  const visibility=()=>{if(!app||!initialized)return;if(document.hidden||reduced.matches||failed)app.ticker.stop();else app.ticker.start();};
  void(async()=>{try{
   const {Application,Assets,Sprite,Container,Graphics,Text}=await import('pixi.js');if(disposed)return;
   const instance=new Application();app=instance;
   await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:true,autoDensity:true,resolution:pixiResolution(true),preference:'webgl',powerPreference:'low-power'});initialized=true;
   if(disposed){instance.destroy(true,{children:true});return;}instance.ticker.stop();instance.ticker.maxFPS=isMobileGraphics()?24:30;
   const actor=new Sprite();sprite=actor;actor.anchor.set(.5);instance.stage.addChild(actor);node.append(instance.canvas);
   const bubble=new Container(),bubbleShape=new Graphics(),bubbleText=new Text({text:'',style:{fontFamily:'Arial, "Malgun Gothic", sans-serif',fontSize:14,fontWeight:'600',fill:0x385445,wordWrap:true,breakWords:true,wordWrapWidth:260,align:'center',lineHeight:21}});
   let bubbleHeight=46;
   bubble.addChild(bubbleShape,bubbleText);instance.stage.addChild(bubble);let speechElapsed=0,layoutWidth=-1;
   const landscape=()=>landscapeMedia.matches;
   const layoutSpeech=()=>{const side=landscape(),width=Math.max(80,side?Math.min(220,instance.screen.width*.48):Math.min(300,instance.screen.width-24));bubbleText.style.fontSize=side?13:14;bubbleText.style.lineHeight=side?19:21;bubbleText.style.wordWrapWidth=width-32;bubbleText.text=speechRef.current?.text??'';const height=Math.max(46,bubbleText.height+24),tail=side?-width/2+22:0;bubbleHeight=height;bubbleText.position.set(-bubbleText.width/2,-height-10+(height-bubbleText.height)/2);bubbleShape.clear().roundRect(-width/2,-height-10,width,height,18).fill({color:0xfffdf5,alpha:.98}).stroke({color:0xd4dfc8,width:2}).moveTo(tail-8,-10).lineTo(tail,0).lineTo(tail+12,-10).fill(0xfffdf5);bubble.pivot.set(0,-height/2-10);bubble.position.set(side?instance.screen.width-width/2-8:instance.screen.width/2,(side?32:8)+height/2);layoutWidth=instance.screen.width;};
   const draw=()=>{
    if(!sprite||!sprite.texture.width)return;
    const w=instance.screen.width,h=node.parentElement!.clientHeight,layout=homeCharacterLayout(w,h,sprite.texture.width,sprite.texture.height,portraitMedia.matches,landscape()),base=layout.scale,pulse=Math.max(0,1-(performance.now()-pressed.current)/450);
    const breath=reduced.matches?0:Math.sin(elapsed/1100),bounce=reduced.matches?0:Math.sin(pulse*Math.PI)*Math.min(9,h*.025);
    sprite.position.set(layout.x,layout.y+24-breath*2-bounce);sprite.scale.set(base*(1+breath*.008+pulse*.015));sprite.rotation=reduced.matches?0:Math.sin(pulse*Math.PI*2)*.025;
    node.dataset.characterScale='1.1';node.dataset.characterOffset=String(layout.offset);
    if(layoutWidth!==w)layoutSpeech();if(portraitMedia.matches)bubble.position.y=layout.head+24-18-bubbleHeight/2;node.dataset.characterHead=String(layout.head);node.dataset.speechBottom=String(bubble.position.y+bubbleHeight/2+10-24);bubble.visible=!!speechRef.current;const progress=Math.min(1,speechElapsed/520),overshoot=1+2.70158*Math.pow(progress-1,3)+1.70158*Math.pow(progress-1,2);bubble.scale.set(reduced.matches?1:Math.max(.05,overshoot));bubble.alpha=reduced.matches?1:Math.min(1,progress*5);node.dataset.speechProgress=String(progress);
    if(!instance.ticker.started)instance.renderer.render(instance.stage);
   };
   speakRef.current=()=>{speechElapsed=0;layoutSpeech();draw();visibility();};
   const load=async(url:string)=>{const current=++sequence;try{const texture=await Assets.load(url);if(disposed||current!==sequence)return;texture.source.scaleMode='linear';texture.source.autoGenerateMipmaps=true;texture.source.updateMipmaps();actor.texture=texture;node.dataset.textureSource=url;draw();clearTimeout(watchdog);failed=false;setRenderer('pixi');visibility();}catch{fallback()}};
   loadRef.current=load;
   observer=new ResizeObserver(()=>{if(disposed)return;instance.renderer.resize(Math.max(1,node.clientWidth),Math.max(1,node.clientHeight));layoutWidth=-1;draw()});observer.observe(node);
   instance.ticker.add(t=>{const delta=Math.min(70,t.deltaMS);elapsed+=delta;speechElapsed+=delta;draw()});
   unwatch=watchContextLoss(instance.canvas,fallback);document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',visibility);
   await load(sourceRef.current);
  }catch{fallback()}})();
  return()=>{disposed=true;window.removeEventListener('logos-native-ready',nativeReady);loadRef.current=null;speakRef.current=null;clearTimeout(watchdog);observer?.disconnect();unwatch();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',visibility);if(initialized)app?.destroy(true,{children:true});};
 },[]);
 return <div className="hub-character-stage" data-character-id={character.id} data-renderer={renderer} aria-label="메인 캐릭터"><button type="button" className="home-character-touch" aria-label={`${character.name} 다음 표정`} data-renderer={renderer} data-pose-index={index%poses.length} onClick={()=>{pressed.current=performance.now();setIndex(old=>(old+1)%poses.length);onInteract()}}><img ref={imageRef} className="hub-main-character" data-character-layer="base" src={source.image} alt={source.name} draggable={false}/><div className="home-character-canvas" ref={host} aria-hidden="true"/></button>{speech&&<div key={speech.serial} className="home-character-speech" role="status" aria-live="polite" aria-atomic="true" data-speech-serial={speech.serial}>{speech.text}</div>}</div>;
}
