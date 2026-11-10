export function descendingFlightTile(offset:number,tileHeight:number,baseY:number,tile:number){
 const fraction=offset%tileHeight;
 return {top:baseY+tile*tileHeight+fraction};
}
