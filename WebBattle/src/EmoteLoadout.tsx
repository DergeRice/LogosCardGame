import {useState} from 'react';
import {COSMETICS,type HubSave} from '../shared/store.js';
import {emoteSlots} from '../shared/emotes.js';
import {ReactionImage} from './ReactionImage.js';
import './emote-loadout.css';
export function EmoteLoadout({save,connected,onSave}:{save:HubSave;connected:boolean;onSave:(slots:(string|null)[])=>void}){
 const [editing,setEditing]=useState(false),[slot,setSlot]=useState(0),[draft,setDraft]=useState<(string|null)[]>([]);
 const current=emoteSlots(save),slots=editing?draft:current;
 const open=(index:number)=>{setDraft([...current]);setSlot(index);setEditing(true)};
 const choose=(id:string|null)=>setDraft(old=>old.map((value,i)=>i===slot?id:value===id?null:value));
 const buttons=(modal=false)=><div className="emote-slots" aria-label={modal?'편집할 감정표현 슬롯':'장착한 감정표현 슬롯'}>{slots.map((id,i)=><button key={i} className={modal&&slot===i?'selected':''} aria-label={`감정표현 슬롯 ${i+1}${id?' · '+COSMETICS.find(c=>c.id===id)?.name:' · 비어 있음'}`} onClick={()=>modal?setSlot(i):open(i)}><small>{i+1}</small>{id?<ReactionImage emoji={id as `emote-${string}`}/>:<b>＋</b>}</button>)}</div>;
 return <section className="emote-loadout"><div className="emote-loadout-heading"><h2>감정표현</h2><small>대전에서 사용할 최대 4개</small></div>{buttons()}<button className="hub-pill" disabled={!connected} onClick={()=>open(0)}>감정표현 장착</button>{editing&&<div className="community-backdrop"><section className="community-modal emote-equip-modal" role="dialog" aria-modal="true" aria-label="감정표현 장착"><h2>감정표현 장착</h2><p>슬롯을 선택하고 감정표현을 넣어 주세요.</p>{buttons(true)}<div className="emote-owned-list">{COSMETICS.filter(c=>c.type==='emote'&&save.owned.includes(c.id)).map(item=><button key={item.id} className={draft.includes(item.id)?'equipped':''} aria-label={`${item.name} 선택`} onClick={()=>choose(item.id)}><ReactionImage emoji={item.id as `emote-${string}`}/><b>{item.name}</b><small>{draft.includes(item.id)?`${draft.indexOf(item.id)+1}번 장착`:'선택'}</small></button>)}</div><div className="emote-equip-actions"><button onClick={()=>choose(null)}>선택 슬롯 비우기</button><button onClick={()=>setEditing(false)}>취소</button><button className="primary" disabled={!connected} onClick={()=>{onSave(draft);setEditing(false)}}>저장</button></div></section></div>}</section>;
}
