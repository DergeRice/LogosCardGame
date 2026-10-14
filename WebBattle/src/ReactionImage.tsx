import {useState} from 'react';
import {type Reaction} from '../shared/rules.js';
// Replace these files to change both the picker and the player reaction bubble.
export const REACTION_IMAGES:Record<Reaction,string>={'👍':'/reactions/thumbs-up.svg','👏':'/reactions/clap.svg','😮':'/reactions/wow.svg','🔥':'/reactions/fire.svg'};
export function ReactionImage({emoji}:{emoji:Reaction}){const [failed,setFailed]=useState(false);return failed?<span className="reaction-fallback" aria-hidden="true">{emoji}</span>:<img className="reaction-image" src={REACTION_IMAGES[emoji]} alt="" draggable={false} onError={()=>setFailed(true)}/>;}
