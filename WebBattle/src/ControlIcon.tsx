import {CONTROL_ICONS} from './controlIcons.js';
import './control-icons.css';
export function ControlIcon({name}:{name:keyof typeof CONTROL_ICONS}){return <img className="game-control-icon" src={CONTROL_ICONS[name]} width={512} height={512} alt="" aria-hidden="true" draggable={false} decoding="async"/>}
