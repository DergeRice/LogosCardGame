# 현재 덱 대표 문장 음원 — v0.9.58

## 완료 결과

24,155개 모두 생성·R2 업로드·전체 객체 해시 대조를 완료했습니다. 합계 548,560,728바이트(약 549MB / 523.15MiB), 문장 길이 0.768~6.144초입니다. 공개 주소에서 33개 대표 파일의 SHA-256·MP3 디코딩·파형을 추가 확인했습니다. [검사 기록](canonical-audio-release.json). 임시 업로드 Worker와 로컬 인증키는 제거했습니다.

## 범위와 연결

- `docs/one-example-per-pos/examples.jsonl`에서 `availableInCurrentDeck:true`인 **24,155개**를 사용합니다. 카드 그림/가감산 효과를 합친 품사 조합마다 어휘 변형 index=0의 문장 1개입니다.
- 게임도 index=0을 선택합니다. 인정 구간만 예문 생성기에 전달하며 앞뒤 불인정 카드는 예문에 보충하지 않습니다. 품사 판정·점수·서버 규칙을 바꾸지 않습니다.
- 조사 범위는 길이 1~5 전수와 최대 15장의 구조 생성 검사입니다. 가능한 모든 긴 배열이나 모든 의미·번역을 전수 검수했다는 뜻은 아닙니다. 기존 자동 생성 초안 표시를 유지합니다.
- 영어 문장 전체를 Kokoro v1.0 `af_heart`, 속도 1.0, mono 24 kHz MP3로 생성합니다. 모바일 모델 다운로드/추론 및 단어별 음원 연결은 없습니다.

## 저장 구조

- R2 Standard 버킷: `logos-card-audio`, APAC. 기존 계정에 R2가 이미 활성화되어 새 가입/결제수단 입력/요금제 변경은 하지 않았습니다.
- 읽기 전용 음원 Worker: `wrangler.audio.jsonc`, `cloudflare/audio-worker.ts`.
- 공개 재생 주소: https://logos-card-audio.jesus-and-children-ranking-worker.workers.dev
- 프런트엔드의 선택적 공개 환경변수: `VITE_SENTENCE_AUDIO_ORIGIN`.
- 해시 키: SHA-256(`kokoro-v1.0/af_heart/1.0/` + 공백 정규화 영어 문장)의 앞 20자리. 경로 `kokoro-afheart-v1/<hash>.mp3`.
- 기존 로컬 547개 중 문장이 일치하면 그 파일을 사용하고, 나머지는 R2 주소를 직접 계산해 요청합니다. 24,155행 색인/음원 전체를 게임 첫 화면에서 받지 않습니다.
- 한 문장 로딩·디코딩은 1.5초 안에 시작하지 못하면 건너뜁니다. 성공 시 재생 종료 2초 뒤 닫히고, ×/Escape 및 카드 조작으로 즉시 닫을 수 있습니다. 고·스톱은 음성을 기다리지 않습니다.
- 읽기 전용 Worker는 GET/HEAD/OPTIONS만 허용하고 경로를 제한합니다. R2 버킷 자체의 개발 공개 URL은 활성화하지 않습니다. CDN/브라우저 캐시는 1년이며 파일 이름은 콘텐츠별로 고정됩니다. 없는 파일은 영구 캐시하지 않습니다.

## 개발용 생성·업로드

```powershell
# 기존 CPU 의존성
python -m pip install -r scripts/kokoro-requirements.txt
# GPU는 별도 격리 디렉터리에 준비한 onnxruntime-gpu[cuda,cudnn]==1.31.0 사용 가능
python scripts/generate-kokoro-catalog.py --packages .runtime/kokoro-python --gpu-packages .runtime/kokoro-gpu --provider cuda --workers 2
# CPU만 쓸 경우 --provider cpu --workers 6, --gpu-packages 생략
```

생성 파일과 진행 정보는 `.runtime/kokoro-catalog/`에만 저장합니다. GitHub/Netlify 빌드에 대량 MP3나 모델을 넣지 않습니다. 파일을 MP3로 다시 디코딩하여 24 kHz·유한 파형·비무음·길이를 확인하고 SHA-256을 기록합니다. 기존 파일을 재사용하며 전체 성공 때 complete manifest를 작성합니다.

업로드에는 별도의 임시 Worker(`cloudflare/audio-upload-worker.ts`, `wrangler.audio-upload.jsonc`)와 난수 시크릿을 사용합니다. `scripts/upload-kokoro-catalog.mjs`는 `.runtime/audio-upload-token` 또는 `AUDIO_UPLOAD_TOKEN_FILE`에서만 인증정보를 읽고 콘솔/프런트엔드에 출력하지 않습니다. HTTP 요청마다 서버가 바이트 수와 SHA-256을 검증한 뒤 R2에 저장합니다. 인증 없는 쓰기는 거부됩니다.

업로드 완료 후 R2의 실제 객체 목록을 페이지별로 읽어 24,155개 모두의 키·크기·SHA 메타데이터를 대조합니다. 영수증은 `.runtime/kokoro-catalog/uploaded.jsonl`, 최종 결과는 `upload-complete.json`에 저장합니다. 완료 후 업로드 Worker와 인증 시크릿을 제거하고 읽기 전용 Worker만 남깁니다.

## 무료 한도

현재 공식 문서 기준:

- R2 Standard: 월 저장 10 GB-month, Class A 쓰기/목록 100만 회, Class B 읽기 1,000만 회 무료. 인터넷 전송료 없음. 다른 버킷의 사용량과 합산하며 초과 시 R2 과금 가능.
- Workers Free: 계정 전체 Worker 호출 합계 하루 100,000회, 요청당 CPU 10ms. 캐시 HIT도 Worker 요청에는 포함됩니다. 자동 유료 전환을 설정하지 않았습니다. 이 규모를 넘는 트래픽은 별도 사용자 지정 도메인/CDN 설계나 플랜 재검토가 필요합니다.
- 음성 생성 API 호출 비용은 0이며 개발 PC의 CPU/GPU만 일괄 생성에 사용합니다. 배포 후 PC를 꺼도 서버/음원 재생은 유지됩니다.

공식 출처:

- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/

## 검사

- 모든 생성 파일 재디코딩, 업로드 서버 SHA-256 확인, 완료 시 전체 R2 객체 목록 대조.
- Miniflare 실제 R2 바인딩에서 CORS/GET/HEAD/캐시/쓰기 금지/없는 파일의 영구 캐시 방지.
- 브라우저 모바일 뷰에서 로컬에 없는 문장을 실제 R2에서 받아 전체 문장으로 재생. 오류·느린 다운로드·음원 누락·자동재생 차단 시 경기 입력이 막히지 않는지 검사.
- 실제 휴대폰 스피커 청취와 Windows의 모바일 브라우저 모사는 구분합니다.
