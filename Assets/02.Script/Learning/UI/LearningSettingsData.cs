using System;
using UnityEngine;

public static class LearningSettingsData
{
    private const string MasterKey = "learning.settings.masterVolume";
    private const string BgmKey = "learning.settings.bgmVolume";
    private const string SfxKey = "learning.settings.sfxVolume";
    private const string NightPushKey = "learning.settings.nightPush";
    private const string PushKey = "learning.settings.push";
    private const string LanguageKey = "learning.settings.language";
    private const string UuidKey = "learning.settings.uuid";

    public static float MasterVolume { get => PlayerPrefs.GetFloat(MasterKey, 1f); set => SetFloat(MasterKey, value); }
    public static float BgmVolume { get => PlayerPrefs.GetFloat(BgmKey, 1f); set => SetFloat(BgmKey, value); }
    public static float SfxVolume { get => PlayerPrefs.GetFloat(SfxKey, 1f); set => SetFloat(SfxKey, value); }
    public static bool NightPush { get => PlayerPrefs.GetInt(NightPushKey, 0) == 1; set => SetBool(NightPushKey, value); }
    public static bool PushEnabled { get => PlayerPrefs.GetInt(PushKey, 1) == 1; set => SetBool(PushKey, value); }
    public static string Language { get => PlayerPrefs.GetString(LanguageKey, DetectLanguage()); set => SetString(LanguageKey, value); }

    public static string Uuid
    {
        get
        {
            string id = PlayerPrefs.GetString(UuidKey, string.Empty);
            if (!string.IsNullOrEmpty(id)) return id;
            id = Guid.NewGuid().ToString("N");
            PlayerPrefs.SetString(UuidKey, id);
            PlayerPrefs.Save();
            return id;
        }
    }

    private static string DetectLanguage()
    {
        SystemLanguage lang = Application.systemLanguage;
        if (lang == SystemLanguage.Korean) return "ko";
        if (lang == SystemLanguage.Japanese) return "ja";
        if (lang == SystemLanguage.Chinese || lang == SystemLanguage.ChineseSimplified || lang == SystemLanguage.ChineseTraditional) return "zh";
        return "en";
    }

    private static void SetFloat(string key, float value)
    {
        PlayerPrefs.SetFloat(key, Mathf.Clamp01(value));
        PlayerPrefs.Save();
    }

    private static void SetBool(string key, bool value)
    {
        PlayerPrefs.SetInt(key, value ? 1 : 0);
        PlayerPrefs.Save();
    }

    private static void SetString(string key, string value)
    {
        PlayerPrefs.SetString(key, value ?? string.Empty);
        PlayerPrefs.Save();
    }
}
