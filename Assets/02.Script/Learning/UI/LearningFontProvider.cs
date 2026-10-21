using TMPro;
using UnityEngine;

#if UNITY_EDITOR
using UnityEditor;
#endif

public static class LearningFontProvider
{
    private const string DefaultFontName = "NanumSquareRoundOTFEB SDF";
    private const string RuntimeResourcePath = "Learning/Fonts/" + DefaultFontName;

#if UNITY_EDITOR
    private const string EditorAssetPath = "Assets/06.Font/" + DefaultFontName + ".asset";
#endif

    private static TMP_FontAsset cachedDefaultFont;

    public static TMP_FontAsset DefaultFont
    {
        get
        {
            if (cachedDefaultFont != null) return cachedDefaultFont;

#if UNITY_EDITOR
            cachedDefaultFont = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(EditorAssetPath);
            if (cachedDefaultFont != null) return cachedDefaultFont;
#endif

            cachedDefaultFont = Resources.Load<TMP_FontAsset>(RuntimeResourcePath);
            if (cachedDefaultFont != null) return cachedDefaultFont;

            TMP_FontAsset[] loadedFonts = Resources.FindObjectsOfTypeAll<TMP_FontAsset>();
            for (int i = 0; i < loadedFonts.Length; i++)
            {
                if (loadedFonts[i] != null && loadedFonts[i].name == DefaultFontName)
                {
                    cachedDefaultFont = loadedFonts[i];
                    return cachedDefaultFont;
                }
            }

            cachedDefaultFont = TMP_Settings.defaultFontAsset;
            return cachedDefaultFont;
        }
    }
}
