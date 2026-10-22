using System;
using System.Collections.Concurrent;
using System.Collections;
using UnityEngine;
using Unity.Services.LevelPlay;

namespace Logos.Native
{
    [UnityEngine.Scripting.Preserve]
    public sealed class LogosCommerceBridge : MonoBehaviour
    {
        [Serializable] public sealed class Settings { public string gameUrl, levelPlayAppKey, rewardedAdUnitId, rewardedPlacement; public bool commerceEnabled; public bool childDirectedTreatment = true; }
        [Serializable] private sealed class Request { public string id, method, productId, accountHash, box, rewardTicket, clientId, nonce; }
        [Serializable] private sealed class Purchase { public bool success; public string productId, purchaseToken, receipt, transactionId, error; }
        [Serializable] private sealed class Reply { public string id, type = "logos-native-result", error, productId, purchaseToken, receipt, transactionId, box, credential; public bool success, rewarded, purchaseEnabled, adReady; }
        private readonly ConcurrentQueue<Action> dispatch = new ConcurrentQueue<Action>();
        private Settings settings;
        private LevelPlayRewardedAd rewarded;
        private Request activePurchase, activeAd;
        private bool adShowing, earned;
        private void Awake() {
            // The Android WebView is composited over Unity's surface. Capping the
            // surface at 15 Hz also throttles the visible WebView on some devices.
            QualitySettings.vSyncCount = 0;
            Application.targetFrameRate = 60;
            var mainCamera = Camera.main;
            if (mainCamera != null) {
                mainCamera.clearFlags = CameraClearFlags.SolidColor;
                mainCamera.backgroundColor = Color.white;
            }
            RenderSettings.skybox = null;
            gameObject.name = "LogosNativeBridge";
            settings = JsonUtility.FromJson<Settings>(Resources.Load<TextAsset>("LogosNativeSettings").text);
            // Credentials are injected by the release builder, never borrowed from QTlingo.
            if (!string.IsNullOrEmpty(settings.levelPlayAppKey) && !string.IsNullOrEmpty(settings.rewardedAdUnitId)) {
                // Mixed-age app: keep child-directed treatment until an age/parental flow exists.
                LevelPlayPrivacySettings.SetCOPPA(settings.childDirectedTreatment);
                LevelPlay.SetMetaData("is_deviceid_optout", "true");
                LevelPlay.OnInitSuccess += Initialized; LevelPlay.OnInitFailed += InitFailed;
                LevelPlay.Init(settings.levelPlayAppKey);
            }
        }
        public void OpenWeb() {
#if UNITY_ANDROID && !UNITY_EDITOR
            using (var web = new AndroidJavaClass("com.baragames.logos.nativebridge.LogosWebView")) web.CallStatic("create", settings.gameUrl, gameObject.name);
#endif
        }
        private void Update() { while (dispatch.TryDequeue(out var action)) action(); }
        public void OnWebReady(string ignored) {
            var bootstrap = "(function(){if(window.LogosNative)return;var pending=new Map();window.LogosNative={platform:'android',request:function(method,args){var id=crypto.randomUUID();return new Promise(function(resolve,reject){var timeout=method==='rewarded'?600000:(method==='purchase'||method==='googleSignIn')?300000:30000;var timer=setTimeout(function(){pending.delete(id);reject(new Error('Native request timed out'));},timeout);pending.set(id,{resolve:resolve,reject:reject,timer:timer});prompt('LOGOS_NATIVE',JSON.stringify(Object.assign({},args||{},{id:id,method:method})));});}};window.addEventListener('logos-native-result',function(e){var r=e.detail,p=pending.get(r.id);if(!p)return;clearTimeout(p.timer);pending.delete(r.id);r.success?p.resolve(r):p.reject(new Error(r.error||'Native request failed'));});window.dispatchEvent(new Event('logos-native-ready'));})();";
            Evaluate(bootstrap);
        }
        // Called on Unity's main thread by UnitySendMessage.
        public void OnNativeRequest(string payload) {
            Request request;
            try { request = JsonUtility.FromJson<Request>(payload); } catch { return; }
            if (request == null || string.IsNullOrEmpty(request.id) || request.id.Length > 80) return;
            if (request.method == "capabilities") { Send(new Reply { id=request.id, success=true, purchaseEnabled=settings.commerceEnabled, adReady=rewarded != null && rewarded.IsAdReady() }); return; }
            if (request.method == "googleSignIn") {
#if UNITY_ANDROID && !UNITY_EDITOR
                if (string.IsNullOrEmpty(request.clientId) || string.IsNullOrEmpty(request.nonce) || request.clientId.Length > 256 || request.nonce.Length != 64) { Fail(request,"Google 로그인 요청이 잘못됐어요."); return; }
                try { using (var google=new AndroidJavaClass("com.baragames.logos.nativebridge.LogosGoogleSignIn")) google.CallStatic("signIn",request.id,request.clientId,request.nonce,gameObject.name); }
                catch (Exception) { Fail(request,"Google 로그인 화면을 열지 못했어요."); }
#else
                Fail(request,"Android 앱에서 로그인해 주세요.");
#endif
                return;
            }
            if (request.method == "purchase") { if (settings.commerceEnabled) Buy(request); else Fail(request, "결제 서버 설정이 아직 완료되지 않았어요."); return; }
            if (request.method == "rewarded") { ShowAd(request); return; }
            // Consumption is performed server-side after verified durable credit. No client confirm endpoint.
            Fail(request, "지원하지 않는 앱 요청이에요.");
        }
        private static bool ValidProduct(string product) => product == "diamonds_100" || product == "diamonds_300" || product == "diamonds_1000" || product == "diamonds_3000";
        private void Buy(Request request) {
            if (!ValidProduct(request.productId) || string.IsNullOrEmpty(request.accountHash) || request.accountHash.Length != 64 || activePurchase != null) { Fail(request, "상품이나 로그인 정보가 잘못됐거나 다른 결제가 진행 중이에요."); return; }
#if UNITY_ANDROID && !UNITY_EDITOR
            activePurchase=request;
            try { using(var billing=new AndroidJavaClass("com.baragames.logos.nativebridge.LogosGoogleBilling")) billing.CallStatic("purchase",request.productId,request.accountHash,gameObject.name,nameof(OnPurchaseResult)); }
            catch(Exception) { activePurchase=null; Fail(request,"Google Play 결제를 시작하지 못했어요."); }
#else
            Fail(request,"Google Play에서 설치한 Android 앱에서 구매해 주세요.");
#endif
        }
        public void OnPurchaseResult(string json) {
            var request=activePurchase; activePurchase=null; if(request==null)return;
            Purchase purchase;
            try { purchase=JsonUtility.FromJson<Purchase>(json); } catch { Fail(request,"구매 결과를 확인하지 못했어요."); return; }
            if(purchase==null||!purchase.success||purchase.productId!=request.productId||string.IsNullOrEmpty(purchase.purchaseToken)) { Fail(request,purchase?.error??"구매가 완료되지 않았어요."); return; }
            Send(new Reply {id=request.id,success=true,productId=purchase.productId,purchaseToken=purchase.purchaseToken,receipt=purchase.receipt,transactionId=purchase.transactionId});
        }
        public void OnGoogleSignInResult(string json) {
            Reply result;
            try { result=JsonUtility.FromJson<Reply>(json); } catch { return; }
            if(result==null || string.IsNullOrEmpty(result.id) || result.id.Length>80)return;
            Send(result);
        }
        private void Initialized(LevelPlayConfiguration ignored) { Debug.Log("LOGOS_LEVELPLAY_INIT_OK"); dispatch.Enqueue(()=>{
            rewarded=new LevelPlayRewardedAd(settings.rewardedAdUnitId);
            rewarded.OnAdLoaded += _=>dispatch.Enqueue(()=> { Debug.Log("LOGOS_LEVELPLAY_AD_READY"); if(activeAd!=null&&!adShowing) DisplayAd(); });
            rewarded.OnAdLoadFailed += error=>dispatch.Enqueue(()=> { Debug.LogWarning("LOGOS_LEVELPLAY_AD_FAILED: "+error); if(activeAd!=null) FinishAd(false,"광고를 불러오지 못했어요."); });
            rewarded.OnAdRewarded += (info,reward)=>dispatch.Enqueue(()=> { Debug.Log("LOGOS_LEVELPLAY_REWARDED"); earned=true; var request=activeAd;activeAd=null;if(request!=null)Send(new Reply{id=request.id,success=true,rewarded=true,box=request.box}); });
            rewarded.OnAdDisplayFailed += (info,error)=>dispatch.Enqueue(()=>FinishAd(false,"광고를 재생하지 못했어요."));
            rewarded.OnAdClosed += _=>dispatch.Enqueue(()=> { Debug.Log("LOGOS_LEVELPLAY_AD_CLOSED: rewarded="+earned); StartCoroutine(CloseAd()); });
            rewarded.LoadAd();
        }); }
        private void InitFailed(LevelPlayInitError error) { Debug.LogWarning("LOGOS_LEVELPLAY_INIT_FAILED: "+error); dispatch.Enqueue(()=> { if(activeAd!=null) FinishAd(false,"광고를 초기화하지 못했어요."); }); }
        private void ShowAd(Request request) {
            if((request.box!="silver"&&request.box!="gold")||string.IsNullOrEmpty(request.rewardTicket)||request.rewardTicket.Length>128||activeAd!=null||adShowing||rewarded==null) { Fail(request,"광고를 준비하지 못했거나 이미 재생 중이에요."); return; }
            if(!LevelPlay.SetDynamicUserId(request.rewardTicket)) { Fail(request,"광고 보상 요청을 연결하지 못했어요.");return; }
            activeAd=request; earned=false;
            if(rewarded.IsAdReady()) DisplayAd(); else { rewarded.LoadAd(); StartCoroutine(AdTimeout(request.id)); }
        }
        private void DisplayAd() { adShowing=true; rewarded.ShowAd(settings.rewardedPlacement); }
        private IEnumerator AdTimeout(string id) { yield return new WaitForSecondsRealtime(30); if(activeAd?.id==id&&!adShowing) FinishAd(false,"광고 로딩 시간이 초과됐어요."); }
        private IEnumerator CloseAd() { yield return new WaitForSecondsRealtime(.5f); FinishAd(earned,earned?null:"광고를 끝까지 시청해야 해요."); }
        private void FinishAd(bool completed,string error) {
            var request=activeAd; activeAd=null; adShowing=false;
            if(request!=null) Send(new Reply{id=request.id,success=completed,rewarded=completed,box=request.box,error=error});
            rewarded?.LoadAd();
        }
        private void Fail(Request request,string message) => Send(new Reply{id=request.id,error=message});
        private void Send(Reply reply) { var json=JsonUtility.ToJson(reply); Evaluate("window.dispatchEvent(new CustomEvent('logos-native-result',{detail:"+json+"}));"); }
        private void Evaluate(string script) {
#if UNITY_ANDROID && !UNITY_EDITOR
            using(var web=new AndroidJavaClass("com.baragames.logos.nativebridge.LogosWebView")) web.CallStatic("evaluate",script);
#endif
        }
        public void Back() {
#if UNITY_ANDROID && !UNITY_EDITOR
            using(var web=new AndroidJavaClass("com.baragames.logos.nativebridge.LogosWebView")) web.CallStatic("back");
#endif
        }
        private void OnApplicationPause(bool paused) {
#if UNITY_ANDROID && !UNITY_EDITOR
            using(var web=new AndroidJavaClass("com.baragames.logos.nativebridge.LogosWebView")) web.CallStatic("pause",paused);
#endif
        }
        private void OnDestroy() {
            LevelPlay.OnInitSuccess-=Initialized;LevelPlay.OnInitFailed-=InitFailed; rewarded?.DestroyAd();
#if UNITY_ANDROID && !UNITY_EDITOR
            using(var web=new AndroidJavaClass("com.baragames.logos.nativebridge.LogosWebView")) web.CallStatic("destroy");
#endif
        }
    }
}
