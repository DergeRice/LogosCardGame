import {LEAGUES} from '../shared/store.js';
import {TIER_ART} from './hubArt.js';
import './tier-badge.css';
export function TierBadge({tier,className=''}:{tier:number;className?:string}){
 const index=Math.max(0,Math.min(7,Math.floor(tier)||0));
 return <img className={`tier-badge ${className}`} src={TIER_ART[index]} width={512} height={512} alt={`${LEAGUES[index]} 티어 배지`} draggable={false} decoding="async"/>;
}
