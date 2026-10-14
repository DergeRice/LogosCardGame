import {test as base,type Browser} from '@playwright/test';
export * from '@playwright/test';
export const test=base.extend<{autoGuest:boolean}>({
 autoGuest:[true,{option:true}],
 page:async({page,autoGuest},use)=>{if(autoGuest)await page.addInitScript(()=>sessionStorage.setItem('logos-entry','guest'));await use(page);},
});
export async function guestContext(browser:Browser,options?:Parameters<Browser['newContext']>[0]){const context=await browser.newContext(options);await context.addInitScript(()=>sessionStorage.setItem('logos-entry','guest'));return context;}
