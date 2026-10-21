# 광고 키 인계 — 2026-10-22

## 현재 상태 / 필요한 키

필요한 값은 **`LEVELPLAY_S2S_PRIVATE_KEY`**, 보상 서버 콜백 검증용 공유 비밀 문자열이다. RSA/pem 개인키나 ironSource 관리 API Secret Key와 다르다. LevelPlay의 앱별 **Set S2S callback → Private Key**와 Cloudflare Worker secret에 같은 값을 등록한다.

2026-10-22 확인 시 운영 Worker secret 목록에는 `ADMIN_LOG_TOKEN`만 있고 광고 키는 없었다. 새 256비트 키를 아래 로컬 보관함에 준비했다. **아직 LevelPlay/Worker에 등록하지 않았으며 실제 광고 연결 완료 상태가 아니다.** 기존 콘솔 키가 이미 있다면 새 키로 덮어쓰기 전에 기존 운영 설정부터 확인한다.

공식 안내: https://docs.unity.com/en-us/grow/levelplay/platform/settings/server-to-server-callback

## 같은 PC의 다른 에이전트에게 전달할 내용

이 문서와 `adsetting/README.md`, `adsetting/UNITY-BRIDGE.md`를 읽고 이어서 진행하세요.

- 작업 폴더: `C:\Work\Weru\LogosCardGame-web-battle\WebBattle`
- 보관함: `.runtime/secrets/levelplay-s2s.dpapi`
- 도구: `adsetting/ads-key-vault.ps1`
- 현재 Windows 사용자로 DPAPI 복호화한다. 별도 비밀번호가 필요 없고 같은 사용자 세션의 에이전트도 사용할 수 있다. 다른 PC/Windows 계정으로 파일만 복사하면 복호화되지 않는다.
- `.runtime/`은 Git 제외다. 실제 키를 README, 채팅, 프런트 번들, 공개 HTML, 커밋에 적지 않는다.

PowerShell에서 작업 폴더로 이동한 뒤:

```powershell
# 키를 출력하지 않고 복호화 가능 여부와 지문 확인
powershell -NoProfile -File adsetting/ads-key-vault.ps1 status

# 복호화한 키를 클립보드로 복사 → LevelPlay Private Key 칸에 붙여넣기
powershell -NoProfile -File adsetting/ads-key-vault.ps1 copy

# 콘솔 저장 후 클립보드 지우기 (클립보드 기록을 켰다면 기록에서도 삭제)
Set-Clipboard -Value ''

# 같은 키를 Worker에 입력: 표준입력으로 전달, 명령줄에 키를 쓰지 않음
powershell -NoProfile -File adsetting/ads-key-vault.ps1 install
```

Node가 PATH에 없으면 install에 다음 인수를 추가한다:

```powershell
-Node 'C:\Users\1\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
```

`init`은 최초 생성 전용이며 기존 보관함이 있으면 실패한다. 재실행하며 키를 교체하지 말 것. 이 도구는 공개 웹 비밀번호 페이지를 만들지 않는다. 다른 PC 인계가 필요하면 신뢰하는 비밀번호 관리자의 보안 공유 기능으로 전달한다.

## 콘솔 등록 / 연결 검증

1. LevelPlay에서 **로고스 카드게임** 앱의 **Set S2S callback**을 연다. QTLingo 앱 값을 재사용하지 않는다.
2. URL의 기본 경로는 아래다. 공식 안내에 따라 `[USER_ID]`, `[REWARDS]`, `[EVENT_ID]`를 포함시키고, Private Key를 저장한다. 현재 서버는 `userId`, `rewards`, `eventId`, `timestamp`, `signature` 쿼리를 검증한다. 콘솔 테스트가 실제 보내는 이름/서명을 확인한다.

   `https://logos-card-battle-server.jesus-and-children-ranking-worker.workers.dev/ads/levelplay/callback?userId=[USER_ID]&rewards=[REWARDS]&eventId=[EVENT_ID]`

3. Reward amount는 `1`, placement는 `logos_rewarded_box`. `timestamp`/`signature`는 LevelPlay가 생성한 값을 사용하며 임의 고정값을 URL에 넣지 않는다.
4. 콘솔에 저장한 뒤 위 install 명령으로 같은 키를 Worker에 등록한다. 이 명령은 운영 secret을 변경하므로 콘솔의 동일 키 저장을 먼저 확인한다.
5. 서명은 `MD5(timestamp + eventId + decoded userId + rewards + privateKey)`. 검증 코드는 `server/levelPlayCallback.ts`. 키 미등록은 503, 잘못된 서명은 403이어야 한다.
6. 무작위 콘솔 테스트 userId는 게임이 발급한 ticket이 아니므로 서명이 맞아도 보상이 지급되지 않을 수 있다. 실제 Unity 빌드에서 서버 발급 ticket으로 광고 완료 → 보상 1회 지급 → 동일 eventId 재전송 시 중복 지급 없음까지 확인한다. 운영 계정에 위조 보상을 넣어 테스트하지 않는다.

## 함께 필요한 SDK 설정

`LEVELPLAY_APP_KEY_ANDROID`, `LEVELPLAY_REWARDED_AD_UNIT_ID`는 별도 앱/광고 단위 설정이며 이 도구가 생성하지 않는다. 로컬 비공개 release env의 존재/값을 해당 빌드 담당자가 확인해야 한다. 공개 저장소에는 `adsetting/.env.example`만 있다. 이번 확인으로 그 실제 파일 위치/값은 확보하지 못했다.

Android Unity WebView 래퍼의 LevelPlay 브리지를 사용한다. 웹에 광고 SDK를 추가하지 않는다. 기존 Capacitor 빌드로 Unity 광고 동작을 검증하지 않는다. 보상형만 사용하고 COPPA 보호를 유지한다. 광고 상자는 일반 무료 상자 쿨타임과 별도이며 은/금 합산 한국 날짜 기준 하루 3회 제한이다. 세부 연결 규칙은 기존 광고 문서가 기준이다.

## Git 상태

웹 작업 clone의 `web-battle`은 `cf728b2f`까지 fast-forward한 후 이 인계 도구를 추가했다. 별도 Unity clone `C:\Work\Weru\LogosCardGame`은 fetch 완료했지만 로컬 수정/미추적 파일과 충돌하여 main 병합이 중단됐다. 기존 파일을 덮거나 stash/reset하지 않았다.
