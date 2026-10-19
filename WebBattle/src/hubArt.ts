export const TIER_ART=['iron','bronze','silver','gold','platinum','emerald','diamond','netherite'].map(name=>`/hub/art/tier-${name}.webp`);
export const BOX_ART={silver:'/hub/art/box-silver.webp',gold:'/hub/art/box-gold.webp',diamond:'/hub/art/box-diamond.webp'} as const;
export function boxArt(id:string){return BOX_ART[id as keyof typeof BOX_ART]??BOX_ART.silver;}
