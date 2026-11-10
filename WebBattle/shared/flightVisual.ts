export function descendingFlightTile(offset:number,tileHeight:number,baseY:number,tile:number){
 const cycle=Math.floor(offset/tileHeight),fraction=offset-cycle*tileHeight;
 return {top:baseY+tile*tileHeight+fraction,flipped:(cycle-tile)%2!==0};
}
