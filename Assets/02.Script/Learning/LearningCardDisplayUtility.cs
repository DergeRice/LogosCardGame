using System.Collections.Generic;

public static class LearningCardDisplayUtility
{
    public static string GetPosLabel(LearningPosType pos)
    {
        switch (pos)
        {
            case LearningPosType.PRP: return "대명사";
            case LearningPosType.PRP_POS: return "소유격";
            case LearningPosType.NNU: return "셀없명사";
            case LearningPosType.NNC: return "셀있명사";
            case LearningPosType.PROPN: return "고유명사";
            case LearningPosType.DT_AN: return "a/an";
            case LearningPosType.DT_THE: return "정관사";
            case LearningPosType.BE: return "Be동사";
            case LearningPosType.VB: return "일반동사";
            case LearningPosType.DO: return "Do";
            case LearningPosType.MODAL: return "조동사";
            case LearningPosType.JJ: return "형용사";
            case LearningPosType.RB: return "부사";
            case LearningPosType.RB_FREQ: return "빈도부사";
            case LearningPosType.RB_NOT: return "not";
            case LearningPosType.IN: return "전치사";
            case LearningPosType.CC: return "접속사";
            case LearningPosType.TO_VB: return "to";
            case LearningPosType.WH: return "Wh의문사";
            default: return pos.ToString();
        }
    }

    public static LearningShapeType GetShape(LearningPosType pos)
    {
        if (IsNounLike(pos)) return LearningShapeType.Square;
        if (IsVerbLike(pos)) return LearningShapeType.Triangle;
        if (pos == LearningPosType.JJ) return LearningShapeType.Circle;
        if (IsAdverbLike(pos)) return LearningShapeType.Diamond;
        return LearningShapeType.None;
    }

    public static string GetShapeLabel(LearningPosType pos)
    {
        switch (GetShape(pos))
        {
            case LearningShapeType.Square:
                return "네모";
            case LearningShapeType.Triangle:
                return "세모";
            case LearningShapeType.Circle:
                return "동그라미";
            case LearningShapeType.Diamond:
                return "다이아";
            default:
                return GetPosLabel(pos);
        }
    }

    public static string GetShapeSymbol(LearningPosType pos)
    {
        switch (GetShape(pos))
        {
            case LearningShapeType.Square:
                return "■";
            case LearningShapeType.Triangle:
                return "▲";
            case LearningShapeType.Circle:
                return "●";
            case LearningShapeType.Diamond:
                return "◆";
            default:
                return GetPosLabel(pos);
        }
    }

    public static string GetNumberLabel(LearningSentenceData sentence, int tokenIndex)
    {
        if (sentence == null || sentence.tokens == null || tokenIndex < 0 || tokenIndex >= sentence.tokens.Count)
            return string.Empty;

        LearningPosType pos = sentence.tokens[tokenIndex].pos;
        if (IsAdverbLike(pos)) return "6";

        List<int> verbs = FindVerbIndexes(sentence);
        int mainVerbIndex = verbs.Count > 0 ? verbs[0] : -1;
        if (tokenIndex == mainVerbIndex || IsVerbLike(pos)) return "2";

        if (pos == LearningPosType.JJ)
        {
            if (sentence.patternType == SentencePatternType.Type5 && tokenIndex > mainVerbIndex)
                return "5";
            return "3";
        }

        if (tokenIndex < mainVerbIndex || mainVerbIndex < 0)
            return "1";

        List<int> objectIndexes = FindObjectLikeIndexesAfterVerb(sentence, mainVerbIndex);
        int objectOrder = objectIndexes.IndexOf(tokenIndex);
        if (objectOrder >= 0)
        {
            if (sentence.patternType == SentencePatternType.Type4)
                return objectOrder == 0 ? "4-1" : "4-2";
            return "4";
        }

        if (sentence.patternType == SentencePatternType.Type5 && tokenIndex > mainVerbIndex)
            return "5";

        return IsNounLike(pos) ? "4" : GetPosLabel(pos);
    }

    public static bool IsNounLike(LearningPosType pos)
    {
        return pos == LearningPosType.PRP ||
               pos == LearningPosType.PRP_POS ||
               pos == LearningPosType.NNU ||
               pos == LearningPosType.NNC ||
               pos == LearningPosType.PROPN ||
               pos == LearningPosType.DT_AN ||
               pos == LearningPosType.DT_THE;
    }

    public static bool IsVerbLike(LearningPosType pos)
    {
        return pos == LearningPosType.BE ||
               pos == LearningPosType.VB ||
               pos == LearningPosType.DO ||
               pos == LearningPosType.MODAL ||
               pos == LearningPosType.TO_VB;
    }

    public static bool IsAdverbLike(LearningPosType pos)
    {
        return pos == LearningPosType.RB ||
               pos == LearningPosType.RB_FREQ ||
               pos == LearningPosType.RB_NOT;
    }

    private static List<int> FindVerbIndexes(LearningSentenceData sentence)
    {
        var indexes = new List<int>();
        for (int i = 0; i < sentence.tokens.Count; i++)
        {
            if (IsVerbLike(sentence.tokens[i].pos)) indexes.Add(i);
        }
        return indexes;
    }

    private static List<int> FindObjectLikeIndexesAfterVerb(LearningSentenceData sentence, int mainVerbIndex)
    {
        var indexes = new List<int>();
        for (int i = mainVerbIndex + 1; i < sentence.tokens.Count; i++)
        {
            LearningPosType pos = sentence.tokens[i].pos;
            if (IsNounLike(pos)) indexes.Add(i);
        }
        return indexes;
    }
}
