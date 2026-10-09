import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {SCORE_MOTION,type ScoreReveal} from './scoreAnimation.js';
export function useReducedMotion(){
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);return reduced;
}
export function AnimatedNumber({value,duration=SCORE_MOTION.scoreboardMs,className='',testId}:{value:number;duration?:number;className?:string;testId?:string}){
 const [display,setDisplay]=useState(value),current=useRef(value),reduced=useReducedMotion();
 useEffect(()=>{
  if(reduced||duration===0||value<current.current){current.current=value;setDisplay(value);return;}
  const from=current.current,start=performance.now();let raf=0;
  const tick=(time:number)=>{const progress=Math.min(1,(time-start)/duration),next=Math.round(from+(value-from)*(1-(1-progress)**2));current.current=next;setDisplay(next);if(progress<1)raf=requestAnimationFrame(tick);};
  raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[value,duration,reduced]);
 return <span className={`rolling-number ${display!==value?'rolling':''} ${className}`} data-testid={testId} data-target={value}>{display}</span>;
}
export function useScoreProgress(reveal:ScoreReveal|null){
 const [clock,setClock]=useState({id:'',elapsed:0}),reduced=useReducedMotion();
 useEffect(()=>{if(!reveal)return;let raf=0;const tick=()=>{const next=performance.now()-reveal.started;setClock({id:reveal.id,elapsed:next});if(next<reveal.duration+SCORE_MOTION.settleMs)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[reveal]);
 const elapsed=clock.id===reveal?.id?clock.elapsed:0;
 const count=reveal?.steps.length??0;
 const completed=!reveal?0:reduced?count:Math.min(count,Math.floor(Math.max(0,elapsed)/reveal.duration*count));
 return {completed,running:Boolean(reveal&&!reduced&&elapsed<reveal.duration+SCORE_MOTION.settleMs),reduced};
}
export function ScoreCalculation({reveal,completed,running}:{reveal:ScoreReveal;completed:number;running:boolean}){
 const step=reveal.steps[Math.max(0,completed-1)],target=completed?step.value:0;
 const interval=reveal.duration/Math.max(1,reveal.steps.length);
 return <section className={`score-calculation score-only ${reveal.judgment.accepted?'confirmed':''}`} aria-label="문장 점수" data-phase={running?'calculating':'complete'} data-step-kind={step?.kind??'base'} data-beat={completed%2}><span key={`${completed}-${running}`} className={`score-detonation ${running?'building':'finished'}`} aria-hidden="true"><i className="score-shockwave"/>{Array.from({length:16},(_,i)=><i key={i} className="score-spark" style={{'--spark-angle':`${i*22.5}deg`,'--spark-distance':`${24+(i%4)*10}px`} as CSSProperties}/>)}</span><AnimatedNumber value={target} duration={Math.min(interval*.85,350)} testId="sentence-total"/></section>;
}
