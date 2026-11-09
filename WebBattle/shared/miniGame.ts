export type VerbCategory={id:string;line:1|2;label:string;description:string;words:readonly string[]};
export const VERB_CATEGORIES:readonly VerbCategory[]=[
 {id:'intransitive',line:1,label:'자동사',description:'자동사',words:['go','come','arrive','begin','start','walk','run','stand','sit','swim','live','talk','work','look','sleep']},
 {id:'state',line:1,label:'상태동사',description:'상태동사',words:['grow','become','fall','turn','go','get','stay','remain','keep']},
 {id:'sense-link',line:1,label:'5감각동사',description:'5감각동사',words:['look','sound','smell','taste','feel']},
 {id:'that-clause',line:1,label:'that절 동사',description:'that절 동사',words:['say','think','know','hope','believe','imagine','mean','guess','realize']},
 {id:'whether-clause',line:1,label:'간접 whether절',description:'간접 whether절',words:['know','learn','wonder','doubt','see','ask','find out','explain','guess',"I don't know","I'm not sure",'I have no idea']},
 {id:'to-infinitive',line:1,label:'to부정사 동사',description:'to부정사 동사',words:['expect','learn','hope','promise','manage','wish','want','decide','agree','plan']},
 {id:'ing-infinitive',line:1,label:'ing부정사 동사',description:'ing부정사 동사',words:['keep','consider','enjoy','deny','admit','mind','finish','avoid','postpone','give up']},
 {id:'both',line:1,label:'둘 다 동사',description:'둘 다 동사',words:['like','love','prefer','hate','begin','start','continue']},
 {id:'both-different',line:1,label:'다를둘다',description:'다를둘다',words:['try','stop','go on','mean','forget','remember','regret']},
 {id:'give-to',line:2,label:'to수여동사',description:'to수여동사',words:['give','send','teach','show','bring','tell','read','write']},
 {id:'give-for',line:2,label:'for수여동사',description:'for수여동사',words:['buy','make','get','cook','find','order']},
 {id:'give-of',line:2,label:'of수여동사',description:'of수여동사',words:['ask','beg']},
 {id:'fifth-basic',line:2,label:'기본 5형식 동사',description:'기본 5형식 동사',words:['want','allow','tell','cause','help','expect','need','compel','order','urge','require','advise','get','enable','encourage','watch']},
 {id:'causative',line:2,label:'사역동사',description:'사역동사',words:['let','have','make']},
 {id:'perception',line:2,label:'지각동사',description:'지각동사',words:['see','watch','hear','listen to','smell','taste','feel','notice']},
 {id:'help',line:2,label:'help동사',description:'help동사',words:['help']},
 {id:'fifth-adjective',line:2,label:'형용사 5형식',description:'형용사 5형식',words:['make','keep','leave','consider','find','believe','think']},
 {id:'married',line:2,label:'Married 타동사',description:'Married 타동사',words:['marry','attend','reach','resemble','interest','enter','discuss']},
];
export type MiniGameCard={id:number;word:string;categoryId:string};
export type MiniGameRun={id:string;startedAt:number;startsAt?:number;endsAt:number;lockedUntil:number;correct:number;wrong:number;pair:[string,string];queue:MiniGameCard[];nextCardId:number;lastPair?:string;feedback?:string;missedWord?:string};
export type MiniGameSeasonRecord={season:string;best:number;rank:number|null;plays:number;correct:number;wrong:number};
export type MiniGameProgress={season:string;best:number;plays:number;correct:number;wrong:number;history:MiniGameSeasonRecord[];run?:MiniGameRun};
export type MiniGameView={serverNow:number;season:string;seasonEndsAt:number;best:number;plays:number;history:MiniGameSeasonRecord[];run?:{id:string;startsAt:number;endsAt:number;lockedUntil:number;correct:number;wrong:number;left:Pick<VerbCategory,'id'|'label'|'line'>;right:Pick<VerbCategory,'id'|'label'|'line'>;card:{id:number;word:string};upcoming:{id:number;word:string}[];audioWords:string[];feedback?:string;missedWord?:string};ranking:{id:string;name:string;profileId?:string;frameId?:string;score:number}[]};
