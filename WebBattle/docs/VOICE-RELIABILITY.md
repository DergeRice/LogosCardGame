# 문장 음성 재생 조사 (v0.9.63)

기존 경로는 `SentenceExamplePanel → playSentenceExample → manifest/local MP3 또는 R2 → decodeAudioData → AudioBufferSourceNode`였다. 시스템 TTS는 사용하지 않는다.

## 확인한 문제와 수정

1. 매니페스트·파일 요청·디코딩·오디오 권한 재개 전체에 1.5초 제한이 있었다. 모바일/첫 요청이 이를 넘으면 다운로드를 취소했다. 지연을 3.2초로 주면 문제가 재현되는 구조이며, 수정 후 실제 MP3 재생 완료를 검사했다. 이제 매니페스트 6초, 파일 12초로 각각 제한하고 제출할 때 미리 읽어 캐시한다. 캐시는 최대 24문장이다.
2. 오류가 모두 무시되고 기본 3초 뒤 예문을 닫아서 로딩 실패·404·연결 오류·권한 차단을 구별할 수 없었다. 준비/재생/완료/차단/미등록/연결/디코딩 상태를 구분하고 수동 재생 버튼을 제공한다. 실패는 서버 진단 이벤트에도 남긴다. 예문 자동 읽기가 꺼졌어도 직접 듣기를 선택할 수 있다.
3. 모바일에서 컨텍스트가 suspended/interrupted 상태인 경우 효과 이후 비동기 호출만으로는 재개가 막힐 수 있다. 탭 동작에서 같은 컨텍스트를 직접 재개하고 실패 시 다시 누를 수 있게 한다. 취소한 문장은 파일 요청이 끝나도 뒤늦게 재생하지 않는다.
4. 싱글 연습 화면은 문장을 텍스트로만 표시했고 재생 호출 자체가 없었다. 연습 확인 후 자동 읽기/다시 듣기를 연결했다. 3고 뒤 마지막 득점으로 결과 화면이 먼저 도착하는 경우에도 마지막 본인 문장을 결과에서 읽을 수 있게 했다.
5. 본인 예문이 표시되는 동안 고/스톱 창이 재생 버튼을 덮지 않게 순서를 조정했다. 예문을 닫거나 읽기가 끝나면 선택창이 열린다. 서버의 45초 선택 제한은 유지한다.

## 검증 범위

- Windows의 설치된 Chrome과 최신 Playwright Chromium: 실제 로컬 및 운영 R2 MP3 재생 시작/완료, 양수 파형, 반복 재생, 중단 후 재개, 3.2초 다운로드 지연, 자동재생 차단 후 재시도, 404/503, 취소 후 늦은 재생 방지.
- Android Chrome 대응: Pixel 7 크기·터치 Chromium 에뮬레이션에서 같은 검사. 시스템 UI를 흉내 낸 작은 visualViewport도 적용한다. 실제 안드로이드 기기는 없다.
- iOS Chrome 대응: WebKit 모바일 화면에서 피버/화면/컨트롤 검사. 이 Windows Playwright WebKit 빌드는 Web Audio API가 없어 음성 검사는 명시적으로 skip한다. **실제 iOS Chrome 오디오 재생 또는 휴대폰 스피커 청감이 확인된 것은 아니다.**
- 운영 R2에서 감사 목록의 짧은/긴 33문장을 각 지원 브라우저가 직접 다운로드·MP3 디코딩하고 기존 길이 및 비무음 파형을 확인한다. 디지털 재생 완료와 하드웨어에서 들린다는 판정은 구분한다.
- 기존 24,155개 등록 예문을 현재 생성기에 다시 넣어 등록된 영어 텍스트와 비교한다. 이 범위의 미등록 생성 문장은 0개다. 모든 15장 배열을 전수 조사했다는 의미는 아니다.

명령: `npx playwright test --config playwright.audio.config.ts`, `npx tsx scripts/check-sentence-audio-coverage.ts`. 게임 흐름 음성은 `tests/browser/recorded-audio.spec.ts`, 종료/피버는 `tests/browser/fever-ui.spec.ts`로 추가 검사한다.

운영 `/audio-check` 화면은 실제 기기에서도 로컬 문장과 R2 문장을 눌러 재생하고 HTTP 오류·컨텍스트 상태·파형·재생 완료를 확인할 수 있게 한다. 자동재생 정책 참고: [Chrome Web Audio](https://developer.chrome.com/blog/web-audio-autoplay/), [WebKit 사용자 동작 정책](https://webkit.org/blog/6784/new-video-policies-for-ios/).
