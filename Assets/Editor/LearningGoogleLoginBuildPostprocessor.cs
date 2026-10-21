#if UNITY_IOS
using System.IO;
using UnityEditor;
using UnityEditor.Callbacks;
using UnityEditor.iOS.Xcode;
using UnityEngine;

public static class LearningGoogleLoginBuildPostprocessor
{
    [PostProcessBuild(50)]
    public static void OnPostProcessBuild(BuildTarget target, string pathToBuiltProject)
    {
        if (target != BuildTarget.iOS) return;

        LearningGoogleLoginSettings settings = LoadSettings();
        if (settings == null || string.IsNullOrWhiteSpace(settings.iosReversedClientId))
        {
            Debug.LogWarning("[LearningGoogleLoginBuildPostprocessor] iOS reversed client ID is empty. Google Sign-In URL scheme was not added.");
            return;
        }

        string plistPath = Path.Combine(pathToBuiltProject, "Info.plist");
        var plist = new PlistDocument();
        plist.ReadFromFile(plistPath);

        PlistElementArray urlTypes = plist.root.values.TryGetValue("CFBundleURLTypes", out PlistElement existing)
            ? existing.AsArray()
            : plist.root.CreateArray("CFBundleURLTypes");

        PlistElementDict urlType = urlTypes.AddDict();
        urlType.SetString("CFBundleTypeRole", "Editor");
        PlistElementArray schemes = urlType.CreateArray("CFBundleURLSchemes");
        schemes.AddString(settings.iosReversedClientId.Trim());

        plist.WriteToFile(plistPath);
        Debug.Log("[LearningGoogleLoginBuildPostprocessor] Added Google Sign-In iOS URL scheme.");
    }

    private static LearningGoogleLoginSettings LoadSettings()
    {
        string[] guids = AssetDatabase.FindAssets("t:LearningGoogleLoginSettings");
        if (guids == null || guids.Length == 0) return null;
        string path = AssetDatabase.GUIDToAssetPath(guids[0]);
        return AssetDatabase.LoadAssetAtPath<LearningGoogleLoginSettings>(path);
    }
}
#endif
