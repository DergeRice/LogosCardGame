using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

public class LearningLobbyAutoBinder : MonoBehaviour
{
    [SerializeField] private bool bindOnStart = true;

    private void Start()
    {
        if (bindOnStart) Bind();
    }

    public void Bind()
    {
        LearningLobbyQuickStartButton[] quickButtons = FindObjectsByType<LearningLobbyQuickStartButton>(FindObjectsInactive.Include, FindObjectsSortMode.None);
        for (int i = 0; i < quickButtons.Length; i++)
        {
            BindQuickStart(quickButtons[i]);
        }
    }

    private void BindQuickStart(LearningLobbyQuickStartButton quickStart)
    {
        if (quickStart == null) return;
        if (quickStart.GetComponent<LearningLobbyTabButton>() != null)
        {
            Debug.LogWarning($"[LearningLobbyAutoBinder] Ignored quick-start marker on tab button: {quickStart.name}");
            return;
        }

        Button button = quickStart.GetComponent<Button>();
        if (button == null) button = quickStart.GetComponentInChildren<Button>(true);
        if (button == null) return;
        if (button.GetComponent<LearningLobbyTabButton>() != null)
        {
            Debug.LogWarning($"[LearningLobbyAutoBinder] Ignored tab button quick-start binding: {button.name}");
            return;
        }

        LearningActionButton actionButton = button.GetComponent<LearningActionButton>();
        if (actionButton == null) actionButton = button.gameObject.AddComponent<LearningActionButton>();

        switch (quickStart.QuickStartType)
        {
            case LearningLobbyQuickStartType.Practice:
                actionButton.Configure(LearningActionType.StartStudyFromSettings);
                break;
            case LearningLobbyQuickStartType.Exploration:
                actionButton.Configure(LearningActionType.ExplorationContinueOrStart);
                break;
            case LearningLobbyQuickStartType.Battle:
                actionButton.Configure(LearningActionType.BattleQuickAI);
                break;
        }
    }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void InstallForLobbyOnLoad()
    {
        TryInstall();
        SceneManager.sceneLoaded += (_, __) => TryInstall();
    }

    private static void TryInstall()
    {
        if (SceneManager.GetActiveScene().name != LearningSceneNames.Lobby) return;
        if (FindFirstObjectByType<LearningLobbyAutoBinder>() != null) return;

        var go = new GameObject("LearningLobbyAutoBinder_Auto");
        go.AddComponent<LearningLobbyAutoBinder>();
        // The action dispatcher looks this bridge up globally. Installing it alongside
        // the runtime lobby binder keeps IAP reachable even before the scene is manually
        // wired in the Editor.
        if (FindFirstObjectByType<LearningIapShopBridge>() == null) go.AddComponent<LearningIapShopBridge>();
    }
}
