using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

public class LearningSceneLoaderRunner : MonoBehaviour
{
    private static LearningSceneLoaderRunner instance;
    private LearningLoadingOverlay overlay;
    private bool loading;

    public static LearningSceneLoaderRunner Instance
    {
        get
        {
            if (instance != null) return instance;
            var go = new GameObject("LearningSceneLoaderRunner");
            instance = go.AddComponent<LearningSceneLoaderRunner>();
            DontDestroyOnLoad(go);
            return instance;
        }
    }

    public void Load(string sceneName)
    {
        if (loading) return;
        if (!Application.CanStreamedLevelBeLoaded(sceneName))
        {
            Debug.LogError($"[LearningSceneLoader] Scene is not enabled in the build: {sceneName}");
            return;
        }
        StartCoroutine(LoadRoutine(sceneName));
    }

    private IEnumerator LoadRoutine(string sceneName)
    {
        loading = true;
        overlay = LearningLoadingOverlay.CreateDefault();
        overlay.SetProgress(0f);

        yield return null;

        AsyncOperation op = SceneManager.LoadSceneAsync(sceneName);
        if (op == null)
        {
            if (overlay != null) Destroy(overlay.gameObject);
            loading = false;
            yield break;
        }
        op.allowSceneActivation = false;

        while (op.progress < 0.9f)
        {
            overlay.SetProgress(op.progress / 0.9f);
            yield return null;
        }

        overlay.SetProgress(1f);
        yield return new WaitForSecondsRealtime(0.12f);
        op.allowSceneActivation = true;

        while (!op.isDone)
        {
            yield return null;
        }

        if (overlay != null) Destroy(overlay.gameObject);
        loading = false;
    }
}
