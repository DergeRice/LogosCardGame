# v0.9.113 Google·Apple 및 WebView 앱 인증

- Google 웹 로그인과 Apple 웹 로그인, iOS 네이티브 Google·Apple 인증, Android Google 및 시스템 브라우저 Apple 인증을 연결했다.
- 서버가 발급한 일회용 nonce, 발급자·대상·서명·만료를 검증한다. 계정에 두 제공자를 연결할 수 있으며 다른 계정의 연결을 덮어쓰지 않는다.
- Capacitor 8 Android/iOS 프로젝트를 추가했다. 웹 자산을 앱에 포함하고 운영 WebSocket 서버를 사용한다.
- Apple 개인 팀 sangjin lee (78KBLJG22W), 앱 ID com.baragames.logoscardgame, Services ID com.baragames.logoscardgame.web을 생성했다. 서비스 설정 저장을 실행했으나 이후 브라우저 제어가 비활성화되어 저장 후 재확인과 실제 Apple 로그인은 미완료다.
- Google iOS 클라이언트와 현재 PC Android 개발 서명용 클라이언트를 생성했다. Google OAuth 공개 상태는 기존 프로덕션을 유지한다.
- Android 개발 SHA-1: AC:81:D9:88:A9:60:3E:BF:C0:80:E6:DF:B5:30:1C:66:60:9D:40:B9. Play 출시에는 실제 Play 앱 서명 인증서 SHA-1을 별도로 등록해야 한다.
- 계정·토큰 검증 테스트 12개 통과. Chromium/WebKit 로그인 테스트 8개 통과(동시 빌드 중 navigation timeout 1개는 단독 재실행 통과). 모바일 visualViewport/시스템 UI 크기를 포함한다. 실제 휴대폰 검증은 하지 않았다.
- TypeScript, 운영 빌드, Cloudflare 검사 및 Miniflare 통과. Android assembleDebug 성공. APK: android/app/build/outputs/apk/debug/app-debug.apk.
- Windows 환경이므로 Xcode iOS 빌드·서명·실기기 검증은 수행하지 못했다. iOS 개발 팀과 Sign In with Apple entitlement, Google 반환 URL은 설정했다.
- Cloudflare 운영 배포: 4f562755-74d6-4319-9b8e-8fe064170d91.

## 앱 빌드

Node 22 이상에서 npm ci, npm run native:sync를 실행한다. Android는 Android Studio에서 android 폴더를 열고, iOS는 macOS Xcode에서 ios/App/App.xcodeproj를 연다. 각 스토어의 실제 서명 설정 및 실기기 Google·Apple 왕복 검증 후 제출한다. debug APK는 스토어 출시 서명 파일이 아니다.
