# UI Remaster — 2026-09-08

홈부터 탐험까지 아이보리 배경, 네이비 버튼, 민트 패널과 살구색 강조로 화면을 통일했습니다.

## 적용 범위

- 홈과 하단 5개 탭: 학습, 탐험, 홈, 대전, 내 기록.
- 설정(음량 슬라이더와 값 표시), 출석, 보급 상점 팝업.
- 탐험 보드와 카드, 탐험 상점, 카드 삭제 선택/확정 창.
- 학습 및 배틀 플레이 화면, 덱 보기, 패배 팝업, 로딩 화면.
- 아이템 102개에 서로 다른 SimpleCasual 아이콘 연결. JSON과 TSV의 경로를 일치시켰습니다.
- GUI Pro-SimpleCasual의 프레임, 아이콘, 버튼 프리팹 활용.
- Cartoon FX Remaster의 Sparks Impact를 UIParticle용 Celebration 프리팹으로 구성하여 버튼과 탐험 타격 연출에 연결.

## 동작 수정

- 플레이용 씬을 Build Settings에 포함해 로비/학습/배틀 전환을 복구.
- 존재하지 않는 씬 요청 시 로딩 화면이 계속 남지 않도록 처리.
- 클라우드 서비스 초기화 전 프로필을 열 때 발생하던 인증 접근 오류 방지.
- 카드 삭제는 확정 시 10G 차감. 창 열기/취소는 무료이며 삭제 실패 시 환불.
- 덱 목록은 스크롤 가능하게 구성하고, 예제 카드의 임시 배수 표시는 숨김.

## 검증

Unity CLI 7800 연결로 컴파일 완료(errors=[]). 에디터 Play Mode의 1080×1920 Game View에서 확인했습니다.
홈/탭/팝업, 학습 및 배틀 씬 이동, 탐험 상점과 덱 목록을 확인했습니다.
상점 카드 구매 시 가격만큼 골드 차감 및 덱 추가를 확인했습니다.
카드 삭제 창 열기/취소는 28G 유지, 확정 후 18G와 구매 완료 상태를 확인했습니다.
테스트용 탐험 런 저장 데이터는 테스트 전 값으로 복원했습니다.
최종 확인 구간 콘솔 오류 0건, 변경 코드의 git diff --check 통과.
실기기 빌드, 실제 IAP 결제 및 클라우드 저장 거래는 검증하지 않았습니다.

## 실제 Game View 캡처

- [홈](UIRemaster/home.png)
- [탐험 상점](UIRemaster/shop.png)
- [탐험](UIRemaster/exploration.png)
- [학습](UIRemaster/practice.png)
- [배틀](UIRemaster/battle.png)
- [덱 보기](UIRemaster/deck.png)
- [패배 팝업](UIRemaster/defeat.png)

## 편집 위치

씬: `Assets/01.Scene/2.LobbyScreen.unity`부터 `5.BattleScreen.unity`.
상점은 `Assets/05.Prefabs/UI/ShopPanelPrefab.prefab`과 Resources 사본 모두 반영했습니다.
공통 리소스: `Assets/Resources/Learning/Remaster`, `Assets/Resources/Learning/ItemIcons/Remaster`.
반복 가능한 제작 코드는 `Assets/Editor/LearningVisualRemaster.cs`이며, Tools → Learning → Visual Remaster 메뉴에서 사용할 수 있습니다. 메뉴 실행은 해당 씬의 UI를 다시 작성하므로 수동으로 추가 수정한 뒤에는 코드를 확인하고 실행하세요.
