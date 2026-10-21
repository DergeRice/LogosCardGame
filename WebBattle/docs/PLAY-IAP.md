# Google Play 일회성 다이아몬드 상품

대상 패키지: `com.baragames.logoscardgame`  
초기 판매 국가: 대한민국만.

| Play product ID | 표시명 | 다이아 | 한국 가격 |
| --- | --- | ---: | ---: |
| `diamonds_100` | 다이아몬드 100개 | 100 | ₩1,200 |
| `diamonds_300` | 다이아몬드 300개 | 300 | ₩2,900 |
| `diamonds_1000` | 다이아몬드 1,000개 | 1,000 | ₩8,900 |
| `diamonds_3000` | 다이아몬드 3,000개 | 3,000 | ₩24,900 |

각 항목은 **일회성 제품 · 소모성**으로 만든다. 상품 ID와 가격은 `shared/store.ts`의 `DIAMOND_PACKS`와 반드시 동일해야 한다.

## 지급 안전 규칙

결제 성공 UI만으로 다이아를 지급하지 않는다. Android Billing Client가 반환한 `purchaseToken`을 서버에 전송하고, 서버가 Google Play Developer API로 패키지·상품 ID·구매 상태를 검증한 뒤 계정별 토큰을 한 번만 처리한다. 이 검증용 서비스 계정은 Play Console API 액세스 권한을 받아야 하며 키는 배포 비밀값으로만 보관한다.

웹 상점은 가격을 보여주지만 Play 결제를 실행하지 않는다. Android 앱도 서버 검증 비밀값과 결제 상품이 준비되기 전에는 구매 버튼을 활성화하지 않는다.
