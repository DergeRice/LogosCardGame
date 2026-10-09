# Unity 문법 판정 포팅 및 동등성 검증

## 기준 원본

사용자가 후속 메시지로 제공한 `LearningLocalGrammarChecker` 전체와 `LearningPosType`, `SentencePatternType` 정의를 기준으로 합니다.

- 원본: `reference/unity/LearningLocalGrammarChecker.cs` (줄바꿈만 정규화)
- 문법 관련 enum 원문: `reference/unity/LearningEnums.cs`
- TypeScript 포팅: `shared/LearningLocalGrammarChecker.ts`
- 실제 경기 연결/점수 어댑터: `shared/rules.ts`
- C# 실행 하네스: `reference/unity/OracleHarness.cs`, `scripts/unity-oracle.ps1`

Unity 씬/기존 대전 점수 코드 전체를 받은 것은 아닙니다. **문법 판정은 이제 제공된 원본을 포팅한 구현**이며, 점수·90초 경기·덱 지급은 기존 웹 버전의 규칙을 유지합니다.

## 보존한 동작

대전의 유일한 판정 진입점은 `CheckPlayableSegment(sequence, false)`입니다. `Check`도 포팅했지만 대전에서 사용하지 않습니다.

1. 길이 15 이하의 가장 긴 연속 구간부터 검사합니다.
2. 길이가 같으면 작은 시작 인덱스를 우선합니다.
3. 입력이 15장을 넘으면 **원본처럼 앞 15장 안에서만** 검색합니다. 뒤쪽으로 창을 옮기지 않습니다.
4. `VB` 한 장은 `Type1`, 메시지 `명령문`, 길이 1로 인정합니다.
5. `valid`, `patternType`, `usedStartIndex`, `usedLength`, `message`, `debugLog`를 원본과 같게 반환합니다. 인덱스는 0 기반입니다.
6. 20개 보조 함수의 분기 순서를 유지합니다. BE로 시작하는 구간, VB 뒤 JJ/TO_VB/VB/MODAL 보어, JJ + 목적어 형태, 전치사구, WH 목적절/관계절 등도 제거하지 않았습니다.
7. `Check`의 CC 처리는 원본의 실제 구현 그대로 단일 분할입니다. 주석을 근거로 새 문법을 덧붙이지 않았습니다. `CheckPlayableSegment`에 `Check`의 중문 결합을 이식하지도 않았습니다.
8. `allowBareCountableNoun` 기본값은 false. 매 호출에 새로운 `CheckContext`를 만들어 원본 static 옵션의 요청 간 간섭을 제거했습니다.
9. C#의 `bool + out`는 TS의 nullable 결과로 옮겼습니다. 실패 분기/성공 우선순위는 그대로입니다.
10. 디버그 문자열은 반환값으로 보존합니다. 웹 서버에서 무조건 콘솔에 출력하지 않습니다.

## 품사 식별자

숫자와 순서를 정확히 유지합니다.

```
0 PRP       1 PRP_POS    2 NNU       3 NNC       4 PROPN
5 DT_AN     6 DT_THE     7 BE        8 VB        9 DO
10 MODAL    11 JJ        12 RB       13 RB_FREQ  14 RB_NOT
15 IN       16 CC        17 TO_VB    18 WH
```

웹 덱의 기존 8가지 렌더링 ID는 `CARD_POS`에서 명시적으로 대응합니다.

| 웹 카드 ID | Unity 품사 |
|---|---|
| pronoun | PRP |
| possessive | PRP_POS |
| mass | NNU |
| count | NNC |
| article | DT_THE (실제 그림이 정관사이므로 이름/예시도 정관사/the로 정정) |
| be | BE |
| verb | VB |
| adjective | JJ |

판정기는 19가지 전체를 지원합니다. 현재 지급 덱에는 원래 웹 버전의 8가지 카드가 들어 있으며, 다른 품사의 카드 추가는 별도 덱 기획입니다. 나머지 품사를 다른 식별자로 합치거나 판정기에서 누락하지 않았습니다.

## 점수 및 카드 소모

- `usedStartIndex`와 `usedLength`로 **인정된 ID만** 고르며, 해당 문장 점수가 20점을 초과한 경우에만 소모합니다. 20점 이하는 문법 정답이어도 무득점·카드 유지입니다.
- 기본 형식 점수 + `usedLength × 2`를 적용합니다. 제출한 나머지 카드 수는 점수에 포함하지 않습니다.
- `[JJ, VB, JJ]`는 VB 1장만 12점으로 처리하고, 두 JJ의 ID는 보존합니다.
- 클라이언트는 서버의 새 손패에도 존재하는 필드 카드를 유지합니다. 인정 카드만 필드에서 사라지고 보충 카드는 손패에 들어옵니다.
- 필드에 있는 카드는 손패 UI에서 제외합니다. 이는 제출 전 임시 배치이며, 서버 소유권은 성공 판정 시에만 변경됩니다.
- 실패 시 필드/카드를 보존합니다. 개별 × 또는 모두 되돌리기로 손패 복귀가 가능합니다.

## 원본 대조 재현

이 PC의 PowerShell 7.6.5 `Add-Type`으로 **원본 C#을 실제 컴파일**했습니다. Unity Editor를 띄우지 않았고, `UnityEngine.Debug.Log`만 테스트용 no-op으로 대체했습니다.

```powershell
npm.cmd run test:parity
```

결과: **457,893회 비교, 불일치 0건**. 데이터는 `docs/grammar-parity.json`에 있습니다.

- 19개 품사 길이 0~4의 모든 조합.
- null, 주요 보조 함수 분기 사례 및 앞뒤 교란 카드.
- 고정 seed를 사용한 긴 배열/문형 변형 15,000개, 15장 경계와 초과 입력.
- 각 입력을 segment(false), segment(true), Check에 각각 전달.
- 유효 여부/형식/시작/길이/메시지/전체 디버그 문자열 6개 필드를 비교.
- true/false/Check를 교차 호출하여 옵션이 다음 호출에 남지 않는 것도 확인.

이는 위 테스트 집합에 대한 동등성 확인이며 가능한 모든 길이의 배열을 수학적으로 증명한 것은 아닙니다. 최초 포팅본의 대조 결과부터 불일치가 없었습니다. 이전 웹 판정기와 달랐던 VB 단독 거부·부분 구간 거부·허용 보어 제한·전체 제출 카드 소모는 포팅 및 서버 연결 과정에서 수정했습니다.

## 손패 UI

`src/HandFan.tsx`가 화면 너비에 맞춰 원호의 반지름·각도·겹침을 계산합니다. 선택 카드만 필드로 이동하고 남은 손패가 다시 정렬됩니다. 마우스 hover/키보드 focus로 카드가 들리며, 모바일에서 겹친 카드를 고르기 어려울 때는 **손패 펼쳐 보기**를 사용할 수 있습니다.
