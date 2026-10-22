/// <reference path="../adsetting/unity-native.d.ts" />

export function isUnityWebView(){
 return navigator.userAgent.includes('LogosUnityWebView/')||window.LogosNative?.platform==='android';
}
