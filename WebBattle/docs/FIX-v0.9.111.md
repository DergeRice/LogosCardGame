# v0.9.111 Google 로그인 구현 

## 구현

- 랜딩의 Google 로그인과 홈 설정의 Google 계정 연결을 실제 GIS credential 흐름으로 연결.
- 서버가 웹 클라이언트 ID와 세션별 5분 nonce를 제공. nonce는 시도 시 한 번만 소비하며, Google JWKS 서명·issuer·audience·exp·iat를 jose로 검증.
- Google sub 해시 기반 식별. 첫 게스트 계정 생성은 기존 진행/아이템 보존, 재로그인은 기존 계정 복원. 기존 비밀번호 계정에 Google 연결 가능. 이미 다른 계정에 연결된 신원과 신원 재연결은 거부.
- Google 이메일/토큰/시크릿을 계정에 저장하지 않음. 일반 로그인 세션은 기존 30일 정책 사용.
- Node 및 Cloudflare 양쪽 전송 계층 지원. 운영 진단 수집 비활성 유지.

## 검증 결과

- 계정/JWT 테스트 9개 통과(서명된 테스트 토큰 사용; 실제 Google 인증 아님).
- 새 Google UI/소켓 fixture 테스트 4개 통과: Chromium/WebKit, 데스크톱/모바일. 모바일 innerHeight390 / visualViewport330 / offsetTop20. 실제 휴대폰 검증 없음.
- TypeScript, 운영 빌드, Cloudflare 타입 검사/dry run 및 Miniflare WebSocket/SQLite 복원 통과.
- 넓게 실행한 기존 login-entry.spec.ts를 포함한 24개 테스트는 17통과/7실패. 실패에는 제거된 `.welcome-profile`을 참조하는 기존 선택자와 Pixi/화면 배치 검사가 포함됨. 해당 전체 회귀 테스트 통과로 보고하지 않음.

## 운영 구성 및 남은 검증

- Google Cloud 프로젝트 `logos-card-game`, 앱 `로고스 카드게임`, 웹 클라이언트 `Logos Card Game Web` 생성 완료. 정책 동의 및 클라이언트 생성은 사용자의 단계별 승인 후 실행.
- 승인된 JavaScript 원본은 https://logos-card-battle.netlify.app 하나만 등록. 공개 클라이언트 ID를 wrangler GOOGLE_CLIENT_ID에 설정. 시크릿 미사용/미저장.
- 현재 로그인한 Google 계정을 테스트 사용자로 등록. 앱은 아직 테스트 상태이며 일반 사용자 공개는 Google 브랜딩 구성을 완료해야 함.
- Cloudflare 로그인 nonce는 WebSocket attachment에 저장하여 절전 복원 시 유지. Node 서버는 세션별 메모리 nonce 사용.
- Cloudflare 버전 e8a399cb-9305-42e4-8241-3708bc808987 및 Netlify 운영 v0.9.111 배포 완료.
- 운영 도메인에서 실제 Google 계정 인증 성공. 설정의 Google 연동 상태 및 새로고침 후 동일 UUID/계정 복원 확인. 비밀번호·이메일·Google 토큰을 테스트 출력/저장소로 복사하지 않고 UI 상태로 확인.
- Google 콘솔 게시 상태는 테스트 중. 일반 공개 버튼은 브랜딩 구성 미완료로 비활성 상태이며 전체 사용자 공개 완료로 보고하지 않음.
- 실제 휴대폰/별도 기기에서의 Google 인증은 수행하지 않음. 모바일 크기 UI 검증과 서버 저장/복원 테스트는 위 결과 참고.
