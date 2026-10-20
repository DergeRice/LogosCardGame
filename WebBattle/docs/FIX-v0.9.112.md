# v0.9.112 Google 전체 사용자 공개

사용자 지시에 따라 테스트 모드 제한을 해제하고 전체 Google 사용자 공개를 진행한다. 기존 앱 게시 버튼 비활성 사유는 브랜딩 구성 미완료이며 개인정보처리방침 URL이 비어 있었다.

- public/about.html: 서비스 설명, 게임 시작, 개인정보처리방침·문의 링크.
- public/privacy.html: 현재 Google 식별자 해시/이름, 게임 기록, localStorage/sessionStorage, IP 접속 제한, 호스팅 제공자, 보관 및 문의 방식 안내. Google 비밀번호·Google 이메일·Google ID 토큰은 계정에 저장하지 않음.
- 로그인 화면에 서비스 소개와 개인정보처리방침 링크 추가.
- 서버 게임 로직·OAuth 클라이언트·권한 범위는 변경하지 않음.
- Google 콘솔 홈페이지 https://logos-card-battle.netlify.app/about.html 및 개인정보처리방침 https://logos-card-battle.netlify.app/privacy.html 등록/저장 완료.
- 사용자의 명시적인 전체 사용자 공개 지시에 따라 앱 게시와 프로덕션 전환 확인을 실행. 콘솔에 게시 상태 ‘프로덕션 단계’, 사용자 유형 ‘외부’, ‘테스트로 돌아가기’ 버튼이 표시되는 것을 확인. 테스트 사용자 제한 해제 완료.
- 로고 업로드나 민감/제한 Google API 권한 추가 없이 기존 Google 기본 로그인 범위 유지.
- 운영 빌드 성공. Chromium/WebKit에서 Google 연결 UI 및 시스템 UI를 포함한 모바일 크기 검증 8개 통과. 실제 휴대폰 검증은 수행하지 않음.
- Netlify v0.9.112와 공개 정적 페이지 내용 일치 확인. Netlify의 링크 pretty URL 재작성은 허용. Cloudflare 배포 버전 c4cf62fe-3fa1-4853-be3c-c9587d930713.
- 공개 상태 증거 스크린샷: .runtime/google-production-public.png (로컬 검증 산출물).
