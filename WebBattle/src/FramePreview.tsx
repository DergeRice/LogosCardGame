import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {Avatar} from './MatchPresentation.js';
import './cosmetic-frames.css';

export function FramePreview({frameId,profileId,onClose}:{frameId:string;profileId?:string;onClose:()=>void}){
 const close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null,shell=document.querySelector<HTMLElement>('.shell'),wasInert=shell?.inert;
  if(shell)shell.inert=true;
  close.current?.focus();
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();onClose();}else if(event.key==='Tab'){event.preventDefault();close.current?.focus();}};
  addEventListener('keydown',key,true);
  return()=>{removeEventListener('keydown',key,true);if(shell)shell.inert=wasInert??false;if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[onClose]);
 return createPortal(<div className="community-backdrop frame-inspection-backdrop" onClick={onClose}><section className="community-modal frame-inspection" role="dialog" aria-modal="true" aria-label="프레임 미리보기" onClick={event=>event.stopPropagation()}><h2>프레임 미리보기</h2><div className="frame-inspection-stage"><Avatar kind="pronoun" profileId={profileId} frameId={frameId}/></div><button ref={close} onClick={onClose} aria-label="프레임 미리보기 닫기">닫기</button></section></div>,document.body);
}
