import {COIN_IMAGE,DIAMOND_IMAGE,DUST_IMAGE} from '../shared/art.js';
import './currency-art.css';
export function CurrencyIcon({currency,className=''}:{currency:'coin'|'diamond'|'dust';className?:string}){
 return <img className={`currency-icon currency-${currency} ${className}`} src={{coin:COIN_IMAGE,diamond:DIAMOND_IMAGE,dust:DUST_IMAGE}[currency]} alt="" aria-hidden="true" draggable={false}/>;
}
