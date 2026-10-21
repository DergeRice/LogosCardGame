import {Capacitor,registerPlugin} from '@capacitor/core';
import type {DiamondPack} from '../shared/store.js';

type NativePlayBilling={
 purchase(options:{productId:string}):Promise<{productId:string;purchaseToken:string;orderId?:string}>;
 products(options:{productIds:string[]}):Promise<{products:{productId:string;formattedPrice:string}[]}>;
};
const PlayBilling=registerPlugin<NativePlayBilling>('PlayBilling');
export const canUsePlayBilling=()=>Capacitor.getPlatform()==='android'&&Capacitor.isNativePlatform()&&import.meta.env.VITE_PLAY_IAP_ENABLED==='true';
export async function purchaseDiamondPack(pack:DiamondPack){
 if(!canUsePlayBilling())throw Error('Google Play 결제는 출시 준비가 완료된 Android 앱에서만 사용할 수 있어요.');
 const purchase=await PlayBilling.purchase({productId:pack.id});
 if(purchase.productId!==pack.id||!purchase.purchaseToken)throw Error('Google Play 구매 정보를 확인하지 못했어요.');
 return purchase;
}
