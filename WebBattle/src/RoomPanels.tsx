import {useEffect,useState} from 'react';
import type {RoomListing,RoomView} from '../shared/rules.js';
import {Avatar} from './MatchPresentation.js';
import './room-panels.css';

type Send=(type:string,extra?:Record<string,unknown>)=>boolean;

export function RoomBrowser({rooms,connected,onClose,send}:{rooms:RoomListing[];connected:boolean;onClose:()=>void;send:Send}){
 return <div className="room-browser-backdrop" onClick={onClose}><section className="room-browser" role="dialog" aria-modal="true" aria-label="방 목록" onClick={event=>event.stopPropagation()}>
  <header><div><small>LOGOS · MULTIPLAYER</small><h2>방 목록</h2></div><button type="button" className="room-close" onClick={onClose} aria-label="방 목록 닫기">×</button></header>
  <div className="room-browser-actions"><button className="primary" disabled={!connected} onClick={()=>send('createRoom')}>＋ 방 만들기</button><button disabled={!connected} onClick={()=>send('roomList')}>새로고침</button></div>
  <div className="room-browser-list">{rooms.length?rooms.map(room=><article className="room-list-item" key={room.code}><div><b>{room.name}</b><small>방장 {room.hostName} · {room.humans}명 + AI {room.aiCount}명 / {room.maxPlayers}명</small></div><button disabled={!connected||room.humans+room.aiCount>=room.maxPlayers} onClick={()=>send('joinRoom',{code:room.code})}>입장</button></article>):<p className="room-list-empty">대기 중인 방이 없어요. 새 방을 만들어 보세요.</p>}</div>
 </section></div>;
}

export function RoomLobby({room,connected,send}:{room:RoomView;connected:boolean;send:Send}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(room.name??'');
 useEffect(()=>{setDraft(room.name??'');},[room.name]);
 const host=room.hostId===room.you;
 const save=()=>{if(send('renameRoom',{name:draft.trim()}))setEditing(false);};
 return <main className="room-lobby" aria-label="대기방"><div className="room-lobby-card">
  <div className="room-lobby-heading"><small>ROOM {room.code} · 게임 대기 중</small>{editing?<form onSubmit={event=>{event.preventDefault();save();}} className="room-name-edit"><input aria-label="방 이름" value={draft} maxLength={30} autoFocus onChange={event=>setDraft(event.target.value)}/><button className="primary" disabled={!draft.trim()||!connected}>저장</button><button type="button" onClick={()=>setEditing(false)}>취소</button></form>:<div className="room-title-row"><h1>{room.name}</h1>{host&&<button aria-label="방 이름 편집" onClick={()=>setEditing(true)}>✎ 편집</button>}</div>}<p>최대 6명 · 방장이 시작하면 모두 함께 입장합니다.</p></div>
  <div className="room-player-list">{room.players.map(player=><div className="room-player" key={player.id}><Avatar kind={player.avatar}/><div><b>{player.name}</b><small>{player.ai?'AI':player.connected?'참여 중':'재접속 대기'}{player.id===room.hostId?' · 방장':''}</small></div>{host&&player.ai&&<button aria-label={`${player.name} 제거`} onClick={()=>send('removeRoomAI',{id:player.id})}>제거</button>}</div>)}</div>
  <div className="room-lobby-actions">{host&&<><button disabled={!connected||room.players.length>=6} onClick={()=>send('addRoomAI')}>＋ AI 추가</button><button className="primary" disabled={!connected||room.players.some(player=>!player.ai&&!player.connected)} onClick={()=>send('startRoom')}>게임 시작 ↗</button></>}<button onClick={()=>send('leave')} disabled={!connected}>방 나가기</button></div>
  <label className="ai-difficulty">AI난이도 설정<select aria-label="AI난이도 설정" disabled={!host||!connected} value={room.aiSetting??'normal'} onChange={event=>send('roomDifficulty',{difficulty:event.target.value})}><option value="easy">쉬움</option><option value="normal">보통</option><option value="hard">어려움</option></select></label>
 </div></main>;
}
