using UnityEngine;

public static class AudioSettingsData
{
    private const string MasterKey = "audio.master";
    private const string SfxKey = "audio.sfx";
    private const string BgmKey = "audio.bgm";

    public static float Master
    {
        get => PlayerPrefs.GetFloat(MasterKey, 1f);
        set { PlayerPrefs.SetFloat(MasterKey, Mathf.Clamp01(value)); PlayerPrefs.Save(); }
    }

    public static float Sfx
    {
        get => PlayerPrefs.GetFloat(SfxKey, 1f);
        set { PlayerPrefs.SetFloat(SfxKey, Mathf.Clamp01(value)); PlayerPrefs.Save(); }
    }

    public static float Bgm
    {
        get => PlayerPrefs.GetFloat(BgmKey, 1f);
        set { PlayerPrefs.SetFloat(BgmKey, Mathf.Clamp01(value)); PlayerPrefs.Save(); }
    }
}
