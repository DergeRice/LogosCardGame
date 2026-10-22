import {Capacitor,registerPlugin} from '@capacitor/core';
import type {DiamondPack} from '../shared/store.js';

type NativePlayBilling={
 purchase(options:{productId:string}):Promise<{productId:string;purchaseToken:string;orderId?:string}>;
 products(options:{productIds:string[]}):Promise<{products:{productId:string;formattedPrice:string}[]}>;
};
const PlayBilling=registerPlugin<NativePlayBilling>('PlayBilling');
const capacitorBilling=()=>Capacitor.getPlatform()==='android'&&Capacitor.isNativePlatform()&&import.meta.env.VITE_PLAY_IAP_ENABLED==='true';
export const canUsePlayBilling=()=>capacitorBilling()||window.LogosNative?.platform==='android';
export async function playBillingReady(){
 if(capacitorBilling())return true;
 if(window.LogosNative?.platform!=='android')return false;
 try{return (await window.LogosNative.request('capabilities')).purchaseEnabled===true}catch{return false}
}
export async function purchaseDiamondPack(pack:DiamondPack,accountId:string){
 if(!canUsePlayBilling())throw Error('Google Play 결제는 출시 준비가 완료된 Android 앱에서만 사용할 수 있어요.');
 if(!accountId)throw Error('구매 전 Google 계정으로 로그인해 주세요.');
 const accountHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(accountId))),b=>b.toString(16).padStart(2,'0')).join('');
 const purchase=window.LogosNative?.platform==='android'
  ? await window.LogosNative.request('purchase',{productId:pack.id,accountHash})
  : await PlayBilling.purchase({productId:pack.id});
 if(purchase.productId!==pack.id||!purchase.purchaseToken)throw Error('Google Play 구매 정보를 확인하지 못했어요.');
 return {...purchase,orderId:'transactionId' in purchase?purchase.transactionId:purchase.orderId};
}
