/// <reference path="../adsetting/unity-native.d.ts" />
import type {AdBox} from '../shared/adRewards.js';

export async function rewardedAdReady(){
 if(window.LogosNative?.platform!=='android')return false;
 try{return Boolean((await window.LogosNative.request('capabilities')).adReady)}catch{return false;}
}
export async function showRewardedAd(box:AdBox,rewardTicket:string){
 if(window.LogosNative?.platform!=='android')throw Error('광고는 Unity Android 앱에서 이용할 수 있어요.');
 const reply=await window.LogosNative.request('rewarded',{box,rewardTicket});
 if(!reply.success||!reply.rewarded||reply.box!==box)throw Error('광고 시청을 완료하지 못했어요.');
}
