# 게임 사운드 호출표

Unity 메뉴 **Tools > Learning > Sound Cue Table**에서 각 이벤트의 AudioClip, 크기, 음높이, 켜짐 여부를 바꾼 뒤 **저장**을 누른다. **파일 찾기**로 프로젝트 위치를 확인하고 **미리듣기**로 소리를 들어볼 수 있다. 매핑은 `Assets/Resources/Learning/Feedback/sound_table.json`에 저장된다. 새 파일을 쓰려면 프로젝트의 `Resources` 폴더 안에 넣어야 한다. Play 모드를 다시 시작하면 변경 사항이 반영된다.

| 키 | 호출 시점 | 코드 |
| --- | --- | --- |
| `ui_click` | 로비·일반 UI 버튼 클릭 | `LearningRemasterMotion.OnPointerClick` |
| `learning_block_select` | 책 학습 블록 선택 | `LogosLegacyRoomUI.SelectCard` |
| `learning_number_place` | 책 학습 방번호 입력 | `LogosLegacyRoomUI.PlaceSelected` |
| `learning_backspace` | 마지막 방번호 지우기 | `LogosLegacyRoomUI.Backspace` |
| `learning_correct` | 모든 방번호 정답 | `LogosLegacyRoomUI.ShowSuccess` |
| `learning_wrong` | 마지막 방번호 입력 후 오답 | `LogosLegacyRoomUI.Submit` |
| `card_play` | 탐험·대전 카드 올리기 | 두 `Learning*SentenceController.PlayHandCard` |
| `card_return` | 문장 카드를 손패로 되돌리기 | 두 `Learning*SentenceController.ReturnSentenceCard` |
| `card_reorder` | 문장 카드 순서 변경 | 두 `Learning*SentenceController.MoveSentenceCard` |
| `submit_valid` | 탐험·대전 문장 제출 성공 | 두 `Learning*SentenceController.SubmitSentence` |
| `submit_invalid` | 탐험·대전 문장 제출 실패 | 두 `Learning*SentenceController.SubmitSentence` |
| `card_tick` | 탐험 카드별 점수 순회, 카드 이동 | `LearningExplorationSentenceUI`의 `LearningSfxPlayer.PlayCardTick` 호출부 |
| `score_tick` | 탐험 점수 카운트 | `LearningExplorationSentenceUI`의 `LearningSfxPlayer.PlayScoreCount` 호출부 |
| `item_trigger` | 탐험 아이템 발동 | `LearningExplorationSentenceUI.PlaySubmitAnimationRoutine` |
| `round_start` | 탐험 블라인드 시작 | `LearningExplorationSentenceController`의 `PlayBlindStart` 호출부 |
| `projectile_fire` | 탐험 데미지 투사체 발사 | `LearningExplorationSentenceUI.MergeAndFireDamage` |
| `boss_hit` | 탐험 보스 피격 | `LearningExplorationSentenceUI.HitMonster` |
| `hp_drain` | 탐험 보스 HP 감소 | `LearningExplorationSentenceUI.AnimateHp` |
| `boss_clear` | 탐험 보스 처치 | `LearningExplorationSentenceUI.ClearMonster` |

`LearningSfxPlayer`는 기존 탐험 연출 코드의 호출을 위 키로 전달한다. 기본 오디오는 Cute UI & Interact Sound Effects Pack에서 골라 `Assets/Resources/Learning/Feedback`에 두었다. 같은 폴더의 Cartoon FX Remaster 프리팹은 `LearningExplorationHitVfx.Play`가 보스 피격·처치 때 생성한다.
