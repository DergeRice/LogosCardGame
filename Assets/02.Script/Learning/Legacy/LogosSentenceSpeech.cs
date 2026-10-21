using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using UnityEngine;

/// <summary>On-device English narration for the current book sentence.</summary>
public sealed class LogosSentenceSpeech : MonoBehaviour
{
    private string pendingText;
#if UNITY_ANDROID && !UNITY_EDITOR
    private AndroidJavaObject androidTts;
    private AndroidJavaObject englishLocale;
    private volatile bool androidReady;
    private InitListener initListener;

    private sealed class InitListener : AndroidJavaProxy
    {
        private readonly LogosSentenceSpeech owner;
        public InitListener(LogosSentenceSpeech owner) : base("android.speech.tts.TextToSpeech$OnInitListener") { this.owner = owner; }
        public void onInit(int status) { owner.androidReady = status == 0; }
    }
#elif UNITY_IOS && !UNITY_EDITOR
    [DllImport("__Internal")] private static extern void LogosSpeakEnglish(string text);
    [DllImport("__Internal")] private static extern void LogosStopEnglish();
#elif UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX
    private Process macProcess;
    private string textFile;
#endif

    private void Awake()
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        try
        {
            using (AndroidJavaClass player = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            using (AndroidJavaObject activity = player.GetStatic<AndroidJavaObject>("currentActivity"))
            {
                initListener = new InitListener(this);
                androidTts = new AndroidJavaObject("android.speech.tts.TextToSpeech", activity, initListener);
            }
            using (AndroidJavaClass locale = new AndroidJavaClass("java.util.Locale"))
                englishLocale = locale.GetStatic<AndroidJavaObject>("US");
        }
        catch (Exception error) { UnityEngine.Debug.LogWarning("[LogosSentenceSpeech] Android TTS unavailable: " + error.Message); }
#endif
    }

    private void Update()
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        if (androidReady && !string.IsNullOrEmpty(pendingText))
        {
            string text = pendingText;
            pendingText = null;
            SpeakAndroid(text);
        }
#endif
    }

    public void Speak(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return;
        Stop();
#if UNITY_ANDROID && !UNITY_EDITOR
        pendingText = text;
        if (androidReady)
        {
            pendingText = null;
            SpeakAndroid(text);
        }
#elif UNITY_IOS && !UNITY_EDITOR
        LogosSpeakEnglish(text);
#elif UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX
        try
        {
            textFile = Path.Combine(Application.temporaryCachePath, "logos_sentence_to_read.txt");
            File.WriteAllText(textFile, text);
            ProcessStartInfo info = new ProcessStartInfo("/usr/bin/say", "-v Samantha -f \"" + textFile.Replace("\"", "\\\"") + "\"");
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            macProcess = Process.Start(info);
        }
        catch (Exception error) { UnityEngine.Debug.LogWarning("[LogosSentenceSpeech] macOS narration unavailable: " + error.Message); }
#else
        UnityEngine.Debug.LogWarning("[LogosSentenceSpeech] Narration is unavailable on this platform.");
#endif
    }

#if UNITY_ANDROID && !UNITY_EDITOR
    private void SpeakAndroid(string text)
    {
        if (androidTts == null) return;
        try
        {
            androidTts.Call<int>("setLanguage", englishLocale);
            androidTts.Call<int>("setSpeechRate", 0.88f);
            androidTts.Call<int>("speak", text, 0, null, "logos-book-sentence");
        }
        catch (Exception error) { UnityEngine.Debug.LogWarning("[LogosSentenceSpeech] Android narration failed: " + error.Message); }
    }
#endif

    public void Stop()
    {
        pendingText = null;
#if UNITY_ANDROID && !UNITY_EDITOR
        if (androidTts != null) androidTts.Call<int>("stop");
#elif UNITY_IOS && !UNITY_EDITOR
        LogosStopEnglish();
#elif UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX
        try
        {
            if (macProcess != null && !macProcess.HasExited) macProcess.Kill();
            macProcess?.Dispose();
            macProcess = null;
        }
        catch (Exception) { macProcess = null; }
#endif
    }

    private void OnDestroy()
    {
        Stop();
#if UNITY_ANDROID && !UNITY_EDITOR
        if (androidTts != null) { androidTts.Call("shutdown"); androidTts.Dispose(); androidTts = null; }
        englishLocale?.Dispose();
#endif
    }
}
