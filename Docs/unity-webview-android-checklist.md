# Unity 안의 웹 게임을 Android 앱으로 옮길 때 확인할 것

이 문서는 LogosCardGame에서 겪은 로그인 창 미표시, 이미지·연출 누락, 심한 프레임 저하를 다른 프로젝트에서 재현하지 않기 위한 점검표다. 특정 앱의 계정 ID, 서명 정보, 비밀키는 넣지 않았다.

## 먼저 정할 것

- 화면을 실제로 그리는 주체가 Unity인지, Android WebView인지, 둘 다인지 확인한다. 이 사례에서는 WebView가 보이는 화면이고 Unity SurfaceView는 뒤에 있었다.
- 같은 휴대폰에서 Chrome과 앱을 같은 화면·네트워크 조건으로 비교한다. Chrome만 부드러우면 콘텐츠 자체보다 앱 컨테이너, 합성, 프레임 제한을 우선 조사한다.
- 로그인·광고·결제·파일 선택처럼 브라우저 외부 기능은 웹 코드의 `window.open()`이나 WebView 기본 동작에 기대지 말고 플랫폼별 경로를 정한다.
- 테스트 APK의 패키지명과 서명 인증서 SHA-1/SHA-256, 배포 앱의 패키지명과 Play App Signing 인증서 SHA-1/SHA-256은 별개로 기록한다. OAuth Android 클라이언트도 실제 설치본의 조합과 맞아야 한다.

## 1. 화면 갱신이 5~11fps까지 떨어질 때

### 진단 순서

1. 먼저 보이는 레이어를 식별한다. `adb shell dumpsys SurfaceFlinger --list`에서 WebView와 Unity SurfaceView를 찾는다. Unity SurfaceView가 5Hz 또는 15Hz를 요청한다는 사실만으로 WebView도 그 속도라는 결론을 내리지 않는다. 실제 보이는 레이어의 프레임 시각을 별도로 측정한다.
2. `adb shell dumpsys gfxinfo <패키지명> framestats`와 SurfaceFlinger 프레임 간격으로 실제 표시 fps를 확인한다. 홈, 로그인, 상점, 전투, 연출 중, 복귀 직후를 각각 측정한다. 60Hz 화면에서 16.7ms보다 긴 프레임 비율도 함께 남긴다.
3. Android Activity와 WebView의 하드웨어 가속 상태를 확인한다. Unity의 템플릿 Manifest만 바꿔도 최종 병합 Manifest에서 `hardwareAccelerated=false`로 덮일 수 있으므로, **빌드 산출물의 최종 Manifest**를 확인한다. 이 프로젝트는 빌드 후 Gradle Manifest 보정으로 `true`를 적용한 뒤 보이는 WebView가 약 59~60fps로 회복됐다.
4. 숨겨진 Unity SurfaceView가 계속 렌더링한다면 불필요한 GPU 경쟁을 줄인다. 이 사례에서는 `QualitySettings.vSyncCount=0`, `Application.targetFrameRate=15`로 숨겨진 Unity 표면만 낮췄다. 이것은 **보이는 WebView의 목표 fps 설정이 아니다**. 보이는 WebView는 별도로 60fps에 가까운지 검증한다.
5. WebView 원격 디버깅/Performance 기록으로 메인 스레드 long task, 이미지 디코드, Pixi/WebGL draw call, 메모리 사용량을 확인한다. CSS 대체 연출이 필요한 기기에서만 쓰이고 있는지, WebGL 리소스가 없어 애니메이션이 통째로 빠지지 않았는지도 본다.

### 다른 프로젝트에 적용할 기준

- WebView가 보이는 구조라면 하드웨어 가속, WebView 버전, 투명 레이어 수, WebGL 컨텍스트, 큰 이미지 디코드·업로드를 함께 점검한다.
- 입자 수·해상도·텍스처 크기는 실제 기기 기준으로 제한한다. 비활성 화면의 ticker를 멈추고 언마운트 시 renderer와 텍스처를 해제한다.
- 평균 fps 하나만 보고 종료하지 않는다. 화면 전환 후 몇 초, 첫 이미지 표시 시간, 장시간 실행 뒤 프레임, 터치 지연을 확인한다.

## 2. 웹에서는 보이는 이미지와 연출이 앱에서 빠질 때

- 네트워크 요청의 URL, 응답 코드, MIME 타입, CORS/CSP, 캐시와 서비스 워커를 기기 WebView에서 확인한다. Chrome에서 성공했다는 결과는 WebView에서의 성공을 보장하지 않는다.
- 홈 메인 그림, 캐릭터, 로그인 일러스트처럼 필수 자산을 페이지 시작에 우선 로드하고, 실패 시 눈에 보이는 대체 자산을 제공한다. 이 사례에서는 WebView에서 필수 이미지를 blob으로 미리 받아 디코드하고, 환경별 렌더러가 실패할 때 DOM 그림 경로를 제공했다.
- 연출을 성능 문제 때문에 일괄 제거하지 않는다. 대표 기기에서 WebGL 경로를 측정하고, 지원이 불가능할 때만 CSS/DOM 대체 경로를 사용한다. 축소 경로에서도 핵심 이미지와 피드백은 반드시 남긴다.
- 이미지가 보이는 것과 연출이 움직이는 것은 각각 검증한다. 로그인, 홈, 상점, 실제 플레이 화면을 스크린샷과 짧은 화면 녹화로 비교한다.

## 3. Google 로그인이 앱에서만 안 열릴 때

### 이 사례의 원인

웹 로그인은 `window.open()`으로 Google OAuth 팝업을 열었다. Unity WebView는 Capacitor 앱이 아니어서 웹 분기로 들어갔고, WebView에는 새 창 생성 처리가 없었다. 따라서 버튼을 눌러도 계정 선택 화면이 나오지 않았다.

### 구현 원칙

1. 웹 브라우저는 기존 OAuth 웹 흐름을 사용한다. Android 앱은 Credential Manager의 **Sign in with Google 버튼 흐름**으로 시스템 계정 선택 UI를 연다. Google OAuth를 임베디드 WebView 안에서 진행하지 않는다.
2. 서버가 일회용 nonce와 **웹 클라이언트 ID**를 발급한다. Android의 `GetSignInWithGoogleOption`에 둘 다 전달한다. 받은 Google ID 토큰을 서버로 보내고, 서버가 서명, 발급자, audience, 만료, nonce를 검증한다. 클라이언트에서 인증 완료로 단정하지 않는다.
3. Unity와 WebView 사이 브리지는 허용된 HTTPS origin만 호출하게 제한하고, 요청 ID로 비동기 응답을 연결한다. 토큰을 로그에 남기거나 영구 저장하지 않는다. 취소·네트워크 오류·중복 요청을 화면에 반환한다.
4. 실제 설치 APK의 패키지명과 서명 인증서가 Google Auth Platform의 Android OAuth 클라이언트에 등록되어 있는지 확인한다. 디버그 `.dev` APK와 Play 배포 앱은 각각 검증한다. `DEVELOPER_ERROR`나 계정 선택 후 실패가 나면 이 매핑과 웹 클라이언트 ID부터 대조한다.
5. 버튼 탭 → 계정 선택 UI 표시 → 계정 선택 → 서버 검증 → 기존 게스트 계정 연결/전환 확인까지 폰에서 검사한다. 창이 열렸다는 것만으로 로그인 완료로 기록하지 않는다.

이 프로젝트의 실기기 테스트에서는 계정 선택 창이 열려도 `Account reauth failed`가 반환됐다. 설치 APK의 패키지명과 SHA-1이 기존 Android OAuth 클라이언트와 달랐고, 정확한 조합을 새 클라이언트로 등록하자 Google 동의, 서버 검증, 계정 연결, 앱 재실행 후 로그인 유지까지 통과했다. 이 오류 문구만 보고 사용자의 Google 계정 재인증 문제로 단정하지 말고 서명 매핑부터 확인한다. 이미 다른 대전에서 사용 중인 계정은 서버 정책에 따라 전환이 거절될 수 있으므로, 인증 실패와 구분해서 테스트한다.

## 4. 광고·결제와 출시 설정

- 광고 앱 키와 유닛 ID, 보상 콜백, 결제 상품 ID, 앱 서명, 서버 검증 키의 환경을 구분한다. 개발·운영 값을 섞지 않는다. 비밀키는 앱이나 저장소에 넣지 않는다.
- 보상형 광고는 서버가 발급한 티켓을 광고 콜백과 연결하고 중복 지급을 막는다. 결제는 Play Billing 토큰을 서버에서 검증한 뒤 내구성 있게 지급한다.
- 콘솔 설정 완료 여부와 앱 동작 검증 여부를 별도로 기록한다. Play Console 상품 생성·활성화, 내부 테스트 배포, Play 설치본 결제 테스트는 로컬 APK 테스트로 대체할 수 없다.
- 아동 포함 앱이면 연령 처리, 광고 SDK 설정, 개인 정보·데이터 안전성 및 동의 화면을 실제 정책과 사용자 대상에 맞춰 검토한다. 약관이나 동의는 실제 적용 전에 내용을 읽고 기록한다.

## 5. 빌드와 실기기 확인표

| 항목 | 통과 조건 |
| --- | --- |
| 빌드 | Gradle/Unity 오류 없이 APK 생성, 최종 Manifest와 의존성 확인 |
| 설치 | 지정한 테스트 패키지만 설치, 기존 앱 데이터 유지 |
| 로그인 | Google 시스템 UI 표시, 서버 검증 성공, 실패·취소 메시지 확인 |
| 자산 | 로그인·홈·상점·플레이의 필수 그림 모두 표시 |
| 연출 | 대표 전환과 파티클이 의도대로 움직임, 미지원 환경의 대체 연출 확인 |
| 성능 | 같은 폰 Chrome과 앱에서 보이는 레이어 fps·긴 프레임·터치 지연 비교 |
| 복귀 | 홈 버튼/앱 전환/화면 회전 후 WebView와 로그인 상태 유지 |

## 참고 자료

- [Android: Credential Manager로 Google 로그인 구현](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation)
- [Android: Credential Manager 문제 해결](https://developer.android.com/identity/sign-in/credential-manager-troubleshooting-guide)
- [Google: OAuth 2.0 모범 사례](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
- [Android: 앱 렌더링 성능 검사](https://developer.android.com/topic/performance/rendering)
