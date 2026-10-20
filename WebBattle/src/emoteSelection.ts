/** A null target fills the first empty slot. An explicit target stays selected. */
export function selectEmote(slots:(string|null)[],target:number|null,id:string){
 const next=[...slots];
 if(target===null){const existing=next.indexOf(id);if(existing>=0){next[existing]=null;return next;}const empty=next.indexOf(null);if(empty>=0)next[empty]=id;return next;}
 return next.map((value,i)=>i===target?id:value===id?null:value);
}
