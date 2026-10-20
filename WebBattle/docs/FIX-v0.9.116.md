# v0.9.116 직접 로그인과 홈 캐릭터 선명도

- 로그인 화면과 설정의 Google·Apple 버튼에서 중간 계정 연결 패널을 제거했다. 제공된 PNG 아이콘은 원본 그대로 보관하고 CSS로 실제 마크 크기를 맞췄다.
- Google 버튼은 사용자 클릭 시 외부 창을 즉시 열고 최신 서버 nonce로 OIDC ID 토큰 인증을 진행한다. Google 콘솔에 https://logos-card-battle.netlify.app/auth/google.html 반환 주소를 등록했다. Access Token이나 새 Google API 권한을 요청하지 않는다.
- 정적 콜백은 fragment를 즉시 주소에서 지우고 동일 origin opener로만 응답한다. 게임은 popup window identity, origin, state를 확인하고, 서버가 기존의 서명·발급자·audience·일회 nonce 검증을 수행한다.
- Apple SDK와 서버 challenge는 미리 준비하여 버튼의 첫 클릭으로 공식 인증을 시작한다. 네이티브 Google·Apple 흐름도 동일 버튼에서 시작한다.
- Google 1개당 게임 계정 1개 및 게스트에서 기존 계정 복귀 확인은 유지한다. 연결 안내 패널은 없고 실제 계정 복귀 확인창만 남는다.
- 저장된 게임 계정 토큰이 있으면 intro URL을 포함해 로그인 화면을 건너뛴다. 서버에서 유효하지 않은 토큰으로 확인되면 토큰을 지우고 로그인 화면으로 돌아온다.
- 홈 캐릭터의 모바일 1배/데스크톱 1.5배 canvas 제한을 최대 DPR 2로 상향하고 선형 필터·mipmap을 적용했다. 512px 원본을 CSS 원본 크기보다 더 확대하지 않는다. FPS 제한, 비활성 ticker 중지 및 WebGL 불가 시 원본 이미지 대체를 유지한다.
- TypeScript 및 운영 빌드 통과. Chromium·WebKit 직접 인증/팝업/계정 복귀/유효·만료 캐시 테스트 12개, DPR 2 캐릭터·표정 전환·생명주기·fallback 테스트 6개 통과. 모바일 visualViewport에서 시스템 UI 영역을 제외한 화면을 검사했다. 실제 휴대폰과 iOS 서명 빌드는 별도다.
