using System;
using UnityEngine;

/// <summary>Shows the same hosted battle and account login inside the Android app.</summary>
public sealed class LearningWebBattleView : MonoBehaviour
{
    private const string BattleUrl = "https://logos-card-battle.netlify.app/";
    private volatile bool closing;

#if UNITY_ANDROID && !UNITY_EDITOR
    private AndroidJavaObject activity;
    private AndroidJavaObject root;
    private AndroidJavaObject webView;
    private AndroidJavaObject closeButton;
    private CloseListener closeListener;

    private sealed class CloseListener : AndroidJavaProxy
    {
        private readonly Action callback;
        public CloseListener(Action onClick) : base("android.view.View$OnClickListener") => callback = onClick;
        public void onClick(AndroidJavaObject view) => callback();
    }
#endif

    private void Start()
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        using (var unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
        activity.Call("runOnUiThread", new AndroidJavaRunnable(CreateWebView));
#endif
    }

#if UNITY_ANDROID && !UNITY_EDITOR
    private void CreateWebView()
    {
        if (closing || activity == null) return;
        try
        {
            root = activity.Call<AndroidJavaObject>("findViewById", 16908290); // android.R.id.content
            webView = new AndroidJavaObject("android.webkit.WebView", activity);
            using (var settings = webView.Call<AndroidJavaObject>("getSettings"))
            {
                settings.Call("setJavaScriptEnabled", true);
                settings.Call("setDomStorageEnabled", true);
                settings.Call("setAllowFileAccess", false);
                settings.Call("setAllowContentAccess", false);
                settings.Call("setJavaScriptCanOpenWindowsAutomatically", false);
            }
            using (var client = new AndroidJavaObject("android.webkit.WebViewClient"))
                webView.Call("setWebViewClient", client);
            using (var fullScreen = new AndroidJavaObject("android.widget.FrameLayout$LayoutParams", -1, -1))
                root.Call("addView", webView, fullScreen);

            closeButton = new AndroidJavaObject("android.widget.Button", activity);
            closeButton.Call("setText", "닫기");
            closeButton.Call("setContentDescription", "웹 대전 닫고 로비로 돌아가기");
            closeListener = new CloseListener(() => closing = true);
            closeButton.Call("setOnClickListener", closeListener);
            float density = activity.Call<AndroidJavaObject>("getResources")
                .Call<AndroidJavaObject>("getDisplayMetrics").Get<float>("density");
            using (var buttonSize = new AndroidJavaObject("android.widget.FrameLayout$LayoutParams", (int)(68 * density), (int)(48 * density)))
            {
                buttonSize.Set("gravity", 51); // TOP | LEFT
                root.Call("addView", closeButton, buttonSize);
            }
            webView.Call("loadUrl", BattleUrl);
        }
        catch (Exception error)
        {
            Debug.LogError($"[LearningWebBattleView] WebView initialization failed: {error}");
            closing = true;
        }
    }
#endif

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.Escape)) closing = true;
        if (closing) { closing = false; LearningSceneLoader.LoadLobby(); }
    }

    private void OnDestroy()
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        closing = true;
        if (activity == null) return;
        var oldRoot = root;
        var oldWebView = webView;
        var oldCloseButton = closeButton;
        activity.Call("runOnUiThread", new AndroidJavaRunnable(() =>
        {
            if (oldCloseButton != null) oldRoot?.Call("removeView", oldCloseButton);
            if (oldWebView != null)
            {
                oldWebView.Call("stopLoading");
                oldRoot?.Call("removeView", oldWebView);
                oldWebView.Call("destroy");
            }
        }));
#endif
    }

#if UNITY_EDITOR || !UNITY_ANDROID
    private void OnGUI()
    {
        var width = Math.Min(Screen.width - 32, 480);
        var area = new Rect((Screen.width - width) / 2f, (Screen.height - 170) / 2f, width, 170);
        GUILayout.BeginArea(area, GUI.skin.box);
        GUILayout.Label("웹 카드 대전 · Android 빌드에서 WebView로 열립니다.");
        if (GUILayout.Button("브라우저에서 미리 보기", GUILayout.Height(48))) Application.OpenURL(BattleUrl);
        if (GUILayout.Button("로비로 돌아가기", GUILayout.Height(48))) LearningSceneLoader.LoadLobby();
        GUILayout.EndArea();
    }
#endif
}
