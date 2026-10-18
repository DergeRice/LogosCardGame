import {COSMETICS} from '../shared/store.js';
import {type Reaction} from '../shared/rules.js';
import {AtlasIcon,type BrandIcon} from './BrandSprites.js';
const reactionIcons:Partial<Record<Reaction,BrandIcon>>={'👍':'happy','👏':'celebrate','😮':'thinking','🔥':'worried'};
export function ReactionImage({emoji}:{emoji:Reaction}){const item=COSMETICS.find(c=>c.type==='emote'&&c.id===emoji);return <span className="reaction-image" role="img" aria-label={item?.name??emoji}>{item?(item.image.startsWith('/')?<img src={item.image} alt={item.name} draggable={false}/>:<span className="owned-emote-glyph">{item.image}</span>):reactionIcons[emoji]?<AtlasIcon icon={reactionIcons[emoji]!}/>:null}</span>;}
