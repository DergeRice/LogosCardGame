using System;
using System.Collections.Generic;

public enum LearningModeType
{
    Practice,
    Exploration,
    Battle,
}

public enum LearningTier
{
    Bronze,
    Silver,
    Gold,
    Platinum,
    Diamond,
}

public enum SentencePatternType
{
    Type1 = 1,
    Type2 = 2,
    Type3 = 3,
    Type4 = 4,
    Type5 = 5,
}

public enum LearningCardDisplayMode
{
    Pos,
    Shape,
    Number,
}

public enum LearningShapeType
{
    None,
    Square,
    Triangle,
    Circle,
    Diamond,
}

public enum LearningBattleProblemType
{
    FillBlank,
    SentenceBuild,
}

public enum LearningPosType
{
    PRP,
    PRP_POS,
    NNU,
    NNC,
    PROPN,
    DT_AN,
    DT_THE,
    BE,
    VB,
    DO,
    MODAL,
    JJ,
    RB,
    RB_FREQ,
    RB_NOT,
    IN,
    CC,
    TO_VB,
    WH,
}

[Serializable]
public class LearningSentenceSet
{
    public LearningTier tier;
    public List<LearningSentenceData> sentences = new List<LearningSentenceData>();
}

[Serializable]
public class LearningSentenceData
{
    public string id;
    public LearningTier tier;
    public SentencePatternType patternType;
    public string fullSentence;
    public List<LearningTokenData> tokens = new List<LearningTokenData>();
    public List<LearningBlankData> blanks = new List<LearningBlankData>();
}

[Serializable]
public class LearningTokenData
{
    public string text;
    public LearningPosType pos;
}

[Serializable]
public class LearningBlankData
{
    public int tokenIndex;
    public LearningPosType requiredPos;
}

[Serializable]
public class LearningStageConfigSet
{
    public List<LearningStageConfig> stages = new List<LearningStageConfig>();
}

[Serializable]
public class LearningStageConfig
{
    public int stage;
    public LearningTier tier;
    public int blanksMin;
    public int blanksMax;
    public float aiAnswerSeconds;
    public int staminaCost;
    public int itemSlots;
    public List<PatternProbability> patternProbabilities = new List<PatternProbability>();
}

[Serializable]
public class PatternProbability
{
    public SentencePatternType patternType;
    public int weight;
}

[Serializable]
public class LearningAnswerResult
{
    public bool success;
    public int correctCount;
    public int totalCount;
    public int score;
}
