/** Texture bounds share one floor between Pixi and the accessible fallback. */
export function homeCharacterLayout(w:number,h:number,textureW:number,textureH:number,portrait:boolean,landscape:boolean){
 const scale=Math.min(w*.92/textureW,h*.92/textureH,1)*1.1,width=textureW*scale,height=textureH*scale;
 const x=w*(landscape?.32:.5),y=portrait?h-height/2+40:h/2+Math.min(22,h*.07);
 return {scale,width,height,x,y,head:y-height/2,offset:y-h/2};
}
