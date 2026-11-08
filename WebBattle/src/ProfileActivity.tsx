import type {CommunityView} from '../shared/community.js';
import './mini-game.css';

export function ProfileActivity({community,owned}:{community:CommunityView|null;owned:number}){
 return <section className="profile-activity" aria-label="플레이 기록">
  <h2>플레이 기록</h2><div className="profile-activity-numbers"><div><small>보유 치장</small><strong>{owned}개</strong></div><div><small>대전 횟수</small><strong>{community?.gamesPlayed??0}회</strong></div><div><small>활성화 일수</small><strong>{community?.activeDays??0}일</strong></div></div><small>대전 횟수와 활성화 일수는 기록 기능 적용 이후부터 집계됩니다.</small>
  <h3>지난 리그 시즌</h3>{community?.ratingHistory?.length?<ol>{[...community.ratingHistory].reverse().map(item=><li key={item.season}><b>{item.season}</b><span>{item.rating.toLocaleString()}점 · {item.rank?`${item.rank}위`:'순위 없음'} · {item.games}판</span></li>)}</ol>:<p>종료된 시즌이 아직 없어요.</p>}
  <h3>지난 미니게임 시즌</h3>{community?.miniGameHistory?.length?<ol>{[...community.miniGameHistory].reverse().map(item=><li key={item.season}><b>{item.season}</b><span>최고 {item.best}개 · {item.rank?`${item.rank}위`:'순위 없음'} · {item.plays}판</span></li>)}</ol>:<p>종료된 시즌이 아직 없어요.</p>}
 </section>;
}
