using System;

[Serializable]
public class LearningLobbyState
{
    public int stamina;
    public int maxStamina;
    public string nextStaminaText;
    public int todayRecommendedStage;
    public int practiceStage;
    public int explorationStage;
    public int battleDifficulty;
    public LearningTier recommendedTier;
}

public static class LearningLobbyStateBuilder
{
    public static LearningLobbyState Build()
    {
        int recommended = LearningPlayerProfile.TodayRecommendedStage;
        LearningStageConfig config = LearningContentRepository.GetStageConfig(recommended);

        return new LearningLobbyState
        {
            stamina = StaminaManager.Current,
            maxStamina = StaminaManager.MaxStamina,
            nextStaminaText = FormatTime(StaminaManager.TimeUntilNext()),
            todayRecommendedStage = recommended,
            practiceStage = LearningPlayerProfile.PracticeStage,
            explorationStage = LearningPlayerProfile.ExplorationStage,
            battleDifficulty = LearningPlayerProfile.BattleDifficulty,
            recommendedTier = config != null ? config.tier : LearningTier.Bronze,
        };
    }

    private static string FormatTime(TimeSpan span)
    {
        if (span <= TimeSpan.Zero) return "FULL";
        return $"{(int)span.TotalHours:00}:{span.Minutes:00}";
    }
}

