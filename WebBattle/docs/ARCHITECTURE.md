# 구조와 프로토콜

- `shared/LearningLocalGrammarChecker.ts`: 제공된 C# 원본 전체 포팅. 호출별 옵션 상태, 19종 숫자 enum.
- `shared/rules.ts`: 카드 품사 매핑, CheckPlayableSegment(false) 호출, 인정 구간 점수, 공개 상태 타입.
- `server/game.ts`: 단일 이벤트 루프에서만 상태 변경. 방, 세션, 게임, 타이머, AI, 유예 처리.
- `server/index.ts`: WebSocket 진입, origin 검증, 최대 프레임, 메시지 token bucket, heartbeat, health.
- `server/ai.ts`: 자기 손패만 전달받는 bounded search.
- `src/main.tsx`: 세션/재접속, 5개 화면, 손패 로컬 선택. 점수 계산/승패 결정은 하지 않음.

## 세션

첫 `hello {name, token?}`에 256비트 랜덤 guest token과 공개 player ID 발급. token은 sessionStorage, 공개 ID는 방 참가자 표시에 사용합니다. 토큰을 다른 플레이어에게 전달하지 않습니다. 기존 token 재접속은 기존 socket을 교체하고 방 상태를 복원합니다. 새 socket이 연결된 뒤 이전 socket의 close 이벤트가 현재 연결을 끊지 않도록 socket identity를 비교합니다.

공개 Cloudflare 서버는 SQLite에서 세션과 경기를 복원하므로 런타임 재시작 후에도 토큰이 유효합니다. 세션 만료 뒤에는 새 게스트로 시작합니다. 로컬 Node 개발 서버만 메모리 방식입니다. 세션은 활동이 없고 연결·방이 없는 상태 1시간 후 정리됩니다.

ROB 대상 조회는 `inspectRob {matchId, cardId}`로 요청합니다. 서버가 ROB 소유와 경기 상태를 확인한 뒤 요청자에게 `robView {players:[{cards,handVersion,fieldVersion}]}`를 보냅니다. cards에는 모든 손패(조합 중인 카드 포함)와 모든 제출 문장의 필드 카드가 포함됩니다. 사용 시 카드 ID·위치·버전을 서버에서 다시 검사합니다. PROTECT를 먼저 검사하며 필드에서 이동한 카드는 문장 기록과 사용 카드 목록에서도 제거합니다. 이미 획득한 점수는 바꾸지 않습니다.

현재 사용자 지정 규칙에 따라 공개 선수 상태에는 `handPreview`(필드 조합 중인 카드 제외), `draftPreview`(현재 조합), `playedSentences`(제출 카드), `lastPlayed`, `lastAction`이 포함됩니다. 상태 표시의 전체 카드 목록은 `shared/cardViews.ts`에서 카드 ID로 중복을 제거해 합칩니다. 게스트 세션 토큰은 공개하지 않습니다.

EXCHANGE 조회 역시 손패와 모든 제출 필드 카드를 반환합니다. 필드 카드 선택 시 대상 fieldVersion을 추가 검증하고, 수락 시 양측 소유권을 다시 확인합니다. 교환한 필드 카드는 기존 필드·문장 기록·사용 카드 목록에서 빠지고 상대 손패로 이동하며 기존 득점은 유지합니다.

## 명령

```
hello { name, token? }
create
join { code }
ai { difficulty: easy|normal|hard }
ready { matchId, ready }
submit { matchId, handVersion, requestId, cards: cardID[] }
choice { matchId, decisionId, choice: go|stop }
rematch { matchId }
leave
ping
```

서버 응답: session / state / ack / error / home / pong. state는 자기 손패와 최대 4인 공개 점수·상태만 포함합니다. 상대 손패 ID·품사, 세션 토큰, AI 계획은 포함하지 않습니다. 문법 규칙은 공개 학습 규칙이며 개인 손패의 정답 후보 목록은 전송하지 않습니다.

## 중복·지연·연타

- 요청 ID를 경기마다 저장해 중복을 무시합니다. 최대 256개로 메모리 제한.
- 경기 ID + 내 손패 버전 검증으로 과거 경기/지급 전/소모 전 요청 거절.
- 1.5초 행동 cooldown. 잘못된 문법도 쿨다운 적용.
- 선택 ID 소유권, 중복 ID, 길이 1~15 검증. 클라이언트의 score/winner 필드는 읽지 않음. 판정의 usedStartIndex/usedLength에 해당하는 카드만 점수 및 소모에 사용.
- 동시 제출은 서버 도착 순으로 직렬 처리. 주도권 발생 전 제출은 반영, 선택 중 도착한 제출은 거절. choice는 결정 ID와 소유권을 검증하며 한번만 적용.
- 서버 Date.now 기준 마감 이후의 제출은 점수를 적용하지 않음.
- 클라이언트 응답 대기 동안 제출 버튼 비활성. 소켓 단절 시 자동 재연결 후 authoritative snapshot 사용. 실패한 제출을 자동 재전송하지 않음.

## 자원 제한

- 메시지 최대 4096바이트, nickname 16자, room code 숫자 6자리, requestId 최대 80자.
- 연결별 초당 4개 평균/버스트 20개. 반복 초과는 종료.
- 접속 원격주소별 분당 upgrade 120회, 전체 socket 1000, room 500, session 2000 상한.
- 프록시 뒤 임의 X-Forwarded-For는 신뢰하지 않습니다. Render 프록시 주소를 공유하는 여러 사용자는 upgrade 한도를 공유할 수 있으며 큰 트래픽으로 확장하려면 신뢰 프록시 설정 또는 외부 rate limit이 필요합니다.
- 소켓 미인증 10초 timeout, 10초 heartbeat. 조용한 단절 감지는 heartbeat에 최대 약 20초 추가될 수 있고, 이후 30초 유예가 시작됩니다.
- 쓰기 버퍼가 256KB를 초과하는 느린 클라이언트는 종료하여 메모리 증가 방지.
- AI 탐색은 1회 8ms/틱 누적 예산 16ms에서 제한합니다. 마지막 탐색 1회가 추가될 수 있어 실제 틱 AI 예산은 최대 약 24ms입니다. 미처 처리하지 못한 AI는 다음 틱에서 계속합니다.
- 외부 origin은 allowlist만 허용. 비브라우저 WebSocket 클라이언트는 Origin이 없어도 접속 가능하며 동일 검증/속도 제한 적용.
- HTML 렌더링은 React text escaping을 사용. 닉네임을 innerHTML로 넣지 않음.

## 운영 한계

RAM 상태는 restart/redeploy 시 사라집니다. 무료 단일 프로세스 체험용이며 무중단·다중 서버·대규모 부하를 검증하지 않았습니다. 등록된 한도 자체가 처리량 보장은 아닙니다.

## 새 상태 전이

matching → reveal → dealing → battle ⇄ decision → result → reveal(전원 재대결 동의). decision은 battle 내부 일시정지 상태입니다. 공용 덱 순서와 사용 카드 목록은 서버에만 남습니다. 정산은 result로의 전이에서 단 한 번 적용됩니다. 손패가 없거나 유효한 조합이 없으면 다음 정기 지급을 기다립니다.

레이팅/포인트도 서버 메모리에만 보관합니다. 클라이언트가 보내는 점수/배율/승패/레이팅은 사용하지 않습니다.

## 단일 물리 덱과 정답 유지

DECK_FACES의 34개 고유 그림을 경기 시작에 각 1장만 생성하며 소진 후 재순환하지 않습니다. usedCards에는 사용 확정된 공개 카드만 보내고, 미지급 덱 순서·상대 손패는 보내지 않습니다. Judgment.valid는 문법 판정, accepted는 유효하고 문장 점수가 20 초과인지입니다. accepted일 때만 카드·점수·손패 버전을 변경합니다. submissionId로 Correct 연출의 재실행을 구분하며 서버 요청 ID 중복 방지가 점수 중복 반영을 막습니다.

## Cloudflare 공개 서버

- cloudflare/worker.ts: Origin 검증, Cloudflare IP 기준 접속 제한, 메시지 제한, WebSocket Hibernation과 자동 ping 응답.
- 초기 규모에서는 하나의 BattleArena Durable Object가 모든 방을 직렬 처리해 기존 공용 매칭을 보존합니다. 방마다 별도 인스턴스를 생성하는 구조는 아닙니다. 대규모 확장 시 매칭/방을 분리해야 합니다.
- server/persistence.ts: player/room 레코드 저장. 살아 있는 소켓은 저장하지 않고 WebSocket attachment의 플레이어 ID로 재연결합니다. 토큰과 손패/덱 순서는 서버 저장소에만 있습니다.
- SQLite transactionSync로 변경된 행만 커밋하고, 커밋 후 클라이언트 ACK/상태를 전송합니다. 저장 실패 시 미확정 응답을 버리고 객체를 재시작해 마지막 커밋 상태로 복구합니다.
- 카드 지급·AI·타임아웃·재접속 유예·방 만료 중 다음 시각 하나를 Durable Object Alarm으로 예약합니다. 200ms 상시 폴링이 없으며, 유휴 WebSocket은 Hibernation을 사용합니다.
- 연결 수 1000, 방 500, 세션 2000은 방어 상한이며 검증된 동시 수용 인원이나 무료 운영 보장이 아닙니다. 공개 테스트 규모는 최대 4인입니다.
