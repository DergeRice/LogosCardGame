# Unity 웹뷰 결제·광고 연결 계약

Unity 원본은 저장소 루트이다. `main`의 Unity 프로젝트를 `web-battle`에 병합했다. 새 구현은 `Assets/LogosNative/`, 적용 씬은 기존 별도 `Assets/01.Scene/6.WebBattleScreen.unity`이다. 웹 담당자는 아래 API를 연결한다.

## 실제 상태 (2026-10-21)

- Unity C# 브리지, Android 네이티브 WebView와 Google Play Billing Java 구현 완료.
- Unity LevelPlay SDK 9.5.1 사용. 네이티브 SDK·Unity Ads 어댑터는 QTlingo에서 사용하는 9.6.0/5.12.0/4.20.0으로 정렬.
- 상품 ID: `diamonds_100`, `diamonds_300`, `diamonds_1000`, `diamonds_3000`. KRW 1200/2900/8900/24900.
- SDK의 성공 응답은 다이아/상자 지급을 의미하지 않는다. 반드시 서버 검증·영구 중복 방지 후 지급한다.
- `commerceEnabled=false`가 기본값이다. 상품과 서버 검증이 완료된 뒤 빌드 환경의 `LOGOS_COMMERCE_ENABLED=1`로 활성화한다.
- 2026-10-21 재시도에서도 LevelPlay 계정은 `Your account is restricted`이다. Unity Cloud 원본 연결 프로젝트 `LogosCardGame (1)`(583abf61-3c16-42c9-8709-e1a3b6c87474)의 Unity Ads는 이미 활성화되어 있다(Android Game ID 5868668). 이 프로젝트의 LevelPlay 연결 경로에서도 동일한 접근 제한을 확인했다. LevelPlay App Key/보상형 단위 생성은 계정 제한 해제 후 진행해야 한다. Unity Ads Game ID를 LevelPlay App Key로 대신 넣으면 안 된다.
- Play Console 상품 4개 모두 대한민국 전용 `standard` 구매 옵션으로 활성화했다. 가격은 100개 ₩1,200 / 300개 ₩2,900 / 1,000개 ₩8,900 / 3,000개 ₩24,900이다. 3,000개 일괄 가격의 자동 반올림을 개별 가격 수정으로 바로잡고 저장 완료를 확인했다.
- Google Cloud `logos-card-game`의 기존 서비스 계정은 없었다. `logos-play-verifier` 생성 양식을 준비했으며, 서버 키 발급 및 앱 한정 구매 권한 부여는 실행 시점 보안 확인을 기다린다.
- Unity Android 서명 AAB 빌드 성공: `Builds/LogosCardGame-Unity.aab`, versionCode 2 / versionName 1.0.1, 약 70MB. 기존 내부 테스트 AAB는 Capacitor 앱이며 이 Unity 브리지를 포함하지 않는다.

## 웹 → Unity API

```ts
// 호출 전에 await capabilities; 웹 단독 환경이면 LogosNative가 없다.
await window.LogosNative.request('capabilities');
// {success:true,purchaseEnabled:boolean,adReady:boolean}

const purchase = await window.LogosNative.request('purchase', {productId:'diamonds_100'});
// {success:true,productId,purchaseToken,receipt,transactionId}
// purchaseToken은 로그/분석 이벤트에 기록하지 않는다.
// 인증된 websocket iapPurchase로 서버에 전달한다.
// Google Play Developer API 검증 → 영구 지급 기록 → 서버에서 consume 순서.
// 동일 토큰의 재전송은 이전 지급 결과를 반환해야 한다.

// 서버가 계정/상자에 묶어 발행한 일회성 rewardTicket만 사용한다.
await window.LogosNative.request('rewarded', {box:'silver',rewardTicket});
// 완료 후 서버의 S2S 검증 완료를 조회한다. 이 응답만으로 상자를 열지 않는다.
```

브리지는 로드 후 `logos-native-ready` 이벤트를 보낸다. `request()`는 Promise이며 취소/실패 시 reject한다. 앱 백그라운드/복귀 시 WebView 생명주기를 전달하고, Android 뒤로가기는 웹 히스토리 또는 앱 백그라운드 이동으로 처리한다.

## 광고 보상 서버

보상형 광고 단위는 하나다. 실버 12시간/골드 24시간은 기존 서버 규칙을 따른다. 무료 정기 개봉과 추가 광고 슬롯의 횟수/쿨다운은 합의 없이 같은 값으로 덮어쓰지 않는다. 현재 웹 변경의 `광고 3/3` 버튼은 별도 슬롯이며, 이 문서는 추가 3회 보상 규칙을 임의로 구현하지 않는다.

`rewardTicket`은 서버가 짧은 유효기간으로 발급해 계정·상자와 저장한다. Unity는 LevelPlay Dynamic User ID에 이 ticket을 넣는다. S2S 콜백의 ticket·거래 ID·서명을 검증하고, 재전송 중복 방지 후 기존 상자 추첨 로직으로 지급한다. 취소·타임아웃·로드 실패·클라이언트 위조 콜백은 지급하지 않는다.

## 빌드

원본 프로젝트에서 Unity 6000.4.5f1로 `Logos.Native.Editor.LogosNativeBuild.Android`를 실행한다.

- `LOGOS_KEYSTORE_PROPERTIES`: 로컬 서명 properties 절대경로 (Git 제외)
- `LOGOS_LEVELPLAY_APP_KEY`: 로고스 Android App Key
- `LOGOS_LEVELPLAY_REWARDED_ID`: 로고스 rewarded ad unit
- `LOGOS_COMMERCE_ENABLED=1`: 서버 및 상품 준비를 확인한 릴리스에서만 설정
- 출력: `Builds/LogosCardGame-Unity.aab` (versionCode 2)

설정은 `Resources/LogosNativeSettings.json`에 빌드 중 주입하고 finally에서 복구한다. `.p8`/서비스 계정 private key를 Unity Resources에 넣지 않는다.
