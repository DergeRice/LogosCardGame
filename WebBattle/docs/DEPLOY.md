# Netlify + Cloudflare 실제 배포

## GitHub 자동 배포 연결 (2026-10-09)

- 저장소: https://github.com/DergeRice/LogosCardGame
- 웹 소스 및 Netlify 배포 브랜치: `web-battle`
- 기존 Unity 프로젝트 브랜치: `main` (변경하지 않음)
- Netlify 프로젝트: https://app.netlify.com/projects/logos-card-battle
- 기본 디렉터리: `WebBattle`
- 빌드: `npm run build` (Netlify가 먼저 lockfile 기준 의존성 설치)
- 게시 디렉터리: `dist` (기본 디렉터리 기준)
- Node.js: 24 (`.nvmrc` 및 `netlify.toml`)
- production 환경변수 `VITE_WS_URL`은 아래의 기존 Cloudflare WSS 주소입니다. 공개 주소이며 비밀값이 아닙니다.

`web-battle`에 커밋을 push하면 Netlify가 빌드·게시합니다. Unity의 수 GB 에셋을 매번 받지 않도록 웹 브랜치는 독립된 이력과 `WebBattle/` 소스만 포함합니다. `.env*` 실제 값, `.netlify/`, `.wrangler/`, `.runtime/`, node_modules, 빌드 결과 및 테스트 스크린샷은 Git에 올리지 않습니다. `.env.example`은 포함합니다.

Cloudflare 서버는 Netlify 정적 사이트 빌드와 별개입니다. `server/`·`shared/`·`cloudflare/` 경기 로직을 바꾼 경우 아래 서버 검사·배포 명령도 실행해야 합니다. 이 저장소 연결을 위해 Cloudflare 서비스나 요금제는 변경하지 않습니다.

## 현재 구성 (2026-09-28)

- 게임: https://logos-card-battle.netlify.app
- 대전 서버: wss://logos-card-battle-server.jesus-and-children-ranking-worker.workers.dev/socket
- 상태 확인: https://logos-card-battle-server.jesus-and-children-ranking-worker.workers.dev/health
- Worker: logos-card-battle-server
- Worker 버전: ac8f5a9b-3292-4fd8-a200-0a44c67849b0
- 서버: Cloudflare Workers + SQLite Durable Object. 유료 플랜 전환, 결제 수단 등록, 유료 VM 생성 없이 배포했습니다.
- **PC 서버(3001)와 Cloudflare Quick Tunnel을 종료한 뒤 공개 브라우저로 검사했습니다. PC 전원과 관계없이 동작합니다.**
- 현재 Netlify 배포: 6aba1dfbee525735290c5284 (ROB 전체 카드와 소유자 표시). 최초 Cloudflare 연결 배포: 6ab8df3f6c392238805e9552. 이전 PC 터널 안내는 reference/previous-tests/DEPLOY-before-cloudflare.md에 보존했습니다.

```text
브라우저 → Netlify (React 화면)
         → Cloudflare Worker /socket (WSS)
           → BattleArena Durable Object (기존 게임 규칙 + SQLite 저장 + Alarm)
```

## 서버 재배포

```powershell
cd C:\Users\vlzkc\OneDrive\Desktop\LogosCardGame\WebBattle
npm ci
npm run check:cloudflare
npm test
npm run test:cloudflare
npm run deploy:cloudflare
```

로그인은 만료됐을 때만 `npx wrangler login --device`로 진행합니다. OAuth 인증은 OS 사용자 설정 폴더에 있으며 웹 빌드·저장소에 포함되지 않습니다. 이번 인증에는 계정/사용자 읽기, Workers/스크립트 쓰기, 로그 읽기 권한을 요청했습니다. 결제나 구독 변경 API는 사용하지 않습니다.

wrangler.jsonc의 `new_sqlite_classes`는 무료 플랜에서도 사용 가능한 SQLite Durable Object입니다. 유료 KV 기반 Durable Object, R2, 별도 D1 DB, Container 등은 생성하지 않습니다. 기존 migration 태그나 클래스 이름은 데이터를 유지하기 위해 임의로 삭제하지 마세요.

## 프런트엔드 재배포

`.env.production.local`과 Netlify production 환경변수 VITE_WS_URL을 동일하게 맞춥니다.

```powershell
npx netlify-cli env:set VITE_WS_URL wss://logos-card-battle-server.jesus-and-children-ranking-worker.workers.dev/socket --context production
npm run build
npx netlify-cli deploy --prod --dir dist --no-build --message "Update LOGOS"
```

`VITE_WS_URL`은 빌드 시 삽입되는 공개 서버 주소입니다. 비밀키를 여기에 넣지 마세요. 허용 origin은 wrangler.jsonc의 ALLOWED_ORIGINS입니다. Netlify 본주소와 로컬 개발 5173만 허용합니다.

## 무료 한도와 비용

Cloudflare Workers Free + Durable Objects Free 기준:

- Workers 요청 100,000/일. Durable Objects 요청 100,000/일, 실행량 13,000 GB-s/일.
- SQLite 읽기 500만 행/일, 쓰기 10만 행/일, 총 저장 5GB.
- 무료 한도 초과 시 해당 요청이 실패하며 다음 한도 초기화를 기다립니다. 무제한 무료나 무중단 보장은 아닙니다.
- 한도는 계정 내 다른 프로젝트와 공유할 수 있습니다. 기존 workers.dev 하위 도메인을 그대로 사용했습니다. OAuth 권한으로 Billing 구독 조회는 거절됐으나, **사용자가 2026-09-27 대시보드에서 Workers Free 표시를 직접 확인했습니다.** 이번 작업으로 유료 구독을 추가하거나 변경하지 않았습니다.
- Workers Free 상태를 유지하면 무료 한도 초과 시 요청이 제한됩니다. 향후 Paid로 변경하면 해당 계정의 요금제/합산 사용량이 적용됩니다.
- Netlify도 기존 계정의 무료 사용량 한도가 적용됩니다.

공식 근거: [Workers 한도](https://developers.cloudflare.com/workers/platform/limits/), [Durable Objects 요금/무료 한도](https://developers.cloudflare.com/durable-objects/platform/pricing/), [WebSocket Hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).

## 저장·재접속·확장 범위

방, 지급 전 덱 순서, 손패, 점수, 고 상태, 요청 중복 기록, 게스트 토큰과 레이팅을 서버 SQLite에 저장합니다. 런타임 재시작 후 복원합니다. 현재 게임 규칙에서는 경기 중 모든 참가자의 손패를 다른 참가자 화면에 공개합니다. 덱 순서와 게스트 토큰은 공개하지 않으며, 행동은 자기 손패에 대해서만 서버가 허용합니다. 세션 토큰은 sessionStorage이므로 탭을 완전히 닫고 새 세션으로 시작하면 이전 계정을 자동 복원하지 않습니다.

방 밖에서 연결이 끊긴 세션은 1시간 비활동 후 정리합니다. 매칭 방 15분, 결과 방 10분, 이탈 유예 30초 규칙은 유지합니다. 영구 계정/영구 랭킹 저장소는 아닙니다.

무료 사용량을 줄이려고 200ms 폴링 대신 다음 경기 이벤트만 Alarm으로 예약하고, 자동 heartbeat 응답과 Hibernation을 사용합니다. 변경된 레코드만 SQLite에 씁니다. 현재 전체 매칭 풀은 단일 Durable Object이며 대규모 부하 테스트는 하지 않았습니다.

## 로컬 개발

- 현재 `.env`는 공용 Cloudflare 서버 주소를 사용합니다. `npx vite --host 0.0.0.0`으로 프런트만 띄워도 됩니다.
- Cloudflare 로컬 실행: `npm run dev:cloudflare`, VITE_WS_URL을 `ws://127.0.0.1:8787/socket`으로 지정.
- 기존 Node 로컬 실행: VITE_WS_URL을 비우고 `npm run dev`. 이 경우에만 3001의 메모리 서버를 사용합니다.
- Cloudflare 모의 환경 저장 파일 `.wrangler/`와 `.runtime/`는 Git/Netlify 업로드에서 제외합니다.

## 2026-09-28 무제한 경기

MATCH_SECONDS=0은 시간 무제한입니다. 경기 endsAt 및 진행 중 방 expiresAt=0에는 만료 Alarm을 예약하지 않습니다. 기존 저장 경기 복구 시에도 0으로 전환합니다. 결과/매칭 방 정리와 재접속 30초는 유지합니다. 사람의 고/스톱 선택은 제한 시간이 없고, AI만 자동 선택합니다. 유한 경기 시간 옵션은 테스트용으로 지원합니다. GET 2/3, ROB, EXCHANGE, PROTECT는 서버 판정으로 구현되어 있습니다.

## 임시 테스트 버튼

대전 화면 상단의 `치트 · 특수카드 받기`는 사람 대 사람 경기에서는 표시되지 않고, 서버에서도 2인 AI 경기만 허용합니다. 현재 덱·AI 손패·사용 카드에 있는 원본 기능 카드 5장을 플레이어 손패로 옮겨 카드 ID 중복을 만들지 않습니다. 사용한 경기는 `testMode`로 저장되며 레이팅·포인트를 정산하지 않습니다. 재대결에는 테스트 상태가 남지 않습니다. 출시 전 제거할 임시 기능입니다.
