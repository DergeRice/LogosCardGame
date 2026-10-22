# Google Play 일회성 다이아몬드 상품

대상 패키지: `com.baragames.logoscardgame`  
초기 판매 국가: 대한민국만.

| Play product ID | 표시명 | 다이아 | 한국 가격 |
| --- | --- | ---: | ---: |
| `diamonds_100` | 다이아몬드 100개 | 100 | ₩1,200 |
| `diamonds_300` | 다이아몬드 300개 | 300 | ₩2,900 |
| `diamonds_1000` | 다이아몬드 1,000개 | 1,000 | ₩8,900 |
| `diamonds_3000` | 다이아몬드 3,000개 | 3,000 | ₩24,900 |

각 항목은 **일회성 제품 · 소모성**이다. 2026-10-22에 Google Play Developer API로 네 상품 모두 `ACTIVE`, `standard` 구매 옵션, 위 한국 가격을 확인했다. 상품 ID와 가격은 `shared/store.ts`의 `DIAMOND_PACKS`와 반드시 동일해야 한다.

## 지급 안전 규칙

결제 성공 UI만으로 다이아를 지급하지 않는다. Android Billing Client가 반환한 `purchaseToken`을 서버에 전송하고, 서버가 Google Play Developer API로 패키지·상품 ID·구매 상태를 검증한 뒤 계정별 토큰을 한 번만 처리한다. 이 검증용 서비스 계정은 Play Console API 액세스 권한을 받아야 하며 키는 배포 비밀값으로만 보관한다.

Unity 앱은 로그인된 계정 ID의 SHA-256 해시를 Billing의 `obfuscatedAccountId`에 넣는다. 서버는 Play ProductPurchaseV2의 구매 상태·완료 시각·상품·수량·미소모 상태·해시를 검사한다. 토큰 해시를 영구 원장에 기록하고 다이아 지급을 같은 SQLite 트랜잭션으로 확정한 뒤 Play consume을 호출한다. 동일 토큰 재전송은 추가 지급하지 않는다.

서버의 `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` secret과 `iapPurchase` 검증 로직은 Cloudflare에 배포했다. `LOGOS_COMMERCE_ENABLED=1`인 기기 테스트 APK에서도 구매 브리지가 활성화되어 있다. 다만 `.dev` 패키지 APK는 운영 패키지의 Play 상품 결제창을 검증할 수 없다. 운영 패키지 AAB를 기존 업로드 인증서로 서명해 내부 테스트에 올리고 Play에서 설치한 후 실제 구매·취소·재설치 복구를 확인해야 한다.

기존 업로드 키 `~/.android/logoscardgame-upload.jks`의 비밀번호가 현재 확인되지 않았다. 프로젝트의 `user.keystore`는 Play 설치 앱 서명 인증서이고, 기존 내부 테스트 AAB의 업로드 인증서와 다르다. 임의로 `user.keystore`로 업데이트 AAB를 올리면 Play가 거부한다. 새 업로드 키와 비밀번호 속성 파일은 각각 `~/.android/logoscardgame-upload-2026.jks`, `~/.config/logoscardgame/upload-key-2026.properties`에 권한 600으로 저장했다. 제출할 공개 인증서는 `~/.config/logoscardgame/upload-certificate-2026.pem`, SHA-1은 `53:4D:19:56:50:8D:9A:68:26:0C:28:04:11:C5:34:76:A0:CD:10:D8`이다. 이 키로 `Builds/LogosCardGame-Unity.aab` versionCode 12를 빌드했고 인증서 일치를 확인했다. Play Console의 업로드 키 재설정 완료 후에만 업로드할 수 있다. 웹 상점은 가격을 보여주지만 Play 결제를 실행하지 않는다.
