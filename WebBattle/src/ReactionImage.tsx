import {type Reaction} from '../shared/rules.js';
import {AtlasIcon,type BrandIcon} from './BrandSprites.js';
const reactionIcons:Record<Reaction,BrandIcon>={'👍':'happy','👏':'celebrate','😮':'thinking','🔥':'worried'};
export function ReactionImage({emoji}:{emoji:Reaction}){return <span className="reaction-image" role="img" aria-label={emoji}><AtlasIcon icon={reactionIcons[emoji]}/><span className="landing-visually-hidden">{emoji}</span></span>;}
