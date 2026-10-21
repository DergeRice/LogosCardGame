# LevelPlay 보상형 광고 운영 인계 — 2026-10-22

## 현재 상태

- LevelPlay의 `Logos Card Game` Android 앱, `logos_rewarded_box` 보상형 광고 단위와 같은 이름의 placement가 등록되어 있다. Unity Ads bidding network도 연결되어 있다.
- S2S callback URL은 `https://logos-card-battle-server.jesus-and-children-ranking-worker.workers.dev/ads/levelplay/callback?userId=[USER_ID]&rewards=[REWARDS]&eventId=[EVENT_ID]`로 등록되어 있고 콘솔 상태는 Active다.
- **S2S Private key는 아직 확인되지 않았다.** 콘솔 편집 화면에서 64자리 키를 붙여넣은 직후에는 64자리였으나, 저장 후 새로고침하면 기존 6자리 값으로 돌아온다. 서버와 키가 다르면 광고 시청 후 보상 지급이 실패한다.
- 이 불일치를 발견해 운영 Worker의 `LEVELPLAY_S2S_PRIVATE_KEY` secret을 제거했다. 키가 없는 서버는 광고 ticket 발급을 거절한다. 콘솔 저장이 검증되기 전에는 다시 설치하지 않는다.
- 이 PC의 `.runtime/secrets/levelplay-s2s.dpapi`에 새 256비트 키를 DPAPI로 보관한다. Git에서 제외된다. `adsetting/ads-key-vault.ps1 status`로 지문만 확인할 수 있다. 키를 문서, 채팅, 로그, 프런트 번들에 출력하지 않는다.
- `.runtime/secrets/levelplay-release.env`에 이 게임 전용 App Key와 보상형 광고 단위 ID를 로컬 보관한다. 이 파일도 Git에서 제외된다.

## 콘솔 저장과 서버 활성화

1. LevelPlay `Logos Card Game` → `Edit S2S reward callback`에서 Private key를 로컬 보관함의 64자리 키로 교체해 저장한다. `powershell -NoProfile -ExecutionPolicy Bypass -File adsetting/ads-key-vault.ps1 copy`로 같은 Windows 사용자의 클립보드에 복사할 수 있다. 비밀키 입력과 저장은 사용자가 직접 수행한다.
2. 페이지를 새로고침한 뒤 Private key 길이가 64자리로 유지되는지 확인한다. 6자리로 되돌아오면 저장 실패이므로 Worker secret을 설치하지 않는다. 콜백 URL과 placement도 다시 확인한다.
3. 콘솔 저장이 확인되면 `powershell -NoProfile -ExecutionPolicy Bypass -File adsetting/ads-key-vault.ps1 install`로 동일 키를 운영 Worker secret에 설치한다. `npx wrangler secret list`로 이름만 확인한다. 이후 `Set-Clipboard -Value ''`로 클립보드를 지운다.
4. 콜백 서명 검증은 `server/levelPlayCallback.ts`에 있다. 앱은 서버 ticket을 Unity Dynamic User ID로 전달하고, 서버는 서명된 S2S 완료 콜백만 보상한다. 무작위 콘솔 테스트 User ID는 유효한 ticket이 아니므로 보상이 지급되지 않는다.

공식 참고: https://docs.unity.com/en-us/grow/levelplay/platform/settings/server-to-server-callback

## Android 배포와 검증

현재 checkout은 sparse 상태로 `Assets/LogosNative/Runtime`과 `WebBattle` 중심이다. 전체 Unity 프로젝트가 물리적으로 준비되지 않았고, 프로젝트 지정 Editor `6000.4.5f1`도 설치되어 있지 않다. `Assets/LogosNative/Editor/LogosNativeBuild.cs`는 Git에 있으며 빌드 시 `LOGOS_LEVELPLAY_APP_KEY`, `LOGOS_LEVELPLAY_REWARDED_ID`, `LOGOS_KEYSTORE_PROPERTIES`를 읽는다. 서명 keystore 설정도 확인해야 새 Android AAB를 만들 수 있다. 새 AAB 설치 없이 기존 앱이 변경된 광고 단위를 자동으로 사용하는 것으로 판단하지 않는다.

실기기에서 보상형 광고 완료, 닫기, 로드 실패를 확인한다. 완료 시 서버 발급 ticket 하나로 상자 1개만 열리고, 같은 LevelPlay event ID 재전송에는 중복 지급이 없어야 한다. 실버와 골드 광고 개봉 횟수는 한국 날짜 기준 합산 하루 3회다. 운영 계정에 위조 보상을 지급해 테스트하지 않는다.
