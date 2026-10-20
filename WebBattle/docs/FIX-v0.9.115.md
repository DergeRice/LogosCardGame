# v0.9.115 계정 연결 중 서버 재연결

- 운영 브라우저에서 Google 실제 계정 재로그인 후 기존 UUID 07244435-f1c2-4d7c-8ebc-8669f2c93e03 복원 확인.
- 설정에서 인증 중 게임 소켓이 교체되면 이전 Google 버튼의 콜백이 남을 수 있었다. 소켓 변경 시 인증 UI와 콜백 상태를 초기화하고 새 세션의 인증 challenge를 기다린다.
- 공유 소켓이 CONNECTING인 경우 즉시 실패하지 않고 session 수신 후 인증을 시작한다.
- Google 브라우저 회귀 검사에 설정 연동 첫 요청 시 소켓 종료·재연결을 추가했다. 기존 계정 복귀 수락/취소 및 시스템 UI를 포함한 모바일 visualViewport 검사를 유지한다.
- TypeScript 검사와 운영 빌드 통과. Capacitor 웹 자산 동기화 완료. Chromium/WebKit 데스크톱 및 모바일 재연결·수락·취소 검사 4개 통과. Android debug APK 재빌드 성공.

- 실제 운영 브라우저: 게스트 UUID 25c0a8e4-7ee6-4672-a6bc-161ab2da5bd9에서 Google 인증 후 복귀 확인창을 수락하여 기존 UUID 07244435-f1c2-4d7c-8ebc-8669f2c93e03로 복귀했다.
- 실제 Apple 인증을 사용자 로그인·동의로 완료했다. 같은 게임 UUID에서 Google·Apple 모두 연동됨을 확인했다. Apple Services ID 활성화, primary App ID 및 두 도메인·반환 주소 저장도 콘솔에서 재확인했다.
- 로컬 검증 증거: .runtime/google-return-real-confirmation.png, .runtime/google-return-real-restored.png, .runtime/apple-service-config-verified.png, .runtime/google-apple-linked-real.png.
