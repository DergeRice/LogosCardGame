export function descendingFlightTile(offset:number,tileHeight:number,baseY:number,tile:number){
 const fraction=offset%tileHeight;
 return {top:baseY+tile*tileHeight+fraction};
}

export function flightGateCenterY(now:number,startsAt:number,deadline:number,fieldHeight:number,gateHeight:number,planeSize:number){
 // Keep the incoming labels and gate visible while the renderer/server handshake completes.
 const start=gateHeight*1.7;
 const contact=fieldHeight*.83-(planeSize+gateHeight)/2;
 return start+Math.max(0,now-startsAt)/Math.max(1,deadline-startsAt)*(contact-start);
}
