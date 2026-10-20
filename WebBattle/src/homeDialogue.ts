/** Common lines stay separate so each character can receive its own lines later. */
export const HOME_COMMON_LINES=[
 '오늘도 재밌게 놀아보자!',
 '영문법이 쏙쏙! 같이 시작해 볼까?',
 '오늘 랭크는 왠지 잘될 것 같아!',
 '오늘 상자에서 좋은 게 뜰지도?',
 '한 판씩 즐기다 보면 실력도 쑥쑥!',
 '빠른 시작으로 가볍게 몸풀기 어때?',
 '연습하기에서 새로운 문장을 만나 보자!',
 '친구랑 함께하면 더 신나는 하루!',
 '마음에 드는 홈 배경으로 기분 전환해 봐!',
 '네가 고른 감정표현이 궁금해!',
 '오늘은 어떤 멋진 문장을 만들까?',
 '틀려도 괜찮아, 다시 해 보면 돼!',
 '어제보다 한 걸음만 더 나아가 보자!',
 '튜토리얼에서 작은 힌트를 찾아볼까?',
 '천천히 생각하면 좋은 문장이 떠올라!',
 '네 속도로 즐기면 그걸로 충분해!',
 '새로운 캐릭터와 인사해 볼까?',
 '프로필을 네 취향대로 꾸며 봐!',
 '방 목록에서 함께 놀 친구를 찾아보자!',
 '오늘도 만나서 반가워!',
 '작은 도전이 큰 자신감이 될 거야!',
 '랭킹에서 지금 내 위치를 확인해 볼까?',
 '별가루로 마음에 드는 치장을 골라 봐!',
 '멋진 한 문장, 우리 함께 만들어 보자!',
 '승패보다 즐겁게 배우는 시간이 소중해!',
 '잠깐 쉬었다 와도 난 여기 있을게!',
 '내가 옆에서 응원할게. 파이팅!',
 '감정표현을 골라 나만의 인사를 해 봐!',
 '오늘의 첫 문장이 벌써 기대돼!',
 '준비됐어? 신나는 한 판을 시작하자!',
] as const;
export const CHARACTER_HOME_LINES:Readonly<Record<string,readonly string[]>>={};
export function pickHomeDialogue(characterId:string,previous?:string,random:()=>number=Math.random){
 const lines=[...HOME_COMMON_LINES,...(CHARACTER_HOME_LINES[characterId]??[])].filter(line=>line!==previous);
 return lines[Math.min(lines.length-1,Math.max(0,Math.floor(random()*lines.length)))];
}
