using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using System.IO;

public static class LearningSceneTools
{
    [MenuItem("Learning/Create Google Login Settings Asset")]
    public static void CreateGoogleLoginSettingsAsset()
    {
        const string folder = "Assets/Resources";
        const string path = "Assets/Resources/LearningGoogleLoginSettings.asset";

        if (!Directory.Exists(folder))
        {
            Directory.CreateDirectory(folder);
        }

        var existing = AssetDatabase.LoadAssetAtPath<LearningGoogleLoginSettings>(path);
        if (existing != null)
        {
            Selection.activeObject = existing;
            Debug.Log("[LearningSceneTools] LearningGoogleLoginSettings already exists.");
            return;
        }

        var settings = ScriptableObject.CreateInstance<LearningGoogleLoginSettings>();
        AssetDatabase.CreateAsset(settings, path);
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Selection.activeObject = settings;
        Debug.Log("[LearningSceneTools] Created LearningGoogleLoginSettings. Fill webClientId and iosReversedClientId.");
    }

    [MenuItem("Learning/Install Cloud Service In Current Scene")]
    public static void InstallCloudService()
    {
        var existing = Object.FindObjectOfType<LearningCloudService>();
        if (existing != null)
        {
            if (existing.GetComponent<LearningCloudAutoSave>() == null)
            {
                existing.gameObject.AddComponent<LearningCloudAutoSave>();
                EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());
            }

            Selection.activeGameObject = existing.gameObject;
            Debug.Log("[LearningSceneTools] LearningCloudService already exists.");
            return;
        }

        var go = new GameObject("LearningCloudService");
        go.AddComponent<LearningCloudService>();
        go.AddComponent<LearningCloudAutoSave>();

        Selection.activeGameObject = go;
        EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());
        Debug.Log("[LearningSceneTools] Installed LearningCloudService with auto-save. It initializes UGS and signs in anonymously on Start.");
    }

    [MenuItem("Learning/Install Cloud Debug UI In Current Scene")]
    public static void InstallCloudDebugUI()
    {
        var existing = Object.FindObjectOfType<LearningCloudDebugUI>();
        if (existing != null)
        {
            Selection.activeGameObject = existing.gameObject;
            Debug.Log("[LearningSceneTools] LearningCloudDebugUI already exists.");
            return;
        }

        var service = Object.FindObjectOfType<LearningCloudService>();
        if (service == null)
        {
            var serviceGo = new GameObject("LearningCloudService");
            service = serviceGo.AddComponent<LearningCloudService>();
            serviceGo.AddComponent<LearningCloudAutoSave>();
        }

        if (Object.FindObjectOfType<LearningGoogleLoginProvider>() == null)
        {
            var providerGo = new GameObject("LearningGoogleLoginProvider");
            providerGo.AddComponent<LearningGoogleLoginProvider>();
        }

        var go = new GameObject("LearningCloudDebugUI");
        go.AddComponent<LearningCloudDebugUI>();

        Selection.activeGameObject = go;
        EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());
        Debug.Log("[LearningSceneTools] Installed LearningCloudDebugUI. Press Play to test save/load buttons.");
    }

    [MenuItem("Learning/Install Google Login Provider In Current Scene")]
    public static void InstallGoogleLoginProvider()
    {
        var existing = Object.FindObjectOfType<LearningGoogleLoginProvider>();
        if (existing != null)
        {
            Selection.activeGameObject = existing.gameObject;
            Debug.Log("[LearningSceneTools] LearningGoogleLoginProvider already exists.");
            return;
        }

        var service = Object.FindObjectOfType<LearningCloudService>();
        if (service == null)
        {
            var serviceGo = new GameObject("LearningCloudService");
            serviceGo.AddComponent<LearningCloudService>();
            serviceGo.AddComponent<LearningCloudAutoSave>();
        }

        var go = new GameObject("LearningGoogleLoginProvider");
        go.AddComponent<LearningGoogleLoginProvider>();

        Selection.activeGameObject = go;
        EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());
        Debug.Log("[LearningSceneTools] Installed LearningGoogleLoginProvider. Connect your login button to SignInButton().");
    }

    [MenuItem("Learning/Install Practice Test Runner In Current Scene")]
    public static void InstallPracticeTestRunner()
    {
        var existing = Object.FindObjectOfType<LearningPracticeRuntimeUI>();
        if (existing != null)
        {
            Selection.activeGameObject = existing.gameObject;
            Debug.Log("[LearningSceneTools] Practice test runner already exists.");
            return;
        }

        var go = new GameObject("LearningPracticeTestRunner");
        go.AddComponent<LearningRoundController>();
        go.AddComponent<LearningPracticeRuntimeUI>();

        Selection.activeGameObject = go;
        EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());
        Debug.Log("[LearningSceneTools] Installed LearningPracticeTestRunner. Press Play to test Practice Stage 1.");
    }
}
