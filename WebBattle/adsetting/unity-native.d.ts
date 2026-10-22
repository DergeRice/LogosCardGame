/** Runtime injected by the dedicated Unity WebView scene; absent in browsers/Capacitor. */
export {};
declare global {
 interface Window {
  LogosNative?: {
   platform:'android';
   request(method:'capabilities'):Promise<{success:true;purchaseEnabled:boolean;adReady:boolean}>;
   request(method:'purchase',args:{productId:'diamonds_100'|'diamonds_300'|'diamonds_1000'|'diamonds_3000';accountHash:string}):Promise<{success:true;productId:string;purchaseToken:string;receipt:string;transactionId:string}>;
   request(method:'rewarded',args:{box:'silver'|'gold';rewardTicket:string}):Promise<{success:true;rewarded:true;box:'silver'|'gold'}>;
  };
 }
}
