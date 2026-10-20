export function isMobileGraphics(){return navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches;}
export function pixiResolution(highQuality=false){return Math.min(devicePixelRatio||1,highQuality?2:isMobileGraphics()?1:1.5);}
export function watchContextLoss(canvas:HTMLCanvasElement,onLost:()=>void){
 const lost=(event:Event)=>{event.preventDefault();onLost();};
 canvas.addEventListener('webglcontextlost',lost);
 return()=>canvas.removeEventListener('webglcontextlost',lost);
}
