import {useEffect,useState} from 'react';
import {type PublicPlayer} from '../shared/rules.js';
import {Avatar} from './MatchPresentation.js';
import {AnimatedNumber} from './ScorePresentation.js';
export function PersonalResult({player}:{player:PublicPlayer}){
 const before=player.rating-player.ratingDelta,[rating,setRating]=useState(before);
 useEffect(()=>{const timer=setTimeout(()=>setRating(player.rating),350);return()=>clearTimeout(timer)},[player.rating]);
 return <section className="personal-result" aria-label="내 경기 결과"><div className="result-profile"><Avatar kind={player.avatar}/><b>{player.name}</b><small>나의 결과</small></div><div className="personal-rewards"><div><span>획득 포인트</span><strong>+<AnimatedNumber value={player.reward} testId="my-reward"/> P</strong><small>문장 점수 {player.score}{player.calledGo?' · 내가 외친 고 ×2':''}</small></div><div className={`rating-result ${player.ratingDelta>0?'rating-up':player.ratingDelta<0?'rating-down':''}`}><span>레이팅</span><div className="rating-change"><small>{before} →</small><strong><AnimatedNumber value={rating} duration={1800} testId="result-rating"/></strong></div><b>{player.ratingDelta>=0?'+':''}{player.ratingDelta}</b></div></div></section>;
}
