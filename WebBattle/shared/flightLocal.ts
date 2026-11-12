import {FLIGHT_VERBS} from '../server/flightWords.js';
import {flightSpeedForStreak,flightWindowForStreak,flightGateSpacingForStreak,FLIGHT_ROUND_MS,type FlightChallenge,type FlightLane,type FlightStage,type FlightSteeringLane} from './flightGame.js';

export type FlightStep={verbIndex:number;stage:FlightStage;left:string;right:string;side:FlightSteeringLane;at:number};
export type LocalFlightRun={id:string;startedAt:number;endsAt:number;hearts:number;score:number;distance:number;speedSteps:number;speed:number;verbIndex:number;verbOrder:number[];verbPosition:number;stage:FlightStage;challengeId:number;challenge:FlightChallenge;steps:FlightStep[];lastResult?:'correct'|'collision';lastWord?:string;lastActionAt:number;gameOverAt?:number};

function shuffledVerbs(previous?:number){const order=Array.from({length:FLIGHT_VERBS.length},(_,i)=>i);for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}if(previous!==undefined&&order[0]===previous)[order[0],order[1]]=[order[1],order[0]];return order;}
function makeChallenge(run:LocalFlightRun,now:number,first=false):FlightChallenge{
 const verb=FLIGHT_VERBS[run.verbIndex],answer=verb[run.stage],wrong=run.stage==='past'?verb.wrongPast:verb.wrongParticiple;
 const distractor=wrong[Math.floor(Math.random()*wrong.length)],correctLane:FlightLane=Math.random()<.5?'left':'right';
 const startsAt=now+(first?Math.round(450*2.7):flightGateSpacingForStreak(run.speedSteps));
 return {id:++run.challengeId,kind:'gate',verbIndex:run.verbIndex,stage:run.stage,left:correctLane==='left'?answer:distractor,right:correctLane==='right'?answer:distractor,correctLane,startsAt,deadline:startsAt+flightWindowForStreak(run.speedSteps)};
}
export function startLocalFlight(now=Date.now()):LocalFlightRun{
 const order=shuffledVerbs(),run:LocalFlightRun={id:`${now}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,startedAt:now,endsAt:now+FLIGHT_ROUND_MS,hearts:3,score:0,distance:0,speedSteps:0,speed:flightSpeedForStreak(0),verbIndex:order[0],verbOrder:order,verbPosition:0,stage:'past',challengeId:0,challenge:null as unknown as FlightChallenge,steps:[],lastActionAt:0};
 run.challenge=makeChallenge(run,now,true);return run;
}
export function advanceLocalFlight(run:LocalFlightRun,side:FlightSteeringLane,now=Date.now()):{run:LocalFlightRun;correct:boolean;word:string;speedUp:boolean}{
 const current=run.challenge,verb=FLIGHT_VERBS[run.verbIndex],correct=side===current.correctLane;
 const step:FlightStep={verbIndex:run.verbIndex,stage:run.stage,left:current.left,right:current.right,side,at:Math.max(0,now-run.startedAt)};
 const next:LocalFlightRun={...run,steps:[...run.steps,step],lastResult:correct?'correct':'collision',lastWord:correct?verb[run.stage]:verb.base,lastActionAt:now};
 if(!correct){next.hearts--;next.speedSteps=0;next.speed=flightSpeedForStreak(0);if(next.hearts<=0)next.gameOverAt=now;else{const startsAt=now+flightGateSpacingForStreak(0);next.challenge={...current,id:++next.challengeId,startsAt,deadline:startsAt+flightWindowForStreak(0)};}return {run:next,correct,word:verb.base,speedUp:false};}
 next.score+=30;next.distance+=100;next.speedSteps++;next.speed=flightSpeedForStreak(next.speedSteps);
 const speedUp=next.speedSteps%3===0&&next.speed>flightSpeedForStreak(next.speedSteps-1);
 if(next.stage==='past')next.stage='participle';else{next.verbPosition++;if(next.verbPosition>=next.verbOrder.length){next.verbOrder=shuffledVerbs(next.verbIndex);next.verbPosition=0;}next.verbIndex=next.verbOrder[next.verbPosition];next.stage='past';}
 next.challenge=makeChallenge(next,now);return {run:next,correct,word:verb[current.stage],speedUp};
}

export function verifyFlightSteps(steps:unknown){
 if(!Array.isArray(steps)||steps.length>180)return null;
 let hearts=3,score=0,speedSteps=0,expectedStage:FlightStage='past',expectedVerb:number|undefined,lastAt=-1,seen=new Set<number>();
 for(const raw of steps){if(!raw||typeof raw!=='object')return null;const step=raw as FlightStep;
  if(!Number.isInteger(step.verbIndex)||step.verbIndex<0||step.verbIndex>=FLIGHT_VERBS.length||!['past','participle'].includes(step.stage)||!['left','right'].includes(step.side)&&step.side!=='center'||!Number.isFinite(step.at)||step.at<=lastAt||step.at>FLIGHT_ROUND_MS||typeof step.left!=='string'||typeof step.right!=='string')return null;
  if(step.stage!==expectedStage||expectedVerb!==undefined&&step.verbIndex!==expectedVerb)return null;
  if(expectedVerb===undefined&&expectedStage==='past'){if(seen.has(step.verbIndex))return null;seen.add(step.verbIndex);}
  const verb=FLIGHT_VERBS[step.verbIndex],answer=verb[step.stage],wrong=step.stage==='past'?verb.wrongPast:verb.wrongParticiple;
  const options=[step.left,step.right];if(options.filter(value=>value===answer).length!==1||!options.some(value=>wrong.includes(value)))return null;
  const selected=step.side==='left'?step.left:step.side==='right'?step.right:'';
  if(selected===answer){score+=30;speedSteps++;if(step.stage==='past'){expectedStage='participle';expectedVerb=step.verbIndex;}else{expectedStage='past';expectedVerb=undefined;if(seen.size===FLIGHT_VERBS.length)seen=new Set();}}
  else{hearts--;speedSteps=0;if(hearts===0&&step!==steps.at(-1))return null;expectedVerb=step.verbIndex;}
  lastAt=step.at;
 }
 return {score,distance:score/30*100,hearts,speedSteps};
}
