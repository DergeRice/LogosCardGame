# 로고스 카드게임 광고 설정 인계

이 디렉터리는 광고 SDK를 연결할 담당자가 사용하는 단일 설정 계약이다. 웹 게임 코드에는 광고 SDK를 넣지 않는다. Android Capacitor 앱에서 **보상형 광고 1개**만 표시한다.

## 현재 범위

- 제공자: **Unity LevelPlay**. 큐티링고의 SDK 구조를 참고한다.
- 형식: 보상형 동영상 1개 (`rewarded`). 배너·전면·앱 오픈 광고는 넣지 않는다.
- 광고 단위는 로고스 카드게임 전용으로 새로 만든다. 큐티링고의 App Key/광고 단위를 재사용하지 않는다.
- 보상 대상: 상점의 실버 박스와 골드 박스.
- 실버 박스: 12시간마다 1회, 골드 박스: 24시간마다 1회.
- 기존 `storeOpenFree`의 서버 기준 쿨다운과 보상 추첨은 유지한다. 광고 SDK는 클라이언트에서 상자를 직접 지급하지 않는다.

## 필요한 값

아래 값은 Git에 넣지 말고 CI/Capacitor native secret 또는 배포 환경변수로 관리한다.

```dotenv
# Android 전용 LevelPlay 앱 설정
LEVELPLAY_APP_KEY_ANDROID=
LEVELPLAY_REWARDED_AD_UNIT_ID=
LEVELPLAY_REWARDED_PLACEMENT=logos_rewarded_box
# rewarded S2S 콜백 검증용 서버 비밀값
LEVELPLAY_REWARDED_S2S_SECRET=
```

## 연결 순서

1. LevelPlay에서 Android 패키지 `com.baragames.logoscardgame`로 새 앱을 만든다.
2. Rewarded ad unit 하나와 placement `logos_rewarded_box` 하나를 만든다.
3. 앱 시작 시 SDK를 초기화하고 rewarded 로드 성공 여부만 UI에 전달한다.
4. 상자 열기 직전에 rewarded를 표시한다. 닫기·스킵·실패는 보상하지 않는다.
5. 보상 이벤트에는 로그인 계정 ID와 임의의 `adTransactionId`를 넣고 LevelPlay S2S 콜백을 서버로 보낸다.
6. 서버는 콜백 서명을 검증하고 `adTransactionId`를 한 번만 처리한 뒤 `storeOpenFree`와 같은 서버 추첨을 실행한다.
7. 이미 열린 상자는 쿨다운 응답을 그대로 표시한다. 로컬 시간으로 쿨다운을 판정하거나 다이아·아이템을 직접 증가시키지 않는다.

## 웹소켓/서버 계약

클라이언트 요청은 `adRewardClaim`으로 제한한다.

```ts
{type:'adRewardClaim', box:'silver'|'gold', adTransactionId:string, requestId:string, storeVersion:number}
```

서버는 LevelPlay S2S 검증이 완료된 거래만 처리하고, `adTransactionId`를 영구적으로 중복 방지한다. 응답은 기존 `storeResult`를 사용한다.

## 검증 체크

- 테스트 광고로 rewarded 완료·취소·네트워크 실패를 각각 확인한다.
- 실버와 골드의 쿨다운이 서로 독립적인지 확인한다.
- 동일 S2S 거래가 재전송돼도 상자가 한 번만 열리는지 확인한다.
- 오프라인/웹 브라우저/변조된 웹소켓 요청이 보상되지 않는지 확인한다.

Unity 앱 구현과 웹 연결 API는 [UNITY-BRIDGE.md](UNITY-BRIDGE.md) 및 [unity-native.d.ts](unity-native.d.ts)를 기준으로 연결한다. 현재 내부 테스트 앱은 Capacitor이므로 Unity AAB를 새 버전으로 설치한 뒤 해당 API를 테스트해야 한다.
