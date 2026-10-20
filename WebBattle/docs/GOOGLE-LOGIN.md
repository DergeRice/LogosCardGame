# Google 로그인 운영 설정

Google Identity Services 공식 버튼으로 ID 토큰을 받고, 서버에서 Google JWKS 서명·issuer·audience·만료시간·발급시간과 5분짜리 일회용 nonce를 검증한다. 이메일 주소를 계정 식별자나 자동 병합 근거로 사용하지 않는다. Google sub의 SHA-256만 계정 연결에 저장한다.

## Google Cloud

1. 프로젝트를 선택하거나 새 프로젝트를 만든다.
2. Google Auth Platform에서 앱 이름, 지원 이메일, 대상 사용자(외부)와 개발자 연락처를 설정한다. 테스트 상태에서는 실제 로그인에 사용할 테스트 사용자를 등록한다.
3. 클라이언트 생성 → 웹 애플리케이션. 승인된 JavaScript 원본에 `https://logos-card-battle.netlify.app`을 등록한다. 개발용은 필요할 때만 `http://localhost:5173`, `http://127.0.0.1:5173`을 추가한다.
4. 공식 버튼의 팝업 credential callback 방식이므로 승인된 리디렉션 URI나 클라이언트 시크릿은 사용하지 않는다. 웹 클라이언트 ID(`…apps.googleusercontent.com`)만 서버의 `GOOGLE_CLIENT_ID`에 설정한다. Netlify 프런트 환경변수에는 필요 없다.
5. 운영 공개 전 Google 콘솔에서 대상 사용자/게시 상태와 요구되는 브랜드 정보를 확인한다.

## 계정 동작

- 첫 연결: 현재 게스트의 진행 기록·골드·별가루·아이템·프로필과 친구 정보를 계정으로 이전한다.
- 기존 Google 계정 로그인: 해당 계정에 저장된 기록을 복원한다. 현재 게스트 아이템을 중복 합산하지 않는다.
- 이미 로그인한 기존 게임 계정: 미연결 Google 신원만 현재 계정에 추가한다. 다른 게임 계정에 연결된 신원이나 이미 다른 Google 신원을 가진 계정은 거절한다.
- 다른 기기에서 대전 중인 계정은 로그인 전환을 거절한다. 홈의 기존 접속은 교체한다.
- 게임 세션 토큰은 기존 30일 만료 저장 방식을 사용한다. Google 토큰·이메일·클라이언트 시크릿은 저장하지 않는다.

## 검증

로컬 서명 JWT로 정상 인증, 잘못된 서명·issuer·audience·nonce·만료 거절을 검사한다. 실제 Google 계정 인증과 구분한다. Playwright SDK/소켓 fixture는 랜딩 및 설정 연결 UI와 토큰 저장을 검사한다. 실제 OAuth 완료는 운영 도메인에서 사용자 계정으로 별도 확인해야 한다.

공식 문서: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid 및 https://developers.google.com/identity/gsi/web/reference/js-reference
