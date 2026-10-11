using UnityEngine;
using UnityEngine.SceneManagement;

public static class LearningLoginAutoBootstrap
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void OnAfterSceneLoad()
    {
        EnsureForActiveScene();
        SceneManager.sceneLoaded += (_, __) => EnsureForActiveScene();
    }

    private static void EnsureForActiveScene()
    {
        if (SceneManager.GetActiveScene().name != LearningSceneNames.Login) return;
        if (Object.FindFirstObjectByType<LearningLoginSceneController>() != null) return;

        var go = new GameObject("LearningLoginSceneController_Auto");
        go.AddComponent<LearningLoginSceneController>();
    }
}
