let level=6;
export function clampSfxLevel(value:number){return Number.isFinite(value)?Math.min(10,Math.max(1,Math.round(value))):6;}
export function readSfxLevel(){try{const saved=localStorage.getItem('logos-sfx-level');return saved===null?6:clampSfxLevel(Number(saved));}catch{return 6;}}
export function setSfxLevel(value:number){level=clampSfxLevel(value);}
export function sfxGain(base:number){return base*level/10;}
