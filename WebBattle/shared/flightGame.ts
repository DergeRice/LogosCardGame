export type FlightLane='left'|'right';
export type FlightSteeringLane=FlightLane|'center';
export type FlightStage='past'|'participle';
export type FlightChallenge={id:number;kind:'approach'|'gate';verbIndex:number;stage:FlightStage;left:string;right:string;correctLane:FlightLane;coinLane?:FlightLane;hazardLane?:FlightLane;startsAt?:number;deadline:number;awaitingReady?:boolean};
export type FlightRun={id:string;startedAt:number;endsAt?:number;speedSteps?:number;hearts:number;distance:number;score:number;coins:number;speed:number;verbIndex:number;verbOrder?:number[];verbPosition?:number;stage:FlightStage;challengeId:number;challenge:FlightChallenge;coinResolved?:boolean;hazardResolved?:boolean;lastActionAt:number;lastResult?:'correct'|'coin'|'collision';collisionReason?:'gate'|'hazard'|'timeout';lastWord?:string};
export type FlightPublicChallenge=Omit<FlightChallenge,'correctLane'>;
export type FlightPublicRun=Omit<FlightRun,'challenge'|'verbIndex'|'verbOrder'|'verbPosition'> & {verb:{base:string;meaning:string};challenge:FlightPublicChallenge};
export type FlightSeasonRecord={season:string;bestDistance:number;bestScore:number;rank:number|null;plays:number};
export type FlightResult={distance:number;score:number;coins:number};
export type FlightProgress={season:string;bestDistance:number;bestScore:number;plays:number;history:FlightSeasonRecord[];run?:FlightRun;lastResult?:FlightResult};
export type FlightView={serverNow:number;season:string;seasonEndsAt:number;bestDistance:number;bestScore:number;plays:number;history:FlightSeasonRecord[];run?:FlightPublicRun;lastResult?:FlightResult;ranking:{id:string;name:string;profileId?:string;frameId?:string;distance:number;score:number}[]};
export function flightSpeed(distance:number){const baseSpeed=Math.min(3.6,1.5+distance/500*0.32);const progress=(baseSpeed-1.5)/2.1;return Math.min(6.12*.93*.9,baseSpeed*(1.3+.281*progress));}
export function flightSpeedForStreak(correctStreak:number){return flightSpeed((correctStreak+Math.floor(correctStreak/3)*2)*100);}
export function flightWindow(speed:number){return Math.max(1000,Math.round(3800/speed));}
export function flightLaneAt(x:number):FlightLane{return x<.5?'left':'right';}
export const FLIGHT_ROUND_MS=120_000;
export const FLIGHT_ARRIVAL_GRACE_MS=5000;
export const FLIGHT_GATE_SPACING_MS=900;
