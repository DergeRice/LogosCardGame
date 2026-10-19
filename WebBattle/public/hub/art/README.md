# 상점 상자 및 티어 배지

사용자 제공 PNG를 비율과 투명도를 유지하여 512×512 WebP(quality 88, alphaQuality 100)로 축소했습니다. 11개 합계 447,912바이트이며 원본 PNG는 변경하지 않았습니다.

| 원본 파일명 | 운영 파일 |
|---|---|
| silverBox.png | box-silver.webp |
| GoldenBox.png | box-gold.webp |
| DiamondBox.png | box-diamond.webp |
| Iron.png | tier-iron.webp |
| Bronze.png | tier-bronze.webp |
| Silver.png | tier-silver.webp |
| Gold.png | tier-gold.webp |
| Platinum.png | tier-platinum.webp |
| Emerlad.png | tier-emerald.webp |
| Diamond.png | tier-diamond.webp |
| NetherLight.png | tier-netherite.webp |

경로 매핑은 `src/hubArt.ts`, 티어 공통 컴포넌트는 `src/TierBadge.tsx`입니다. 상점 DOM 이미지와 Pixi 개봉 연출은 같은 상자 파일을 사용합니다. 원본의 철자와 게임의 기존 티어 순서는 위 표처럼 대응합니다.
