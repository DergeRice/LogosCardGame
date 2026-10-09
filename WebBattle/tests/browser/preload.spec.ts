import {test,expect} from '@playwright/test';
import {CARD_FACE_URLS} from '../../src/preloadCards.js';

test('all unique card faces load before quick start becomes available',async({page})=>{
 const requested=new Set<string>();
 await page.route('**/cards/*.webp',async route=>{
  requested.add(new URL(route.request().url()).pathname);
  if(route.request().url().endsWith('/cards/rob.webp'))await new Promise(resolve=>setTimeout(resolve,2000));
  await route.continue();
 });
 await page.routeWebSocket('**/socket',route=>{route.onMessage(raw=>{if(JSON.parse(String(raw)).type==='hello')route.send(JSON.stringify({type:'session',token:'preload-fixture',name:'게스트',avatar:'pronoun',rating:1000,points:0}));});});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.card-preload-screen')).toBeVisible();
 await expect(page.getByRole('button',{name:/빠른시작/})).toHaveCount(0);
 await expect(page.getByRole('button',{name:/빠른시작/})).toBeVisible();
 expect(requested).toEqual(new Set(CARD_FACE_URLS));
});
