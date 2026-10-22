import {diamondPack} from '../shared/store.js';

type Credentials={client_email:string;private_key:string};
type Purchase={purchaseStateContext?:{purchaseState?:string};productLineItem?:Array<{productId?:string;productOfferDetails?:{purchaseOptionId?:string;quantity?:number;consumptionState?:string}}>;purchaseCompletionTime?:string;obfuscatedExternalAccountId?:string};
const base64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const encode=(value:unknown)=>base64url(new TextEncoder().encode(JSON.stringify(value)));

export async function playAccessToken(secret:string):Promise<string>{
 const credentials=JSON.parse(secret) as Credentials;
 if(!credentials.client_email||!credentials.private_key)throw Error('Google Play 검증 계정이 잘못 설정됐어요.');
 const now=Math.floor(Date.now()/1000),header=encode({alg:'RS256',typ:'JWT'}),body=encode({iss:credentials.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const pem=credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
 const der=Uint8Array.from(atob(pem),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const signature=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(`${header}.${body}`)));
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${header}.${body}.${base64url(signature)}`})});
 if(!response.ok)throw Error(`Google Play 인증 실패 (${response.status})`);
 const token=(await response.json() as {access_token?:string}).access_token;
 if(!token)throw Error('Google Play 인증 토큰이 없어요.');
 return token;
}

export async function verifyPlayPurchase(secret:string,productId:string,purchaseToken:string,accountId:string){
 const pack=diamondPack(productId);
 if(!pack||!purchaseToken||purchaseToken.length>4096)throw Error('유효한 상품 또는 구매 토큰이 아니에요.');
 const accessToken=await playAccessToken(secret);
 const packageName='com.baragames.logoscardgame';
 const response=await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/productsv2/tokens/${encodeURIComponent(purchaseToken)}`,{headers:{authorization:`Bearer ${accessToken}`}});
 if(!response.ok)throw Error(response.status===404?'Google Play에서 구매를 찾지 못했어요.':`Google Play 구매 확인 실패 (${response.status})`);
 const purchase=await response.json() as Purchase;
 const expectedAccount=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(accountId))),b=>b.toString(16).padStart(2,'0')).join('');
 const line=purchase.productLineItem;
 if(purchase.purchaseStateContext?.purchaseState!=='PURCHASED'||!purchase.purchaseCompletionTime||purchase.obfuscatedExternalAccountId!==expectedAccount||line?.length!==1||line[0].productId!==productId||line[0].productOfferDetails?.purchaseOptionId!=='standard'||line[0].productOfferDetails?.quantity!==1||line[0].productOfferDetails?.consumptionState!=='CONSUMPTION_STATE_YET_TO_BE_CONSUMED')throw Error('구매 상태, 계정 또는 상품 정보가 일치하지 않아요.');
 return {accessToken,amount:pack.amount};
}

export async function consumePlayPurchase(accessToken:string,productId:string,purchaseToken:string):Promise<void>{
 const url=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.baragames.logoscardgame/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:consume`;
 const response=await fetch(url,{method:'POST',headers:{authorization:`Bearer ${accessToken}`}});
 if(!response.ok)throw Error(`Google Play consume failed (${response.status})`);
}
