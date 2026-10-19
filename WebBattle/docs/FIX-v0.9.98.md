# v0.9.98 프레임 10종 추가

- img4 (1).png~img4 (10).png를 style-51.webp~style-60.webp에 순서대로 추가.
- 512×512, 비율 유지, 투명 중앙 및 배경 유지. WebP quality 88 / alphaQuality 100. 합계 512,120바이트.
- 이미지 프레임 60종 + 기본 3종 = 총 63종. 기존 가격, 확률, 이름 숨김 유지.
- 빌드 성공. 교환·장착·상대 전달·저장 복원 및 경제 테스트 5개 통과.
- Chromium/WebKit PC 및 모바일 크기 브라우저 테스트 4개 통과. 모바일 visualViewport 844×330 / innerHeight 390 / offsetTop 20. 실제 휴대폰 검증은 수행하지 않음.
- Cloudflare 타입 검사, dry run, 실제 Miniflare WebSocket/SQLite 복원 검증 통과. 운영 진단 수집 비활성 유지.
