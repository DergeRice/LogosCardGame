# 문장 음성과 예문 검수 — v0.9.54

## 검수 범위

- 기존 150개 자료를 유지하고, 자동 추출 초안에서 72개 유형의 대표 예문 216개를 다시 선정·검수했습니다. 목록: [REVIEWED-EXAMPLES.md](REVIEWED-EXAMPLES.md), 원자료: `shared/reviewed-examples.json`.
- 사람이 목적어인데 `Read Naro`라고 하던 예는 `Help Naro`로, 4형식의 부자연스러운 `Give us them`은 `Give them something`으로 바꿨습니다. `We are me`는 `We are ourselves`가 됩니다.
- `Can I need the book?` 대신 `Can I read the book?`를 사용합니다. 부사 위치에 따라 `today`/`really` 등을 골라 `Do today work`가 생기지 않게 했습니다.
- 한국어는 문장 끝의 글자를 잘라 붙이던 방식에서 술어별 활용표로 바꿨습니다. 의문문·부정·명령·가능 표현, 5형식 목적격 보어의 뜻을 유지합니다. 예: `Can I make them work?` → `나는 그들이 일하게 만들 수 있나요?`.
- 형용사와 빈도부사의 연속은 자연스러운 병렬 표현을 위해 예문에 연결어를 보충합니다. `happy, calm, and confident`, `regularly and often`처럼 읽습니다. 연결어를 별도 득점 카드로 추가하는 것은 아닙니다. 기존 형용사 3장·부사 2장 제한은 유지합니다.
- `Be not afraid!`와 같은 DO 없는 부정 BE 명령은 격식체/문어체로 표시하고 판정을 유지합니다. 보통 회화에서는 `Do not be afraid!`가 일반적입니다.
- Naro는 주어·목적어·보어에서 같은 이름을 사용합니다. 이 검수는 대표 문장 216개와 생성기의 공통 오류를 대상으로 하며, 가능한 모든 긴 배열의 의미·상황 적절성을 보증하지 않습니다.

준비된 음성은 총 **547개**(22,050 Hz PCM WAV, 합계 약 40.1 MiB)입니다. 라이브 클라이언트는 현재 예문의 파일 하나만 받고, 나머지 파일 전체를 미리 내려받지 않습니다.

## 무료 재생 경로

1. 준비된 문장이면 사이트의 **문장 전체 WAV 한 개**를 재생합니다. 216개 대표 예문, 기존 150개, 관측된 품사 배열의 어휘 변형과 자주 쓰는 예문을 오프라인에서 생성합니다. 필요한 한 파일만 다운로드합니다.
2. 준비되지 않은 문장: **모바일은 Web Worker의 Piper VITS 신경망 합성**으로 전체 문장을 생성합니다. 게임 화면 스레드에서 추론하지 않습니다. 실패하면 기기의 영어 TTS로 문장 전체를 읽습니다.
3. PC에서는 준비 파일 → 기기 영어 TTS → 같은 브라우저 신경망 합성 순서입니다.
4. 단어 녹음을 이어 붙이거나 단어마다 SpeechSynthesisUtterance를 만드는 경로는 예문 패널에서 제거했습니다. 기존 단어 자료는 호환성/검사용으로만 남아 있으며 게임 시작 때 다운로드하지 않습니다.
5. 재생이 정상 종료된 시점부터 **2초 후** 패널을 닫습니다. 기기의 자동재생 제한 등으로 소리가 시작되지 않으면 패널을 유지하고 `소리 켜고 듣기`를 제공합니다. 재시도는 터치 안에서 오디오를 활성화합니다.

별도 음성 API 계정·유료 키·음성 서버가 없습니다. 정적 파일은 기존 Netlify에서 제공하고, 신경망 합성은 접속한 기기에서 실행합니다. Netlify 무료 할당량은 계속 적용됩니다. 브라우저 모델이 필요한 첫 사용에는 수십 MB의 모델/런타임 다운로드와 기기별 준비 시간이 필요합니다. 모델은 가능한 경우 브라우저의 OPFS에 저장됩니다. 저장소 삭제·비공개 모드·캐시 제한·외부 모델 호스트 장애 시 다시 다운로드하거나 기기 TTS로 대체할 수 있습니다.

합성 중 진행 상태를 표시하며, 취소·언마운트·90초 제한 때 워커를 종료합니다. 입력은 600자 이하로 제한합니다. 준비 WAV는 문장별로 받으므로 모바일에서 모델을 실행할 필요가 없는 예문은 바로 재생할 수 있습니다.

## 재현

```sh
npm run examples:review
npm run audit:examples
# 별도 터미널에서 로컬 Vite를 5182 포트로 실행
npx vite --host 127.0.0.1 --port 5182
# 무료 로컬 신경망으로 정적 문장 파일 생성 (이미 있으면 재사용)
npm run audio:sentences
```

생성 스크립트는 Playwright의 로컬 Chromium으로 전체 문장을 합성합니다. Google Chirp 스크립트는 이 작업에서 실행하지 않았습니다. 모델·음성 준비는 개발용 작업이고, 배포 후 사용자에게 개발 PC 연결은 필요하지 않습니다.

## 출처와 라이선스

- [`@diffusionstudio/vits-web` 1.0.3](https://github.com/diffusionstudio/vits-web): MIT. 브라우저 Piper/ONNX 합성 래퍼.
- [LJ Speech medium 모델 카드](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/ljspeech/medium/MODEL_CARD): 미국 영어 여성 1인 음성, 22,050 Hz. 원 데이터는 [LJ Speech public domain](https://keithito.com/LJ-Speech-Dataset/), [Piper voices 저장소](https://huggingface.co/rhasspy/piper-voices)의 모델 라이선스는 MIT입니다.
- [ONNX Runtime](https://github.com/microsoft/onnxruntime): MIT. [Piper phonemizer](https://github.com/rhasspy/piper-phonemize)는 eSpeak NG(GPL)를 포함합니다. 브라우저 래퍼가 지정한 공개 런타임을 사용하며 해당 소스/라이선스는 각 저장소에서 확인할 수 있습니다.

실제 휴대폰의 스피커/무음 모드 검증과 Windows에서 실행한 모바일 브라우저 모사 검증은 구분해서 보고합니다. Windows Playwright WebKit에 Web Audio가 없는 경우 iPhone 음성 검증으로 간주하지 않습니다.

## 검증 결과

- 단위/통합 테스트 133개 통과. 대표 216개 재생성 일치, 547개 WAV의 SHA-256·포맷·길이·비무음 파형을 검사했습니다.
- 실제 Cloudflare 런타임에서 4개 WebSocket, 자연 배분, 제출 중복, 재접속/SQLite 복구, 전원 동의 배분, 재대결 검사가 통과했습니다.
- Chromium의 PC/모바일 크기에서 문장 WAV 재생, 자동재생 제한 뒤 터치 재시도, 새 문장의 실제 신경망 합성, 합성 중 화면 프레임 갱신, 취소 시 워커 종료를 확인했습니다.
- 고·스톱 순서 및 점수 연출 검사는 제어한 26점 손패/서버 상태를 사용하는 UI 픽스처입니다. 정상 자연 플레이에서 26점을 얻었다는 검증으로 분류하지 않습니다. 재생 종료와 패널 제거 시간을 직접 비교해 2초 지연을 확인했습니다.
- Windows Playwright WebKit은 Web Audio 자체가 없어 해당 음성 검사는 명시적으로 건너뜁니다. 실제 iPhone/Android 스피커를 직접 들은 검증은 아닙니다.
