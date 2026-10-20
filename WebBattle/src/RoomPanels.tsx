import type {CommunityView} from '../shared/community.js';
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

export function RoomLobby({room,connected,send,community}:{room:RoomView;connected:boolean;send:Send;community:CommunityView|null}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(room.name??''),[picker,setPicker]=useState<'choose'|'friends'|null>(null);
 useEffect(()=>{setDraft(room.name??'');},[room.name]);
 const host=room.hostId===room.you;
 const save=()=>{if(send('renameRoom',{name:draft.trim()}))setEditing(false);};
 return <main className="room-lobby modern-lobby" aria-label="대기방"><div className="room-lobby-card">
 <div className="room-lobby-heading"><small>ROOM {room.code}</small>{editing?<form onSubmit={e=>{e.preventDefault();save();}} className="room-name-edit"><input aria-label="방 이름" value={draft} maxLength={30} onChange={e=>setDraft(e.target.value)}/><button disabled={!draft.trim()||!connected}>저장</button><button type="button" onClick={()=>setEditing(false)}>취소</button></form>:<div className="room-title-row"><h1>{room.name}</h1>{host&&<button aria-label="방 이름 편집" onClick={()=>setEditing(true)}>✎</button>}</div>}</div>
 <div className="lobby-six-slots">{Array.from({length:6},(_,i)=>{const player=room.players[i];return player?<article className="lobby-seat room-player" key={player.id}><Avatar kind={player.avatar} characterId={player.characterId} frameId={player.frameId}/><b>{player.name}</b><small>{player.id===room.hostId?'방장':player.ai?'로고스 AI':player.connected?'참여 중':'재접속 대기'}</small>{player.ai&&<><select aria-label={`${player.name} 난이도`} disabled={!host||!connected} value={player.difficulty??'normal'} onChange={e=>send('roomDifficulty',{id:player.id,difficulty:e.target.value})}><option value="easy">쉬움</option><option value="normal">중급</option><option value="hard">어려움</option></select>{host&&<button className="lobby-remove" aria-label={`${player.name} 제거`} onClick={()=>send('removeRoomAI',{id:player.id})}>×</button>}</>}</article>:<button className="lobby-seat lobby-empty" key={i} disabled={!host||!connected} aria-label={`${i+1}번 빈자리 추가`} onClick={()=>{send('community');setPicker('choose')}}><span>＋</span><small>초대하기</small></button>})}</div>
 <div className="room-lobby-actions"><button disabled={!connected} onClick={()=>send('leave')}>방 나가기</button>{host&&<button className="primary" disabled={!connected||room.players.some(p=>!p.ai&&!p.connected)} onClick={()=>send('startRoom')}>게임 시작 ↗</button>}</div>
 </div>{picker&&<div className="community-backdrop" onClick={()=>setPicker(null)}><section className="community-modal" role="dialog" aria-modal="true" aria-label="빈자리 초대" onClick={e=>e.stopPropagation()}><h2>{picker==='choose'?'함께할 상대':'온라인 친구 초대'}</h2>{picker==='choose'?<><button onClick={()=>{send('addRoomAI');setPicker(null)}}>AI 추가 · 중급</button><button onClick={()=>setPicker('friends')}>친구 초대</button></>:<div className="friend-rows">{community?.friends.filter(f=>f.online).map(f=><article key={f.id}><Avatar kind={f.avatar} characterId={f.characterId} frameId={f.frameId}/><b>{f.name}</b><button onClick={()=>{send('friendInvite',{id:f.id});setPicker(null)}}>초대</button></article>)}{!community?.friends.some(f=>f.online)&&<p>온라인인 친구가 없어요.</p>}</div>}<button onClick={()=>setPicker(null)}>닫기</button></section></div>}</main>;
}
