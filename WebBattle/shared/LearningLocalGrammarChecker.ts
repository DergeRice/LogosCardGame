/** Port of the user-supplied C# file in reference/unity.
 * Branch order and permissive combinations are intentionally preserved.
 * C# bool + out parameters become nullable parsed offsets / pattern values.
 * A fresh context owns the bare-noun option for each public call.
 */
export enum LearningPosType {
 PRP = 0, PRP_POS = 1, NNU = 2, NNC = 3, PROPN = 4, DT_AN = 5, DT_THE = 6,
 BE = 7, VB = 8, DO = 9, MODAL = 10, JJ = 11, RB = 12, RB_FREQ = 13,
 RB_NOT = 14, IN = 15, CC = 16, TO_VB = 17, WH = 18
}
export enum SentencePatternType { Type1 = 1, Type2 = 2, Type3 = 3, Type4 = 4, Type5 = 5 }
export type LearningGrammarCheckResult = {
 valid: boolean; patternType: SentencePatternType; message: string;
 usedStartIndex: number; usedLength: number; debugLog: string | null;
};
type Sequence = readonly LearningPosType[];
const P = LearningPosType, T = SentencePatternType;
const initial = (message: string): LearningGrammarCheckResult => ({ valid: false, patternType: T.Type1, message, usedStartIndex: 0, usedLength: 0, debugLog: null });

class CheckContext {
 constructor(private readonly allowBareCountableNounThisCheck: boolean) {}

 Check(sequence: Sequence | null | undefined): LearningGrammarCheckResult {
  const result = initial('문장 구조가 맞지 않습니다.');
  if (sequence == null || sequence.length < 2) { result.message = '카드를 2장 이상 올려야 합니다.'; return result; }
  if (sequence.length > 15) { result.message = '문장이 너무 깁니다.'; return result; }
  const pattern = this.TryMatchClause(sequence, 0, sequence.length);
  if (pattern !== null) return { ...result, valid: true, patternType: pattern, message: `${pattern}형식 문장`, usedLength: sequence.length };
  // Preserve the actual source's one-CC split; do not implement extra splits from its comment.
  for (let i = 1; i < sequence.length - 1; i++) {
   if (sequence[i] !== P.CC) continue;
   const left = this.TryMatchClause(sequence, 0, i);
   if (left !== null && this.TryMatchClause(sequence, i + 1, sequence.length) !== null)
    return { ...result, valid: true, patternType: left, message: '복문/중문', usedLength: sequence.length };
  }
  return result;
 }

 CheckPlayableSegment(sequence: Sequence | null | undefined): LearningGrammarCheckResult {
  const result = initial('문장으로 인정되는 카드가 없습니다.');
  if (sequence == null || sequence.length === 0) { result.message = '카드를 1장 이상 올려야 합니다.'; return result; }
  const maxCount = Math.min(sequence.length, 15);
  const debug: string[] = [`[GrammarCheck] sequence=${this.AppendSequence(sequence, 0, sequence.length)} allowBareCountableNoun=${this.allowBareCountableNounThisCheck ? 'True' : 'False'}`];
  for (let length = maxCount; length >= 1; length--) {
   for (let start = 0; start + length <= maxCount; start++) {
    const end = start + length;
    const match = this.TryMatchPlayableSegment(sequence, start, end);
    debug.push(` | segment ${this.AppendSequence(sequence, start, end)}${match ? ` => OK ${match.label}` : ' => fail'}`);
    if (!match) continue;
    return { valid: true, patternType: match.pattern, usedStartIndex: start, usedLength: end - start, message: match.label, debugLog: debug.join('') };
   }
  }
  result.debugLog = debug.join(''); return result;
 }

 private AppendSequence(sequence: Sequence, start: number, end: number): string {
  return '[' + sequence.slice(start, end).map(pos => P[pos] ?? String(pos)).join(' ') + ']';
 }

 private TryMatchPlayableSegment(seq: Sequence, start: number, end: number): { pattern: SentencePatternType; label: string } | null {
  if (end - start === 1 && seq[start] === P.VB) return { pattern: T.Type1, label: '명령문' };
  if (end - start === 3 && this.IsStandaloneNP(seq[start]) && seq[start + 1] === P.VB && this.TryParseComplement(seq, start + 2, end) === end)
   return { pattern: T.Type2, label: '2형식 문장' };
  if (end - start === 3 && this.IsStandaloneNP(seq[start]) && seq[start + 1] === P.VB && this.IsStandaloneNP(seq[start + 2]))
   return { pattern: T.Type3, label: '3형식 문장' };
  const pattern = this.TryMatchClause(seq, start, end);
  return pattern !== null ? { pattern, label: `${pattern}형식 문장` } : null;
 }

 private TryMatchClause(seq: Sequence, start: number, end: number): SentencePatternType | null {
  while (start < end && this.IsAdverb(seq[start])) start++;
  while (end > start && this.IsAdverb(seq[end - 1])) end--;
  if (end - start < 2) return null;
  if (seq[start] === P.WH) return this.TryMatchClause(seq, start + 1, end);
  if (seq[start] === P.DO) {
   const doNpEnd = this.TryParseNP(seq, start + 1, end);
   if (doNpEnd !== null) { const verbIndex = this.SkipAuxiliaryModifiers(seq, doNpEnd, end); if (verbIndex < end && seq[verbIndex] === P.VB) return this.MatchAfterVerb(seq, verbIndex + 1, end); }
  }
  if (seq[start] === P.MODAL) {
   const modalNpEnd = this.TryParseNP(seq, start + 1, end);
   if (modalNpEnd !== null && modalNpEnd < end) {
    const verbIndex = this.SkipAuxiliaryModifiers(seq, modalNpEnd, end);
    if (verbIndex < end && seq[verbIndex] === P.VB) return this.MatchAfterVerb(seq, verbIndex + 1, end);
    if (verbIndex < end && seq[verbIndex] === P.BE) return this.MatchAfterBe(seq, verbIndex + 1, end);
   }
  }
  if (seq[start] === P.BE && this.TryParseNP(seq, start + 1, end) === end) return T.Type2;
  const npEnd = this.TryParseNP(seq, start, end);
  if (npEnd === null || npEnd >= end) return null;
  if (seq[npEnd] === P.BE) return this.MatchAfterBe(seq, npEnd + 1, end);
  if (seq[npEnd] === P.DO || seq[npEnd] === P.MODAL) {
   const next = this.SkipAuxiliaryModifiers(seq, npEnd + 1, end);
   if (next < end && seq[next] === P.VB) return this.MatchAfterVerb(seq, next + 1, end);
  }
  if (seq[npEnd] === P.VB) return this.MatchAfterVerb(seq, npEnd + 1, end);
  return null;
 }

 private MatchAfterVerb(seq: Sequence, start: number, end: number): SentencePatternType | null {
  start = this.SkipAdverbs(seq, start, end);
  if (start === end) return T.Type1;
  const verbPpEnd = this.TryParsePP(seq, start, end);
  if (verbPpEnd !== null && this.SkipAdverbs(seq, verbPpEnd, end) === end) return T.Type1;
  const stateComplementEnd = this.TryParseComplement(seq, start, end);
  if (stateComplementEnd !== null && this.SkipAdverbs(seq, stateComplementEnd, end) === end) return T.Type2;
  const whObjectEnd = this.TryParseWhObjectClause(seq, start, end);
  if (whObjectEnd !== null && this.SkipAdverbs(seq, whObjectEnd, end) === end) return T.Type3;
  if (start + 2 < end && seq[start] === P.JJ) {
   const adjectiveObjectForComplementEnd = this.TryParseNP(seq, start + 1, end);
   if (adjectiveObjectForComplementEnd !== null) {
    const adjectiveObjectComplementEnd = this.TryParseComplement(seq, adjectiveObjectForComplementEnd, end);
    if (adjectiveObjectComplementEnd !== null && this.SkipAdverbs(seq, adjectiveObjectComplementEnd, end) === end) return T.Type5;
   }
  }
  if (start < end && seq[start] === P.JJ) {
   const adjectiveObjectEnd = this.TryParseNP(seq, start + 1, end);
   if (adjectiveObjectEnd !== null && this.SkipAdverbs(seq, adjectiveObjectEnd, end) === end) return T.Type4;
  }
  let obj1End = this.TryParseNP(seq, start, end);
  if (obj1End === null) return null;
  obj1End = this.SkipAdverbs(seq, obj1End, end);
  if (obj1End === end) return T.Type3;
  const relativeEnd = this.TryParseRelativeClause(seq, obj1End, end);
  if (relativeEnd !== null && this.SkipAdverbs(seq, relativeEnd, end) === end) return T.Type3;
  const obj2End = this.TryParseNP(seq, obj1End, end);
  if (obj2End !== null && this.SkipAdverbs(seq, obj2End, end) === end) return T.Type4;
  const vpCompEnd = this.TryParseVerbPhraseComplement(seq, obj1End, end);
  if (vpCompEnd !== null && this.SkipAdverbs(seq, vpCompEnd, end) === end) return T.Type5;
  const compEnd = this.TryParseComplement(seq, obj1End, end);
  if (compEnd !== null && this.SkipAdverbs(seq, compEnd, end) === end) return T.Type5;
  const ppEnd = this.TryParsePP(seq, obj1End, end);
  if (ppEnd !== null && this.SkipAdverbs(seq, ppEnd, end) === end) return T.Type3;
  return null;
 }

 private TryParseVerbPhraseComplement(seq: Sequence, start: number, end: number): number | null {
  if (start >= end || seq[start] !== P.VB) return null;
  if (this.MatchAfterVerb(seq, start + 1, end) !== null) return end;
  return null;
 }

 private TryParseWhObjectClause(seq: Sequence, start: number, end: number): number | null {
  if (start >= end || seq[start] !== P.WH) return null;
  const afterWh = start + 1;
  if (afterWh >= end) return null;
  if (seq[afterWh] === P.BE && this.MatchAfterBe(seq, afterWh + 1, end) !== null) return end;
  if (seq[afterWh] === P.VB && this.MatchAfterVerb(seq, afterWh + 1, end) !== null) return end;
  if (seq[afterWh] === P.DO || seq[afterWh] === P.MODAL) {
   if (this.TryMatchClause(seq, start, end) === null) return null;
   return end;
  }
  return null;
 }

 private TryParseRelativeClause(seq: Sequence, start: number, end: number): number | null {
  if (start >= end || seq[start] !== P.WH) return null;
  const afterWh = start + 1;
  if (afterWh >= end) return null;
  if (seq[afterWh] === P.VB && this.MatchAfterVerb(seq, afterWh + 1, end) !== null) return end;
  if (seq[afterWh] === P.BE && this.MatchAfterBe(seq, afterWh + 1, end) !== null) return end;
  if (this.TryMatchClause(seq, start, end) !== null) return end;
  return null;
 }

 private MatchAfterBe(seq: Sequence, start: number, end: number): SentencePatternType | null {
  start = this.SkipAdverbs(seq, start, end);
  if (start >= end) return null;
  if (seq[start] === P.RB_NOT) start = this.SkipAdverbs(seq, start + 1, end);
  const npEnd = this.TryParseNP(seq, start, end);
  if (npEnd !== null && this.SkipAdverbs(seq, npEnd, end) === end) return T.Type2;
  const adjEnd = this.TryParseAdjP(seq, start, end);
  if (adjEnd !== null && this.SkipAdverbs(seq, adjEnd, end) === end) return T.Type2;
  const ppEnd = this.TryParsePP(seq, start, end);
  if (ppEnd !== null && this.SkipAdverbs(seq, ppEnd, end) === end) return T.Type2;
  return null;
 }

 private TryParseNP(seq: Sequence, start: number, end: number): number | null {
  let next = this.TryParseBaseNP(seq, start, end);
  if (next === null) return null;
  while (true) {
   const ppEnd = this.TryParsePP(seq, next, end);
   if (ppEnd === null || ppEnd <= next) break;
   next = ppEnd;
  }
  return next;
 }

 private TryParseBaseNP(seq: Sequence, start: number, end: number): number | null {
  if (start >= end) return null;
  if (this.IsStandaloneNP(seq[start]) || (this.allowBareCountableNounThisCheck && seq[start] === P.NNC)) return start + 1;
  if (this.IsDeterminer(seq[start]) || seq[start] === P.PRP_POS) {
   let i = start + 1;
   while (i < end && (seq[i] === P.JJ || this.IsAdverb(seq[i]))) i++;
   if (i < end && this.IsNoun(seq[i])) return i + 1;
  }
  if (seq[start] === P.JJ) {
   let i = start + 1;
   while (i < end && seq[i] === P.JJ) i++;
   if (i < end && this.IsUncountableOrProperNoun(seq[i])) return i + 1;
  }
  return null;
 }

 private TryParseAdjP(seq: Sequence, start: number, end: number): number | null {
  while (start < end && this.IsAdverb(seq[start])) start++;
  if (start < end && seq[start] === P.JJ) return start + 1;
  return null;
 }

 private TryParseComplement(seq: Sequence, start: number, end: number): number | null {
  const next = this.TryParseAdjP(seq, start, end);
  if (next !== null) return next;
  if (start + 1 < end && seq[start] === P.TO_VB && seq[start + 1] === P.VB) return start + 2;
  if (start < end && seq[start] === P.TO_VB) return start + 1;
  if (start < end && (seq[start] === P.VB || seq[start] === P.MODAL)) return start + 1;
  return null;
 }

 private TryParsePP(seq: Sequence, start: number, end: number): number | null {
  if (start >= end || seq[start] !== P.IN) return null;
  return this.TryParseNP(seq, start + 1, end);
 }
 private SkipAdverbs(seq: Sequence, start: number, end: number): number {
  while (start < end && this.IsAdverb(seq[start])) start++;
  return start;
 }
 private SkipAuxiliaryModifiers(seq: Sequence, start: number, end: number): number {
  while (start < end && (this.IsAdverb(seq[start]) || seq[start] === P.RB_NOT)) start++;
  return start;
 }
 private IsDeterminer(pos: LearningPosType) { return pos === P.DT_AN || pos === P.DT_THE; }
 private IsNoun(pos: LearningPosType) { return pos === P.NNU || pos === P.NNC || pos === P.PROPN; }
 private IsUncountableOrProperNoun(pos: LearningPosType) { return pos === P.NNU || pos === P.PROPN; }
 private IsStandaloneNP(pos: LearningPosType) { return pos === P.PRP || this.IsUncountableOrProperNoun(pos); }
 private IsAdverb(pos: LearningPosType) { return pos === P.RB || pos === P.RB_FREQ; }
}

export function Check(sequence: Sequence | null | undefined): LearningGrammarCheckResult {
 return new CheckContext(false).Check(sequence);
}
export function CheckPlayableSegment(sequence: Sequence | null | undefined, allowBareCountableNoun = false): LearningGrammarCheckResult {
 return new CheckContext(allowBareCountableNoun).CheckPlayableSegment(sequence);
}
export const LearningLocalGrammarChecker = { Check, CheckPlayableSegment };
