# v0.9.88 상점 개봉 연출

## 변경
- 서버가 StoreResult.source(box/redeem), box 종류를 확정하고 저장합니다. 클라이언트가 보낸 source는 신뢰하지 않습니다.
- 직접 교환: 구매 완료 패널에 실제 항목 표시. 상자·카드 뒤집기 없음.
- 상자: 기존 상자 SVG를 PixiJS v8로 흔들고 터뜨린 뒤 보상 카드를 순서대로 한 장씩 클릭/터치해 뒤집습니다. 모바일 입자18/24FPS, PC28/30FPS. 숨김 탭 ticker 정지, renderer 정리, 실패 시 CSS 대체/시간 상한.
- 화면 닫기·카드 뒤집기는 지급/차감 요청을 만들지 않습니다. 결과 요청ID 중복 재생 방지. 기존 서버 결과는 보류 요청 정보로 호환합니다.
- 전체 열기 버튼은 없으며 다음 카드로 스크롤/포커스가 이동합니다. 글로벌 비활성 버튼 필터가 3D 뒷면을 가리는 문제도 수정했습니다.

## 검증
- npm test: 194/194 통과. 신규 서버 테스트는 지급 출처·요청 중복·재접속 저장 검증.
- npm run build, check:cloudflare, TypeScript 검사 통과.
- Chromium/WebKit 각각 PC1366×900, 모바일844×390(visualViewport330/top20) 총4건 통과. Pixi 실제 renderer 확인, 직접 교환 상자 없음,10장 개별 뒤집기, 중복 결과 재열림 없음, 화면/버튼 경계, pageerror 없음.
- 위 브라우저 검증은 WebSocket 응답과 재화를 지정한 테스트 픽스처입니다. 운영 이용자 재화를 소비한 정상 구매 검증이나 실제 휴대폰 검증으로 간주하지 않습니다.

## 운영 서버 제한
- Cloudflare 서버 업로드/배포 성공: 3c0450d8-5a08-4124-9a72-aedc4aa8ebd1.
- 운영 WebSocket 연결이 HTTP500으로 실패. Wrangler tail에서 새 버전의 Durable Object 초기화 오류를 직접 확인: `Exceeded allowed rows written in Durable Objects free tier.`
- 따라서 현재 운영 서버에서 실제 구매·지급 검증을 완료했다고 보고하지 않습니다. 유료 전환/데이터 삭제/계정 변경은 하지 않았습니다.
- Cloudflare 공식 문서상 일일 무료 한도는00:00UTC(한국09:00)에 초기화됩니다. 재발 방지를 위한 쓰기량 분석/감축은 별도 작업이 필요합니다. https://developers.cloudflare.com/durable-objects/platform/pricing/
- Netlify는 GitHub web-battle 같은 커밋의 운영 ready 배포 확인 대상으로 관리합니다.
