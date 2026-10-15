import {useEffect,useMemo,useState} from 'react';
import {CATALOG,DECK_FACES,cardFace,effectLabel,type Card,type Kind} from '../shared/rules.js';
import {BUILD_VERSION} from './buildVersion.js';
import './card-viewer.css';

type Group='all'|'grammar'|'special';
const special=new Set<Kind>(['get2','get3','rob','exchange','protect','nothing']);
const cards:Card[]=DECK_FACES.map((face,index)=>({...face,id:`viewer-${index}`}));
const image=(card:Card)=>`/cards/${card.variant??card.kind}.webp`;

export function CardViewer(){
 const [group,setGroup]=useState<Group>('all');
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState<Card|null>(null);
 const visible=useMemo(()=>cards.filter(card=>{
  if(group==='grammar'&&special.has(card.kind))return false;
  if(group==='special'&&!special.has(card.kind))return false;
  const face=cardFace(card);
  return `${face.name} ${face.symbol} ${face.example} ${card.variant??''} ${effectLabel(card)}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
 }),[group,query]);
 useEffect(()=>{if(!selected)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setSelected(null)};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[selected]);
 return <main className="viewer-page">
  <header className="viewer-header"><a className="viewer-brand" href="/">◇ LOGOS <span>CARD BATTLE</span></a><a className="viewer-back" href="/">게임으로 돌아가기 ↗</a></header>
  <section className="viewer-hero"><div className="viewer-kicker">CARD LIBRARY · {BUILD_VERSION}</div><h1>카드 뷰어</h1><p>현재 대전 덱에 들어가는 카드 {cards.length}장을 살펴보세요. 카드를 누르면 크게 볼 수 있습니다.</p><div className="viewer-summary"><strong>{cards.length}<small>전체 카드</small></strong><strong>{cards.filter(c=>!special.has(c.kind)).length}<small>문법 카드</small></strong><strong>{cards.filter(c=>special.has(c.kind)).length}<small>기능·꽝 카드</small></strong></div></section>
  <section className="viewer-content" aria-label="카드 목록"><div className="viewer-controls"><div className="viewer-tabs" role="group" aria-label="카드 분류">{([['all','전체'],['grammar','문법'],['special','기능']] as const).map(([id,label])=><button key={id} type="button" aria-pressed={group===id} onClick={()=>setGroup(id)}>{label}</button>)}</div><label className="viewer-search"><span>카드 검색</span><input type="search" placeholder="이름, 품사, 효과 검색" value={query} onChange={event=>setQuery(event.target.value)}/></label></div>
   <div className="viewer-results" aria-live="polite">{visible.length}장 표시</div>
   {visible.length?<div className="viewer-grid">{visible.map(card=><button key={card.id} className="viewer-tile" type="button" onClick={()=>setSelected(card)} aria-label={`${cardFace(card).name}${effectLabel(card)?` ${effectLabel(card)}`:''} 카드 보기`}><img src={image(card)} alt="" loading="lazy"/><span><b>{cardFace(card).name}</b><small>{effectLabel(card)||cardFace(card).example}</small></span></button>)}</div>:<p className="viewer-empty">검색 결과가 없습니다.</p>}
  </section>
  {selected&&<div className="viewer-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null)}}><section className="viewer-dialog" role="dialog" aria-modal="true" aria-label={`${cardFace(selected).name} 카드 상세`}><button className="viewer-close" autoFocus type="button" aria-label="카드 상세 닫기" onClick={()=>setSelected(null)}>×</button><img src={image(selected)} alt={`${cardFace(selected).name} 카드 앞면`}/><div className="viewer-detail"><small>{selected.kind==='nothing'?'꽝 카드':special.has(selected.kind)?'기능 카드':'문법 카드'}</small><h2>{cardFace(selected).name}{effectLabel(selected)&&<em>{effectLabel(selected)}</em>}</h2><p>{cardFace(selected).example}</p>{selected.kind==='to-infinitive'&&<p>동사를 포함한 목적격 보어 카드입니다. 5형식: 대명사 + 일반동사 + 대명사 + To부정사. 뒤에 일반동사 카드를 더 놓을 필요가 없습니다.</p>}</div></section></div>}
 </main>;
}
