using System;

[Serializable]
public class LearningCloudSaveData
{
    public int schemaVersion = 1;
    public int practiceStage = 1;
    public int explorationStage = 1;
    public int battleDifficulty = 1;
    public int staminaCurrent = StaminaManager.MaxStamina;
    public long staminaLastUpdateUtcTicks;
    public bool explorationRunActive;
    public int explorationRunChapter = 1;
    public int explorationRunBlindIndex;
    public int explorationRunBlindRule;
    public int explorationRunCoin;
    public bool explorationRunShopPending;
    public string lastSavedUtc = string.Empty;

    public static LearningCloudSaveData CaptureLocal()
    {
        StaminaManager.Refresh();
        StaminaCloudState stamina = StaminaManager.ExportCloudState();

        return new LearningCloudSaveData
        {
            schemaVersion = 1,
            practiceStage = LearningPlayerProfile.PracticeStage,
            explorationStage = LearningPlayerProfile.ExplorationStage,
            battleDifficulty = LearningPlayerProfile.BattleDifficulty,
            staminaCurrent = stamina.current,
            staminaLastUpdateUtcTicks = stamina.lastUpdateUtcTicks,
            explorationRunActive = LearningExplorationRunState.HasActiveRun,
            explorationRunChapter = LearningExplorationRunState.Chapter,
            explorationRunBlindIndex = LearningExplorationRunState.BlindIndex,
            explorationRunBlindRule = (int)LearningExplorationRunState.BlindRule,
            explorationRunCoin = LearningExplorationRunState.Coin,
            explorationRunShopPending = LearningExplorationRunState.ShopPending,
            lastSavedUtc = DateTime.UtcNow.ToString("o")
        };
    }

    public void ApplyToLocal()
    {
        LearningPlayerProfile.ApplyCloudState(practiceStage, explorationStage, battleDifficulty);
        StaminaManager.ImportCloudState(new StaminaCloudState
        {
            current = staminaCurrent,
            lastUpdateUtcTicks = staminaLastUpdateUtcTicks
        });

        if (explorationRunActive)
        {
            LearningExplorationRunState.Save(
                explorationRunChapter,
                explorationRunBlindIndex,
                (LearningBlindRuleType)explorationRunBlindRule);
            LearningExplorationRunState.SetCoin(explorationRunCoin);
            LearningExplorationRunState.SetShopPending(explorationRunShopPending);
        }
        else
        {
            LearningExplorationRunState.Clear();
        }
    }
}
