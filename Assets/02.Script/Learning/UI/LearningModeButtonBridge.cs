using UnityEngine;

public class LearningModeButtonBridge : MonoBehaviour
{
    [SerializeField] private LearningScreenRouter router;
    [SerializeField] private LearningPracticePrefabUI practiceUI;
    [SerializeField] private LearningExplorationController explorationController;
    [SerializeField] private LearningBattleModeController battleController;
    [SerializeField] private bool useSeparatedScenes = true;

    private void Awake()
    {
        if (router == null) router = FindFirstObjectByType<LearningScreenRouter>();
        if (practiceUI == null) practiceUI = FindFirstObjectByType<LearningPracticePrefabUI>();
        if (explorationController == null) explorationController = FindFirstObjectByType<LearningExplorationController>();
        if (battleController == null) battleController = FindFirstObjectByType<LearningBattleModeController>();
    }

    public void GoLobby()
    {
        if (useSeparatedScenes) LearningSceneLoader.LoadLobby();
        else router?.ShowLobby();
    }

    public void StartPractice()
    {
        if (useSeparatedScenes)
        {
            LearningSceneLoader.LoadPractice();
            return;
        }

        router?.ShowPractice();
        practiceUI?.StartPractice(LearningPlayerProfile.PracticeStage);
    }

    public void StartExplorationSmallBlind()
    {
        StartExplorationContinueOrNew();
    }

    public void StartExplorationContinueOrNew()
    {
        if (useSeparatedScenes)
        {
            if (!LearningExplorationRunState.HasActiveRun)
            {
                LearningExplorationRunState.StartNewRun();
            }

            LearningSceneLoader.LoadExploration();
            return;
        }

        router?.ShowExploration();
        if (explorationController != null)
        {
            explorationController.StartOrContinueRun();
        }
    }

    public void StartBattle()
    {
        if (useSeparatedScenes)
        {
            LearningSceneLoader.LoadBattle();
            return;
        }

        router?.ShowBattle();
        battleController?.StartBattle();
    }
}
