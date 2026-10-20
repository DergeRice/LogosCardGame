# v0.9.114 Google 기존 계정 복귀 확인

- 로그인 화면에서 Google 로그인 시 연결된 기존 계정의 기록을 불러온다.
- 게스트가 설정의 Google 연결을 선택하면 미연결 Google 계정은 현재 게스트 진행·보유품을 저장한다. 이미 연결된 Google 계정은 ‘원래 계정으로 돌아가시겠습니까?’를 표시한다.
- 복귀 수락 전에는 계정·재화·보유품 및 인증 토큰을 변경하지 않는다. 취소하면 게스트를 유지하며, 수락하면 기존 게임 계정으로 전환한다. 두 계정 기록을 합치지 않는다.
- Google 식별자 하나당 게임 계정 하나, 게임 계정당 Google 식별자 하나를 유지한다. 다른 게임 계정에 연결된 Google 식별자를 덮어쓰지 않는다.
- 복귀 승인은 서버에서 검증한 신원에만 연결하며 5분 제한·일회 소비를 적용한다. Cloudflare WebSocket attachment에도 보관하여 Durable Object의 절전 복원 후에도 확인할 수 있다.
- 인증·계정 테스트 11개, TypeScript 및 Cloudflare 타입 검사, 운영 빌드, Miniflare 실제 런타임 검증 통과. Android v0.9.114 debug APK 재생성 성공.
- Google 선택·기존 계정 복귀의 수락/취소 화면을 Chromium/WebKit 데스크톱 및 모바일 크기에서 검사한다. visualViewport가 330px인 가로 화면에서 상하단 시스템 UI 영역을 제외한다.
- 실제 Google·Apple 계정 로그인 검사는 Work 설정에서 브라우저 제어가 비활성화되어 추가 실행하지 못했다. 실기기 및 iOS Xcode 서명 검증은 별도 필요하다.
- Cloudflare 배포 버전: a22aa5d0-f363-4bf7-a0c9-5a4845b5f25d.
