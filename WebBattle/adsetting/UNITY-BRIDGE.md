# Unity 웹뷰 결제·광고 연결 계약

> 최신 구현·실기기 검증·남은 위험은 [`../docs/UNITY-WEBVIEW-IAP-ADS-LESSONS.md`](../docs/UNITY-WEBVIEW-IAP-ADS-LESSONS.md)에 정리했다. 아래 2026-10-22 상태 기록은 초기 연결 당시의 이력이다.

Unity 원본은 저장소 루트이다. `main`의 Unity 프로젝트를 `web-battle`에 병합했다. 새 구현은 `Assets/LogosNative/`, 적용 씬은 기존 별도 `Assets/01.Scene/6.WebBattleScreen.unity`이다. 웹 담당자는 아래 API를 연결한다.

## 실제 상태 (2026-10-22)

- Unity C# 브리지, Android 네이티브 WebView와 Google Play Billing Java 구현 완료.
- Unity LevelPlay SDK 9.5.1 사용. 네이티브 SDK·Unity Ads 어댑터는 9.6.0/5.12.0/4.20.0으로 정렬.
- 상품 ID: `diamonds_100`, `diamonds_300`, `diamonds_1000`, `diamonds_3000`. KRW 1200/2900/8900/24900.
- Billing 8은 `standard` 구매 옵션의 `offerToken`을 명시하여 결제창을 연다. 대여/할인 옵션은 선택하지 않는다. [Google 공식 연결 가이드](https://developer.android.com/google/play/billing/one-time-product-multi-purchase-options-offers)를 기준으로 구현했다.
- SDK의 성공 응답은 다이아/상자 지급을 의미하지 않는다. 반드시 서버 검증·영구 중복 방지 후 지급한다.
- `commerceEnabled=false`가 기본값이다. 서버 검증과 영구 중복 방지를 배포했으며 테스트 APK는 `LOGOS_COMMERCE_ENABLED=1`로 빌드했다. 운영 구매 검증은 Play 내부 테스트 AAB 설치 후 가능하다.
- 전용 LevelPlay Android 앱과 보상형 단위·placement `logos_rewarded_box`를 생성했다. 비공개 App Key와 ad unit ID는 릴리스 환경 파일만 사용한다. Unity Ads bidding network는 로고스 전용 Unity 서비스 계정과 Organization Core ID로 연결했고, Android Game ID `5868669`의 rewarded placement `Rewarded_Android`를 `logos_unity_rewarded` 인스턴스로 등록했다. QTlingo 자격 증명과 광고 단위는 재사용하지 않는다.
- Play Console 상품 4개 모두 대한민국 전용 `standard` 구매 옵션으로 활성화했다. 가격은 100개 ₩1,200 / 300개 ₩2,900 / 1,000개 ₩8,900 / 3,000개 ₩24,900이다. 3,000개 일괄 가격의 자동 반올림을 개별 가격 수정으로 바로잡고 저장 완료를 확인했다.
- Google Cloud `logos-card-game`에 `logos-play-verifier` 서비스 계정을 만들고, Play Console에서 `com.baragames.logoscardgame` 앱 한정으로 구매 조회·처리 권한을 부여했다. JSON 키는 로컬 비공개 경로에만 보관한다. Android Publisher API 활성화 확인 뒤 서버가 실제 구매 토큰을 검증할 수 있다.
- Google Play Android Developer API 활성화 및 서비스 계정의 읽기 검증을 완료했다. `GOOGLE_PLAY_SERVICE_ACCOUNT_FILE=/비공개/키.json node WebBattle/adsetting/verify-play-products.mjs`는 키·토큰을 출력하지 않고 상품 ID만 확인한다.
- Unity Android 서명 AAB 빌드 성공: `Builds/LogosCardGame-Unity.aab`, versionCode 2 / versionName 1.0.1, 약 70MB. 기존 내부 테스트 AAB는 Capacitor 앱이며 이 Unity 브리지를 포함하지 않는다.

## 웹 → Unity API

```ts
// 호출 전에 await capabilities; 웹 단독 환경이면 LogosNative가 없다.
await window.LogosNative.request('capabilities');
// {success:true,purchaseEnabled:boolean,adReady:boolean}

const accountHash = /* 로그인한 communityId를 SHA-256 hex로 변환 */;
const purchase = await window.LogosNative.request('purchase', {productId:'diamonds_100',accountHash});
// {success:true,productId,purchaseToken,receipt,transactionId}
// purchaseToken은 로그/분석 이벤트에 기록하지 않는다.
// 인증된 websocket iapPurchase로 서버에 전달한다.
// Google Play Developer API 검증 → 영구 지급 기록 → 서버에서 consume 순서.
// 동일 토큰의 재전송은 이전 지급 결과를 반환해야 한다.

// 서버가 계정/상자에 묶어 발행한 일회성 rewardTicket만 사용한다.
await window.LogosNative.request('rewarded', {box:'silver',rewardTicket});
// 현재 운영 경로는 OnAdRewarded 성공 후 인증 WebSocket으로 adRewardClaim(ticket)을 보낸다.
// 서버가 ticket·일일 제한을 확인한 storeResult가 와야 상자를 연다.
```

브리지는 로드 후 `logos-native-ready` 이벤트를 보낸다. `request()`는 Promise이며 취소/실패 시 reject한다. 앱 백그라운드/복귀 시 WebView 생명주기를 전달하고, Android 뒤로가기는 웹 히스토리 또는 앱 백그라운드 이동으로 처리한다.

## 광고 보상 서버

보상형 광고 단위는 하나다. 실버 12시간/골드 24시간은 기존 서버 규칙을 따른다. 무료 정기 개봉과 추가 광고 슬롯은 별도다. 실버·골드 광고 개봉을 합해 한국 날짜 기준 하루 최대 3회다.

`rewardTicket`은 서버가 15분 유효기간으로 발급해 계정·상자와 저장한다. Unity는 LevelPlay Dynamic User ID에 이 ticket을 넣는다. 실제 S2S 전송이 확인되지 않아 현재는 `OnAdRewarded` 후 웹이 `adRewardClaim(ticket)`을 보내고 서버가 ticket·하루 3회·중복 지급을 검사한다. 이 클라이언트 신호는 위조될 수 있으므로 광고 시청의 암호학적 증명이 아니다. 서명된 S2S 콜백도 유지하며 나중에 도착하면 중복 지급하지 않는다.

`adRewardTicket`과 서명 검증을 거치는 `/ads/levelplay/callback`은 연결했다. LevelPlay S2S의 기존 private key와 Worker secret을 일치시켰고 callback URL을 설정했다. 초기에는 SDK 광고 완료만 확인되고 지급이 없었다. 콜백의 서명 대상 `userId`와 광고별 `dynamicUserId`를 구분하고 ticket을 영숫자 32자로 바꿨다. 광고 요청의 3분 타임아웃은 10분으로 늘렸다. 2026-10-23에는 Play 코드 14와 운영 웹 v0.9.169에서 SDK 완료→서버 지급을 실기기로 확인했다. 실제 S2S 발송은 미확인이다. 현재 키 길이와 운영 상태는 `../readmeAds.md`에 기록했다. `iapPurchase` 서버 검증·영구 지급·consume도 배포됐다. 남은 검증은 다음과 같다.

1. Play 설치 앱에서 IAP 취소·재설치 복구·중복 결제의 실기기 경계 사례를 확인한다. 100개 상품 완료·지급은 확인했다.
2. 실제 광고 S2S 콜백의 전송·서명·재시도를 확인한다. 현재 운영 지급은 SDK 완료 신호 기반이고 클라이언트 변조 위험이 남는다.

## 빌드

원본 프로젝트에서 Unity 6000.4.5f1로 `Logos.Native.Editor.LogosNativeBuild.Android`를 실행한다.

- `LOGOS_KEYSTORE_PROPERTIES`: 로컬 서명 properties 절대경로 (Git 제외)
- `LOGOS_LEVELPLAY_APP_KEY`: 로고스 Android App Key
- `LOGOS_LEVELPLAY_REWARDED_ID`: 로고스 rewarded ad unit
- `LOGOS_COMMERCE_ENABLED=1`: 구매 서버 및 상품 준비를 확인한 릴리스에서만 설정. 광고 활성화와 별개다.
- 출력: `Builds/LogosCardGame-Unity.aab` (프로젝트 현재 versionCode + 1)

설정은 `Resources/LogosNativeSettings.json`에 빌드 중 주입하고 finally에서 복구한다. `.p8`/서비스 계정 private key를 Unity Resources에 넣지 않는다.
