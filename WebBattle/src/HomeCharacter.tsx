import {useEffect,useRef,useState} from 'react';
import type {Application,Sprite} from 'pixi.js';
import {HOME_CHARACTERS} from '../shared/homeCharacters.js';
import {isMobileGraphics,pixiResolution,watchContextLoss} from './pixiRuntime.js';
import './home-character.css';

export function HomeCharacter({character}:{character:{id:string;name:string;image:string}}){
 const poses=HOME_CHARACTERS.find(c=>c.id===character.id)?.poses??[{image:character.image,name:character.name,id:character.id}];
 const [index,setIndex]=useState(0),[renderer,setRenderer]=useState('loading'),host=useRef<HTMLDivElement>(null),source=poses[index%poses.length];
 const sourceRef=useRef(source.image),loadRef=useRef<((url:string)=>Promise<void>)|null>(null),pressed=useRef(-Infinity);sourceRef.current=source.image;
 useEffect(()=>{void loadRef.current?.(source.image)},[source.image]);
 useEffect(()=>{
  const node=host.current;if(!node)return;
  let disposed=false,initialized=false,app:Application|undefined,sprite:Sprite|undefined,sequence=0,elapsed=0,failed=false,unwatch=()=>{},observer:ResizeObserver|undefined;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fallback=()=>{if(disposed)return;failed=true;app?.ticker?.stop();setRenderer('fallback')};
  const watchdog=setTimeout(fallback,3000);
  const visibility=()=>{if(!app||!initialized)return;if(document.hidden||reduced.matches||failed)app.ticker.stop();else app.ticker.start();};
  void(async()=>{try{
   const {Application,Assets,Sprite}=await import('pixi.js');if(disposed)return;
   const instance=new Application();app=instance;
   await instance.init({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight),backgroundAlpha:0,antialias:true,autoDensity:true,resolution:pixiResolution(),preference:'webgl',powerPreference:'low-power'});initialized=true;
   if(disposed){instance.destroy(true,{children:true});return;}instance.ticker.stop();instance.ticker.maxFPS=isMobileGraphics()?24:30;
   const actor=new Sprite();sprite=actor;actor.anchor.set(.5);instance.stage.addChild(actor);node.append(instance.canvas);
   const draw=()=>{
    if(!sprite||!sprite.texture.width)return;
    const w=instance.screen.width,h=instance.screen.height,base=Math.min(w*.92/sprite.texture.width,h*.92/sprite.texture.height),pulse=Math.max(0,1-(performance.now()-pressed.current)/450);
    const breath=reduced.matches?0:Math.sin(elapsed/1100),bounce=reduced.matches?0:Math.sin(pulse*Math.PI)*Math.min(9,h*.025);
    sprite.position.set(w/2,h/2-breath*2-bounce);sprite.scale.set(base*(1+breath*.008+pulse*.015));sprite.rotation=reduced.matches?0:Math.sin(pulse*Math.PI*2)*.025;
    if(!instance.ticker.started)instance.renderer.render(instance.stage);
   };
   const load=async(url:string)=>{const current=++sequence;try{const texture=await Assets.load(url);if(disposed||current!==sequence)return;actor.texture=texture;node.dataset.textureSource=url;draw();clearTimeout(watchdog);failed=false;setRenderer('pixi');visibility();}catch{fallback()}};
   loadRef.current=load;
   observer=new ResizeObserver(()=>{if(disposed)return;instance.renderer.resize(Math.max(1,node.clientWidth),Math.max(1,node.clientHeight));draw()});observer.observe(node);
   instance.ticker.add(t=>{elapsed+=Math.min(70,t.deltaMS);draw()});
   unwatch=watchContextLoss(instance.canvas,fallback);document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',visibility);
   await load(sourceRef.current);
  }catch{fallback()}})();
  return()=>{disposed=true;loadRef.current=null;clearTimeout(watchdog);observer?.disconnect();unwatch();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',visibility);if(initialized)app?.destroy(true,{children:true});};
 },[]);
 return <div className="hub-character-stage" data-character-id={character.id} aria-label="메인 캐릭터"><button type="button" className="home-character-touch" aria-label={`${character.name} 다음 표정`} data-renderer={renderer} data-pose-index={index%poses.length} onClick={()=>{pressed.current=performance.now();setIndex(old=>(old+1)%poses.length)}}><img className="hub-main-character" data-character-layer="base" src={source.image} alt={source.name} draggable={false}/><div className="home-character-canvas" ref={host} aria-hidden="true"/></button></div>;
}
