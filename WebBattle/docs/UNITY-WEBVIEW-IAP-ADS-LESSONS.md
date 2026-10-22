# Unity 안의 웹앱: WebView·로그인·IAP·보상형 광고 실전 기록

작성 기준: 2026-10-23, LogosCardGame 원본 프로젝트와 Play 내부 테스트 Android 앱. 다음 프로젝트에서 그대로 복사할 설계 원칙과 이 프로젝트에서만 쓰는 값은 구분했다. 실제 코드가 이 문서보다 우선이며, 비밀번호·API 비밀키·구매 토큰은 여기에 기록하지 않는다.

## 0. 한눈에 보는 결과와 증거 수준

| 영역 | 실제로 겪은 문제 | 적용한 해결 | 확인한 범위 |
| --- | --- | --- | --- |
| 웹 콘텐츠 | 폰 앱에서 홈 그림·연출이 빠지고 웹 브라우저와 다르게 보임 | 실제 WebView URL/배포 자산, 로드 오류와 기기 조건을 나눠 점검하고 누락 이미지 fallback 정비 | 개발 APK와 Play 앱에서 홈·상점 이미지를 눈으로 확인. 최초 모든 리소스 누락의 단일 원인은 확정하지 못함 |
| 갱신 속도 | Unity `SurfaceView`가 5Hz를 요청한다는 보고, 코드의 15fps 제한, 심한 체감 끊김 | `vSyncCount=0`, `targetFrameRate=60`, Unity 배경 흰색 | Play 코드 14의 SurfaceFlinger 126표본 중간값 16.66ms·33ms 초과 0개. 모든 WebView 장면의 무끊김을 증명하는 값은 아님 |
| Google 로그인 | 웹에서는 열리던 팝업이 Unity WebView에서 열리지 않거나 최초 동의 중 30초 제한에 걸림 | Android Credential Manager와 서버용 웹 OAuth 클라이언트 ID 사용, 네이티브 요청 5분 제한, 설치 앱 패키지·서명 SHA-1별 Android OAuth 등록 | 개발 APK와 Play 설치 앱에서 계정 선택·로그인 복귀 확인 |
| IAP | 구매창 미표시, 상품 조회/서명 혼동, 클라이언트 성공만으로 재화 지급 위험 | Android BillingClient 직접 연결, `standard` 옵션의 `offerToken`, 계정 해시, 서버 Play 검증·토큰 원장·소비 | Play 설치 앱에서 `diamonds_100` 테스트 구매 후 다이아 0→100 확인. 취소·재설치 복구·중복 구매의 전체 실기기 매트릭스는 미완료 |
| 광고 | SDK 광고 완료는 왔으나 실제 LevelPlay S2S 요청이 없어 상점은 `광고 3/3` 그대로; 웹 사전 준비 검사로 버튼도 비활성 | QTLingo와 같이 `OnAdRewarded` 완료 신호를 웹에 보내고 서버의 일회용 ticket·하루 3회 제한으로 지급. 광고 버튼은 별도 `adReady` 검사로 막지 않음 | Play 코드 14·웹 v0.9.169에서 실제 시청 후 `3/3→2/3`, 별가루 `11,457→11,487`; **실제 S2S 발송은 여전히 미확인** |

**보안상 중요한 차이:** IAP의 구매 증거는 Google Play 서버에서 검증한다. 현재 광고 보상은 SDK 완료 이벤트를 웹이 서버에 전달하는 방식이므로 클라이언트 변조를 암호학적으로 막지 못한다. 서버의 ticket 소유권·만료·1회 사용·일일 3회 제한은 과지급을 줄이지만 광고 시청 자체의 증명은 아니다. LevelPlay S2S 실전송이 확인되면 서버 검증 전용으로 전환하는 것이 목표다. [Unity의 S2S 권고](https://docs.unity.com/en-us/grow/levelplay/platform/settings/server-to-server-callback)

## 1. 연결 구조: 어느 층에서 무엇을 하는가

```text
WebBattle React (HTTPS, Netlify)
  ├─ prompt('LOGOS_NATIVE', JSON) ──> Android WebChromeClient.onJsPrompt
  │                                      └─ UnitySendMessage → LogosCommerceBridge
  │                                           ├─ Credential Manager → Google ID token
  │                                           ├─ BillingClient → purchaseToken
  │                                           └─ LevelPlay → OnAdRewarded
  ├─ logos-native-result CustomEvent <─────── Unity WebView.evaluateJavascript
  └─ 인증 WebSocket ─────────────────────────> Cloudflare Durable Object
                                               ├─ Google 토큰 검증
                                               ├─ Google Play 구매 검증·지급·소비
                                               └─ 광고 ticket·지급·일일 제한
```

- 진입 씬: `Assets/01.Scene/6.WebBattleScreen.unity` → `Assets/02.Script/Learning/UI/LearningWebBattleView.cs` → `Assets/LogosNative/Runtime/LogosCommerceBridge.cs`.
- Android WebView와 브라우저 요청 출처 검사: `Assets/LogosNative/Plugins/Android/LogosWebView.java`. 고정 HTTPS 호스트만 열고, `onJsPrompt`의 **호출 프레임 URL과 현재 WebView URL을 모두 확인**한다. 임의 페이지에 `addJavascriptInterface`를 공개하지 않는다. [Android WebChromeClient API](https://developer.android.com/reference/android/webkit/WebChromeClient)
- 웹 쪽 bridge 선언·호출: `WebBattle/adsetting/unity-native.d.ts`, `WebBattle/src/nativeAuth.ts`, `nativePurchase.ts`, `nativeRewarded.ts`.
- `request()`는 ID를 붙여 Promise로 응답을 짝짓는다. 일반 요청 30초, 로그인·구매 5분, 광고 10분이다. 응답은 `logos-native-result` 이벤트로 전달한다. 성공 이벤트를 UI/서버의 최종 지급으로 혼동하지 않는다.
- WebView는 `onPageFinished` 뒤 브리지를 주입하고 `logos-native-ready`를 발생시킨다. 페이지 새로고침·앱 재개·광고 뒤 돌아오기에서 브리지와 웹소켓을 다시 확인한다.

## 2. 웹 리소스·연출·프레임·스카이박스

### 무엇이 문제였나

같은 URL이 Chrome에서 잘 보여도 앱 WebView에는 그림·연출이 누락됐다. 이것만으로 특정 원인을 단정할 수 없다. 앱이 예전 배포 HTML/번들을 캐시했는지, `/brand-ui` 같은 절대경로가 배포 `dist`에 있는지, HTTP/MIME 오류인지, WebGL·기기 `prefers-reduced-motion` 때문인지 각각 확인해야 한다. 실제로 프로젝트에서는 이미지 fallback과 필수 자산 포함을 정비했고, Play 앱에서 홈·상점 이미지 표시를 확인했다.

프레임 문제는 분리해서 봤다. 5Hz 요청 보고가 있었고 기존 15fps 제한을 코드에서 발견했다. `LogosCommerceBridge.Awake()`가 `QualitySettings.vSyncCount=0`, `Application.targetFrameRate=60`을 설정하도록 했다. WebView가 Unity `SurfaceView` 위에 합성되는 폰에서는 Unity 표면의 제한이 눈에 보이는 화면 갱신에도 영향을 줄 수 있다. Unity 카메라 `SolidColor`/흰 배경 및 `RenderSettings.skybox=null`로 WebView가 뜨기 전후에 스카이박스가 비치지 않게 했다.

### 다음 프로젝트의 검증 순서

1. 앱이 실제 여는 URL, 운영 HTML의 JS/CSS 해시, APK 안 설정, WebView의 네트워크 오류를 대조한다. 브라우저의 최신 화면만 확인하고 끝내지 않는다.
2. 첫 화면의 대표 이미지·상자·카드·Pixi/Canvas 효과를 각각 캡처한다. 리소스 누락과 reduced motion/배터리 절약/WebGL 실패를 구분한다.
3. `Application.targetFrameRate`, `vSyncCount`, Unity 카메라 clear flags, 빈/전환 화면을 확인한다.
4. `adb shell dumpsys gfxinfo <package>`는 WebView/UI 지표다. Unity 표면은 SurfaceFlinger 프레임 타임으로 별도 측정하고 Chrome의 동일 URL과 비교한다. 시작 로딩·광고 전환·안정 상태를 섞어 평균 내지 않는다.

## 3. Google 로그인과 앱 서명

웹 브라우저의 Google 팝업 흐름을 WebView에 그대로 기대해 로그인 창이 열리지 않았다. Android 쪽 `LogosGoogleSignIn.java`에서 Credential Manager의 `GetSignInWithGoogleOption`을 열고, 서버가 발급한 nonce와 **웹 서버용 OAuth client ID**로 ID token을 받는다. 웹은 토큰을 인증 WebSocket으로 보내며, 서버가 audience·nonce·서명을 확인한다. 최초 동의가 30초를 넘어서 `Native request timed out`가 난 적이 있어 네이티브 요청을 5분으로 늘렸다. [Google Credential Manager 가이드](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation)

Android OAuth 등록은 `(패키지 이름, 실제 설치 앱 서명 SHA-1)` 조합이다. `.dev` APK, 로컬 운영 APK, Play에서 배포된 운영 앱은 각각 다를 수 있다. **업로드 키 SHA-1을 Play 앱 서명 SHA-1로 착각하지 않는다.** 이 프로젝트에서는 예전 설치 앱과 새 Play 앱의 서명이 달라 덮어쓰기가 거부됐고, 승인 후 재설치·새 SHA-1용 OAuth 등록을 했다. 새 프로젝트에서는 Play Console의 앱 서명 인증서와 `apksigner verify --print-certs`로 실제 설치물을 비교한다. 키 비밀번호·별칭은 Git 밖에 보관한다.

## 4. Google Play IAP: 버튼부터 영구 지급까지

1. Play Console에서 **운영 패키지**의 일회성 상품을 활성화하고 판매 국가·가격·구매 옵션 ID를 확인한다. 로고스는 `diamonds_100/300/1000/3000`과 `standard` 옵션이다. `.dev` APK에서 운영 패키지 상품 조회가 실패해도 상품 자체의 오류라는 뜻이 아니다.
2. 웹의 가격 버튼 → `nativePurchase.ts`가 로그인 계정 ID를 SHA-256 64자 hex로 해시 → Unity `purchase` 요청 → `LogosGoogleBilling.java`가 BillingClient 연결, 기존 미소모 구매 복구 또는 ProductDetails 조회를 수행한다. Unity IAP 경로의 ProductDetails/JNI 참조 문제를 피하려 직접 BillingClient를 쓴다는 설명이 해당 Java 파일에 남아 있다.
3. Billing 8 일회성 상품의 **`standard` 구매 옵션을 선택하고 `offerToken`을 `BillingFlowParams`에 명시**한다. 계정 해시는 `setObfuscatedAccountId`에 넣는다. 이메일 원문이나 비밀번호를 넣지 않는다. [Play Billing 통합 문서](https://developer.android.com/google/play/billing/integrate)
4. 구매 결과가 `PURCHASED`여도 웹은 다이아를 직접 더하지 않는다. `purchaseToken`을 로그인된 WebSocket의 `iapPurchase`로 보내고, Worker가 Play Developer API `productsv2`로 패키지·상품·구매 상태·완료 시각·수량 1·`standard`·미소모 상태·계정 해시를 확인한다.
5. 서버는 **토큰 해시 영구 원장과 다이아 지급을 같은 SQLite 트랜잭션**으로 확정한다. 같은 토큰 재전송은 기존 결과만 반환한다. 지급 후 서버가 consume을 호출하며 실패하면 재전송 때 재시도한다. [Play 구매 보안 가이드](https://developer.android.com/google/play/billing/security)

`iapResult`와 잔액 증가가 실기기 성공 신호다. 결제창이 뜬 것, Play 성공 콜백, 개발 APK 상품 조회만으로 완료라고 적지 않는다. Play 코드 13의 테스트 카드 구매로 `diamonds_100` 지급을 확인했고 코드 14 업데이트 뒤 잔액도 유지됐다. 취소·재설치 복구·중복 결제 경계 사례는 서버 자동 검사와 별개로 기기 재현이 더 필요하다.

## 5. LevelPlay 보상형 광고: 왜 완료 후에도 지급이 없었나

### 실제 원인과 현재 처리

LevelPlay Unity SDK는 초기화·로드·재생·`OnAdRewarded`까지 성공했다. 그런데 콘솔의 **테스트 콜백**은 Worker가 HTTP 200 `EVENT_ID:OK`로 받는 반면, 실제 광고 완료 시 같은 Worker로 **실제 S2S 요청이 관측되지 않았다**. 그러므로 테스트 콜백 통과는 실제 지급 증명이 아니다. 이전 콜백 시도에는 8자 `dynamicUserId`가 들어와 32자 ticket 형식으로 거부됐고, 빈 `userId`/`publisherSubId` 후보를 서명 검증하도록 조정했지만 최종 실전송 부재의 원인은 확정하지 못했다. `Not live yet` 상태가 원인인지도 확인되지 않았다.

로고스 웹은 광고가 끝난 뒤에도 S2S만 폴링해 `광고 3/3`에 머물렀다. QTLingo 원본 구현(`Assets/_Project/Scripts/Services/LevelPlayRewardedAdService.cs`, `RewardedAdBridgeService.cs`, 웹 `src/services/nativeBridge.ts`)을 비교했다. QTLingo는 `OnAdRewarded`가 오면 웹 Promise를 완료한다. 로고스에도 이 완료 신호 후 `adRewardClaim(ticket)`을 추가했다. Worker는 발급 계정의 32자 ticket, 15분 만료, 1회 사용, 한국 날짜 기준 실버+골드 합산 3회를 검사한다. 늦게 S2S가 오면 같은 ticket은 ACK만 하고 중복 지급하지 않는다. [Unity 보상 이벤트·Dynamic User ID 가이드](https://docs.unity.com/en-us/grow/levelplay/sdk/unity/rewarded-ad-integration-package)

웹의 `capabilities.adReady` 사전 조회는 Unity 로그가 `AD_READY`인 폰에서도 광고 버튼을 비활성화했다. 이 중복 게이트를 버튼에서 제거했다. 서버 연결·남은 횟수만 UI에서 확인하고, 실제 요청 시 Unity의 로드/재생 콜백이 가능 여부와 실패 사유를 알려준다. 버튼이 회색이라고 광고 SDK가 실패했다고 추측하지 말고, `button.disabled`의 모든 조건을 각각 조사한다.

### 새 프로젝트의 안전한 순서

- 광고 앱 키·보상형 unit ID·placement가 **같은 앱**에 속하는지 확인하고 각 환경별 키를 분리한다. 로고스는 Unity Ads bidding 네트워크를 LevelPlay에 연결했다.
- 서버에서 계정·상자와 묶인 일회용 ticket을 발급한다. Unity `Init(appKey, installUserId)`의 고정 ID와 `SetDynamicUserId(ticket)`의 광고별 ID를 혼동하지 않는다. ticket은 LevelPlay 요구의 1~64자 영숫자이며 `ShowAd` **전에** 설정한다. 이 프로젝트는 로드 전에도 설정한다.
- `OnAdLoaded`, `OnAdLoadFailed`, `OnAdRewarded`, `OnAdClosed`, 서버 콜백 도착, 지급 결과를 다른 로그로 기록한다. `OnAdRewarded`와 `OnAdClosed`의 순서는 보장되지 않으므로 닫힘만으로 보상을 판정하지 않는다. [Unity 공식 설명](https://docs.unity.com/en-us/grow/levelplay/sdk/unity/rewarded-ad-integration-package)
- S2S를 쓰면 `[USER_ID]`(서명 대상), `dynamicUserId`(ticket), `[EVENT_ID]`(중복 방지), `[REWARDS]`, timestamp/signature를 구분한다. 서명은 서버에서 비밀키로 검증하고 키는 앱/웹 번들에 넣지 않는다. 콘솔 테스트용 고정 ID는 실제 재화를 지급하지 않는다. [Unity S2S 이벤트 문서](https://docs.unity.com/en-us/grow/levelplay/platform/settings/event-handlers)
- **서버 재화라면 가능한 한 서명된 S2S 지급을 사용한다.** QTLingo식 클라이언트 완료 신호는 기능을 작동시키지만 위조 가능하다. 이 프로젝트의 현재 경로는 그 제한을 명시한 임시 운영 선택이다. 단순히 하루 3회 제한이 있다고 안전한 광고 증명이 되는 것은 아니다.
- UI의 광고 버튼은 명확히 눌리는 모양과 오류 메시지를 주고, SDK 준비 신호가 실제 지급 완료를 뜻하지 않게 한다.

### 이번 실기기 확인

Samsung SM-N981N의 Play 코드 14 앱에서 UnityAds 광고를 끝까지 시청했다. `LOGOS_LEVELPLAY_REWARDED`와 `LOGOS_LEVELPLAY_AD_CLOSED: rewarded=True`가 찍혔고 웹 v0.9.169의 상점에서 `광고 3/3→2/3`, 별가루 `11,457→11,487`이 보였다. 이는 **SDK 완료→클라이언트 ticket 요청→서버 지급** 경로의 확인이다. 실제 S2S 발송 확인은 아니다. 추가 운영 기록은 `WebBattle/readmeAds.md`에 있다.

## 6. 다음 프로젝트에 그대로 적용할 검증 표

| 단계 | 합격 신호 | 실패 시 먼저 볼 곳 |
| --- | --- | --- |
| WebView 시작 | 고정 HTTPS 페이지·최신 빌드 버전·필수 이미지 표시 | WebView 실제 URL, 배포 HTML 해시, `dist` 자산, 네트워크 오류 |
| 화면 전환 | 홈·상점·광고 복귀에 흰 바탕, 그림과 연출 표시 | Unity 카메라/skybox, WebView 생명주기, WebGL/reduced motion |
| 성능 | 안정 홈에서 표면 프레임 시간과 UI 지표를 별도로 측정 | `targetFrameRate`, vSync, WebView/UI jank, GPU 부하 |
| 로그인 | 기기 계정 선택→앱 복귀→서버 세션 | 패키지/SHA-1, 웹 client ID, nonce, 5분 요청 제한 |
| IAP | Play 설치 앱 결제→서버 검증→잔액 증가 1회 | 상품 `standard`/offerToken, service account, 토큰 원장 |
| 광고 | 실제 광고 완료→서버 ticket 소모→횟수·재화 변경 | 버튼 `disabled`, SDK 이벤트, WebSocket, S2S 수신을 각각 분리 |
| 재시도 | 같은 구매 토큰·광고 ticket 재전송에 추가 지급 없음 | SQLite 원장/transaction, ticket 결과·일일 제한 |

테스트는 항상 **실제 Play 설치 앱의 패키지·버전·서명**, **운영 웹 번들 버전**, **서버 배포 버전**을 함께 기록한다. 로고스는 Unity 프로젝트를 복제하거나 worktree로 옮기지 않고 원본에서 빌드했다. 빌드 중 필요한 비밀값은 환경 변수·Git 제외 로컬 파일·Worker secret으로만 전달한다.
