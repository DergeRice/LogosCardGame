#if UNITY_EDITOR
using System;
using System.IO;
using System.Reflection;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

[InitializeOnLoad]
public sealed class LearningAndroidInputHandlingGuard : IPreprocessBuildWithReport
{
    private const int OldInputManagerValue = 0;
    private const string ProjectSettingsInputPattern = @"activeInputHandler:\s*\d+";
    private const string ProjectSettingsOldInputLine = "activeInputHandler: 0";

    public int callbackOrder => -10000;

    static LearningAndroidInputHandlingGuard()
    {
        EditorApplication.delayCall += EnforceForCurrentAndroidTarget;
    }

    [MenuItem("Tools/Learning/Fix Android Input Handling")]
    public static void FixAndroidInputHandlingFromMenu()
    {
        TrySetOldInputManager(out string message);
        DebugLog(message);
    }

    public void OnPreprocessBuild(BuildReport report)
    {
        if (report.summary.platform != BuildTarget.Android)
        {
            return;
        }

        InputGuardResult result = TrySetOldInputManager(out string message);
        if (result != InputGuardResult.AlreadyOld)
        {
            DebugLog(message);
        }
    }

    private static void EnforceForCurrentAndroidTarget()
    {
        if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.Android)
        {
            return;
        }

        InputGuardResult result = TrySetOldInputManager(out string message);
        if (result != InputGuardResult.AlreadyOld)
        {
            DebugLog(message);
        }
    }

    private static InputGuardResult TrySetOldInputManager(out string message)
    {
        PropertyInfo property = typeof(PlayerSettings).GetProperty(
            "activeInputHandling",
            BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);

        if (property != null && property.CanRead && property.CanWrite)
        {
            object currentValue = property.GetValue(null);
            int currentInt = Convert.ToInt32(currentValue);
            if (currentInt == OldInputManagerValue)
            {
                message = "Android Active Input Handling already Input Manager (Old).";
                return InputGuardResult.AlreadyOld;
            }

            object oldInputValue = property.PropertyType.IsEnum
                ? Enum.ToObject(property.PropertyType, OldInputManagerValue)
                : Convert.ChangeType(OldInputManagerValue, property.PropertyType);
            property.SetValue(null, oldInputValue);

            AssetDatabase.SaveAssets();
            message = $"Android Active Input Handling fixed: {currentValue} -> Input Manager (Old).";
            return InputGuardResult.Changed;
        }

        return TrySetProjectSettingsFile(out message);
    }

    private static InputGuardResult TrySetProjectSettingsFile(out string message)
    {
        string projectRoot = Directory.GetParent(Application.dataPath)?.FullName;
        if (string.IsNullOrEmpty(projectRoot))
        {
            message = "Project root를 찾지 못했습니다. Project Settings에서 수동으로 Input Manager (Old)를 선택하세요.";
            return InputGuardResult.Failed;
        }

        string projectSettingsPath = Path.Combine(projectRoot, "ProjectSettings", "ProjectSettings.asset");
        if (!File.Exists(projectSettingsPath))
        {
            message = $"ProjectSettings.asset를 찾지 못했습니다: {projectSettingsPath}";
            return InputGuardResult.Failed;
        }

        string text = File.ReadAllText(projectSettingsPath);
        var regex = new Regex(ProjectSettingsInputPattern);
        Match match = regex.Match(text);
        if (!match.Success)
        {
            message = "ProjectSettings.asset 안에서 activeInputHandler 값을 찾지 못했습니다.";
            return InputGuardResult.Failed;
        }

        if (match.Value.Trim() == ProjectSettingsOldInputLine)
        {
            message = "Android Active Input Handling already Input Manager (Old).";
            return InputGuardResult.AlreadyOld;
        }

        text = regex.Replace(text, ProjectSettingsOldInputLine, 1);
        File.WriteAllText(projectSettingsPath, text);
        AssetDatabase.Refresh();
        message = $"Android Active Input Handling fixed in ProjectSettings.asset: {match.Value.Trim()} -> {ProjectSettingsOldInputLine}.";
        return InputGuardResult.Changed;
    }

    private static void DebugLog(string message)
    {
        UnityEngine.Debug.Log($"[LearningAndroidInputHandlingGuard] {message}");
    }

    private enum InputGuardResult
    {
        AlreadyOld,
        Changed,
        Failed
    }
}
#endif
