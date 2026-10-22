# LevelPlay 보상형 광고 운영 인계 — 2026-10-22

## 현재 상태

- LevelPlay의 `Logos Card Game` Android 앱, `logos_rewarded_box` 보상형 광고 단위와 같은 이름의 placement가 등록되어 있다. Unity Ads bidding network도 연결되어 있다.
- S2S callback URL은 `https://logos-card-battle-server.jesus-and-children-ranking-worker.workers.dev/ads/levelplay/callback?userId=[USER_ID]&rewards=[REWARDS]&eventId=[EVENT_ID]`로 등록되어 있고 콘솔 상태는 Active다.
- 콘솔이 새 64자리 키를 저장하지 않아, 기존에 저장되어 있던 6자리 키를 운영 Worker의 `LEVELPLAY_S2S_PRIVATE_KEY`와 일치시켰다. `npx wrangler secret list`에서 등록을 확인했고, 운영 `/health`는 200, 서명 없는 콜백은 403이다. Samsung SM-N981N에서 LevelPlay SDK 초기화·광고 로드·실제 광고 재생을 확인했다. 광고 보상 완료 콜백과 서버 지급은 아직 검증하지 못했다.
- 6자리 16진수 키는 추측에 대한 보호가 약하다. 서버의 짧은 유효기간 ticket 및 event ID 중복 방지는 유지되지만, 콘솔에서 긴 키 저장 문제가 해결되면 양쪽 키를 함께 교체해야 한다.
- 이 PC의 `.runtime/secrets/levelplay-s2s.dpapi`에 현재 키를 DPAPI로 보관한다. 쓰이지 않은 64자리 제안 키는 `.runtime/secrets/levelplay-s2s-proposed-unused.dpapi`에 따로 남겨 두었다. 둘 다 Git에서 제외된다. `adsetting/ads-key-vault.ps1 status`로 길이와 지문만 확인할 수 있다. 키를 문서, 채팅, 로그, 프런트 번들에 출력하지 않는다.
- `.runtime/secrets/levelplay-release.env`에 이 게임 전용 App Key와 보상형 광고 단위 ID를 로컬 보관한다. 이 파일도 Git에서 제외된다.

## 키 유지와 검증

1. LevelPlay `Logos Card Game`의 S2S Private key와 Worker secret은 같은 현재 키다. 콘솔에서 키를 바꾼 경우, 새로고침 후 저장값을 확인하고 Worker secret도 함께 바꾼다. 콘솔 비밀키 입력과 저장은 사용자가 직접 수행한다.
2. `powershell -NoProfile -ExecutionPolicy Bypass -File adsetting/ads-key-vault.ps1 status`는 현재 로컬 키의 길이와 지문만 출력한다. `copy`는 클립보드로 복사하고, `install`은 같은 키를 Worker에 재설치한다. 실제 키를 출력하지 않는다. 복사 후에는 `Set-Clipboard -Value ''`로 지운다.
3. 콜백 서명 검증은 `server/levelPlayCallback.ts`에 있다. 앱은 서버 ticket을 Unity Dynamic User ID로 전달하고, 서버는 서명된 S2S 완료 콜백만 보상한다. 무작위 콘솔 테스트 User ID는 유효한 ticket이 아니므로 보상이 지급되지 않는다.

공식 참고: https://docs.unity.com/en-us/grow/levelplay/platform/settings/server-to-server-callback

## Android 배포와 검증

원본 Unity 프로젝트는 `/Users/isangjin/Documents/GitHub/LogosCardGame`이며 Unity Editor `6000.4.5f1`로 개발 APK를 빌드해 폰에 설치했다. `Assets/LogosNative/Editor/LogosNativeBuild.cs`는 빌드 시 `LOGOS_LEVELPLAY_APP_KEY`, `LOGOS_LEVELPLAY_REWARDED_ID`, `LOGOS_KEYSTORE_PROPERTIES`를 읽는다. 기존 Play 업로드 키의 비밀번호를 찾지 못해 운영 앱 업데이트는 Play 업로드 키 재설정이 필요하다. 새 업로드 키와 제출용 PEM은 로컬에 준비했다.

실기기에서 보상형 광고 완료, 닫기, 로드 실패를 확인한다. 완료 시 서버 발급 ticket 하나로 상자 1개만 열리고, 같은 LevelPlay event ID 재전송에는 중복 지급이 없어야 한다. 실버와 골드 광고 개봉 횟수는 한국 날짜 기준 합산 하루 3회다. 운영 계정에 위조 보상을 지급해 테스트하지 않는다.
