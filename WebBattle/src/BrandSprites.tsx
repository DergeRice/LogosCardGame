import type {CSSProperties,ReactNode} from 'react';

const atlas={width:1536,height:1024};
const regions={
 settings:{x:87,y:42,w:315,h:304},music:{x:458,y:40,w:277,h:300},sound:{x:790,y:43,w:328,h:290},person:{x:1165,y:39,w:290,h:292},
 cards:{x:291,y:379,w:437,h:301},consent:{x:852,y:383,w:375,h:291},
 happy:{x:10,y:654,w:382,h:370},thinking:{x:400,y:650,w:345,h:374},celebrate:{x:756,y:655,w:390,h:369},worried:{x:1162,y:654,w:356,h:370},
} as const;
export type BrandIcon=keyof typeof regions;
export function AtlasIcon({icon,className=''}:{icon:BrandIcon;className?:string}){
 const r=regions[icon];const style:CSSProperties={backgroundImage:"url('/brand-ui/ui-icons.png')",backgroundSize:`${atlas.width/r.w*100}% ${atlas.height/r.h*100}%`,backgroundPosition:`${r.x/(atlas.width-r.w)*100}% ${r.y/(atlas.height-r.h)*100}%`};
 return <span className={`brand-atlas-icon ${className}`} style={style} aria-hidden="true"/>;
}

const field={x:793,y:77,w:596,h:390,edge:64};
const button={x:73,y:198,w:654,h:207,edge:75};
type PanelKind='field'|'button';
export function NineSlicePanel({kind='field',className='',children}:{kind?:PanelKind;className?:string;children?:ReactNode}){
 const r=kind==='field'?field:button, xs=[r.x,r.x+r.edge,r.x+r.w-r.edge],ys=[r.y,r.y+r.edge,r.y+r.h-r.edge],ws=[r.edge,r.w-r.edge*2,r.edge],hs=[r.edge,r.h-r.edge*2,r.edge];
 return <span className={`nine-slice nine-slice-${kind} ${className}`} aria-hidden="true">{ys.flatMap((y,row)=>xs.map((x,col)=><svg key={`${row}-${col}`} viewBox={`${x} ${y} ${ws[col]} ${hs[row]}`} preserveAspectRatio="none"><image href="/brand-ui/panels.png" width="1448" height="1086"/></svg>))}{children}</span>;
}
