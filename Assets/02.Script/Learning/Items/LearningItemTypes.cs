using System;

public enum LearningItemUseMode
{
    ExplorationOnly,
    BattleOnly,
    ExplorationAndBattle,
}

public enum LearningItemRarity
{
    B,
    A,
    S,
}

public enum LearningItemEffectType
{
    Custom,
    AddScore,
    MultiplyScore,
    AddTemporaryPosCards,
    RevealOneBlankAnswer,
    RemoveWrongPosCards,
    ExtraTime,
    HealMistake,
    AddCardBonusScore,
    AddDeckPosBonusScore,
    AddPosTriggerScore,
    AddPosTriggerMultiplier,
    AddPatternScore,
    AddPatternMultiplier,
    AddCardToDeck,
    AddRandomCardsToDeck,
    RemoveAllPosCards,
    AddDropCount,
    AddSubmitCount,
    AddShopRerollDiscount,
    AddFreeRerolls,
    AddItemSlots,
    AddNoArticleRule,
    AddDrawAfterDrop,
    AddDrawAfterSubmit,
    RefillHandWhenEmpty,
    AddDropDamagePerCard,
    AddOpeningDecayMultiplier,
    AddBlindDecayMultiplier,
    AddDeckSizeConditionalScore,
    AddDeckSizeConditionalMultiplier,
    AddSpecialCardSet,
    AddGoldenSpecialCard,
    AddPassiveTriggerMultiplier,
    AddConsecutivePatternMultiplier,
    AddDifferentPatternMultiplier,
    FixSubmitCount,
    FixDropCount,
    AddDropDamageFromBonusScore,
    AddDropStackMultiplier,
    AddSubmitStackMultiplier,
    RealizeTemporaryCards,
    AddCardGrowthOnScoreThreshold,
    AddStartingHandSize,
    AddBaseMultiplier
}

[Serializable]
public class LearningItemEffect
{
    public LearningItemEffectType effectType;
    public int intValue;
    public int intValue2;
    public float floatValue;
    public float floatValue2;
    public string target;
    public string condition;
    public string stackDisplay;
    public string stringValue;
}
