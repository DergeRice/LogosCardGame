import { CheckPlayableSegment, LearningPosType, type LearningGrammarCheckResult } from './LearningLocalGrammarChecker.js';
// Rendering identifiers map explicitly to the original numeric Unity POS enum.
export type Kind = 'pronoun' | 'count' | 'mass' | 'article' | 'indefinite' | 'possessive' | 'verb' | 'be' | 'do' | 'modal' | 'not' | 'frequency' | 'adverb' | 'preposition' | 'very' | 'adjective' | 'get2' | 'get3' | 'rob' | 'exchange' | 'protect';
export type Card = { id: string; kind: Kind; variant?: string };
export const CATALOG: Record<Kind, { name: string; symbol: string; example: string; sheet: number; col: number; row: number; tone: string }> = {
 indefinite: { name: '부정관사', symbol: 'A', example: 'a · an', sheet: 2, col: 0, row: 2, tone: 'gold' },
 do: { name: 'Do', symbol: 'DO', example: 'do · does · did', sheet: 4, col: 1, row: 0, tone: 'green' },
 modal: { name: '조동사', symbol: 'MD', example: 'shall · will · must · can · may', sheet: 5, col: 1, row: 0, tone: 'green' },
 not: { name: 'not', symbol: 'NOT', example: 'not', sheet: 5, col: 3, row: 0, tone: 'pink' },
 frequency: { name: '빈도부사', symbol: 'FREQ', example: 'always · usually · often', sheet: 5, col: 0, row: 1, tone: 'pink' },
 adverb: { name: '부사', symbol: 'ADV', example: 'now · then · soon', sheet: 5, col: 1, row: 2, tone: 'pink' },
 preposition: { name: '전치사', symbol: 'PREP', example: 'in · on · at · by · to', sheet: 4, col: 1, row: 1, tone: 'gold' },
 very: { name: 'Very', symbol: 'VERY', example: 'very', sheet: 5, col: 3, row: 2, tone: 'pink' },
 pronoun: { name: '대명사', symbol: 'P', example: 'I · you · we', sheet: 1, col: 2, row: 0, tone: 'coral' },
 count: { name: '셀 수 있는 명사', symbol: 'N', example: 'book · cat', sheet: 2, col: 2, row: 0, tone: 'blue' },
 mass: { name: '셀 수 없는 명사', symbol: 'N', example: 'water · milk', sheet: 1, col: 2, row: 2, tone: 'blue' },
 article: { name: '정관사', symbol: 'A', example: 'the', sheet: 2, col: 3, row: 2, tone: 'gold' },
 possessive: { name: '소유격', symbol: 'D', example: 'my · your', sheet: 4, col: 3, row: 0, tone: 'gold' },
 verb: { name: '일반동사', symbol: 'V', example: 'run · like · give', sheet: 3, col: 1, row: 0, tone: 'green' },
 be: { name: 'Be동사', symbol: 'BE', example: 'am · are · is', sheet: 3, col: 0, row: 2, tone: 'green' },
 adjective: { name: '형용사', symbol: 'ADJ', example: 'kind · happy', sheet: 5, col: 3, row: 1, tone: 'pink' },
 get2: { name: 'Get 2', symbol: '+2', example: '카드 2장 받기', sheet: 4, col: 2, row: 2, tone: 'green' },
 get3: { name: 'Get 3', symbol: '+3', example: '카드 3장 받기', sheet: 4, col: 1, row: 2, tone: 'blue' },
 rob: { name: 'Rob', symbol: 'R', example: '상대 카드 1장 뺏기', sheet: 4, col: 0, row: 2, tone: 'coral' },
 exchange: { name: 'Exchange', symbol: 'E', example: '상대에게 카드 교환 요청', sheet: 4, col: 2, row: 1, tone: 'green' },
 protect: { name: 'Protect', symbol: 'S', example: '가지고 있으면 Rob 방어', sheet: 4, col: 3, row: 1, tone: 'gold' }
};
export const CARD_POS: Record<Kind, LearningPosType | null> = {
 indefinite: LearningPosType.DT_AN, do: LearningPosType.DO, modal: LearningPosType.MODAL,
 not: LearningPosType.RB_NOT, frequency: LearningPosType.RB_FREQ, adverb: LearningPosType.RB,
 preposition: LearningPosType.IN, very: LearningPosType.RB,
 pronoun: LearningPosType.PRP, possessive: LearningPosType.PRP_POS,
 mass: LearningPosType.NNU, count: LearningPosType.NNC, article: LearningPosType.DT_THE,
 be: LearningPosType.BE, verb: LearningPosType.VB, adjective: LearningPosType.JJ,
 get2: null, get3: null, rob: null, exchange: null, protect: null
};
// Only effects visibly printed on these exact faces are enabled. Client-supplied effects are never accepted.
export const VARIANTS: Record<string, { kind: Kind; sheet: number; col: number; row: number; multiply: number; add: number }> = {
 'possessive-minus2': { kind:'possessive',sheet:1,col:1,row:0,multiply:1,add:-2 },
 'indefinite-x2': { kind:'indefinite',sheet:2,col:2,row:1,multiply:2,add:0 },
 'indefinite-minus2': { kind:'indefinite',sheet:2,col:3,row:1,multiply:1,add:-2 },
 'verb-div2': { kind:'verb',sheet:3,col:0,row:0,multiply:0.5,add:0 },
 'be-div2': { kind:'be',sheet:3,col:2,row:1,multiply:0.5,add:0 },
 'do-x2': { kind:'do',sheet:4,col:0,row:0,multiply:2,add:0 },
 'preposition-x3': { kind:'preposition',sheet:4,col:0,row:1,multiply:3,add:0 },
 'preposition-thirteen': { kind:'preposition',sheet:4,col:3,row:2,multiply:1,add:0 },
 'modal-plus2': { kind:'modal',sheet:5,col:0,row:0,multiply:1,add:2 },
 'not-plus3': { kind:'not',sheet:5,col:2,row:0,multiply:1,add:3 },
 'frequency-thirteen': { kind:'frequency',sheet:5,col:1,row:1,multiply:1,add:0 },
 'adverb-plus2': { kind:'adverb',sheet:5,col:0,row:2,multiply:1,add:2 },
 'very-plus3': { kind:'very',sheet:5,col:2,row:2,multiply:1,add:3 },
 'pronoun-eight': { kind:'pronoun',sheet:1,col:3,row:0,multiply:1,add:0 },
 'pronoun-fifteen': { kind:'pronoun',sheet:1,col:0,row:1,multiply:1,add:0 },
 'pronoun-fourteen': { kind:'pronoun',sheet:1,col:1,row:1,multiply:1,add:0 },
 'mass-fourteen': { kind:'mass',sheet:1,col:0,row:2,multiply:1,add:0 },
 'mass-nine': { kind:'mass',sheet:1,col:1,row:2,multiply:1,add:0 },
 'mass-one': { kind:'mass',sheet:1,col:3,row:2,multiply:1,add:0 },
 'count-nine': { kind:'count',sheet:2,col:3,row:0,multiply:1,add:0 },
 'count-ten': { kind:'count',sheet:2,col:0,row:1,multiply:1,add:0 },
 'count-fourteen': { kind:'count',sheet:2,col:1,row:1,multiply:1,add:0 },
 'article-fourteen': { kind:'article',sheet:2,col:2,row:2,multiply:1,add:0 },
 'verb-thirteen': { kind:'verb',sheet:3,col:2,row:0,multiply:1,add:0 },
 'verb-two': { kind:'verb',sheet:3,col:3,row:0,multiply:1,add:0 },
 'verb-twelve': { kind:'verb',sheet:3,col:0,row:1,multiply:1,add:0 },
 'verb-fifteen': { kind:'verb',sheet:3,col:1,row:1,multiply:1,add:0 },
 'be-eight': { kind:'be',sheet:3,col:1,row:2,multiply:1,add:0 },
 'be-four': { kind:'be',sheet:3,col:2,row:2,multiply:1,add:0 },
 'be-six': { kind:'be',sheet:3,col:3,row:2,multiply:1,add:0 },
 'pronoun-x2': { kind:'pronoun',sheet:1,col:0,row:0,multiply:2,add:0 },
 'mass-plus2': { kind:'mass',sheet:1,col:2,row:1,multiply:1,add:2 },
 'mass-plus1': { kind:'mass',sheet:1,col:3,row:1,multiply:1,add:1 },
 'count-plus3': { kind:'count',sheet:2,col:0,row:0,multiply:1,add:3 },
 'count-plus2': { kind:'count',sheet:2,col:1,row:0,multiply:1,add:2 },
 'article-x2': { kind:'article',sheet:2,col:1,row:2,multiply:2,add:0 },
 'possessive-x2': { kind:'possessive',sheet:4,col:2,row:0,multiply:2,add:0 },
 'be-plus3': { kind:'be',sheet:3,col:3,row:1,multiply:1,add:3 },
 'adjective-plus3': { kind:'adjective',sheet:5,col:2,row:1,multiply:1,add:3 }
};
export const DECK_FACES: Omit<Card,'id'>[] = [
 ...(Object.keys(CATALOG) as Kind[]).map(kind=>({kind})),
 ...Object.entries(VARIANTS).map(([variant,face])=>({kind:face.kind,variant}))
];
export const faceKey = (card: Card | Omit<Card,'id'>) => `${card.kind}:${card.variant??'base'}`;
export function cardEffect(card: Card) { const effect = card.variant ? VARIANTS[card.variant] : undefined; return effect?.kind === card.kind ? effect : { multiply:1, add:0 }; }
export function cardFace(card: Card) { const variant = card.variant ? VARIANTS[card.variant] : undefined; return variant?.kind === card.kind ? { ...CATALOG[card.kind], ...variant } : CATALOG[card.kind]; }
export function effectLabel(card: Card) { const e=cardEffect(card); return e.multiply!==1 ? e.multiply<1 ? `÷${1/e.multiply}` : `×${e.multiply}` : e.add ? e.add<0 ? `−${-e.add}` : `+${e.add}` : ''; }
export type Judgment = LearningGrammarCheckResult & { form?: number; label?: string; points: number; formula?: string; reason: string; accepted?: boolean; submissionId?: string; spans: { start: number; end: number; role: string }[] };
export function judge(kinds: Kind[]): Judgment {
 // This is the actual battle entry point. Check() has different semantics.
 const positions=kinds.map(kind => CARD_POS[kind]);
 if(positions.some(pos=>pos===null))return {valid:false,patternType:1,message:'기능 카드는 문장에 넣을 수 없습니다.',debugLog:'',usedStartIndex:0,usedLength:0,points:0,reason:'기능 카드는 손패에서 사용하세요.',spans:[]};
 const result = CheckPlayableSegment(positions as LearningPosType[], false);
 return { ...result, form: result.valid ? result.patternType : undefined, label: result.message,
  points: result.valid ? result.usedLength : 0,
  reason: result.valid ? `${result.message} · 제출 ${result.usedStartIndex + 1}~${result.usedStartIndex + result.usedLength}번 카드 인정` : result.message,
  spans: result.valid ? [{ start: result.usedStartIndex, end: result.usedStartIndex + result.usedLength, role: '인정 구간' }] : []
 };
}
export function judgeCards(cards: Card[], go = 1): Judgment {
 const result = judge(cards.map(c=>c.kind));
 if (!result.valid) return result;
 const accepted = cards.slice(result.usedStartIndex,result.usedStartIndex+result.usedLength);
 const factors = accepted.map(cardEffect).filter(e=>e.multiply!==1).map(e=>e.multiply);
 const adds = accepted.map(cardEffect).filter(e=>e.add!==0).map(e=>e.add);
 const subtotal = result.usedLength * factors.reduce((a,b)=>a*b,1) + adds.reduce((a,b)=>a+b,0);
 const expression = [String(result.usedLength),...factors.map(x=>x<1?`÷ ${1/x}`:`× ${x}`),...adds.map(x=>x<0?`− ${-x}`:`+ ${x}`)].join(' ');
 result.points = subtotal * go;
 result.formula = go === 1 ? `${expression} = ${result.points}점` : `(${expression}) × ${go}고배율 = ${result.points}점`;
 return result;
}
export const RULES = { handSize: 5, maxPlayers: 4, maxSelected: 15, matchSeconds: 0, reconnectSeconds: 30, actionCooldownMs: 1500, exchangeCooldownMs: 6000, dealMs: 30_000, matchingMs: 6000, revealMs: 3000, dealingMs: 2400, decisionMs: 10_000, goThreshold: 20, maxGo: 3 };
export const goMultiplier = (goCount: number) => 1 + Math.min(3, Math.max(0, goCount));
export type Difficulty = 'easy' | 'normal' | 'hard';
export const REACTIONS=['👍','👏','😮','🔥'] as const;
export type Reaction=typeof REACTIONS[number];
export type DrawVote={id:string;approved:string[]};
export const EXCHANGE_REPLIES=['명사 필요','동사 필요','+ 카드 요청','x 카드 요청','무시하기'] as const;
export type ExchangeReplyReason=typeof EXCHANGE_REPLIES[number];
export type PublicPlayer = { id: string; name: string; avatar: Kind; rating: number; ratingDelta: number; points: number; reward: number; score: number; ready: boolean; connected: boolean; handCount: number; handPreview?: Card[]; draftPreview?:Card[]; rematch: boolean; ai: boolean; disconnectedAt?: number; lastPlayed?: Card[]; playedSentences?: Card[][]; lastAction?: { id: string; text: string }; reaction?: {id:string;emoji:Reaction;at:number} };
export type ExchangeRequest = { id:string; fromId:string; toId:string; offerId:string; wantedId:string; expiresAt:number };
export type Decision = { id: string; playerId: string; expiresAt: number; startedAt: number };
export type RobNotice = {id:string;fromId:string;fromName:string;fromAvatar:Kind;card:Card;source:"hand"|"field"};
export type RoomView = { code: string; phase: 'lobby' | 'matching' | 'reveal' | 'dealing' | 'battle' | 'result'; matchId: string; players: PublicPlayer[]; hand: Card[]; handVersion: number; you: string; robNotices?:RobNotice[]; endsAt: number; stageEndsAt: number; nextDealAt: number; dealSerial: number; deckCount: number; deckTotal: number; usedCards: Card[]; dealIntervalMs: number; goCount: number; multiplier: number; highScore: number; leaderId?: string; drawVote?: DrawVote; testMode?: boolean; decision?: Decision; exchange?: { id:string;fromId:string;toId:string;expiresAt:number;offer?:Card;wanted?:Card }; serverNow: number; actionAt: number; exchangeAt: number; reconnectMs: number; durationMs: number; winner?: string | null; reason?: string; log: { id: string; text: string }[]; judgment?: Judgment; expiresAt: number };
