import {defaultHubSave,openDemoBox} from '../shared/store.js';
import type {StoreResult} from '../shared/community.js';
// Temporary animation trial. Set false to restore authoritative paid purchases.
export const FREE_BOX_PREVIEW=true;
export function previewBox(box:string,count:number):StoreResult{
 const fixture={...defaultHubSave(),gold:100_000_000,diamonds:100_000_000};
 return {source:'box',box,requestId:'preview:'+crypto.randomUUID(),rewards:openDemoBox(fixture,box,count).rewards};
}
