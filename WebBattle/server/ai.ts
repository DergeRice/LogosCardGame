import { judgeCards, cardEffect, type Card, type Difficulty, type Kind } from '../shared/rules.js';
// Syntax-shaped candidates prevent impossible prefixes exhausting the budget.
// Templates are public grammar, never opponent information. judge is authoritative.
const nounPhrases: Kind[][] = [['pronoun'], ['mass']];
for (const d of ['article', 'possessive'] as const) for (const n of ['count', 'mass'] as const) nounPhrases.push([d, n], [d, 'adjective', n]);
const templates: Kind[][] = [['verb']];
for (const s of nounPhrases) {
 templates.push([...s, 'verb'], [...s, 'be', 'adjective']);
 for (const o of nounPhrases) {
  templates.push([...s, 'be', ...o], [...s, 'verb', ...o], [...s, 'verb', ...o, 'adjective']);
  for (const o2 of nounPhrases) templates.push([...s, 'verb', ...o, ...o2]);
 }
}
const candidates = templates.filter(t => t.length <= 8).sort((a, b) => a.length - b.length);
export function chooseMove(hand: Card[], difficulty: Difficulty): string[] | null {
 const budget = { easy: 100, normal: 900, hard: 5000 }[difficulty];
 const started = performance.now(); let nodes = 0, best: string[] | null = null, score = -1;
 const ranked = [...hand].sort((a,b)=>{const x=cardEffect(a),y=cardEffect(b);return (y.multiply-x.multiply)*100+y.add-x.add;});
 for (const candidate of candidates) {
  if (nodes >= budget || performance.now() - started > 8) break;
  if (difficulty === 'easy' && candidate.length > 3) break;
  const chosen: Card[] = [];
  for (const kind of candidate) {
   if (++nodes > budget) break;
   const card = ranked.find(c => c.kind === kind && !chosen.some(used => used.id === c.id));
   if (!card) break;
   chosen.push(card);
  }
  if (chosen.length !== candidate.length) continue;
  const result = judgeCards(chosen);
  if (result.valid && result.points > score) { best = chosen.slice(result.usedStartIndex, result.usedStartIndex + result.usedLength).map(c => c.id); score = result.points; if (difficulty === 'easy') break; }
 }
 return best;
}
export const thinkMs = (d: Difficulty) => ({ easy: 6500, normal: 4300, hard: 2600 }[d]);
