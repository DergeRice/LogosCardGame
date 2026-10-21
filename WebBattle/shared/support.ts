export const SUPPORT_EMAIL='leesangjin2372@gmail.com';
export function supportMail({name='',uuid='',version='',topic='게임 이용 문의',message=''}:{name?:string;uuid?:string;version?:string;topic?:string;message?:string}={}){
 const body=`[로고스 카드게임 문의]\n문의 유형: ${topic}\n닉네임: ${name}\nUUID: ${uuid}\n게임 버전: ${version}\n기기 / 운영체제: \n발생 시각: \n\n문의 내용:\n${message}\n\n※ 비밀번호·로그인 토큰은 보내지 마세요.`;
 return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('[로고스 카드게임] '+topic)}&body=${encodeURIComponent(body)}`;
}
