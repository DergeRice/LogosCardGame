# Netlify + Render 무료 배포

## 현재 실제 배포 (2026-09-27)

- 사이트: https://logos-card-battle.netlify.app
- Netlify 프로젝트 ID: da7a036d-3c94-44dc-814d-82530c77a666
- 배포 ID: 6ab8db2ba3cdab2b5281a864 (34종 단일 덱, 20점 이하 정답 유지, 포인터 드래그와 지급 게이지)
- 공용 서버: wss://towers-clarke-boards-identification.trycloudflare.com/socket
- 프런트엔드: Netlify 정적 배포, 실제 사용자 CLI 인증으로 업로드.
- 백엔드: **이 PC의 컴파일된 Node 서버(3001) + Cloudflare Quick Tunnel**. Render에는 아직 배포하지 않았습니다.
- localhost 개발 화면과 Netlify 사이트 모두 같은 Node 서버에 연결됩니다.
- 새 유료 상품/유료 서버를 생성하지 않았습니다. Netlify 사용량은 기존 계정 플랜 한도를 사용합니다.

PC 종료·절전, Node 종료, 터널 종료 시 대전 서버가 중단됩니다. Quick Tunnel 주소는 다시 실행하면 바뀝니다. 주소 변경 시 아래 VITE_WS_URL을 바꿔 다시 빌드/배포해야 합니다. 서버 메모리 기록은 재시작 시 사라집니다. [Cloudflare 공식 Quick Tunnel 안내](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/)

### 현재 프로세스와 로그

`.runtime/server.pid`, `.runtime/tunnel.pid`에 이번에 실행한 프로세스 ID를 저장했습니다. 로그는 `.runtime/server.out.log`, `.runtime/server.err.log`, `.runtime/tunnel.err.log`입니다. 프로세스 ID는 재부팅 후 재사용될 수 있으므로 종료 전에 명령행이 이 WebBattle 경로를 가리키는지 확인하세요. `.runtime/`와 `.env`는 Git 및 Netlify 정적 배포 대상에서 제외합니다.

실행 서버는 `node --env-file-if-exists=.env dist-server/server/index.js`입니다. 코드를 고친 후 서버에도 반영하려면 빌드 후 이 서버만 재시작해야 합니다. 현재 Vite는 별도로 5173에서 실행됩니다.

### Netlify 재배포

이 폴더는 `.netlify/state.json`으로 새 프로젝트에 연결돼 있습니다. 공개 서버 URL은 `.env.production.local`과 Netlify production 환경변수에 저장했습니다. 둘 다 비밀키가 아닌 공개 접속 주소입니다.

```powershell
# WebBattle 디렉터리에서 실행
npm run build
npx netlify-cli deploy --prod --dir dist --no-build
```

서버 주소 변경 시 `.env.production.local`의 VITE_WS_URL 수정 후 `npx netlify-cli env:set VITE_WS_URL wss://NEW-HOST/socket --context production`, 빌드·재배포. 서버 `.env`의 ALLOWED_ORIGINS에는 `https://logos-card-battle.netlify.app`를 유지합니다. 임의 Netlify preview 주소는 허용하지 않습니다.

---

## PC를 끈 뒤에도 운영하려는 경우: Netlify + Render 무료 서버 준비

아래는 아직 실행하지 않은 Render 배포 절차입니다.

## 구조

```
브라우저 ── HTTPS ── Netlify Free (React 정적 사이트)
    └───── WSS ──── Render Free (Node WebSocket / 단일 인스턴스)
```

정적 사이트에는 지속 실행하는 Node 서버가 없으므로 서버는 Render에 배치합니다. Redis/DB/AI API/유료 인증은 사용하지 않습니다.

## 1. 소스 저장소 준비

현재 `LogosCardGame`은 Git 저장소가 아니며 사용자 요청에 따라 클론/worktree를 만들지 않았습니다. 본 디렉터리를 본인 GitHub 저장소에 업로드한 다음 두 서비스에 연결하세요. `node_modules`, `.env`, 테스트 결과는 업로드 대상이 아닙니다.

권장 구조는 저장소 루트 아래 `WebBattle/`. **WebBattle 자체를 저장소 루트로 올렸다면** 아래 Root/Base directory를 비우고 render.yaml의 `rootDir`을 `.`으로 바꾸세요.

## 2. Render 웹 서비스

New → Web Service → 저장소 선택:

| 설정 | 값 |
|---|---|
| Root directory | `WebBattle` |
| Runtime | Node |
| Plan | **Free** |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check | `/health` |
| Node version | 24 |
| ALLOWED_ORIGINS | `https://YOUR-SITE.netlify.app` (경로·마지막 / 제외) |
| NODE_ENV | `production` |

Render가 주는 `PORT`를 사용합니다. `PORT`를 고정할 필요 없습니다. `render.yaml`에도 동일한 Free 설정이 있습니다. Blueprint를 이용한다면 설정 파일 경로를 `WebBattle/render.yaml`로 지정하세요.

배포 후 `https://YOUR-SERVICE.onrender.com/health`에서 `status: ok`를 확인합니다.

## 3. Netlify 사이트

Import existing project → 저장소 선택:

| 설정 | 값 |
|---|---|
| Base directory | `WebBattle` |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` (base 기준) |
| 환경변수 VITE_WS_URL | `wss://YOUR-SERVICE.onrender.com/socket` |

`netlify.toml`에 빌드·SPA fallback·보안 헤더가 있습니다. 서버 코드는 정적 배포물 `dist/`에 포함되지 않습니다. 공개 URL만 VITE 환경변수에 넣으세요. 비밀키는 필요 없습니다.

Netlify URL이 확정되면 Render의 `ALLOWED_ORIGINS`를 그 정확한 origin으로 맞춰 다시 배포하세요. 여러 주소는 쉼표로 구분합니다. Preview 배포 URL은 자동 허용하지 않습니다.

`VITE_WS_URL`은 **빌드 시점**에 삽입되므로 바꾼 후 Netlify를 다시 빌드하세요. Netlify Drop을 쓸 때도 해당 환경변수를 넣은 뒤 로컬 `npm run build` 결과 `dist/`를 업로드해야 합니다. 서버 URL 없이 올린 정적 파일만으로 온라인 대전은 동작하지 않습니다.

## 4. 공개 환경 검증

두 기기/독립 브라우저에서 Netlify 사이트를 열어 6초 안에 각각 빠른시작 → 같은 방 매칭 → 카드 배분 → 점수/고·스톱 → 결과 → 재대결을 확인하세요. 개발자도구 Network에서 WSS `/socket`의 101 응답을 확인합니다. 403이면 ALLOWED_ORIGINS, 연결 오류면 VITE_WS_URL/Render 상태를 확인합니다.

## 무료 범위와 운영 제한

- Render Free: 워크스페이스별 월 750 인스턴스 시간. 비활성 15분 후 절전, 깨우는 데 약 1분. 무료 인스턴스 재시작 가능. 앱은 자동 재연결하지만 서버 프로세스의 메모리는 복구할 수 없습니다. [Render 공식 무료 안내](https://render.com/docs/free)
- Render의 대역폭/빌드 무료 할당량은 계정 대시보드에서 확인하세요. 결제 수단이 없으면 무료 사용량 초과 시 서비스/빌드가 중단될 수 있습니다. 카드 등록 계정은 초과 비용 설정을 확인하고 유료 자동 업그레이드를 사용하지 마세요. [Render 무료 제한](https://render.com/docs/free)
- Netlify Free는 현재 월 300 크레딧 기반입니다. 본인 계정이 Legacy인지 현재 Free인지 확인하세요. 정적 요청/대역폭/배포 사용량도 계정 한도에 포함될 수 있습니다. [Netlify 공식 플랜](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- WebSocket은 Render 웹 서비스에서 지원합니다. HTTPS 사이트는 `ws://`가 아니라 `wss://`로 연결해야 합니다. [Render WebSocket 문서](https://render.com/docs/websocket)
- 무료 할당량을 보존하려면 게임을 끝낸 탭을 닫으세요. 활성 연결은 heartbeat를 보내므로 접속된 탭이 서버를 계속 활성 상태로 유지합니다. 외부 주기 ping으로 절전을 우회하지 않습니다.
- 상태는 단일 서버 메모리. 여러 인스턴스/지역으로 확장하면 현재 구조로 방 상태를 공유할 수 없습니다.
- 사용자의 제공 에셋 사용 및 배포 요청에 따라 해당 이미지를 배포했습니다. 별도 라이선스 증빙은 저장소에 없습니다. 소유/이용허락을 증명하는 라이선스 문서는 ZIP에 없었습니다.

## 서버 환경변수

`.env.example` 참고. 기본 운영 규칙은 `MATCH_SECONDS=90`, `RECONNECT_SECONDS=30`. 허용 범위는 각각 5~600초, 2~120초이며 서버만 바꿀 수 있습니다. 통합 테스트는 생성자 옵션으로 시간을 단축합니다.
