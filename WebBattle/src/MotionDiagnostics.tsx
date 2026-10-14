import {useEffect,useState} from 'react';
import './motion-diagnostics.css';

type MotionSample={reduced:boolean;hidden:boolean;frames:number;longestGap:number;cssName:string;cssDuration:string;cssTime:string;pixi:string;canvas:string};
const initial:MotionSample={reduced:false,hidden:false,frames:0,longestGap:0,cssName:'-',cssDuration:'-',cssTime:'-',pixi:'-',canvas:'-'};

export function MotionDiagnostics(){
 const [sample,setSample]=useState(initial);
 useEffect(()=>{
  let frame=0,frames=0,longestGap=0,lastFrame=0;
  const tick=(time:number)=>{if(lastFrame)longestGap=Math.max(longestGap,time-lastFrame);lastFrame=time;frames++;frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);
  const update=()=>{
   const probe=document.querySelector<HTMLElement>('.motion-debug-probe');
   const animated=document.querySelector<HTMLElement>('.landing-background,.matching-orbit,.deal-flight i,.deck-request-fill');
   const css=animated?getComputedStyle(animated):null;
   const canvas=document.querySelector<HTMLCanvasElement>('.landing-art canvas');
   const pixi=document.querySelector<HTMLElement>('.landing-art');
   const probeAnimation=probe?.getAnimations()[0];
   setSample({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,hidden:document.hidden,frames,longestGap:Math.round(longestGap),cssName:css?.animationName??'-',cssDuration:css?.animationDuration??'-',cssTime:probeAnimation?.currentTime==null?'-':String(Math.round(Number(probeAnimation.currentTime))),pixi:pixi?.dataset.pixi??(pixi?.classList.contains('landing-art-fallback')?'fallback':'-'),canvas:canvas?`${canvas.width}×${canvas.height}`:'-'});
   frames=0;longestGap=0;
  };
  update();const interval=setInterval(update,1500);
  return()=>{cancelAnimationFrame(frame);clearInterval(interval);};
 },[]);
 return <aside className="motion-debug" aria-label="애니메이션 진단"><div className="motion-debug-probe" aria-hidden="true"/><b>연출 진단</b><span>동작 줄이기 판정: {sample.reduced?'켜짐':'꺼짐'}</span><span>페이지 상태: {sample.hidden?'숨김':'표시 중'}</span><span>1.5초 화면 갱신: {sample.frames}회 · 최대 간격 {sample.longestGap}ms</span><span>CSS 연출: {sample.cssName} / {sample.cssDuration}</span><span>진단 애니메이션 시간: {sample.cssTime}ms</span><span>Pixi: {sample.pixi} · 캔버스 {sample.canvas}</span><small>이 화면을 캡처해 보내 주세요.</small></aside>;
}
