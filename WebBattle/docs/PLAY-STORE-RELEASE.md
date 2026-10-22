# Google Play 출시 준비

## 확정한 앱 정보

| 항목 | 값 |
| --- | --- |
| 앱 이름 | 로고스 카드게임 |
| 패키지명 | `com.baragames.logoscardgame` |
| 유형 | 게임 |
| 가격 | 무료 |
| 기본 언어 | 한국어 (`ko-KR`) |
| 개인정보처리방침 | `https://logos-card-battle.netlify.app/privacy.html` |
| 지원 페이지 | `https://logos-card-battle.netlify.app/support.html` |
| 계정 삭제 요청 URL | `https://logos-card-battle.netlify.app/account-delete.html` |
| 지원 이메일 | `leesangjin2372@gmail.com` |
| 출시 버전 | Android `versionCode 1`, `versionName 1.0` |

## 로컬 Android 빌드

1. Node 의존성을 잠금 파일 그대로 설치한다: `npm ci`.
2. Android 웹 자산을 빌드/동기화한다: `npm run native:sync`.
3. 런처와 Play 아이콘은 `npm run native:icon`으로 `public/brand-ui/loading.png`에서 다시 만든다.
4. `android/keystore.properties.example`을 참고해 로컬 업로드 키의 속성 파일을 만든다. 실제 키와 비밀번호는 Git에 넣지 않는다.
5. JDK 21로 `cd android && ./gradlew :app:bundleRelease`를 실행한다.

출력물은 `android/app/build/outputs/bundle/release/app-release.aab`이다. APK가 아니라 이 서명된 AAB를 Play Console에 올린다.

## Play Console에서 할 일

앱 생성 때 아래 값을 입력한다.

- 앱 이름: `로고스 카드게임`
- 패키지 이름: `com.baragames.logoscardgame`
- 기본 언어: 한국어
- 유형: 게임
- 무료

생성 버튼을 누르기 전에는 Play 개발자 프로그램 정책과 미국 수출법 준수 선언을 검토하고 직접 확인한다. 생성 뒤 Play App Signing을 사용한다.

### Google 로그인 연결

Play App Signing 화면에서 **앱 서명 인증서 SHA-1**을 복사해 Google Cloud의 Android OAuth 클라이언트에 등록한다. 개발 PC의 debug SHA-1만으로는 Play에서 받은 앱의 Google 로그인이 동작하지 않는다.

### 스토어 등록정보

- 아이콘: `docs/store-assets/app-icon-512.png` (512×512 PNG)
- 제목: `로고스 카드게임`
- 짧은 설명: `단어 카드를 조합해 영어 문장을 만들고 친구·AI와 대결하는 문법 카드게임`
- 자세한 설명:

  `로고스 카드게임은 영어 단어 카드를 조합해 자연스러운 문장을 완성하는 카드게임입니다. 카드의 품사와 문장 구조를 익히며 AI 또는 다른 플레이어와 대전할 수 있습니다. 연습 모드로 문장을 만들고, 온라인 방에서 친구들과 함께 플레이하세요. 게임을 진행하며 프로필과 캐릭터를 꾸미고 랭킹에 도전할 수 있습니다.`

게임 화면을 실제 Android 기기에서 캡처한 세로·가로 스크린샷을 최소 2장씩 준비하고, 1024×500 특집 그래픽도 추가한다. 스토어에 올릴 이미지에는 기기 프레임·비허용 문구·미완성 기능을 넣지 않는다.

### 앱 콘텐츠 선언

현재 구현 기준으로 작성한다. 사실과 다른 항목을 선택하지 않는다.

- **앱 액세스**: 게스트 모드에서 기본 게임 진입이 가능하다. 심사자가 로그인 없이 핵심 기능을 볼 수 있는지 실제 AAB에서 다시 확인한다.
- **광고**: Unity LevelPlay SDK와 보상형 광고가 있으며, 상점에서 광고 시청 후 상자 보상을 받는다. Play Console 신고는 실제 배포 AAB와 일치시킨다.
- **앱 콘텐츠**: 온라인 대전의 닉네임·감정표현 등 이용자 상호작용이 있다. Play Console의 해당 질문에 맞춰 온라인 상호작용을 표시한다.
- **연령 및 콘텐츠 등급**: 교육용 영어 문법 게임의 실제 기능 기준으로 설문한다.
- **데이터 보안**: 계정 ID, 표시 이름, 게임 진행/재화/레이팅, 친구·대전 정보 및 로그인 식별자 해시를 서버에 저장한다. Google·Apple 토큰, 비밀번호 원문, 이메일은 저장하지 않는다. 전송은 HTTPS/WSS로 보호한다. `privacy.html` 내용과 Console 답변을 일치시킨다.
- **개인정보처리방침**: 위 운영 URL을 등록한다.
- **계정 삭제**: 앱 설정의 개인정보 · 회원 탈퇴 · 문의에서 인증된 본인 계정을 직접 삭제할 수 있다. 외부 삭제 요청 URL은 위 `account-delete.html`을 등록하며, 앱에 접속할 수 없는 이용자는 미리 작성된 메일로 요청할 수 있다. 외부 요청은 운영자가 본인 확인 후 처리한다. 실제 Android AAB에서도 설정과 메일 앱 연결을 확인한다.

## 출시 전 검증

- 실제 Android에서 Google 로그인, Apple 시스템 브라우저 로그인 후 앱 복귀, 게스트 전환, 재실행 복구를 확인한다.
- 느린 네트워크에서 최초 번들 로딩·오디오·대전 재접속을 확인한다.
- 세로/가로 전환, 뒤로가기, 전체화면 해제, 전화·앱 전환 뒤 복귀를 확인한다.
- 내부 테스트 트랙에 AAB를 먼저 올리고 Google Play pre-launch report의 크래시·ANR·정책 경고를 처리한다.
- 프로덕션 제출과 실제 공개는 위 항목 및 Console의 모든 필수 작업이 끝난 뒤 별도 승인으로 진행한다.
