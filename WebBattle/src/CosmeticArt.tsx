import {Avatar} from './MatchPresentation.js';
import './cosmetic-frames.css';
export function CosmeticArt({image,name}:{image?:string;name:string}){
 if(image?.startsWith('/cosmetics/frames/'))return <span className="cosmetic-frame-preview"><Avatar kind="pronoun"/><img src={image} alt={name} draggable={false} loading="lazy"/></span>;
 return image?.startsWith('/')?<img src={image} alt={name} draggable={false}/>:<span className="item-glyph" style={image?.startsWith('#')?{color:image}:undefined}>{image?.startsWith('#')?'◎':image??'✧'}</span>;
}
