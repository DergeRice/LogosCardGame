# LOGOS WebBattle

원본 소스: [DergeRice/LogosCardGame — web-battle 브랜치](https://github.com/DergeRice/LogosCardGame/tree/web-battle/WebBattle).
이 브랜치에 push하면 Netlify가 `WebBattle/`를 자동으로 빌드합니다. Unity 프로젝트는 기존 `main` 브랜치에 보존되어 있습니다.

Unity 없이 실행되는 React + TypeScript / Node.js + WebSocket 기본 4인·최대 6인 고·스톱 카드 대전입니다.

## 현재 공개 테스트 주소

https://logos-card-battle.netlify.app

프런트엔드는 Netlify, 실제 대전 서버는 Cloudflare Workers + SQLite Durable Object에 배포했습니다. **PC를 꺼도 서비스가 동작합니다.** 임시 터널과 PC 서버는 종료했습니다. 현재 공용 서버는 wss://logos-card-battle-server.jesus-and-children-ranking-worker.workers.dev/socket 입니다. 배포와 무료 한도는 docs/DEPLOY.md를 참고하세요.

점수: **인정 카드 수 × 인쇄 곱셈·나눗셈 효과 + 인쇄 덧셈·뺄셈 효과**, 이후 고 배율 적용. 예: 5×2+3=13점. 카드 위쪽 번호나 별은 점수가 아닙니다.

## 이 PC에서 실행

Node.js 24가 설치되어 있습니다. PowerShell:

```powershell
cd C:\Users\vlzkc\OneDrive\Desktop\LogosCardGame\WebBattle
npm.cmd ci
npm.cmd run dev
```

브라우저에서 **http://localhost:5173** 을 여세요. 프런트엔드 5173, 서버 3001입니다. 현재 .env의 VITE_WS_URL은 Cloudflare를 가리킵니다. 프런트만 실행하려면 npx vite --host 0.0.0.0을 사용합니다. 로컬 Node 서버로 테스트할 때는 VITE_WS_URL을 비우세요. 종료는 실행 터미널에서 Ctrl+C.

Windows에서는 `start-local.cmd`를 더블클릭해도 됩니다. 같은 Wi-Fi의 휴대폰에서는 개발 서버가 표시하는 Network URL로 접속할 수 있습니다. 방화벽에서 허용한 경우에만 열리며 공용 인터넷 배포 주소는 아닙니다.

- 두 명 테스트: 일반 창 + 시크릿 창. 같은 탭 새로고침은 게스트 세션 유지.
- 첫 접속 시 `게스트 1234` 형태로 자동 접속합니다. **빠른시작 하나**로 매칭합니다.
- 6초 매칭 창 안에 다른 브라우저에서도 빠른시작을 누르면 같은 방으로 입장합니다. 최대 6명까지 참여하며, 대기 시간이 끝났을 때 4명 미만이면 AI로 빈자리를 채워 4인으로 시작합니다.
- 매칭 성사 → 내 프로필 / VS / 상대 프로필 → 공용 덱에서 5장씩. 이후 30초마다 자동으로 모두 1장씩 받고, 전원이 미리 동의하면 즉시 받습니다. 1고 이후에는 현재 최고점 플레이어가 별도로 추가 배분할 수 있습니다.
- 한 문장이 20점을 초과해야 득점·사용 확정 및 고/스톱. **1고 2배 → 2고 3배 → 3고 4배**, 이후 최고점 갱신자가 주도권을 얻습니다.
- GET 2/3은 공용 덱에서 2/3장을 바로 받습니다. ROB은 선택한 상대의 손패 또는 필드에서 원하는 한 장을 가져옵니다. PROTECT를 손에 쥐고 있으면 ROB이 막힙니다. EXCHANGE는 내 카드 한 장과 다른 사람 손패의 원하는 카드 한 장을 골라 그 사람에게 보냅니다. 상대는 수락하거나 빠른 답장으로 거절합니다. 요청은 15초 후 만료됩니다.
- 결과에서 보상 포인트와 임시 레이팅을 확인합니다. 전원이 동의하면 재대결합니다.
- 카드는 부채꼴로 겹쳐 표시합니다. 클릭/터치 → 필드 이동과 손패에서 제외. 필드 카드를 누르면 손패 복귀. 직접 드래그하면 카드를 숨기고 삽입 위치를 표시하며 순서를 변경합니다.
- 상대 프로필을 누르면 가운데 문장 영역에서 그 사람의 남은 손패·현재 조합 중인 문장·기존 제출 문장을 볼 수 있습니다. 아래의 내 손패는 그대로 유지됩니다. 미리보기의 × 또는 내 프로필을 누르면 내 문장으로 돌아갑니다. 내 손패 아래 😊 버튼을 누르면 감정표현 4개가 열립니다.
- 겹친 카드를 고르기 어렵다면 손패 펼쳐 보기를 사용할 수 있습니다.
- 모바일 가로 화면에서는 선수 정보·필드·손패를 한 화면 높이에 맞춰 배치합니다. 우측 상단 ⛶ 버튼으로 브라우저 전체화면을 켜고 끌 수 있습니다. 전체화면을 지원하지 않는 모바일 브라우저에서는 가로 회전 안내가 표시됩니다.
- 같은 PC에서 생성한 세션을 다른 기기로 옮기지는 않습니다. 토큰은 sessionStorage에 보관하며 같은 탭 새로고침/일시적 단절 복귀를 지원합니다.
- 탭을 완전히 닫거나 시크릿 세션을 종료하면 게스트 토큰이 사라질 수 있습니다.

## 검증

```powershell
npm.cmd test
npm.cmd run test:parity
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
```

운영 경기는 **시간 무제한**입니다(MATCH_SECONDS=0). 브라우저 AI 검사는 매칭·무제한 표시·재접속·직접 나가기를 확인합니다. 별도 WebSocket 통합 테스트는 유한 시간 옵션으로 종료·재대결을 검사합니다. 점수·승패 강제 변경 API는 없습니다.

`test:parity`는 PowerShell 7의 C# 컴파일러로 제공 원본을 실행하여 TypeScript 반환값과 비교합니다. 이 PC에는 PowerShell 7이 설치되어 있습니다.

## 운영 빌드

```powershell
npm.cmd run build
npm.cmd start
```

`dist/`는 Netlify에 올리는 정적 사이트, `dist-server/`는 Node 서버입니다. `npm start`는 API/WebSocket 서버만 실행합니다. 프런트엔드 파일을 서비스하지 않습니다.

## 문서

- [새 대전 규칙과 기존 자료 구분](docs/RULES.md)
- [Unity 문법 포팅·C# 원본 비교 결과](docs/UNITY-GRAMMAR.md)
- [Netlify + Cloudflare 무료 배포](docs/DEPLOY.md)
- [에셋 출처와 편집 방법](docs/ASSETS.md)
- [구조와 프로토콜](docs/ARCHITECTURE.md)
- [검증 결과](docs/TEST-REPORT.md)

## 디렉팅

| 수정할 것 | 파일 |
|---|---|
| 색상·간격·카드 크기·애니메이션 | `src/style.css`의 `:root` 및 반응형 규칙 |
| 삽화 시트·표시 영역 | `src/theme.ts` |
| 카드 이름·예시·삽화 선택 | `shared/rules.ts`의 `CATALOG` |
| 원본 문법 판정 | `shared/LearningLocalGrammarChecker.ts` |
| 품사 매핑·인정 구간 점수 | `shared/rules.ts`의 `judge` |
| 부채꼴 손패 | `src/HandFan.tsx`, `src/original-cards.css` |
| 빠른시작·프로필·VS·카드 배분 연출 | `src/MatchPresentation.tsx`, `src/quick-battle.css` |
| 경기·재접속·손패 정책 | `server/game.ts` |
| AI 생각 시간·탐색량 | `server/ai.ts` |

## 현 버전 범위

최초에는 카드 자료만으로 구현했으며, 이후 사용자가 제공한 C# 문법 판정기 전체를 포팅했습니다. 현재 대전은 `CheckPlayableSegment(sequence, false)`를 사용하고, 원본과 457,893회 비교해 불일치가 없었습니다. 탐험·상점·결제·광고·계정·공개 랭킹은 포함하지 않습니다. 로컬 Node 서버는 메모리 저장이며, 공개 Cloudflare 서버는 SQLite Durable Object에 방·게스트 세션을 저장합니다. 게스트 토큰을 잃거나 세션이 만료되면 임시 레이팅은 복원할 수 없습니다.

## 카드와 제출 (최신 규칙)

- 원본 카드 60종(문법 카드 55종 + 기능 5종, Nothing 제외)을 각 1장씩 공유합니다. 모든 카드의 둥근 외곽 바깥은 투명하게 잘라 표시합니다. 같은 그림 중복 지급·사용 카드 재순환은 없습니다.
- 20점 이하의 문법 정답은 0점으로 표시하며 필드·손패·점수를 유지합니다. 20점 초과 시 인정 구간만 사용 확정하고 고/스톱 선택을 즉시 표시합니다. 사람이 선택할 때까지 자동 종료되지 않습니다.
- 계산 영역에는 숫자만 표시합니다. 고 횟수에 따라 필드의 열기·불씨가 점점 강해집니다. 원본 카드 JPEG 시트에서 각 카드를 정확히 분리한 lossless WebP를 직접 렌더링합니다. 생성: `npm run cards:build`.
- 필드 카드 클릭/터치로 손패 복귀. 직접 드래그하면 원본 카드를 숨기고 삽입 위치를 미리 보여 줍니다.
- ROB 화면에는 다른 모든 참가자의 손패와 필드 카드를 한 목록으로 표시하고 카드마다 소유자 이름을 붙입니다. 카드를 고르면 대상 플레이어와 카드 위치가 자동으로 정해집니다. 경기 중 손패 앞면은 참가자들에게 공개되지만, ROB 선택 화면의 버전 조회 응답은 ROB 보유자에게만 전달됩니다. 서버가 카드의 위치와 버전을 다시 검사합니다. 필드에서 가져온 카드는 상대 필드·문장 미리보기·사용 카드 목록에서 없어지고 내 손패로 이동합니다. 이미 얻은 점수는 유지합니다. PROTECT는 상대 손패에 있으면 뺏기를 막습니다.
- EXCHANGE 요청 화면은 상대 프로필과 이름, 작은 제시 카드 미리보기를 표시합니다. 경기 중 선수 상태에는 마지막 기능 카드 행동과 득점한 문장들의 작은 카드 묶음이 표시됩니다. 문장 묶음이 많으면 가로로 스크롤할 수 있습니다.
- 20점 초과로 득점한 문장은 손패에서 사용 확정되지만 필드에는 다음 문장을 조합하기 전까지 계속 표시됩니다. 표시된 사용 확정 카드는 손패로 되돌릴 수 없습니다.
- 첫 화면에서 카드 얼굴 60종을 모두 다운로드하고 디코딩한 뒤 빠른시작을 표시합니다. 첫 접속은 네트워크에 따라 시간이 걸릴 수 있지만, 이후 카드는 브라우저 캐시를 활용합니다.
- 카드 배분 동의는 `0/2`처럼 현재 동의 인원으로 표시합니다. 전원 동의 시 30초를 기다리지 않고 배분한 뒤 타이머를 다시 시작합니다. 거절 버튼은 없습니다. 덱에 전원에게 줄 수 있는 카드가 부족하면 지급을 멈춥니다. 👍 👏 😮 🔥 감정표현은 선수 상태에 잠시 나타납니다.

## Cloudflare 서버

```powershell
npm run check:cloudflare
npm run test:cloudflare
npm run deploy:cloudflare
```

Wrangler 로그인은 배포 시에만 필요합니다. 서버 실행을 위해 PC를 켜둘 필요가 없습니다. 게임과 세션은 SQLite에 저장되며 만료 규칙에 따라 정리됩니다.

