import {BUILD_VERSION} from '../../src/buildVersion.js';
import {test,expect} from '@playwright/test';
import {DECK_FACES,judgeCards,type RoomView} from '../../shared/rules.js';
function fixture():RoomView{
 const players=Array.from({length:4},(_,i)=>({id:`player-${i}`,name:`게스트 ${1000+i}`,avatar:['pronoun','verb','adjective','count'][i] as 'pronoun'|'verb'|'adjective'|'count',rating:1000,ratingDelta:0,points:0,reward:0,score:i*3,ready:true,connected:true,handCount:5,handPreview:DECK_FACES.slice(i*5,i*5+5).map((c,j)=>({...c,id:`preview-${i}-${j}`})),draftPreview:DECK_FACES.slice(i*5,i*5+1).map((c,j)=>({...c,id:`draft-${i}-${j}`})),playedSentences:[DECK_FACES.slice(i*5,i*5+2).map((c,j)=>({...c,id:`played-${i}-${j}`}))],rematch:false,ai:false}));
 return {code:'123456',phase:'battle',matchId:'landscape-fixture',players,you:players[0].id,hand:DECK_FACES.slice(0,5).map((c,i)=>({...c,id:`landscape-${i}`})),handVersion:1,endsAt:0,stageEndsAt:0,nextDealAt:0,dealSerial:1,deckCount:19,deckTotal:39,usedCards:[],dealIntervalMs:0,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
}

for(const size of [{width:667,height:320},{width:844,height:390},{width:932,height:430}])test('readable mobile cards and unclipped labels '+size.width,async({browser})=>{
 const ctx=await browser.newContext({viewport:size,isMobile:true,hasTouch:true,deviceScaleFactor:3});const page=await ctx.newPage();const room=fixture();room.dealSerial=0;
 room.hand=['pronoun','verb','adjective','be','get3'].map((kind,i)=>({...DECK_FACES.find(c=>c.kind===kind)!,id:'readable-'+i}));
 room.drawVote={id:'readable-vote',approved:[]};room.nextDealAt=Date.now()+40000;room.dealIntervalMs=40000;
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/socket',ws=>{ws.onMessage(raw=>{const m=JSON.parse(String(raw));if(m.type==='hello'){ws.send(JSON.stringify({type:'session',token:'readable',name:'게스트 1000',avatar:'pronoun',rating:1000,points:0}));ws.send(JSON.stringify({type:'state',room}));}else if(m.type==='submit'){room.judgment={...judgeCards(m.cards.map((id:string)=>room.hand.find(c=>c.id===id)!)),accepted:false,submissionId:m.requestId};ws.send(JSON.stringify({type:'ack',requestId:m.requestId}));ws.send(JSON.stringify({type:'state',room}));}})});
 const check=async()=>{const g=await page.evaluate(()=>{const board=document.querySelector('.sentence-area')!.getBoundingClientRect();return{scroll:document.documentElement.scrollHeight,h:innerHeight,images:[...document.querySelectorAll('.sentence-card .illustration')].map(el=>{const r=el.getBoundingClientRect();return{top:r.top,bottom:r.bottom,boardTop:board.top,boardBottom:board.bottom,natural:(el as HTMLImageElement).naturalWidth}}),labels:[...document.querySelectorAll('.sentence-card .card-readable-label')].map(el=>{const r=el.getBoundingClientRect();return{bottom:r.bottom,boardBottom:board.bottom,font:parseFloat(getComputedStyle(el).fontSize),overflow:el.scrollWidth>el.clientWidth+1}})}});expect(g.scroll).toBeLessThanOrEqual(g.h);for(const r of g.images){expect(r.top).toBeGreaterThanOrEqual(r.boardTop);expect(r.bottom).toBeLessThanOrEqual(r.boardBottom);expect(r.natural).toBe(488)}};
 try{
  await page.goto('/');await expect(page.locator('.hand .game-card')).toHaveCount(5,{timeout:45000});await page.evaluate(()=>document.fonts.ready);await expect(page.locator('.character-avatar>img')).toHaveCount(4);
  const card=page.locator('.hand .game-card').first();expect(await card.evaluate(e=>e.clientWidth)).toBeGreaterThanOrEqual(60);expect(await page.getByTestId('my-score').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(19);
  await page.getByRole('button',{name:'손패 펼쳐 보기'}).tap();
  await expect(page.locator('.table-player .mini-hand-preview img')).toHaveCount(0);
  await expect(page.locator('.table-player .mini-hand-preview .status-card-block').first()).toBeVisible();
  const handBox=(await page.locator('.hand-container').boundingBox())!,fieldBox=(await page.locator('.sentence-area').boundingBox())!;expect(handBox.y).toBeGreaterThan(fieldBox.y+fieldBox.height);await expect(page.locator('.build-version')).toHaveText(BUILD_VERSION);
  for(let i=0;i<3;i++)await page.locator('[data-card-id="readable-'+i+'"]').tap();await expect(page.locator('.sentence-card')).toHaveCount(3);await expect(page.locator('.sentence-card>small')).toHaveCount(0);expect(await page.locator('.sentence-card').first().evaluate(e=>e.clientWidth)).toBeGreaterThanOrEqual(size.height<=350?32:48);await check();await page.screenshot({path:'docs/screenshots/mobile-polish-'+size.width+'.png'});
  await expect(page.locator('.field-feedback-wrap .sentence-actions .submit')).toBeVisible();const area=(await page.locator('.sentence-area').boundingBox())!;const actions=(await page.locator('.sentence-actions').boundingBox())!;expect(actions.y).toBeGreaterThanOrEqual(area.y);expect(actions.y+actions.height).toBeLessThanOrEqual(area.y+area.height);await page.getByRole('button',{name:'문장 제출',exact:false}).tap();await expect(page.locator('.score-calculation')).toHaveAttribute('data-phase','complete');await check();await expect(page.getByTestId('sentence-total')).toHaveText('3');await expect(page.getByTestId('my-score')).toHaveText('0');
  await page.getByRole('button',{name:'감정표현 열기'}).tap();const bottom=await page.locator('.emoji-options').evaluate(e=>e.getBoundingClientRect().bottom);expect(bottom).toBeLessThanOrEqual(size.height);expect(errors).toEqual([]);
 }finally{await ctx.close()}
});


