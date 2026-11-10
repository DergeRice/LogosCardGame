export type FlightLane='left'|'right';
export type FlightSteeringLane=FlightLane|'center';
export type FlightStage='past'|'participle';
export type FlightChallenge={id:number;kind:'approach'|'gate';verbIndex:number;stage:FlightStage;left:string;right:string;correctLane:FlightLane;coinLane?:FlightLane;hazardLane?:FlightLane;startsAt?:number;deadline:number};
export type FlightRun={id:string;startedAt:number;hearts:number;distance:number;score:number;coins:number;speed:number;verbIndex:number;verbOrder?:number[];verbPosition?:number;stage:FlightStage;challengeId:number;challenge:FlightChallenge;coinResolved?:boolean;hazardResolved?:boolean;lastActionAt:number;lastResult?:'correct'|'coin'|'collision';collisionReason?:'gate'|'hazard'|'timeout';lastWord?:string};
export type FlightPublicChallenge=Omit<FlightChallenge,'correctLane'>;
export type FlightPublicRun=Omit<FlightRun,'challenge'|'verbIndex'|'verbOrder'|'verbPosition'> & {verb:{base:string;meaning:string};challenge:FlightPublicChallenge};
export type FlightSeasonRecord={season:string;bestDistance:number;bestScore:number;rank:number|null;plays:number};
export type FlightResult={distance:number;score:number;coins:number};
export type FlightProgress={season:string;bestDistance:number;bestScore:number;plays:number;history:FlightSeasonRecord[];run?:FlightRun;lastResult?:FlightResult};
export type FlightView={serverNow:number;season:string;seasonEndsAt:number;bestDistance:number;bestScore:number;plays:number;history:FlightSeasonRecord[];run?:FlightPublicRun;lastResult?:FlightResult;ranking:{id:string;name:string;profileId?:string;frameId?:string;distance:number;score:number}[]};
export function flightSpeed(distance:number){return Math.min(2.4,1+distance/500*0.12);}
export function flightWindow(speed:number){return Math.max(2800,Math.round(3800/Math.sqrt(speed)));}
export function flightLaneAt(x:number):FlightLane{return x<.5?'left':'right';}
export const FLIGHT_ARRIVAL_GRACE_MS=5000;
export const FLIGHT_GATE_SPACING_MS=900;
