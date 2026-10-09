import {useEffect,useState} from 'react';
// Browser chrome, fullscreen system bars and Samsung visual viewports can resize independently.
export function useGameViewport(){
 const measure=()=>({width:Math.min(innerWidth,window.visualViewport?.width??innerWidth),height:Math.min(innerHeight,window.visualViewport?.height??innerHeight),top:window.visualViewport?.offsetTop??0,left:window.visualViewport?.offsetLeft??0});
 const [viewport,setViewport]=useState(measure);
 useEffect(()=>{let frame=0;const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const v=measure();const style=document.documentElement.style;style.setProperty('--game-height',`${v.height}px`);style.setProperty('--game-width',`${v.width}px`);style.setProperty('--game-top',`${v.top}px`);style.setProperty('--game-left',`${v.left}px`);setViewport(v);});};update();window.addEventListener('resize',update);window.addEventListener('orientationchange',update);document.addEventListener('fullscreenchange',update);window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update);return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',update);window.removeEventListener('orientationchange',update);document.removeEventListener('fullscreenchange',update);window.visualViewport?.removeEventListener('resize',update);window.visualViewport?.removeEventListener('scroll',update);};},[]);
 return viewport;
}

