package com.baragames.logos.nativebridge;

import android.app.Activity;
import android.net.Uri;
import android.webkit.*;
import android.view.*;
import android.widget.FrameLayout;
import com.unity3d.player.UnityPlayer;

/** Only pages served from the fixed Logos HTTPS origin can invoke the bridge. */
public final class LogosWebView {
    private static WebView view;
    private static String receiver;
    private static final String HOST = "logos-card-battle.netlify.app";
    private static boolean allowed(String url) {
        Uri uri = Uri.parse(url == null ? "" : url);
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && (uri.getPort() == -1 || uri.getPort() == 443);
    }
    public static void create(String url, String objectName) {
        Activity activity = UnityPlayer.currentActivity;
        if (!allowed(url)) return;
        receiver = objectName;
        activity.runOnUiThread(() -> {
            if (view != null) return;
            view = new WebView(activity);
            view.getSettings().setUserAgentString(view.getSettings().getUserAgentString() + " LogosUnityWebView/1");
            view.getSettings().setJavaScriptEnabled(true);
            view.getSettings().setDomStorageEnabled(true);
            view.getSettings().setAllowFileAccess(false);
            view.getSettings().setAllowContentAccess(false);
            view.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            view.getSettings().setTextZoom(100);
            view.setWebChromeClient(new WebChromeClient());
            // onJsPrompt supplies the calling frame URL; addJavascriptInterface cannot authenticate frames.
            view.setWebChromeClient(new WebChromeClient() {
                @Override public boolean onJsPrompt(WebView v, String frameUrl, String message, String value, JsPromptResult result) {
                    if (!"LOGOS_NATIVE".equals(message)) return false;
                    if (allowed(frameUrl) && allowed(v.getUrl()) && value != null && value.length() < 32768)
                        UnityPlayer.UnitySendMessage(receiver, "OnNativeRequest", value);
                    result.confirm(""); return true;
                }
            });
            view.setWebViewClient(new WebViewClient() {
                @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                    return !allowed(request.getUrl().toString());
                }
                @Override public void onPageFinished(WebView v, String loaded) {
                    if (allowed(loaded)) UnityPlayer.UnitySendMessage(receiver, "OnWebReady", "");
                }
            });
            activity.addContentView(view, new FrameLayout.LayoutParams(-1, -1));
            view.loadUrl(url);
        });
    }
    public static void evaluate(String script) { UnityPlayer.currentActivity.runOnUiThread(() -> { if (view != null && allowed(view.getUrl())) view.evaluateJavascript(script, null); }); }
    public static void back() { UnityPlayer.currentActivity.runOnUiThread(() -> { if (view != null && view.canGoBack()) view.goBack(); else UnityPlayer.currentActivity.moveTaskToBack(true); }); }
    public static void pause(boolean paused) { UnityPlayer.currentActivity.runOnUiThread(() -> { if (view != null) { if (paused) view.onPause(); else view.onResume(); } }); }
    public static void destroy() { UnityPlayer.currentActivity.runOnUiThread(() -> { if (view != null) { ((ViewGroup)view.getParent()).removeView(view); view.destroy(); view = null; } }); }
}
