# LevelPlay 보상형 광고 운영 인계 — 2026-10-22

## 현재 상태

- LevelPlay의 `Logos Card Game` Android 앱, `logos_rewarded_box` 보상형 광고 단위와 같은 이름의 placement가 등록되어 있다. Unity Ads bidding network도 연결되어 있다.
- S2S callback URL은 `https://logos-card-battle-server.jesus-and-children-ranking-worker.workers.dev/ads/levelplay/callback?userId=[USER_ID]&rewards=[REWARDS]&eventId=[EVENT_ID]`로 등록되어 있고 콘솔 상태는 Active다. 2026-10-23 콘솔의 서명된 테스트 콜백이 `EVENT_ID:OK`와 HTTP 200을 받아 "Your callback settings are valid"가 표시됐고 저장 완료 알림을 확인했다. 이 테스트용 고정 ID는 실제 광고 ticket과 구분하며 보상을 지급하지 않는다.
- 콘솔이 새 64자리 키를 저장하지 않아, 기존에 저장되어 있던 6자리 키를 운영 Worker의 `LEVELPLAY_S2S_PRIVATE_KEY`와 일치시켰다. `npx wrangler secret list`에서 등록을 확인했고, 운영 `/health`는 200, 서명 없는 콜백은 403이다. Samsung SM-N981N에서 LevelPlay SDK 초기화·광고 로드·실제 광고 재생·앱의 보상 완료 이벤트까지 확인했다. Unity는 서버 발급 32자 ticket을 받지만 S2S 지급은 아직 검증하지 못했다. 관측된 이전 콜백 재시도는 8자 `dynamicUserId`여서 거부됐다. 2026-10-23 서버는 빈 `userId`와 `publisherSubId` 중 실제 서명에 사용된 후보를 검증하도록 수정했다. Play Store 코드 14에서 콘솔 설정을 저장한 뒤 다시 광고를 끝까지 재생했고 SDK `LOGOS_LEVELPLAY_REWARDED` 및 `AD_CLOSED: rewarded=True`가 찍혔다. Cloudflare tail에는 이 광고의 `/ads/levelplay/callback` 요청이 없었고 상점 횟수는 `광고 3/3` 그대로였다. 따라서 실제 광고 S2S 전송은 미해결이며, 콘솔 테스트 통과를 실제 지급 성공으로 취급하면 안 된다.
- 6자리 16진수 키는 추측에 대한 보호가 약하다. 서버의 짧은 유효기간 ticket 및 event ID 중복 방지는 유지되지만, 콘솔에서 긴 키 저장 문제가 해결되면 양쪽 키를 함께 교체해야 한다.
- 이 PC의 `.runtime/secrets/levelplay-s2s.dpapi`에 현재 키를 DPAPI로 보관한다. 쓰이지 않은 64자리 제안 키는 `.runtime/secrets/levelplay-s2s-proposed-unused.dpapi`에 따로 남겨 두었다. 둘 다 Git에서 제외된다. `adsetting/ads-key-vault.ps1 status`로 길이와 지문만 확인할 수 있다. 키를 문서, 채팅, 로그, 프런트 번들에 출력하지 않는다.
- `.runtime/secrets/levelplay-release.env`에 이 게임 전용 App Key와 보상형 광고 단위 ID를 로컬 보관한다. 이 파일도 Git에서 제외된다.

## 키 유지와 검증

1. LevelPlay `Logos Card Game`의 S2S Private key와 Worker secret은 같은 현재 키다. 콘솔에서 키를 바꾼 경우, 새로고침 후 저장값을 확인하고 Worker secret도 함께 바꾼다. 콘솔 비밀키 입력과 저장은 사용자가 직접 수행한다.
2. `powershell -NoProfile -ExecutionPolicy Bypass -File adsetting/ads-key-vault.ps1 status`는 현재 로컬 키의 길이와 지문만 출력한다. `copy`는 클립보드로 복사하고, `install`은 같은 키를 Worker에 재설치한다. 실제 키를 출력하지 않는다. 복사 후에는 `Set-Clipboard -Value ''`로 지운다.
3. 콜백 서명 검증은 `server/levelPlayCallback.ts`에 있다. 앱은 서버의 영숫자 32자 ticket을 Unity Dynamic User ID로 전달한다. 서버는 LevelPlay가 서명한 `userId`로 서명을 검증하고 `dynamicUserId`의 ticket이 현재 계정에 발급된 것인지 확인한다. 무작위 콘솔 테스트 User ID는 유효한 ticket이 아니므로 보상이 지급되지 않는다.

공식 참고: https://docs.unity.com/en-us/grow/levelplay/platform/settings/server-to-server-callback

## Android 배포와 검증

원본 Unity 프로젝트는 `/Users/isangjin/Documents/GitHub/LogosCardGame`이며 Unity Editor `6000.4.5f1`로 개발 APK를 빌드해 폰에 설치했다. `Assets/LogosNative/Editor/LogosNativeBuild.cs`는 빌드 시 `LOGOS_LEVELPLAY_APP_KEY`, `LOGOS_LEVELPLAY_REWARDED_ID`, `LOGOS_KEYSTORE_PROPERTIES`를 읽는다. Codex가 생성했던 기존 Play 업로드 키의 비밀번호 파일은 원본 프로젝트의 `WebBattle/android/keystore.properties`에서 찾았다. 기존 업로드 키로 서명한 버전 코드 14 AAB가 Play 내부 테스트에 게시돼 내부 테스터에게 제공 중이다. 폰의 기존 코드 11 운영 앱은 현재 Play 앱 서명 키와 달라 덮어쓰기 설치가 거절됐다. 사용자 승인 후 기존 앱을 제거하고 Play Store에서 재설치한 뒤 코드 14까지 업데이트했다. 코드 13 Play 설치 앱에서 테스트 카드의 `diamonds_100` 구매 후 다이아 100개 지급을 확인했고, 업데이트 뒤에도 잔액이 유지됐다.

실기기에서 보상형 광고 완료, 닫기, 로드 실패를 확인한다. 다음 조사에서는 LevelPlay 측 실제 광고 S2S 전송 로그나 지원 응답을 확보하고, 콜백 도착 여부부터 확인한다. 현재 앱은 콘솔에서 `Not live yet`(Temp)로 등록되어 있어 이 상태와 실제 콜백 발송 관계도 확인한다. 완료 시 서버 발급 ticket 하나로 상자 1개만 열리고, 같은 LevelPlay event ID 재전송에는 중복 지급이 없어야 한다. 실버와 골드 광고 개봉 횟수는 한국 날짜 기준 합산 하루 3회다. 운영 계정에 위조 보상을 지급해 테스트하지 않는다.
