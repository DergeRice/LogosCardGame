# v0.9.59 재생 점검 / 배경음악 제거

- 배경음악 재생 코드, 설정 버튼, 배포 MP3를 제거했습니다. 효과음과 Kokoro 예문 음성은 유지합니다.
- 터치 후 AudioContext 재개가 비동기로 끝나는 경우 완료를 기다린 뒤 재생합니다. 1.5초 시작 제한과 입력을 막지 않는 정책은 유지합니다.
- Windows Chromium: 실제 문장 MP3 디코딩, 비무음 파형, 재생 시작/종료 및 종료 2초 후 패널 닫힘 검사.
- Android Chrome **모사**: Pixel 7 사용자 에이전트·터치·가로 화면·축소 visualViewport에서 로컬/R2 문장 재생과 비동기 오디오 재개 검사. 실제 안드로이드 스피커 출력 검사는 아닙니다.
- iOS: Windows Playwright WebKit에 Web Audio가 빌드돼 있지 않아 음성 검사는 명시적으로 건너뜁니다. iPhone/iPad 실기기 검증은 미완료이며, iOS에서 소리가 확인됐다고 판단하지 않습니다.
- 차단·느린 응답·누락·서버 오류에도 예문이 3초 후 닫히고 게임 입력을 막지 않는지 검사합니다. 모든 검사에서 BGM 요청이 없어야 합니다.
- 아래 문서는 이전 음원 구성 기록입니다. 현재 24,155개 R2 문장 구성이 우선합니다.

# v0.9.58 후속 확장

현재 덱의 조사된 24,155개 품사 조합에 대해 대표 문장 1개씩 R2 음원을 준비하며 게임도 index=0으로 고정합니다. 아래 547개는 로컬 호환 음원 자료입니다. 새로운 R2 구조·생성·검사·한도는 [CANONICAL-AUDIO.md](CANONICAL-AUDIO.md)를 참조하세요.

# Kokoro 문장 음성 — v0.9.57

## 현재 범위

- 기본 예문 150개, 카드별 대표 검수 예문 216개, 관측된 카드 조합의 어휘 변형 등을 중복 제거한 **547문장**을 모두 Kokoro로 생성합니다.
- 동적인 카드 문장 생성기가 만들 수 있는 모든 긴 품사 배열 전체를 547개라고 세는 것은 아닙니다. 새 조합으로 등록되지 않은 문장이 나오면 텍스트는 표시하고 음성은 건너뜁니다. 어휘·판정은 음성 제공 여부 때문에 바꾸지 않습니다.
- 미국 영어 여성 `af_heart`, Kokoro-82M v1.0, 속도 1.0, mono 24,000 Hz MP3. 문장 전체를 한 번에 합성하며 단어 파일을 이어 붙이지 않습니다.

## 실행 중 동작

1. 선택한 문장의 MP3 한 개만 사이트에서 받습니다. 전체 음원이나 모델은 사용자 기기로 미리 받지 않습니다. 547개 음원의 합계는 7,707,528바이트(약 7.35 MiB)입니다. 선택적 manifest 사전 로딩은 경기 시작을 막지 않습니다.
2. manifest·다운로드·디코딩·자동재생 허용을 합해 **1.5초 내 시작**하지 못하면 건너뜁니다. 신경망 모델 다운로드, 기기 TTS, 외부 유료 API로 재시도하지 않습니다.
3. 재생 성공 시 종료 2초 후 예문이 닫힙니다. 시작 실패/음성 끄기/미등록 문장은 3초 후 닫힙니다. 재생이 끝나지 않는 경우에도 시작 후 12초 상한이 있습니다. ×/Escape로 즉시 닫고 재생을 취소할 수 있습니다.
4. 예문 패널은 카드 입력을 가로채지 않고, 고·스톱은 점수 연출 종료 후 음성 여부와 독립적으로 표시됩니다. 게임 설정에서 예문 음성을 따로 끌 수 있습니다.
5. 긴 대기 상태, 음성 준비 문구, 반복 다운로드 버튼은 없습니다. 자동재생이 차단된 기기에서는 무음으로 넘어갑니다.

## 오프라인 재생성

개발 PC에서만 실행합니다. 서버/모바일에는 Python·ONNX·모델 설치가 필요 없습니다.

```sh
python -m pip install -r scripts/kokoro-requirements.txt
# .runtime/kokoro/ 아래에 아래 두 모델 파일 저장
python scripts/generate-kokoro.py
# 별도 target 디렉터리에 패키지를 설치했다면 --packages PATH
```

모델 파일(런타임 디렉터리만 사용, Git/Netlify에 올리지 않음):

- https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.0.onnx
- https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.0.bin

스크립트는 기존 manifest의 모든 문장을 대상으로 하며, 생성 파일을 다시 디코딩해 비무음 파형·길이를 확인하고 SHA-256을 저장합니다. 완료한 파일을 재사용하고 전체 성공 때만 manifest를 교체합니다. 0.4.9 래퍼의 speed dtype을 공식 ONNX 모델의 float32 입력에 맞추는 호환 처리가 포함돼 있습니다.

새 문장을 준비하려면 manifest 입력 목록에 text를 추가하고 다시 실행합니다. `--limit 2`는 음색 샘플 생성만 하며 manifest를 바꾸지 않습니다.

## 비용·출처

- 음성 API 호출 비용 0. 개발 시 로컬 CPU로 일괄 생성, 정적 파일은 기존 Netlify에서 제공하므로 호스팅 무료 할당량이 적용됩니다.
- [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M): Apache 2.0 모델. `af_heart` 음성을 사용합니다.
- [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx): MIT 로컬 추론 래퍼, [ONNX Runtime](https://github.com/microsoft/onnxruntime): MIT. eSpeak NG는 생성용 개발 의존성이고 웹에 배포하지 않습니다.
- 이전 Piper WAV와 단어별 자료는 과거 자료로 보존하지만 현재 manifest는 Kokoro MP3만 가리키며 라이브 재생에 사용하지 않습니다.

## 검증 구분

모든 MP3는 Python에서 재디코딩하고 브라우저에서도 길이·파형을 검사합니다. 모바일 크기 Chromium에서 전체 문장 재생, TTS 없는 환경, 로딩 지연/503/미등록/자동재생 차단 시 자동 닫기를 검증합니다. Windows Playwright WebKit은 Web Audio가 없어 음성 검사는 명시적으로 제외합니다. 모바일 뷰 모사는 실제 Android/iPhone 스피커를 직접 들은 검증이 아닙니다.
