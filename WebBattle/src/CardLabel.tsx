import { effectLabel, type Card, type Kind } from '../shared/rules.js';
const labels:Record<Kind,string>={pronoun:'대명사',count:'가산',mass:'불가산',article:'정관사',indefinite:'부정관사',possessive:'소유격',verb:'동사',be:'BE',do:'DO',modal:'조동사',not:'NOT',frequency:'빈도부사',adverb:'부사',preposition:'전치사',very:'VERY',adjective:'형용사',get2:'GET 2',get3:'GET 3',rob:'ROB',exchange:'교환',protect:'보호'};
// Supplemental text stays sharp at small sizes; the original face is unchanged.
export function CardLabel({card}:{card:Card}){const effect=effectLabel(card);return <span className="card-readable-label" aria-hidden="true">{labels[card.kind]}{effect&&<i>{effect}</i>}</span>}

const statusLabels:Record<Kind,string>={...labels,count:'명사',mass:'명사',article:'관사',be:'BE동사'};
export function StatusCardBlock({card}:{card:Card}){const effect=effectLabel(card);return <span className="status-card-block" data-kind={card.kind} title={labels[card.kind]}>{statusLabels[card.kind]}{effect&&<i>{effect}</i>}</span>}
