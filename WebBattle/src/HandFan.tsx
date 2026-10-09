import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Card } from '../shared/rules.js';

type Props = { cards: Card[]; renderCard: (card: Card, style?: CSSProperties) => ReactNode; forceExpanded?: boolean; label?:string };
export function HandFan({ cards, renderCard, forceExpanded=false, label='내 손패' }: Props) {
 const container = useRef<HTMLDivElement>(null);
 const [width, setWidth] = useState(360), [expanded, setExpanded] = useState(false);
 const spread=expanded||forceExpanded;
 useEffect(() => {
  const node = container.current;
  if (!node) return;
  const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
  observer.observe(node); return () => observer.disconnect();
 }, []);
 const compactLandscape=typeof window!=='undefined'&&window.matchMedia('(orientation: landscape) and (max-height: 900px) and (pointer: coarse)').matches;
 const landscape=typeof window!=='undefined'&&window.matchMedia('(orientation: landscape)').matches;
 const viewportHeight=typeof window==='undefined'?768:Math.min(window.innerHeight,window.visualViewport?.height??window.innerHeight);
 const cardWidth = compactLandscape ? Math.round(Math.max(60,Math.min(88,viewportHeight*.19))) : landscape ? Math.round(Math.max(80,Math.min(145,viewportHeight*.18))) : width < 600 ? 110 : 145;
 const cardHeight = cardWidth * 693 / 488;
 const maxAngle = Math.min(compactLandscape ? 3 : 8, Math.max(0, cards.length - 1) * 3);
 const edge = maxAngle * Math.PI / 180;
 const rotatedWidth = cardWidth * Math.cos(edge) + cardHeight * Math.sin(edge);
 const chord = Math.min(Math.max(0, width - rotatedWidth - 28), Math.max(0, cards.length - 1) * (compactLandscape ? cardWidth*.65 : 82), cardWidth*6);
 const radius = edge ? chord / (2 * Math.sin(edge)) : 0;
 const sag = radius * (1 - Math.cos(edge));
 return <div className="hand-container" ref={container} style={{'--mobile-hand-width':`${cardWidth}px`,'--fan-height':`${cardHeight+sag+cardWidth*Math.sin(edge)/2+5}px`} as CSSProperties}>
  {cards.length > 1 && !forceExpanded && <button className="hand-layout-toggle" aria-label={expanded ? '손패 모아 보기' : '손패 펼쳐 보기'} onClick={() => setExpanded(!expanded)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="9" y="5" width="9" height="14" rx="2"/><path d="M7 6 3 8l4 13 4-1M19 7l3 2-3 11"/></svg></button>}
  <div className={spread ? 'hand hand-spread' : 'hand hand-fan'} aria-label={label} style={spread ? undefined : { height: cardHeight + sag + 95 }}>
   {cards.map((card, i) => {
    const angle = cards.length > 1 ? -maxAngle + 2 * maxAngle * i / (cards.length - 1) : 0;
    const radians = angle * Math.PI / 180;
    const style = spread ? undefined : {
     '--fan-x': `${radius * Math.sin(radians)}px`, '--fan-y': `${radius * (1 - Math.cos(radians))}px`,
     '--fan-angle': `${angle}deg`, '--fan-order': i + 1, width: cardWidth
    } as CSSProperties;
    return renderCard(card, style);
   })}
  </div>
 </div>;
}






