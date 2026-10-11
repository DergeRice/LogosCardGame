public enum LearningBlindRuleType
{
    None,
    ShowPosInsteadOfWords,
    ShowSymbolsOnly,
    ShapeBlind,
    NumberBlind,
    OneWordVisibleRestBlank,
}

[System.Serializable]
public class LearningBlindRule
{
    public LearningBlindRuleType ruleType;
    public string displayName;
    public string description;

    public static LearningBlindRule None => new LearningBlindRule
    {
        ruleType = LearningBlindRuleType.None,
        displayName = "일반",
        description = "기본 문장입니다.",
    };
}
