using TMPro;
using UnityEngine;

public class LearningExplorationTabBridge : MonoBehaviour
{
    [SerializeField] private TMP_Text runInfoText;
    [SerializeField] private TMP_Text continueButtonText;

    private void OnEnable()
    {
        Refresh();
    }

    public void Refresh()
    {
        bool active = LearningExplorationRunState.HasActiveRun;
        if (continueButtonText != null) continueButtonText.text = active ? "계속하기" : "새 탐험 시작";
        if (runInfoText != null)
        {
            runInfoText.text = active
                ? $"Chapter {LearningExplorationRunState.Chapter} / Blind {LearningExplorationRunState.BlindIndex + 1}"
                : "진행 중인 탐험이 없습니다.";
        }
    }

    public void ContinueOrStartRun()
    {
        if (!LearningExplorationRunState.HasActiveRun) LearningExplorationRunState.StartNewRun();
        LearningSceneLoader.LoadExploration();
    }

    public void AbandonAndStartNewRun()
    {
        LearningExplorationRunState.Clear();
        LearningExplorationRunState.StartNewRun();
        Refresh();
    }

    public void AbandonAndStartNewRunThenEnter()
    {
        LearningExplorationRunState.Clear();
        LearningExplorationRunState.StartNewRun();
        LearningSceneLoader.LoadExploration();
    }

    public void SelectCharacter(int characterIndex)
    {
        // Character-specific starting decks will plug in here when character data exists.
        Debug.Log($"[LearningExplorationTabBridge] Character selected: {characterIndex}");
    }
}
