# 로고스 카드게임 광고 설정 인계

이 디렉터리는 광고 SDK를 연결할 담당자가 사용하는 단일 설정 계약이다. 웹 게임 코드에는 광고 SDK를 넣지 않는다. Android Unity WebView 앱에서 **보상형 광고 1개**만 표시한다. 기존 내부 테스트의 Capacitor 앱에는 Unity 브리지가 없다.

## 현재 범위

- 제공자: **Unity LevelPlay**. 큐티링고의 SDK 구조를 참고한다.
- 형식: 보상형 동영상 1개 (`rewarded`). 배너·전면·앱 오픈 광고는 넣지 않는다.
- 광고 단위는 로고스 카드게임 전용으로 새로 만든다. 큐티링고의 App Key/광고 단위를 재사용하지 않는다.
- 보상 대상: 상점의 실버 박스와 골드 박스.
- 실버 박스: 12시간마다 1회, 골드 박스: 24시간마다 1회.
- 기존 `storeOpenFree`의 서버 기준 쿨다운과 보상 추첨은 유지한다. 광고 SDK는 클라이언트에서 상자를 직접 지급하지 않는다.

## 발급·연결 상태 (2026-10-21)

- LevelPlay Android 앱 `로고스 카드게임`과 보상형 광고 단위 `logos_rewarded_box`, 같은 이름의 rewarded placement를 새로 만들었다. 기존 QTlingo 식별자는 사용하지 않는다.
- LevelPlay rewarded 설정과 Unity Ads bidding network를 연결했다. 로고스 전용 Unity 서비스 계정과 Organization Core ID로 Android Game ID `5868669`의 rewarded placement `Rewarded_Android`를 `logos_unity_rewarded` 인스턴스로 등록했다. QTlingo 자격 증명과 광고 단위는 재사용하지 않는다.
- LevelPlay 앱 키와 광고 단위 ID는 로컬 비공개 릴리스 환경 파일에만 있다. 저장소·웹 번들·Unity Resources에는 넣지 않는다.
- S2S 콜백 endpoint와 서명 검증 코드는 구현했다. LevelPlay 콘솔의 기존 키와 Cloudflare Worker secret을 일치시켰다. 실제 Android 광고 재생·보상은 새 Unity 빌드와 실기기에서 확인해야 한다. 현재 키 길이와 위험은 `../readmeAds.md`를 참조한다.
- 대상 연령은 어린이·청소년·성인을 포함한다. 현재 네이티브 앱은 연령 판별 흐름이 생길 때까지 COPPA 보호 모드로 초기화한다. 웹에서 임의로 완화하지 않는다.

## 필요한 비공개 값

아래 값은 Git에 넣지 말고 CI/Unity 빌드 설정 또는 배포 환경변수로 관리한다.

```dotenv
# Android 전용 LevelPlay 앱 설정
LEVELPLAY_APP_KEY_ANDROID=
LEVELPLAY_REWARDED_AD_UNIT_ID=
LEVELPLAY_REWARDED_PLACEMENT=logos_rewarded_box
# rewarded S2S 콜백 검증용 서버 비밀값
LEVELPLAY_S2S_PRIVATE_KEY=
```

## 연결 순서

1. 앱 시작 시 SDK를 초기화하고 rewarded 로드 성공 여부만 UI에 전달한다.
2. 서버가 계정·상자에 묶은 일회성 `rewardTicket`을 발급한다. Unity는 이를 Dynamic User ID로 설정한다. 클라이언트가 보상 거래 ID를 만들어 검증을 대신할 수 없다.
3. 상자 열기 직전에 rewarded를 표시한다. 닫기·스킵·실패는 보상하지 않는다.
4. LevelPlay 콘솔에 S2S callback URL과 비밀값을 설정한다.
5. 서버는 콜백 서명을 검증하고 `eventId`를 한 번만 처리한 뒤 무료 1회와 같은 상자 추첨을 실행한다.
6. 광고 개봉은 정기 무료 개봉의 쿨다운과 별개이며, 한국 날짜 기준 실버·골드 합계 하루 3회다. 로컬 시간으로 횟수를 판정하거나 다이아·아이템을 직접 증가시키지 않는다.

## 웹소켓/서버 계약

클라이언트 요청은 `adRewardTicket`으로 제한한다. 광고 시청 완료 자체로 지급을 요청하지 않는다.

```ts
{type:'adRewardTicket', box:'silver'|'gold'}
```

서버는 현재 세션·상자·만료 시각에 묶인 `rewardTicket`을 만들어 반환한다. S2S 검증이 완료된 거래만 처리하고 `eventId`를 영구적으로 중복 방지한다. 지급 결과는 기존 `storeResult`를 사용하며, 클라이언트는 `adRewardStatus`로 이 결과를 조회한다.

## 검증 체크

- 테스트 광고로 rewarded 완료·취소·네트워크 실패를 각각 확인한다.
- 실버와 골드의 쿨다운이 서로 독립적인지 확인한다.
- 동일 S2S 거래가 재전송돼도 상자가 한 번만 열리는지 확인한다.
- 오프라인/웹 브라우저/변조된 웹소켓 요청이 보상되지 않는지 확인한다.

Unity 앱 구현과 웹 연결 API는 [UNITY-BRIDGE.md](UNITY-BRIDGE.md) 및 [unity-native.d.ts](unity-native.d.ts)를 기준으로 연결한다. 현재 내부 테스트 앱은 Capacitor이므로 Unity AAB를 새 버전으로 설치한 뒤 해당 API를 테스트해야 한다.
