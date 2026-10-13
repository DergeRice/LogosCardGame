import {CATALOG} from '../shared/rules.js';
import type {SentenceStats} from '../shared/sentence-analytics.js';
export function SentenceAnalytics({stats,busy,onPage,onExport}:{stats:SentenceStats;busy:boolean;onPage:(offset:number)=>void;onExport:()=>void}){
 return <section className="admin-sentences" aria-label="누적 문장 통계"><header><div><small>OBSERVED SENTENCES</small><h2>실제로 나온 문장 · 예문 준비 수</h2></div><button disabled={busy} onClick={onExport}>품사 조합 JSON 저장</button></header>
 <p>같은 품사는 같은 카드로 집계합니다. 그림·×2·+2 효과는 합치고 카드 순서와 반복은 유지합니다. 제출 전체가 아닌 서버가 인정한 구간만 사용합니다.</p>
 <div className="admin-stats"><div><span>정답 제출 횟수</span><b>{stats.total.toLocaleString()}</b></div><div><span>필요한 예문 · 조합당 1개</span><b>{stats.unique.toLocaleString()}</b></div><div><span>득점 문장만 준비하면</span><b>{stats.scoredUnique.toLocaleString()}</b></div></div>
 <p className="admin-caption">{stats.since?`${new Date(stats.since).toLocaleDateString('ko-KR')}부터 복원·수집한 누적 통계`:'아직 수집된 정답이 없습니다.'} · AI 포함 · 반복 제출은 빈도에만 반영 · 상세 로그 삭제 후에도 통계는 유지됩니다.{stats.missingCards>0&&` 카드 정보가 없어 제외한 기존 정답 ${stats.missingCards}건.`}</p>
 <div className="admin-form-counts">{stats.forms.map(f=><div key={f.patternType}><b>{f.patternType}형식</b><span>정답 {f.count.toLocaleString()}회 · {f.unique.toLocaleString()}조합 · 득점 {f.scoredCount.toLocaleString()}회</span></div>)}</div>
 <div className="admin-combo-table"><table><thead><tr><th>형식</th><th>품사 조합</th><th>정답 횟수</th><th>득점</th><th>AI / 구분 없음</th></tr></thead><tbody>{stats.combinations.map(c=><tr key={c.key}><td>{c.patternType}형식</td><td><div className="admin-pos-chips">{c.kinds.map((k,i)=><span key={i}>{CATALOG[k].name}</span>)}</div><small>{c.key}</small></td><td>{c.count}</td><td>{c.scoredCount}</td><td>{c.aiCount} / {c.unknownActorCount}</td></tr>)}</tbody></table></div>
 <p className="admin-caption">형식·조합은 빈도순입니다. 문법 정답에는 20점 이하도 포함됩니다. 득점은 20점을 넘어 점수로 반영된 제출입니다. 이는 실제 관측된 조합 수이며 가능한 전체 조합 수는 아닙니다.</p>
 <div className="admin-sentence-paging"><button disabled={busy} onClick={()=>onPage(0)}>처음</button><button disabled={busy||stats.nextOffset===null} onClick={()=>onPage(stats.nextOffset!)}>다음 조합</button></div>
 </section>;
}
