export type VerbCategory={id:string;line:1|2;label:string;description:string;words:readonly string[]};
// Temporary starter vocabulary. The curriculum's line 1/2 list can replace these entries.
export const VERB_CATEGORIES:readonly VerbCategory[]=[
 {id:'move',line:1,label:'움직임',description:'움직이는',words:['run','walk','jump','climb','swim','fly','crawl','dance','travel','slide']},
 {id:'food',line:1,label:'먹고 마시기',description:'먹거나 마시는',words:['eat','drink','chew','taste','sip','bite','swallow','lick','munch','devour']},
 {id:'speech',line:1,label:'말하기',description:'말하는',words:['say','speak','talk','ask','answer','tell','shout','whisper','call','explain']},
 {id:'think',line:2,label:'생각하기',description:'생각하는',words:['think','know','remember','forget','decide','imagine','guess','learn','understand','believe']},
 {id:'make',line:2,label:'만들기',description:'만드는',words:['make','build','draw','paint','create','fix','cut','bake','sew','fold']},
 {id:'feel',line:2,label:'느끼기',description:'느끼는',words:['love','hate','enjoy','fear','worry','miss','feel','prefer','like','admire']},
];
export type MiniGameCard={id:number;word:string;categoryId:string};
export type MiniGameRun={id:string;startedAt:number;startsAt?:number;endsAt:number;lockedUntil:number;correct:number;wrong:number;pair:[string,string];queue:MiniGameCard[];nextCardId:number;lastPair?:string;feedback?:string};
export type MiniGameSeasonRecord={season:string;best:number;rank:number|null;plays:number;correct:number;wrong:number};
export type MiniGameProgress={season:string;best:number;plays:number;correct:number;wrong:number;history:MiniGameSeasonRecord[];run?:MiniGameRun};
export type MiniGameView={serverNow:number;season:string;seasonEndsAt:number;best:number;plays:number;history:MiniGameSeasonRecord[];run?:{id:string;startsAt:number;endsAt:number;lockedUntil:number;correct:number;wrong:number;left:Pick<VerbCategory,'id'|'label'|'line'>;right:Pick<VerbCategory,'id'|'label'|'line'>;card:{id:number;word:string};feedback?:string};ranking:{id:string;name:string;profileId?:string;frameId?:string;score:number}[]};
