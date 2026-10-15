import {LoginLanding} from './LoginLanding.js';
import {PracticeMode} from './PracticeMode.js';
import {PersonalResult} from './PersonalResult.js';
import {ReactionImage} from './ReactionImage.js';
import {QuickTools} from './QuickTools.js';
import {AdminLogs} from './AdminLogs.js';
import {playerCards,fieldCards,canTransferCard} from '../shared/cardViews.js';
import React, { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { CATALOG, VARIANTS, RULES, REACTIONS, EXCHANGE_REPLIES, effectLabel, type Card, type RoomView, type RoomListing, type Kind } from '../shared/rules.js';
import './style.css';
import './original-cards.css';
import {CardLabel,StatusCardBlock} from './CardLabel.js';
import {preloadProfiles} from './profiles.js';
import { HandFan } from './HandFan.js';
import { useCardDrag } from './useCardDrag.js';
import { SentenceField } from './SentenceField.js';
import { OpponentFieldPreview } from './OpponentFieldPreview.js';
import './card-interaction.css';
import { Avatar, MatchPresentation, SharedDeck } from './MatchPresentation.js';
import './quick-battle.css';
import {AnimatedNumber,ScoreCalculation,useScoreProgress} from './ScorePresentation.js';
import {scoreSteps,SCORE_MOTION,type ScoreReveal} from './scoreAnimation.js';
import {type SentenceExample} from '../shared/sentence-examples.js';
import {cardSentenceExample} from '../shared/card-sentence-example.js';
import {SentenceExamplePanel} from './SentenceExamplePanel.js';

import {unlockGameAudio} from './exampleAudio.js';
import {preloadSentenceVoice} from './sentenceVoice.js';

import './score-presentation.css';
import './game-stage.css';
import './special-cards.css';
import './draw-reactions.css';
import './landscape.css';
import './profile-hands.css';
import './mobile-stage.css';
import './tabletop.css';
import './battle-layout.css';
import './multiplayer.css';
import './player-status.css';
import './drag-preview.css';
import './experience.css';
import './login-landing.css';
import {BUILD_VERSION} from './buildVersion.js';
import {useGameViewport} from './useGameViewport.js';
import {useDealtHand} from './useDealtHand.js';
import { CARD_FACE_URLS, preloadCardFaces } from './preloadCards.js';
import {preloadGameAssets} from './preloadGameAssets.js';
import {CardViewer} from './CardViewer.js';
import {MotionDiagnostics} from './MotionDiagnostics.js';
import {RoomBrowser,RoomLobby} from './RoomPanels.js';
import {AtlasIcon,NineSlicePanel} from './BrandSprites.js';
import {PixiLoading} from './PixiLoading.js';
import './brand-ui.css';

function Illustration({ kind, card, className = '' }: { kind: Kind; card?: Card; className?: string }) {
 const face=card?.variant&&VARIANTS[card.variant]?.kind===kind?card.variant:kind;
 return <img className={`illustration ${className}`} src={`/cards/${face}.webp`} alt={`${CATALOG[kind].name} 원본 카드`} aria-label={`${CATALOG[kind].name} 원본 카드`} draggable={false}/>;
}
function PlayedSentencePreview({name,sentences}: {name:string;sentences:Card[][]}) {
 return <span className="player-sentence-preview" aria-label={`${name} 님이 플레이한 문장들`}>{sentences.map((sentence,i)=><span className="played-sentence" key={i} aria-label={`${i+1}번째 문장`}>{sentence.map(c=><StatusCardBlock key={c.id} card={c}/>)}</span>)}</span>;
}
function MiniHandPreview({name,cards}:{name:string;cards:Card[]}){
 return <span className="mini-hand-preview" aria-label={`${name}의 손패와 필드 카드 상태`}>{cards.map(c=><StatusCardBlock key={c.id} card={c}/>)}</span>;
}
function PlayerActionBubble({action}:{action:NonNullable<RoomView['players'][number]['lastAction']>}){
 const [shown,setShown]=useState(true);
 useEffect(()=>{setShown(true);const timer=window.setTimeout(()=>setShown(false),2000);return()=>window.clearTimeout(timer);},[action.id]);
 return shown?<span className="player-last-action" title={action.text}>{action.text}</span>:null;
}
function CardTransferFlights({room}:{room:RoomView}){
 const [items,setItems]=useState<{id:string;card:Card;left:number;top:number;dx:number;dy:number}[]>([]);
 const signature=room.players.flatMap(player=>player.lastAction?.flights?.map((flight,index)=>`${player.lastAction!.id}:${index}:${flight.fromId}:${flight.toId}`)??[]).join('|');
 useEffect(()=>{const frame=requestAnimationFrame(()=>{const point=(id:string)=>{const node=document.querySelector<HTMLElement>(id==='deck'?'.deck-request-button':`.table-player[data-player-id="${CSS.escape(id)}"]`);const rect=node?.getBoundingClientRect();return rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:null;};const next=room.players.flatMap(player=>(player.lastAction?.flights??[]).map((flight,index)=>{const from=point(flight.fromId),to=point(flight.toId);return from&&to?{id:`${player.lastAction!.id}:${index}`,card:flight.card,left:from.x,top:from.y,dx:to.x-from.x,dy:to.y-from.y}:null;})).filter((item):item is NonNullable<typeof item>=>Boolean(item));setItems(next);});return()=>cancelAnimationFrame(frame);},[signature,room.players]);
 return <div className="card-transfer-flights" aria-hidden="true">{items.map(item=>{const face=item.card.variant&&VARIANTS[item.card.variant]?.kind===item.card.kind?item.card.variant:item.card.kind;return <img key={item.id} className="card-transfer-flight" src={`/cards/${face}.webp`} style={{left:item.left,top:item.top,'--flight-x':`${item.dx}px`,'--flight-y':`${item.dy}px`} as CSSProperties} alt=""/>;})}</div>;
}
function guestName() {
 const saved = sessionStorage.getItem('logos-name');
 if (saved?.startsWith('게스트 ')) return saved;
 const name = '게스트 ' + (1000 + crypto.getRandomValues(new Uint32Array(1))[0] % 9000);
 sessionStorage.removeItem('logos-token');
 sessionStorage.setItem('logos-name', name);
 return name;
}
function ViewportPage({children}:{children:React.ReactNode}){useGameViewport();return children;}
function GameEntry({practice=false}:{practice?:boolean}){
 const [entered,setEntered]=useState(()=>!new URLSearchParams(location.search).has('intro')&&(sessionStorage.getItem('logos-entry')==='guest'||Boolean(localStorage.getItem('logos-account-token'))));
 const [departing,setDeparting]=useState(false);
 useEffect(()=>{if(practice)return;void preloadProfiles();void preloadGameAssets();void preloadCardFaces(()=>{});},[practice]);
 const finishEntry=()=>{setDeparting(true);setTimeout(()=>setEntered(true),580);};
 const onGuest=()=>{sessionStorage.setItem('logos-entry','guest');const saved=localStorage.getItem('logos-guest-name');if(saved)sessionStorage.setItem('logos-name',saved);finishEntry();};
 return entered?(practice?<ViewportPage><PracticeMode/></ViewportPage>:<App/>):<ViewportPage><LoginLanding onGuest={onGuest} departing={departing}/></ViewportPage>;
}
function App() {
 const [name, setName] = useState(guestName);
 const [connected, setConnected] = useState(false), [status, setStatus] = useState('연결 준비 중');
 const [room, setRoom] = useState<RoomView | null>(null), roomRef = useRef<RoomView | null>(null);
 const [profile, setProfile] = useState({avatar:'pronoun' as Kind, rating:1000, points:0, coins:0});
 const [account,setAccount]=useState<string|null>(null);
 const [authMode,setAuthMode]=useState<'register'|'login'|null>(null);
 const [authName,setAuthName]=useState(''),[authPassword,setAuthPassword]=useState('');
 const [error, setError] = useState(''), [selected, setSelected] = useState<string[]>([]);
 const [now, setNow] = useState(Date.now()), offset = useRef(0);
 const [sound, setSound] = useState(localStorage.getItem('logos-sound') !== 'off'), soundRef = useRef(sound), audioRef = useRef<AudioContext | null>(null);
 const [pending, setPending] = useState(false), pendingAt = useRef(0), pendingId=useRef<string|null>(null), uiActions=useRef<string[]>([]), selectedLive=useRef<string[]>([]), uiContext=useRef<Record<string,unknown>>({});
 const socketRef = useRef<WebSocket | null>(null);
 const [notice, setNotice] = useState('');
 const [cardLoad,setCardLoad]=useState({done:0,total:CARD_FACE_URLS.length,ready:false,failed:0});
 const [rooms,setRooms]=useState<RoomListing[]>([]),[roomBrowserOpen,setRoomBrowserOpen]=useState(false);
 const lastEvent = useRef('');
 const [correct,setCorrect]=useState<ScoreReveal|null>(null);
 const [exampleVoice,setExampleVoice]=useState(localStorage.getItem('logos-example-voice')!=='off');
 const [example,setExample]=useState<SentenceExample|null>(null);
 const exampleShown=useRef('');
 const [failedJudgment,setFailedJudgment]=useState<{id:string;reason:string}|null>(null);
 useGameViewport();
 const [specialCard,setSpecialCard]=useState<Card|null>(null),[specialTarget,setSpecialTarget]=useState(''),[specialOffer,setSpecialOffer]=useState(''),[wantedId,setWantedId]=useState('');
 const [exchangePreview,setExchangePreview]=useState<{matchId:string;cardId:string;players:{id:string;name:string;avatar:Kind;handVersion:number;fieldVersion?:number;cards:Card[]}[]}|null>(null);
 const [robPreview,setRobPreview]=useState<{matchId:string;cardId:string;players:{id:string;name:string;avatar:Kind;connected:boolean;protected?:boolean;handVersion:number;fieldVersion:number;cards:(Card&{source:'hand'|'field'})[]}[]}|null>(null),[stealId,setStealId]=useState(''),[stealSource,setStealSource]=useState<'hand'|'field'>('hand');
 const [inspectMode,setInspectMode]=useState(false),[inspectCard,setInspectCard]=useState<Card|null>(null);
 const [viewingHandId,setViewingHandId]=useState<string|null>(null),[emoteOpen,setEmoteOpen]=useState(false);
 const [fullscreen,setFullscreen]=useState(false),[settingsOpen,setSettingsOpen]=useState(false);
 useEffect(()=>{if(!settingsOpen)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setSettingsOpen(false)};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[settingsOpen]);
 const submission=useRef<{id:string;matchId:string;cards:Card[]}|null>(null);
 const scoreProgress=useScoreProgress(correct);
 useEffect(()=>{if(!correct||scoreProgress.running||exampleShown.current===correct.id)return;exampleShown.current=correct.id;const used=correct.cards.slice(correct.judgment.usedStartIndex,correct.judgment.usedStartIndex+correct.judgment.usedLength);const built=cardSentenceExample(correct.cards,correct.judgment,0);setExample(built.example);if(!built.example)trace('example_missing',{code:'EXAMPLE_MISSING',reason:built.reason});},[correct,scoreProgress.running]);
 useEffect(()=>{setExample(null);exampleShown.current='';},[room?.matchId,room?.phase]);
 const feedbackTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 function tone(win = false) { if (!soundRef.current) return; try { const ctx = audioRef.current ??= unlockGameAudio();if(!ctx)return; void ctx.resume(); const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.setValueAtTime(win ? 660 : 440, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(win ? 990 : 660, ctx.currentTime + .12); g.gain.setValueAtTime(.06, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .2); o.start(); o.stop(ctx.currentTime + .21); } catch { /* Audio is optional. */ } }
 function playSfx(file:string,volume=.42){if(!soundRef.current)return;try{const audio=new Audio(file);audio.preload='auto';audio.volume=volume;void audio.play().catch(()=>{});}catch{/* Audio is optional. */}}
 useEffect(() => { soundRef.current = sound; localStorage.setItem('logos-sound', sound ? 'on' : 'off'); }, [sound]);
 useEffect(()=>{
  const activate=()=>{
   audioRef.current=unlockGameAudio();
  };
  document.addEventListener('click',activate,true);document.addEventListener('touchend',activate,true);
  return()=>{document.removeEventListener('click',activate,true);document.removeEventListener('touchend',activate,true);};
 },[]);
 useEffect(()=>{const sync=()=>setFullscreen(Boolean(document.fullscreenElement||(document as Document & {webkitFullscreenElement?:Element}).webkitFullscreenElement));document.addEventListener('fullscreenchange',sync);document.addEventListener('webkitfullscreenchange',sync);return()=>{document.removeEventListener('fullscreenchange',sync);document.removeEventListener('webkitfullscreenchange',sync);};},[]);
 async function enterGameFullscreen(quiet=false){
  const doc=document as Document & {webkitFullscreenElement?:Element};
  const root=document.documentElement as HTMLElement & {webkitRequestFullscreen?:()=>Promise<void>|void};
  try{if(!document.fullscreenElement&&!doc.webkitFullscreenElement){if(root.requestFullscreen)await root.requestFullscreen();else if(root.webkitRequestFullscreen)await root.webkitRequestFullscreen();else throw Error('unsupported');}}
  catch{if(!quiet)setNotice('이 브라우저는 게임 전체화면을 지원하지 않아요. 휴대폰을 가로로 돌려 플레이해 주세요.');}
  const orientation=screen.orientation as {lock?:(mode:string)=>Promise<void>}|undefined;
  try{await orientation?.lock?.('landscape');}catch{/* Unsupported direction locks leave normal play available. */}
 }
 async function exitGameFullscreen(){
  const doc=document as Document & {webkitFullscreenElement?:Element;webkitExitFullscreen?:()=>Promise<void>|void};
  if(!document.fullscreenElement&&!doc.webkitFullscreenElement)return;
  try{if(document.exitFullscreen)await document.exitFullscreen();else await doc.webkitExitFullscreen?.();}catch{/* iOS may ignore this outside a user gesture. */}
 }
 async function toggleFullscreen(){
  const doc=document as Document & {webkitFullscreenElement?:Element};
  if(document.fullscreenElement||doc.webkitFullscreenElement){await exitGameFullscreen();return;}
  await enterGameFullscreen();
 }
 useEffect(()=>{let active=true;void preloadProfiles();if(exampleVoice)void preloadSentenceVoice();void Promise.all([preloadCardFaces((done,total)=>{if(active)setCardLoad(old=>({...old,done,total}));}),preloadGameAssets()]).then(([{failed}])=>{if(active)setCardLoad(old=>({...old,ready:true,failed}));});return()=>{active=false;};},[]);
 useEffect(() => { const t = setInterval(() => { setNow(Date.now() + offset.current); if (pendingAt.current && Date.now() - pendingAt.current > 6000) { setPending(false); pendingAt.current = 0; trace('submit_timeout',{code:'SUBMIT_TIMEOUT',requestId:pendingId.current??''});pendingId.current=null;submission.current=null;setError('제출 응답이 늦습니다. 다시 제출하거나 새로고침으로 복귀해 주세요.'); } }, 1000); return () => clearInterval(t); }, []);
 useEffect(() => {
  let stopped = false, retry: ReturnType<typeof setTimeout>, resumeCheck:ReturnType<typeof setTimeout>, attempts = 0, responseSerial=0;
  const heartbeats=new Set<ReturnType<typeof setInterval>>();
  function connect() {
   if (stopped) return; setStatus(attempts ? '재연결 중 · 무료 서버를 깨우는 데 잠시 걸릴 수 있어요' : '서버 연결 중');
   const url = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/socket`;
   const ws = new WebSocket(url); socketRef.current = ws;
   let heartbeat:ReturnType<typeof setInterval>;
   ws.onopen = () => { if(socketRef.current!==ws){ws.close();return;} ws.send(JSON.stringify({ type: 'hello', name: sessionStorage.getItem('logos-name') || name, token: sessionStorage.getItem('logos-token')||localStorage.getItem('logos-guest-token'),authToken:localStorage.getItem('logos-account-token') })); heartbeat = setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'ping' })); }, 12000);heartbeats.add(heartbeat); };
   ws.onmessage = event => {
    if(socketRef.current!==ws)return;responseSerial++;clearTimeout(resumeCheck);
    const msg = JSON.parse(event.data);
    if (msg.type === 'session') { sessionStorage.setItem('logos-token', msg.token); sessionStorage.setItem('logos-name', msg.name); if(!msg.account){localStorage.setItem('logos-guest-token',msg.token);localStorage.setItem('logos-guest-name',msg.name);}setName(msg.name); setAccount(msg.account?.username??null); setProfile({avatar:msg.avatar, rating:msg.rating, points:msg.points, coins:msg.coins??0}); setConnected(true); setStatus('서버 연결됨'); attempts = 0; }
    if (msg.type === 'auth') { if(msg.authToken){localStorage.setItem('logos-account-token',msg.authToken);setAccount(msg.username);setAuthMode(null);setAuthPassword('');setNotice('계정이 연결됐어요. 이제 레이팅이 저장됩니다.');}else{localStorage.removeItem('logos-account-token');sessionStorage.removeItem('logos-token');location.reload();} }
    if (msg.type === 'state') {
     const r = msg.room as RoomView, previous = roomRef.current;if(r.phase!=='battle'||(previous&&previous.matchId!==r.matchId)||r.judgment?.submissionId===pendingId.current){pendingId.current=null;pendingAt.current=0;setPending(false);} offset.current = r.serverNow - Date.now();
      if (previous?.matchId !== r.matchId) {setSelected([]);setCorrect(null);setFailedJudgment(null);setSpecialCard(null);setRobPreview(null);setExchangePreview(null);setStealId('');setWantedId('');setInspectCard(null);setViewingHandId(null);setEmoteOpen(false);}
     else if (previous?.handVersion !== r.handVersion) {const acceptedOwn=Boolean(r.judgment?.accepted&&r.judgment.submissionId===submission.current?.id);setSelected(old => acceptedOwn?[]:old.filter(id => r.hand.some(card => card.id === id)));}
     if(r.judgment?.valid&&r.judgment.submissionId===submission.current?.id&&submission.current?.matchId===r.matchId&&r.judgment.submissionId!==previous?.judgment?.submissionId){
      const cards=submission.current.cards,steps=scoreSteps(cards,r.judgment,r.multiplier),duration=Math.min(SCORE_MOTION.totalMs,Math.max(650,steps.length*SCORE_MOTION.stepMaxMs));
      setExample(null);setFailedJudgment(null);setCorrect({id:r.judgment.submissionId!,cards,judgment:r.judgment,steps,previousScore:previous?.players.find(p=>p.id===previous.you)?.score??0,started:performance.now(),duration});
      clearTimeout(feedbackTimer.current);feedbackTimer.current=setTimeout(()=>setCorrect(null),duration+SCORE_MOTION.holdMs);submission.current=null;
     }
     if(r.judgment&&!r.judgment.valid&&r.judgment.submissionId===submission.current?.id&&r.judgment.submissionId!==previous?.judgment?.submissionId){setExample(null);setCorrect(null);setFailedJudgment({id:r.judgment.submissionId!,reason:r.judgment.reason});clearTimeout(feedbackTimer.current);feedbackTimer.current=setTimeout(()=>setFailedJudgment(null),1800);submission.current=null;}
     const eventId = r.log[0]?.id;
     if (eventId && lastEvent.current !== eventId) { lastEvent.current = eventId; if (r.phase === 'result' || r.log[0].text.includes('+')) tone(r.phase === 'result'); }
     roomRef.current = r; setRoom(r);if(r.phase==='lobby')setRoomBrowserOpen(false);
    }
     if (msg.type === 'home') { setProfile(old=>({...old, rating:msg.rating??old.rating, points:msg.points??old.points, coins:msg.coins??old.coins})); roomRef.current = null; setRoom(null); setSelected([]); setCorrect(null);setViewingHandId(null);setEmoteOpen(false); submission.current=null; setPending(false); if (msg.message) setError(msg.message); }
    if (msg.type === 'roomList') setRooms(msg.rooms as RoomListing[]);
    if (msg.type === 'robView') { setRobPreview(msg); setStealId(''); setStealSource('hand'); }
    if (msg.type === 'exchangeView') { setExchangePreview(msg); setWantedId(''); }
    if (msg.type === 'exchangeResponse') setNotice(`${msg.fromName} 님의 답장: ${msg.reason}`);
    if (msg.type === 'error') { setError(msg.message);if(!msg.requestId||msg.requestId===pendingId.current){pendingId.current=null;submission.current=null;setPending(false); pendingAt.current = 0;} }
    if (msg.type === 'ack'&&msg.requestId===pendingId.current) { pendingId.current=null;setPending(false); pendingAt.current = 0; setError(''); }
   };
   ws.onclose = ev => { clearInterval(heartbeat);heartbeats.delete(heartbeat);if(socketRef.current!==ws)return;clearTimeout(resumeCheck);setConnected(false); setPending(false); pendingAt.current = 0; if (stopped) return; if (ev.code === 4001) { setStatus('다른 창에서 이 세션을 사용 중이에요. 이 창을 새로고침하면 복귀합니다.'); return; } attempts++; setStatus('연결 끊김 · 자동으로 복귀 중'); retry = setTimeout(connect, Math.min(1000 * 2 ** Math.min(attempts, 3), 8000)); };
   ws.onerror = () => {if(socketRef.current===ws)setStatus('서버 연결 대기 · 첫 접속은 약 1분 걸릴 수 있어요');};
  }
  function resumeConnection(){
   if(stopped||document.visibilityState==='hidden')return;
   const ws=socketRef.current;
   if(ws?.readyState===WebSocket.OPEN){
    const serial=responseSerial;ws.send(JSON.stringify({type:'ping'}));clearTimeout(resumeCheck);
    resumeCheck=setTimeout(()=>{if(socketRef.current===ws&&ws.readyState===WebSocket.OPEN&&responseSerial===serial){ws.close();connect();}},8000);
   }else if(!ws||ws.readyState===WebSocket.CLOSED||ws.readyState===WebSocket.CLOSING){clearTimeout(retry);connect();}
  }
  connect();document.addEventListener('visibilitychange',resumeConnection);window.addEventListener('pageshow',resumeConnection);window.addEventListener('online',resumeConnection);
  return () => { stopped = true; clearTimeout(retry); clearTimeout(resumeCheck);for(const heartbeat of heartbeats)clearInterval(heartbeat);document.removeEventListener('visibilitychange',resumeConnection);window.removeEventListener('pageshow',resumeConnection);window.removeEventListener('online',resumeConnection);socketRef.current?.close(); };
 }, []);
 const me = room?.players.find(p => p.id === room.you), opponent = room?.players.find(p => p.id !== room.you);
 const viewingPlayer=room?.players.find(p=>p.id===viewingHandId&&p.id!==room.you);
 const resultClosed=Boolean(room?.finalRound)||Boolean(room?.expiresAt&&now>=room.expiresAt);
 const seconds = room ? Math.max(0, Math.ceil((room.endsAt - (room.finalRound?now:room.decision?.startedAt ?? now)) / 1000)) : 90;
 const locked = scoreProgress.running || !connected || pending || !room || room.phase !== 'battle' || Boolean(room.decision) || now < room.actionAt || Boolean(room?.endsAt && seconds <= 0);
 const hand = room?.hand ?? [], chosen = selected.map(id => hand.find(c => c.id === id)).filter((c): c is Card => Boolean(c));
 const dealt=useDealtHand(room);
 const dealSfx=useRef(''),scoreSfx=useRef('');
 useEffect(()=>{if(!room){dealSfx.current='';return;}const key=`${room.matchId}:${room.dealSerial}`;if(dealSfx.current&&dealSfx.current!==key&&room.dealSerial>0)playSfx('/audio/sfx/card-deal.wav',.32);dealSfx.current=key;},[room?.matchId,room?.dealSerial]);
 useEffect(()=>{if(!correct||!scoreProgress.completed){scoreSfx.current='';return;}const key=`${correct.id}:${scoreProgress.completed}`;if(scoreSfx.current!==key){scoreSfx.current=key;playSfx('/audio/sfx/score-chime.wav',.26);}},[correct?.id,scoreProgress.completed]);
 const remainingHand = hand.filter(c => !selected.includes(c.id)&&dealt.visible.has(c.id));
 const robTarget=robPreview?.players.find(p=>p.id===specialTarget);
 selectedLive.current=selected;uiContext.current={inspectMode,viewingOpponent:Boolean(viewingPlayer),scoreRunning:scoreProgress.running,selected};
 function queueAction(event:string,cardId=''){uiActions.current.push(Date.now()+':'+event+':'+cardId);if(uiActions.current.length>120)uiActions.current.shift();}
 function trace(event:string,details:Record<string,unknown>={}){const ws=socketRef.current;if(ws?.readyState===1)ws.send(JSON.stringify({type:'clientEvent',event,build:BUILD_VERSION,connected:ws.readyState===1,pending:Boolean(pendingAt.current),phase:roomRef.current?.phase,...uiContext.current,...details}));}
 useEffect(()=>{const error=(e:ErrorEvent)=>trace('browser_error',{code:'CLIENT_ERROR',reason:e.message.slice(0,200),file:e.filename.split('?')[0],line:e.lineno,column:e.colno});const rejection=()=>trace('unhandled_rejection',{code:'CLIENT_ERROR'});window.addEventListener('error',error);window.addEventListener('unhandledrejection',rejection);return()=>{window.removeEventListener('error',error);window.removeEventListener('unhandledrejection',rejection)}},[]);
 useEffect(()=>{const timer=setInterval(()=>{if(socketRef.current?.readyState===1&&uiActions.current.length)trace('ui_actions',{events:uiActions.current.splice(0,15),selected:selectedLive.current,handVersion:roomRef.current?.handVersion});},1000);return()=>clearInterval(timer)},[]);
 function send(type: string, extra: Record<string, unknown> = {}) { if (!connected || socketRef.current?.readyState !== 1) { setError('서버에 연결된 후 다시 시도해 주세요.'); return false; } try{setError(''); socketRef.current.send(JSON.stringify({ type, matchId: room?.matchId, ...extra }));return true;}catch{setError('연결이 끊겼습니다. 재연결 후 다시 제출해 주세요.');return false;} }
 useEffect(()=>{if(!connected||room?.phase!=='battle'||!room.matchId)return;const timer=setTimeout(()=>{if(socketRef.current?.readyState===WebSocket.OPEN)socketRef.current.send(JSON.stringify({type:'draft',matchId:room.matchId,handVersion:room.handVersion,cards:selected}));},500);return()=>clearTimeout(timer);},[connected,room?.phase,room?.matchId,room?.handVersion,selected]);
 function action(type: string) { setExample(null);if (locked||pendingAt.current){trace('submit_blocked',{code:'SUBMIT_BLOCKED',reason:scoreProgress.running?'score_animation':pendingAt.current?'pending':!connected?'disconnected':room?.decision?'go_decision':'cooldown_or_phase',selected});return;} setPending(true); pendingAt.current = Date.now(); const requestId = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''); submission.current={id:requestId,matchId:room!.matchId,cards:chosen.map(c=>({...c}))}; pendingId.current=requestId;if(!send(type, { cards: selected, requestId, handVersion: room?.handVersion })){pendingId.current=null;submission.current=null;pendingAt.current=0;setPending(false);} }
 function playSpecial(card:Card){queueAction('special_select',card.id);if(!interactionEnabled)return;if(card.kind==='nothing'){setNotice('Nothing은 꽝 카드예요. 아래 쓰레기통으로 버려주세요.');return;}if(card.kind==='protect'){setNotice('PROTECT는 손에 가지고 있으면 ROB을 자동으로 막아요.');return;}if(card.kind==='get2'||card.kind==='get3'){send('special',{cardId:card.id,handVersion:room?.handVersion,requestId:crypto.randomUUID()});return;}setSpecialCard(card);setSpecialTarget('');setSpecialOffer('');setWantedId('');setRobPreview(null);setExchangePreview(null);setStealId('');setStealSource('hand');if(card.kind==='exchange')send('inspectExchange',{cardId:card.id});if(card.kind==='rob')send('inspectRob',{cardId:card.id});}
 function add(id: string) { setExample(null);queueAction('card_toggle',id);if (!connected || room?.phase !== 'battle' || pending || room?.decision) return; setViewingHandId(null);setSelected(old => old.includes(id) ? old.filter(c => c !== id) : old.length < RULES.maxSelected ? [...old, id] : old); }
 function move(id: string, to: number) { queueAction('card_move_'+to,id);if (pending||room?.decision||room?.phase!=='battle') return; setSelected(old => { const next = old.filter(x => x !== id); next.splice(Math.max(0, to), 0, id); return next.slice(0, RULES.maxSelected); }); }
 const interactionEnabled=!scoreProgress.running&&connected&&!pending&&room?.phase==='battle'&&!room?.decision;
 function discard(id:string){if(locked)return;setExample(null);queueAction('card_discard',id);const requestId=crypto.randomUUID();pendingId.current=requestId;pendingAt.current=Date.now();setPending(true);if(!send('discard',{cardId:id,requestId,handVersion:room?.handVersion,fieldVersion:room?.fieldVersion??0})){pendingId.current=null;pendingAt.current=0;setPending(false);}}
 const drag=useCardDrag(Boolean(interactionEnabled&&!locked),selected,move,add,discard);
 const playerRanks=new Map((room?.players??[]).slice().sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).map((player,index)=>[player.id,index+1]));
 const hasScore=Boolean(room?.players.some(player=>player.score!==0));
 const renderCard = (c: Card, style?: CSSProperties) => <button key={c.id} style={style} data-card-id={c.id} data-kind={c.kind} data-variant={c.variant??''} title={CATALOG[c.kind].name+' '+(['get2','get3','rob','exchange','protect','nothing'].includes(c.kind)?CATALOG[c.kind].example:effectLabel(c)||'카드당 1점')} className={'game-card '+CATALOG[c.kind].tone+(dealt.arriving.has(c.id)?' card-arriving':'')+(drag.preview?.id===c.id?' drag-source':'')+(inspectMode?' inspect-mode':'')} aria-label={CATALOG[c.kind].name+(inspectMode?' 카드 확대':' 카드 선택')} disabled={(!interactionEnabled&&!inspectMode)||dealt.arriving.has(c.id)} draggable={false} onDragStart={e=>e.preventDefault()} onPointerDown={e=>{if(!inspectMode)drag.start(e,c.id,['get2','get3','rob','exchange','protect','nothing'].includes(c.kind));}} onClick={()=>{if(inspectMode){queueAction('card_inspect',c.id);setInspectCard(c);return;}drag.click(()=>['get2','get3','rob','exchange','protect','nothing'].includes(c.kind)?playSpecial(c):add(c.id));}}><Illustration kind={c.kind} card={c}/><CardLabel card={c}/></button>;
 if(!cardLoad.ready||cardLoad.failed)return <main className="card-preload-screen" role="status" aria-live="polite"><PixiLoading/><img className="preload-under" src="/brand-ui/loading-under.png" alt=""/><strong className="preload-label">{cardLoad.failed?'카드를 모두 불러오지 못했어요':'게임 준비 중'}</strong>{cardLoad.failed>0&&<button className="primary preload-retry" onClick={()=>location.reload()}>다시 불러오기</button>}</main>;
 return <div className="shell" data-fullscreen={fullscreen} data-viewport-height={Math.min(innerHeight,visualViewport?.height??innerHeight)}><small className="build-version" aria-label="게임 버전">{BUILD_VERSION}</small>
  <button className="settings-trigger" aria-label="설정 열기" aria-expanded={settingsOpen} onClick={()=>setSettingsOpen(open=>!open)}><AtlasIcon icon="settings"/></button>
  {settingsOpen&&<><div className="settings-backdrop" onClick={()=>setSettingsOpen(false)}/><section className="game-settings" role="dialog" aria-label="게임 설정"><div className="settings-heading"><b>설정</b><button autoFocus aria-label="설정 닫기" onClick={()=>setSettingsOpen(false)}>×</button></div><div className="game-toolbar">{!room&&<>{account?<button type="button" onClick={()=>send('logout')}>로그아웃</button>:<><button type="button" onClick={()=>{setSettingsOpen(false);setAuthMode('login')}}>계정 로그인</button><button type="button" onClick={()=>{setSettingsOpen(false);setAuthMode('register')}}>계정 만들기</button></>}</>}<a className="toolbar-action card-viewer-link" href="/cards" target="_blank" rel="noopener noreferrer">▦ 카드 뷰어 ↗</a>{room?.phase==='battle'&&<><button className={`toolbar-action ${inspectMode?'active':''}`} aria-label="카드 확대 보기" aria-pressed={inspectMode} onClick={()=>{setInspectMode(old=>!old);setInspectCard(null);setSettingsOpen(false);}}>⌕ 카드 확대</button>{room.players.filter(p=>!p.ai).length===1&&room.players.some(p=>p.ai)&&<button className="toolbar-action cheat-action" disabled={!connected} onClick={()=>{send('debugSpecials',{requestId:crypto.randomUUID()});setSettingsOpen(false);}}>치트 · 특수카드 받기</button>}{room.testMode&&<span className="test-mode-label">테스트 판 · 보상 없음</span>}</>}<span className={`connection ${connected ? 'online' : ''}`} aria-label={status} title={status}/><button className="icon-button fullscreen-button" onClick={toggleFullscreen} aria-label={fullscreen?'전체화면 종료':'전체화면'} title={fullscreen?'전체화면 종료':'전체화면'} aria-pressed={fullscreen}>{fullscreen?'⤢ 전체화면 종료':'⛶ 전체화면'}</button><button className="icon-button" onClick={() => { setSound(!sound); if (!sound) { soundRef.current = true; tone(); } }} aria-label={sound ? '효과음 끄기' : '효과음 켜기'}><AtlasIcon icon="sound"/> {sound ? '효과음 끄기' : '효과음 켜기'}</button><button className="icon-button" onClick={()=>setExampleVoice(old=>{localStorage.setItem('logos-example-voice',old?'off':'on');return !old})} aria-label={exampleVoice?'예문 음성 끄기':'예문 음성 켜기'}>{exampleVoice?'예문 음성 끄기':'예문 음성 켜기'}</button>{room&&['battle','dealing'].includes(room.phase)&&<button className="settings-leave" onClick={()=>{if(window.confirm('대전을 포기하면 패배합니다. 나갈까요?')){send('leave');setSettingsOpen(false);}}}>대전 나가기 ↗</button>}</div></section></>}
  {!connected && <div className="connection-banner" role="status">{status}. 새로고침해도 같은 세션으로 복귀합니다.</div>}
  {error && <div className="toast error" role="alert">{error}<button aria-label="알림 닫기" onClick={() => setError('')}>×</button></div>}
  {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}
  {!room && <main className="quick-home dashboard-home"><div className="welcome-profile"><Avatar kind={profile.avatar}/><div className="welcome-profile-copy"><small>다시 돌아온 걸 환영합니다.</small><b data-testid="guest-name">{name}</b><span>현재 레이팅 <strong>{profile.rating}</strong></span></div><div className="welcome-coins" aria-label={`코인 ${profile.coins}개`}><span>●</span><b>{profile.coins.toLocaleString()}</b></div></div><div className="dashboard-actions"><div className="dashboard-quick-stack"><button className="primary quick-start quick-start-art" aria-label="빠른 시작" disabled={!connected} onClick={()=>{tone();if(matchMedia('(pointer:coarse)').matches)void enterGameFullscreen(true);sessionStorage.setItem('logos-entry','guest');send('quick');}}><img src="/brand-ui/start-button.png" alt=""/></button></div><div className="dashboard-secondary-actions"><button className="room-open-button" disabled={!connected} onClick={()=>{setRoomBrowserOpen(true);send('roomList');}}>방 목록</button><a className="practice-entry" href="/practice">연습하기</a></div></div><img className="dashboard-cards" src="/brand-ui/loading-under.png" alt=""/></main>}
  {!room&&roomBrowserOpen&&<RoomBrowser rooms={rooms} connected={connected} onClose={()=>setRoomBrowserOpen(false)} send={send}/>}
  {room?.phase==='lobby'&&<RoomLobby room={room} connected={connected} send={send}/>}
  {authMode&&!room&&<div className="account-backdrop" onClick={()=>setAuthMode(null)}><form className="account-dialog" role="dialog" aria-label={authMode==='register'?'계정 만들기':'계정 로그인'} onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();send(authMode,{username:authName,password:authPassword});}}><h2>{authMode==='register'?'계정 만들기':'계정 로그인'}</h2><p>같은 계정으로 웹과 Unity 웹뷰에서 레이팅을 이어갑니다.</p><label htmlFor="account-name">아이디</label><input id="account-name" autoComplete="username" minLength={3} maxLength={16} value={authName} onChange={e=>setAuthName(e.target.value)} required/><label htmlFor="account-password">비밀번호</label><input id="account-password" type="password" autoComplete={authMode==='register'?'new-password':'current-password'} minLength={10} maxLength={128} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} required/><div className="account-dialog-actions"><button type="button" onClick={()=>setAuthMode(null)}>취소</button><button className="primary" disabled={!connected} type="submit">{authMode==='register'?'만들고 연동':'로그인'}</button></div></form></div>}
  {room && ['matching','reveal'].includes(room.phase) && <MatchPresentation room={room} now={now} cancel={()=>send('leave')}/>}
  {room && ['battle','dealing'].includes(room.phase) && <main className={`battle ${correct?scoreProgress.running?'score-building':'score-burst':''}`} data-score-beat={scoreProgress.completed%2}>
   <section className="table-scoreboard" data-player-count={room.players.length} style={{"--player-count":room.players.length} as CSSProperties}>{[me,...room.players.filter(p=>p.id!==room.you)].filter((p):p is NonNullable<typeof p>=>Boolean(p)).map(p=>{const rank=playerRanks.get(p.id);const crown=rank===1?'gold':rank===2?'silver':rank===3?'bronze':null;return <div className={`table-player ${p.id===room.you?'self':''} ${viewingHandId===p.id?'viewing':''}`} data-player-id={p.id} key={p.id}><button className="player-profile-hit" aria-label={p.id===room.you?'내 프로필 · 내 문장 보기':`${p.name}의 손패와 문장 보기`} onClick={()=>{setExample(null);queueAction('profile_view',p.id);if(p.id===room.you){setViewingHandId(null);return;}void exitGameFullscreen();setViewingHandId(old=>old===p.id?null:p.id);}}><Avatar kind={p.avatar}/><span className="player-profile-details"><b>{p.name}</b><MiniHandPreview name={p.name} cards={playerCards(p,p.id===room.you?room.hand:[])}/></span></button><span className="player-card-count" aria-label={`${p.name} 보유 카드 ${p.handCount+fieldCards(p).length}장`}>{p.handCount+fieldCards(p).length}장</span>{hasScore&&crown&&<img className={`player-rank-crown rank-${rank}`} key={`${room.matchId}-${p.id}-${rank}-${p.score}`} src={`/brand-ui/crowns/${crown}.png`} alt={`${rank}위`}/>} {!p.connected&&!p.ai&&<span className="player-reconnecting">재접속 대기</span>}{p.lastAction&&<PlayerActionBubble key={p.lastAction.id} action={p.lastAction}/>}{p.reaction&&now-p.reaction.at<3000&&<span className="reaction-bubble" key={p.reaction.id} aria-label={`${p.name} 님의 ${p.reaction.emoji} 감정표현`}><ReactionImage emoji={p.reaction.emoji}/></span>}<strong><AnimatedNumber key={room.matchId+p.id} testId={p.id===room.you?'my-score':'opponent-score'} value={p.id===room.you&&correct?.judgment.accepted&&scoreProgress.completed<correct.steps.length?correct.previousScore:p.score}/></strong></div>})}</section><CardTransferFlights room={room}/>

   <div className="round-strip"><span className="round-score-status">최고점 <AnimatedNumber key={room.matchId} value={room.highScore}/> PT{room.goCount>0&&room.leaderId&&<small> · 고/스톱 {room.players.find(p=>p.id===room.leaderId)?.name}</small>}</span><span>{room.phase==='dealing'?'카드 배분 중':room.endsAt===0?'시간 제한 없음':`남은 시간 ${seconds}초`}</span></div>
   {room.players.filter(p=>!p.connected&&!p.ai).map(p=><div className="connection-banner" key={p.id}>{p.name} 님 재접속 대기 · {Math.max(0,Math.ceil(((p.disconnectedAt??now)+room.reconnectMs-now)/1000))}초</div>)}
   <div className={`table-feedback-row ${correct||failedJudgment?'feedback-active':''}`}><div className="table-feedback-slot">
   {correct&&<ScoreCalculation key={correct.id} reveal={correct} completed={scoreProgress.completed} running={scoreProgress.running}/>}
   {failedJudgment&&<div className="judgment score-only-judgment invalid" role="status"><strong>다시 도전!</strong><small>{failedJudgment.reason}</small></div>}
   </div><SharedDeck room={room} now={now} onApprove={()=>send('drawVote',{voteId:room.drawVote?.id,approve:true})}/></div>
   <div className="field-feedback-wrap"><NineSlicePanel className="field-panel-skin"/>
   <button className="text-button return-all-icon" aria-label="모두 되돌리기" title="모두 되돌리기" disabled={pending||scoreProgress.running} onClick={()=>{queueAction('undo_all');setSelected([])}}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12" transform="translate(0 -3)"/></svg></button><div className="sentence-actions" onPointerDown={()=>trace((locked||viewingPlayer||chosen.length<1)?'submit_blocked':'submit_attempt',{code:(locked||viewingPlayer||chosen.length<1)?'SUBMIT_BLOCKED':'SUBMIT_ATTEMPT',reason:scoreProgress.running?'score_animation':pending?'pending':!connected?'disconnected':room.decision?'go_decision':now<room.actionAt?'cooldown':viewingPlayer?'opponent_preview':chosen.length<1?'empty_field':'ready',selected,handVersion:room.handVersion})}>{room.goCount>0&&<div className="go-progress-banner" aria-live="polite"><b>{room.goCount} Go 진행중!!</b></div>}<button className="primary submit" disabled={locked||Boolean(viewingPlayer)||chosen.length<1} onClick={()=>action('submit')}>{pending?'판정 중…':now<room.actionAt?`${Math.max(0,Math.ceil((room.actionAt-now)/1000))}초 후 제출`:'문장 제출'} <span>↗</span></button></div>
   <SentenceField cards={correct&&scoreProgress.running?correct.cards:chosen.length?chosen:me?.lastPlayed??[]} committed={!chosen.length&&Boolean(me?.lastPlayed?.length)} score={correct} completed={scoreProgress.completed} disabled={!interactionEnabled} drag={drag} onReturn={add} renderFace={c=><Illustration kind={c.kind} card={c}/>} goCount={room.goCount}/>{example&&!scoreProgress.running&&<SentenceExamplePanel key={example.id} example={example} voice={exampleVoice} onClose={()=>setExample(null)}/>}
   </div>

   <div ref={drag.handZone} className={`battle-hand-zone ${drag.preview?.toHand?'hand-return-target':''}`}><HandFan cards={remainingHand} renderCard={renderCard} forceExpanded={inspectMode} label="내 손패"/><div className="hand-emote-control"><button className="emoji-trigger" aria-label="감정표현 열기" aria-expanded={emoteOpen} onClick={()=>setEmoteOpen(open=>!open)}><ReactionImage emoji="😮"/></button>{emoteOpen&&<div className="emoji-options" aria-label="감정표현">{REACTIONS.map(emoji=><button key={emoji} aria-label={`${emoji} 감정표현 보내기`} disabled={!connected||room.phase!=='battle'} onClick={()=>{send('react',{emoji});setEmoteOpen(false);}}><ReactionImage emoji={emoji}/></button>)}</div>}</div></div>
  </main>}
  {viewingPlayer&&<OpponentFieldPreview player={viewingPlayer} onClose={()=>{void exitGameFullscreen();setViewingHandId(null);}}/>}
  {drag.preview&&<div ref={drag.trashZone} className={`card-trash-zone ${drag.preview.toTrash?'trash-hover':''}`} role="region" aria-label="카드 버리기"><span aria-hidden="true">🗑</span><b>{drag.preview.toTrash?'놓으면 버려집니다':'여기에 놓아 카드 버리기'}</b></div>}
  {room?.robNotices?.[0]&&<div className="special-backdrop rob-notice-backdrop"><section className="special-dialog rob-notice" role="dialog" aria-label="ROB 피해 알림"><h2>카드를 빼앗겼어요!</h2><div className="rob-notice-body"><Illustration kind={room.robNotices[0].card.kind} card={room.robNotices[0].card}/><div><div className="exchange-sender"><Avatar kind={room.robNotices[0].fromAvatar}/><b>{room.robNotices[0].fromName}</b></div><p>님이 내 {room.robNotices[0].source==='field'?'필드':'손패'}의<br/><strong>{CATALOG[room.robNotices[0].card.kind].name}{effectLabel(room.robNotices[0].card)&&' · '+effectLabel(room.robNotices[0].card)}</strong> 카드를 가져갔어요.</p></div></div><div className="special-actions"><button className="primary" onClick={()=>send('robNoticeRead',{noticeId:room.robNotices![0].id})}>확인</button></div></section></div>}
  {room?.phase==='battle'&&specialCard&&<div className="special-backdrop"><section className={`special-dialog ${specialCard.kind==='exchange'?'exchange-dialog':'rob-dialog'}`} role="dialog" aria-label={specialCard.kind==='rob'?'ROB 카드 선택':'EXCHANGE 교환 요청'}>
   <h2>{specialCard.kind==='rob'?'ROB · 원하는 카드 1장 뺏기':'EXCHANGE · 교환 요청'}</h2>
   {specialCard.kind==='rob'&&<>{robPreview?.cardId===specialCard.id&&robPreview.matchId===room.matchId?<div className="rob-all-cards">{robPreview.players.map(player=><section className="rob-player-group" key={player.id}><div className="rob-player-heading"><Avatar kind={player.avatar}/><b>{player.name}</b><small>{player.protected?"보호중":`${player.cards.filter(canTransferCard).length}장`}</small></div><div className="rob-player-cards">{player.cards.filter(canTransferCard).map(card=><div className="rob-card-choice" key={card.id}><button className={stealId===card.id&&specialTarget===player.id?'selected':''} disabled={!player.connected} aria-label={`${player.name}의 ${card.source==='field'?'필드':'손패'} ${CATALOG[card.kind].name} 카드 뺏기`} onClick={()=>{setSpecialTarget(player.id);setStealId(card.id);setStealSource(card.source);}}><Illustration kind={card.kind} card={card}/></button></div>)}</div>{player.cards.filter(canTransferCard).length===0&&<span className={player.protected?"rob-protected":"rob-no-cards"}>{player.protected?"protect로 보호중!":"선택 가능한 카드 없음"}</span>}</section>)}{robPreview.players.every(p=>p.cards.filter(canTransferCard).length===0)&&<span className="rob-no-cards">뺏을 카드가 없어요.</span>}</div>:<div className="rob-loading">상대 카드를 확인하는 중…</div>}</>}
   {specialCard.kind==='exchange'&&<div className="exchange-picker"><div className="exchange-column"><h3>내 카드 선택하기</h3><div className="exchange-cards">{(me?playerCards(me,hand):hand).filter(c=>c.id!==specialCard.id&&canTransferCard(c)).map(c=><button key={c.id} className={specialOffer===c.id?'selected':''} aria-label={`내 ${CATALOG[c.kind].name} 카드 선택`} onClick={()=>setSpecialOffer(c.id)}><Illustration kind={c.kind} card={c}/></button>)}</div></div><div className="exchange-column"><h3>상대 카드 선택하기</h3>{exchangePreview?.cardId===specialCard.id&&exchangePreview.matchId===room.matchId?exchangePreview.players.map(p=><div className="exchange-player" key={p.id}><div className="exchange-player-name"><Avatar kind={p.avatar}/><b>{p.name}</b><small>{p.cards.length}장</small></div><div className="exchange-cards">{p.cards.filter(canTransferCard).map(c=><button key={c.id} className={wantedId===c.id&&specialTarget===p.id?'selected':''} aria-label={`${p.name}의 ${CATALOG[c.kind].name} 카드 선택`} onClick={()=>{setSpecialTarget(p.id);setWantedId(c.id);}}><Illustration kind={c.kind} card={c}/></button>)}</div></div>):<div className="rob-loading">다른 플레이어의 카드를 확인하는 중…</div>}</div></div>}
   <div className="special-selection-summary" aria-live="polite">{specialTarget?`${room.players.find(p=>p.id===specialTarget)?.name??"상대"} · ${CATALOG[(specialCard.kind==="rob"?robTarget?.cards.find(c=>c.id===stealId):exchangePreview?.players.find(p=>p.id===specialTarget)?.cards.find(c=>c.id===wantedId))?.kind??"pronoun"].name}${specialCard.kind==="exchange"?(specialOffer?` · 내 ${CATALOG[(me?playerCards(me,hand):hand).find(c=>c.id===specialOffer)?.kind??"pronoun"].name}와 교환`:" · 내 카드도 선택해 주세요"):" · 선택 완료"}`:specialCard.kind==="rob"?"상대별 목록에서 뺏을 카드 한 장을 선택하세요. PROTECT 보유 상대는 보호중으로 표시됩니다.":"내가 줄 카드와 상대에게 받을 카드를 각각 선택하세요."}</div><div className="special-actions"><button onClick={()=>setSpecialCard(null)}>취소</button><button className="primary" disabled={!specialTarget||(specialCard.kind==='exchange'&&(!specialOffer||!wantedId||exchangePreview?.cardId!==specialCard.id))||(specialCard.kind==='rob'&&(!stealId||robPreview?.cardId!==specialCard.id||!robTarget?.connected))} onClick={()=>{send('special',{cardId:specialCard.id,targetId:specialTarget,offerId:specialOffer,wantedId,targetHandVersion:specialCard.kind==='exchange'?exchangePreview?.players.find(p=>p.id===specialTarget)?.handVersion:robTarget?.handVersion,stealId,stealSource,targetFieldVersion:specialCard.kind==='exchange'?exchangePreview?.players.find(p=>p.id===specialTarget)?.fieldVersion:robTarget?.fieldVersion,handVersion:room.handVersion,requestId:crypto.randomUUID()});setSpecialCard(null);setRobPreview(null);setExchangePreview(null);}}>{specialCard.kind==='rob'?'사용하기':'교환 요청 보내기'}</button></div>
  </section></div>}
  {room?.phase==='battle'&&room.exchange?.toId===room.you&&<div className="special-backdrop"><section className="special-dialog" role="dialog" aria-label="교환 요청 수락 또는 거절"><h2>카드 교환 요청</h2>{room.players.filter(p=>p.id===room.exchange?.fromId).map(p=><div className="exchange-sender" key={p.id}><Avatar kind={p.avatar}/><b>{p.name}</b><span>님이 교환을 요청했어요.</span></div>)}<div className="exchange-pair"><div><small>받을 카드</small>{room.exchange.offer&&<Illustration kind={room.exchange.offer.kind} card={room.exchange.offer}/>}</div><div><small>줄 카드</small>{room.exchange.wanted&&<Illustration kind={room.exchange.wanted.kind} card={room.exchange.wanted}/>}</div></div><p>선택된 카드로 교환할까요? · {Math.max(0,Math.ceil((room.exchange.expiresAt-now)/1000))}초</p><div className="special-actions"><button className="primary" disabled={!room.exchange.offer||!room.exchange.wanted} onClick={()=>send('exchangeReply',{exchangeId:room.exchange?.id,accept:true})}>교환 수락</button></div><div className="exchange-quick-replies" aria-label="교환 거절 빠른 답장"><small>거절 답장 보내기</small>{EXCHANGE_REPLIES.map(reason=><button key={reason} onClick={()=>send('exchangeReply',{exchangeId:room.exchange?.id,accept:false,reason})}>{reason}</button>)}</div></section></div>}
  {inspectCard&&<div className="card-inspect-backdrop" onClick={()=>setInspectCard(null)}><section className="card-inspect-dialog" role="dialog" aria-label="카드 확대 보기" onClick={e=>e.stopPropagation()}><button className="card-inspect-close" aria-label="카드 확대 닫기" onClick={()=>setInspectCard(null)}>×</button><Illustration kind={inspectCard.kind} card={inspectCard}/></section></div>}
  {room?.phase === 'result' && <main className="result"><div className="eyebrow">A SENTENCE WELL PLAYED</div><span className="result-emblem">{room.winner===room.you?'✦':room.winner===null?'＝':'◇'}</span><h1>{room.winner===room.you?'승리!':room.winner===null?'무승부':`패배 · ${room.players.find(p=>p.id===room.winner)?.name??'상대'} 승리`}</h1><p className="muted">{room.reason}</p>{me&&<PersonalResult key={room.matchId} player={me}/>}<button className="primary ready-button" disabled={!connected||(!resultClosed&&Boolean(me?.rematch))||(!resultClosed&&room.players.length<2)} onClick={()=>send(resultClosed?'leave':'rematch')}>{resultClosed?'경기 종료 · 시작 화면으로 ↗':me?.rematch?'상대의 재대결 동의를 기다리는 중':'한 판 더! 재대결 ↗'}</button>{opponent?.rematch&&!me?.rematch&&<p>상대가 재대결을 기다리고 있어요.</p>}<button className="text-button" onClick={()=>send('leave')}>시작 화면으로</button></main>}
  {room?.decision && !scoreProgress.running && (!correct||exampleShown.current===correct.id) && <div className="decision-backdrop"><section className="go-dialog" role="dialog" aria-label="고 스톱 선택"><div className="eyebrow">NEW HIGH SCORE · {room.highScore} PT</div><h1>{room.decision.playerId===room.you?'고? 스톱!':`${room.players.find(p=>p.id===room.decision?.playerId)?.name} 님의 선택`}</h1><p>{room.decision.playerId===room.you?'최고점을 갱신했어요. 고를 외치면 나의 획득 포인트만 2배!':'잠시 기다려 주세요. 카드 지급과 경기 시간이 멈춥니다.'}</p>{room.decision.expiresAt>0&&<strong>{Math.max(0,Math.ceil((room.decision.expiresAt-now)/1000))}초</strong>}{room.decision.playerId===room.you&&<div className="go-actions"><button className="primary" disabled={!connected||room.goCount>=3} onClick={()=>send('choice',{decisionId:room.decision?.id,choice:'go'})}>{room.goCount>=3?'고 완료':'고!'}</button><button className="secondary" disabled={!connected} onClick={()=>send('choice',{decisionId:room.decision?.id,choice:'stop'})}>스톱!</button></div>}{room.decision.playerId===room.you&&<small>선택 시간이 지나면 자동 스톱합니다</small>}</section></div>}
 </div>;
}
const adminRoute=['/admin','/admin/'].includes(location.pathname);
document.documentElement.classList.toggle('admin-route',adminRoute);
const practiceRoute=location.pathname.replace(/\/$/,'')==='/practice';
document.documentElement.classList.toggle('practice-route',practiceRoute);
const cardViewerRoute=location.pathname.replace(/\/$/,'')==='/cards';
document.documentElement.classList.toggle('card-viewer-route',cardViewerRoute);
createRoot(document.getElementById('root')!).render(<>{adminRoute?<AdminLogs/>:cardViewerRoute?<CardViewer/>:practiceRoute?<GameEntry practice/>:<GameEntry/>}<QuickTools/>{new URLSearchParams(location.search).has('motion-debug')&&<MotionDiagnostics/>}</>);











