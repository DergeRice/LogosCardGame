using TMPro;
using UnityEngine;

public class LearningLobbyView : MonoBehaviour
{
    [SerializeField] private TMP_Text staminaText;
    [SerializeField] private TMP_Text nextStaminaText;
    [SerializeField] private TMP_Text recommendedText;
    [SerializeField] private TMP_Text practiceStageText;
    [SerializeField] private TMP_Text explorationStageText;
    [SerializeField] private TMP_Text battleDifficultyText;
    [SerializeField] private TMP_Text explorationButtonText;

    private void OnEnable()
    {
        Refresh();
    }

    public void Refresh()
    {
        LearningLobbyState state = LearningLobbyStateBuilder.Build();
        if (staminaText != null) staminaText.text = $"{state.stamina}/{state.maxStamina}";
        if (nextStaminaText != null) nextStaminaText.text = state.nextStaminaText;
        if (recommendedText != null) recommendedText.text = $"추천 학습 Stage {state.todayRecommendedStage} / {state.recommendedTier}";
        if (practiceStageText != null) practiceStageText.text = $"연습 {state.practiceStage}";
        if (explorationStageText != null) explorationStageText.text = $"탐험 {state.explorationStage}";
        if (battleDifficultyText != null) battleDifficultyText.text = $"대전 난이도 {state.battleDifficulty}";
        if (explorationButtonText != null)
        {
            explorationButtonText.text = LearningExplorationRunState.HasActiveRun ? "탐험 계속하기" : "탐험 시작";
        }
    }
}
