using System;
using UnityEngine;

public static class LearningPlayerProfile
{
    public const int MaxStage = 30;

    private const string PracticeStageKey = "learning.practice.stage";
    private const string ExplorationStageKey = "learning.exploration.stage";
    private const string BattleDifficultyKey = "learning.battle.difficulty";
    private const string PracticeProblemTypeKey = "learning.practice.problemType";
    private const string BattleProblemTypeKey = "learning.battle.problemType";
    private const string TodayKey = "learning.today.key";
    private const string TodayRecommendedStageKey = "learning.today.stage";

    public static int PracticeStage
    {
        get => Mathf.Clamp(PlayerPrefs.GetInt(PracticeStageKey, 1), 1, MaxStage);
        set { PlayerPrefs.SetInt(PracticeStageKey, Mathf.Clamp(value, 1, MaxStage)); PlayerPrefs.Save(); }
    }

    public static int ExplorationStage
    {
        get => Mathf.Clamp(PlayerPrefs.GetInt(ExplorationStageKey, 1), 1, MaxStage);
        set { PlayerPrefs.SetInt(ExplorationStageKey, Mathf.Clamp(value, 1, MaxStage)); PlayerPrefs.Save(); }
    }

    public static int BattleDifficulty
    {
        get => Mathf.Clamp(PlayerPrefs.GetInt(BattleDifficultyKey, 1), 1, MaxStage);
        set { PlayerPrefs.SetInt(BattleDifficultyKey, Mathf.Clamp(value, 1, MaxStage)); PlayerPrefs.Save(); }
    }

    public static LearningStudyProblemType PracticeProblemType
    {
        get => (LearningStudyProblemType)Mathf.Clamp(PlayerPrefs.GetInt(PracticeProblemTypeKey, (int)LearningStudyProblemType.PartOfSpeech), 0, 2);
        set { PlayerPrefs.SetInt(PracticeProblemTypeKey, Mathf.Clamp((int)value, 0, 2)); PlayerPrefs.Save(); }
    }

    public static LearningBattleProblemType BattleProblemType
    {
        get => (LearningBattleProblemType)Mathf.Clamp(PlayerPrefs.GetInt(BattleProblemTypeKey, (int)LearningBattleProblemType.SentenceBuild), 0, 1);
        set { PlayerPrefs.SetInt(BattleProblemTypeKey, Mathf.Clamp((int)value, 0, 1)); PlayerPrefs.Save(); }
    }

    public static int TodayRecommendedStage
    {
        get
        {
            string today = DateTime.Now.ToString("yyyyMMdd");
            string stored = PlayerPrefs.GetString(TodayKey, string.Empty);
            if (stored == today)
            {
                return Mathf.Clamp(PlayerPrefs.GetInt(TodayRecommendedStageKey, 1), 1, MaxStage);
            }

            int stage = Mathf.Clamp(PracticeStage, 1, MaxStage);
            PlayerPrefs.SetString(TodayKey, today);
            PlayerPrefs.SetInt(TodayRecommendedStageKey, stage);
            PlayerPrefs.Save();
            return stage;
        }
    }

    public static void ApplyCloudState(int practiceStage, int explorationStage, int battleDifficulty)
    {
        PlayerPrefs.SetInt(PracticeStageKey, Mathf.Clamp(practiceStage, 1, MaxStage));
        PlayerPrefs.SetInt(ExplorationStageKey, Mathf.Clamp(explorationStage, 1, MaxStage));
        PlayerPrefs.SetInt(BattleDifficultyKey, Mathf.Clamp(battleDifficulty, 1, MaxStage));
        PlayerPrefs.Save();
    }

    public static void RecordPracticeResult(int stage, LearningAnswerResult result)
    {
        if (result != null && result.success && stage >= PracticeStage)
        {
            PracticeStage = Mathf.Min(MaxStage, stage + 1);
        }
    }

    public static void RecordExplorationResult(int stage, LearningAnswerResult result)
    {
        if (result != null && result.success && stage >= ExplorationStage)
        {
            ExplorationStage = Mathf.Min(MaxStage, stage + 1);
        }
    }

    public static void RecordBattleResult(int difficulty, bool won)
    {
        if (won && difficulty >= BattleDifficulty)
        {
            BattleDifficulty = Mathf.Min(MaxStage, difficulty + 1);
        }
    }
}
