const form=document.querySelector('#support-form');
if(form)form.addEventListener('submit',event=>{
 event.preventDefault();const values=new FormData(form),topic=String(values.get('topic')||'게임 이용 문의');
 const body=`[로고스 카드게임 문의]\n문의 유형: ${topic}\n닉네임: ${values.get('nickname')||''}\nUUID: ${values.get('uuid')||''}\n기기 / 운영체제: ${values.get('device')||''}\n발생 시각: \n\n문의 내용:\n${values.get('message')||''}\n\n※ 비밀번호·로그인 토큰은 보내지 마세요.`;
 location.href=`mailto:leesangjin2372@gmail.com?subject=${encodeURIComponent('[로고스 카드게임] '+topic)}&body=${encodeURIComponent(body)}`;
 document.querySelector('#mail-status').textContent='메일 앱에서 내용을 확인한 뒤 전송해 주세요.';
});
