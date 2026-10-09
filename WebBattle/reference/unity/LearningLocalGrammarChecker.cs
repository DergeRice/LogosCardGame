using System.Collections.Generic;

public class LearningGrammarCheckResult
{
    public bool valid;
    public SentencePatternType patternType;
    public string message;
    public int usedStartIndex;
    public int usedLength;
    public string debugLog;
}

public static class LearningLocalGrammarChecker
{
    private static bool allowBareCountableNounThisCheck;

    public static LearningGrammarCheckResult Check(IReadOnlyList<LearningPosType> sequence)
    {
        var result = new LearningGrammarCheckResult
        {
            valid = false,
            patternType = SentencePatternType.Type1,
            message = "문장 구조가 맞지 않습니다.",
            usedStartIndex = 0,
            usedLength = 0,
        };

        if (sequence == null || sequence.Count < 2)
        {
            result.message = "카드를 2장 이상 올려야 합니다.";
            return result;
        }

        if (sequence.Count > 15)
        {
            result.message = "문장이 너무 깁니다.";
            return result;
        }

        if (TryMatchClause(sequence, 0, sequence.Count, out SentencePatternType pattern))
        {
            result.valid = true;
            result.patternType = pattern;
            result.message = $"{(int)pattern}형식 문장";
            result.usedStartIndex = 0;
            result.usedLength = sequence.Count;
            return result;
        }

        // Simple compound sentence support: Clause CC Clause, Clause CC Clause CC Clause.
        for (int i = 1; i < sequence.Count - 1; i++)
        {
            if (sequence[i] != LearningPosType.CC) continue;
            if (TryMatchClause(sequence, 0, i, out SentencePatternType left) &&
                TryMatchClause(sequence, i + 1, sequence.Count, out _))
            {
                result.valid = true;
                result.patternType = left;
                result.message = "복문/중문";
                result.usedStartIndex = 0;
                result.usedLength = sequence.Count;
                return result;
            }
        }

        return result;
    }

    public static LearningGrammarCheckResult CheckPlayableSegment(IReadOnlyList<LearningPosType> sequence)
    {
        return CheckPlayableSegment(sequence, false);
    }

    public static LearningGrammarCheckResult CheckPlayableSegment(IReadOnlyList<LearningPosType> sequence, bool allowBareCountableNoun)
    {
        var result = new LearningGrammarCheckResult
        {
            valid = false,
            patternType = SentencePatternType.Type1,
            message = "문장으로 인정되는 카드가 없습니다.",
            usedStartIndex = 0,
            usedLength = 0,
        };

        if (sequence == null || sequence.Count == 0)
        {
            result.message = "카드를 1장 이상 올려야 합니다.";
            return result;
        }

        allowBareCountableNounThisCheck = allowBareCountableNoun;
        int maxCount = sequence.Count > 15 ? 15 : sequence.Count;
        var debug = new System.Text.StringBuilder();
        debug.Append("[GrammarCheck] sequence=");
        AppendSequence(debug, sequence, 0, sequence.Count);
        debug.Append($" allowBareCountableNoun={allowBareCountableNoun}");
        for (int length = maxCount; length >= 1; length--)
        {
            for (int start = 0; start + length <= maxCount; start++)
            {
                int end = start + length;
                bool matched = TryMatchPlayableSegment(sequence, start, end, out SentencePatternType pattern, out string label);
                debug.Append(" | segment ");
                AppendSequence(debug, sequence, start, end);
                debug.Append(matched ? $" => OK {label}" : " => fail");
                if (!matched) continue;

                result.valid = true;
                result.patternType = pattern;
                result.usedStartIndex = start;
                result.usedLength = end - start;
                result.message = label;
                result.debugLog = debug.ToString();
                UnityEngine.Debug.Log(result.debugLog);
                allowBareCountableNounThisCheck = false;
                return result;
            }
        }

        allowBareCountableNounThisCheck = false;
        result.debugLog = debug.ToString();
        UnityEngine.Debug.Log(result.debugLog);
        return result;
    }

    private static void AppendSequence(System.Text.StringBuilder builder, IReadOnlyList<LearningPosType> sequence, int start, int end)
    {
        builder.Append("[");
        for (int i = start; i < end; i++)
        {
            if (i > start) builder.Append(" ");
            builder.Append(sequence[i]);
        }
        builder.Append("]");
    }

    private static bool TryMatchPlayableSegment(IReadOnlyList<LearningPosType> seq, int start, int end, out SentencePatternType pattern, out string label)
    {
        pattern = SentencePatternType.Type1;
        label = "1형식 문장";

        if (end - start == 1 && seq[start] == LearningPosType.VB)
        {
            label = "명령문";
            return true;
        }

        if (end - start == 3 &&
            IsStandaloneNP(seq[start]) &&
            seq[start + 1] == LearningPosType.VB &&
            TryParseComplement(seq, start + 2, end, out int stateEnd) &&
            stateEnd == end)
        {
            pattern = SentencePatternType.Type2;
            label = "2형식 문장";
            return true;
        }

        if (end - start == 3 &&
            IsStandaloneNP(seq[start]) &&
            seq[start + 1] == LearningPosType.VB &&
            IsStandaloneNP(seq[start + 2]))
        {
            pattern = SentencePatternType.Type3;
            label = "3형식 문장";
            return true;
        }

        if (TryMatchClause(seq, start, end, out pattern))
        {
            label = $"{(int)pattern}형식 문장";
            return true;
        }

        return false;
    }

    private static bool TryMatchClause(IReadOnlyList<LearningPosType> seq, int start, int end, out SentencePatternType pattern)
    {
        pattern = SentencePatternType.Type1;
        while (start < end && IsAdverb(seq[start])) start++;
        while (end > start && IsAdverb(seq[end - 1])) end--;
        if (end - start < 2) return false;

        if (seq[start] == LearningPosType.WH)
        {
            return TryMatchClause(seq, start + 1, end, out pattern);
        }

        // Questions/auxiliary starts: DO/MODAL/BE + NP + ...
        if (seq[start] == LearningPosType.DO && TryParseNP(seq, start + 1, end, out int doNpEnd))
        {
            int verbIndex = SkipAuxiliaryModifiers(seq, doNpEnd, end);
            if (verbIndex < end && seq[verbIndex] == LearningPosType.VB)
            {
                return MatchAfterVerb(seq, verbIndex + 1, end, out pattern);
            }
        }

        if (seq[start] == LearningPosType.MODAL && TryParseNP(seq, start + 1, end, out int modalNpEnd) && modalNpEnd < end)
        {
            int verbIndex = SkipAuxiliaryModifiers(seq, modalNpEnd, end);
            if (verbIndex < end && seq[verbIndex] == LearningPosType.VB) return MatchAfterVerb(seq, verbIndex + 1, end, out pattern);
            if (verbIndex < end && seq[verbIndex] == LearningPosType.BE) return MatchAfterBe(seq, verbIndex + 1, end, out pattern);
        }

        if (seq[start] == LearningPosType.BE && TryParseNP(seq, start + 1, end, out int beQuestionEnd) && beQuestionEnd == end)
        {
            pattern = SentencePatternType.Type2;
            return true;
        }

        if (!TryParseNP(seq, start, end, out int npEnd) || npEnd >= end) return false;

        if (seq[npEnd] == LearningPosType.BE)
        {
            return MatchAfterBe(seq, npEnd + 1, end, out pattern);
        }

        if (seq[npEnd] == LearningPosType.DO || seq[npEnd] == LearningPosType.MODAL)
        {
            int next = SkipAuxiliaryModifiers(seq, npEnd + 1, end);
            if (next < end && seq[next] == LearningPosType.VB)
            {
                return MatchAfterVerb(seq, next + 1, end, out pattern);
            }
        }

        if (seq[npEnd] == LearningPosType.VB)
        {
            return MatchAfterVerb(seq, npEnd + 1, end, out pattern);
        }

        return false;
    }

    private static bool MatchAfterVerb(IReadOnlyList<LearningPosType> seq, int start, int end, out SentencePatternType pattern)
    {
        pattern = SentencePatternType.Type1;
        start = SkipAdverbs(seq, start, end);
        if (start == end)
        {
            pattern = SentencePatternType.Type1;
            return true;
        }

        if (TryParsePP(seq, start, end, out int verbPpEnd) && SkipAdverbs(seq, verbPpEnd, end) == end)
        {
            pattern = SentencePatternType.Type1;
            return true;
        }

        if (TryParseComplement(seq, start, end, out int stateComplementEnd) && SkipAdverbs(seq, stateComplementEnd, end) == end)
        {
            pattern = SentencePatternType.Type2;
            return true;
        }

        if (TryParseWhObjectClause(seq, start, end, out int whObjectEnd) &&
            SkipAdverbs(seq, whObjectEnd, end) == end)
        {
            pattern = SentencePatternType.Type3;
            return true;
        }

        if (start + 2 < end &&
            seq[start] == LearningPosType.JJ &&
            TryParseNP(seq, start + 1, end, out int adjectiveObjectForComplementEnd) &&
            TryParseComplement(seq, adjectiveObjectForComplementEnd, end, out int adjectiveObjectComplementEnd) &&
            SkipAdverbs(seq, adjectiveObjectComplementEnd, end) == end)
        {
            pattern = SentencePatternType.Type5;
            return true;
        }

        if (start < end && seq[start] == LearningPosType.JJ &&
            TryParseNP(seq, start + 1, end, out int adjectiveObjectEnd) &&
            SkipAdverbs(seq, adjectiveObjectEnd, end) == end)
        {
            pattern = SentencePatternType.Type4;
            return true;
        }

        if (!TryParseNP(seq, start, end, out int obj1End)) return false;
        obj1End = SkipAdverbs(seq, obj1End, end);
        if (obj1End == end)
        {
            pattern = SentencePatternType.Type3;
            return true;
        }

        if (TryParseRelativeClause(seq, obj1End, end, out int relativeEnd) &&
            SkipAdverbs(seq, relativeEnd, end) == end)
        {
            pattern = SentencePatternType.Type3;
            return true;
        }

        if (TryParseNP(seq, obj1End, end, out int obj2End) && SkipAdverbs(seq, obj2End, end) == end)
        {
            pattern = SentencePatternType.Type4;
            return true;
        }

        if (TryParseVerbPhraseComplement(seq, obj1End, end, out int vpCompEnd) && SkipAdverbs(seq, vpCompEnd, end) == end)
        {
            pattern = SentencePatternType.Type5;
            return true;
        }

        if (TryParseComplement(seq, obj1End, end, out int compEnd) && SkipAdverbs(seq, compEnd, end) == end)
        {
            pattern = SentencePatternType.Type5;
            return true;
        }

        if (TryParsePP(seq, obj1End, end, out int ppEnd) && SkipAdverbs(seq, ppEnd, end) == end)
        {
            pattern = SentencePatternType.Type3;
            return true;
        }

        return false;
    }

    private static bool TryParseVerbPhraseComplement(IReadOnlyList<LearningPosType> seq, int start, int end, out int next)
    {
        next = start;
        if (start >= end || seq[start] != LearningPosType.VB) return false;

        if (MatchAfterVerb(seq, start + 1, end, out _))
        {
            next = end;
            return true;
        }

        return false;
    }

    private static bool TryParseWhObjectClause(IReadOnlyList<LearningPosType> seq, int start, int end, out int next)
    {
        next = start;
        if (start >= end || seq[start] != LearningPosType.WH) return false;

        int afterWh = start + 1;
        if (afterWh >= end) return false;

        if (seq[afterWh] == LearningPosType.BE && MatchAfterBe(seq, afterWh + 1, end, out _))
        {
            next = end;
            return true;
        }

        if (seq[afterWh] == LearningPosType.VB && MatchAfterVerb(seq, afterWh + 1, end, out _))
        {
            next = end;
            return true;
        }

        if (seq[afterWh] == LearningPosType.DO || seq[afterWh] == LearningPosType.MODAL)
        {
            if (!TryMatchClause(seq, start, end, out _)) return false;
            next = end;
            return true;
        }

        return false;
    }

    private static bool TryParseRelativeClause(IReadOnlyList<LearningPosType> seq, int start, int end, out int next)
    {
        next = start;
        if (start >= end || seq[start] != LearningPosType.WH) return false;

        int afterWh = start + 1;
        if (afterWh >= end) return false;

        // WH can behave as the subject in short relative clauses: "people who run", "people who are kind".
        if (seq[afterWh] == LearningPosType.VB && MatchAfterVerb(seq, afterWh + 1, end, out _))
        {
            next = end;
            return true;
        }

        if (seq[afterWh] == LearningPosType.BE && MatchAfterBe(seq, afterWh + 1, end, out _))
        {
            next = end;
            return true;
        }

        // Keep supporting ordinary WH-fronted clauses such as "what do I make".
        if (TryMatchClause(seq, start, end, out _))
        {
            next = end;
            return true;
        }

        return false;
    }

    private static bool MatchAfterBe(IReadOnlyList<LearningPosType> seq, int start, int end, out SentencePatternType pattern)
    {
        pattern = SentencePatternType.Type2;
        start = SkipAdverbs(seq, start, end);
        if (start >= end) return false;
        if (seq[start] == LearningPosType.RB_NOT) start = SkipAdverbs(seq, start + 1, end);
        if (TryParseNP(seq, start, end, out int npEnd) && SkipAdverbs(seq, npEnd, end) == end) return true;
        if (TryParseAdjP(seq, start, end, out int adjEnd) && SkipAdverbs(seq, adjEnd, end) == end) return true;
        if (TryParsePP(seq, start, end, out int ppEnd) && SkipAdverbs(seq, ppEnd, end) == end) return true;
        return false;
    }

    private static bool TryParseNP(IReadOnlyList<LearningPosType> seq, int start, int end, out int next)
    {
        if (!TryParseBaseNP(seq, start, end, out next)) return false;

        while (TryParsePP(seq, next, end, out int ppEnd) && ppEnd > next)
        {
            next = ppEnd;
        }

        return true;
    }

    private static bool TryParseBaseNP(IReadOnlyList<LearningPosType> seq, int start, int end, out int next)
    {
        next = start;
        if (start >= end) return false;

        if (IsStandaloneNP(seq[start]) || (allowBareCountableNounThisCheck && seq[start] == LearningPosType.NNC))
        {
            next = start + 1;
            return true;
        }

        if (IsDeterminer(seq[start]) || seq[start] == LearningPosType.PRP_POS)
        {
            int i = start + 1;
            while (i < end && (seq[i] == LearningPosType.JJ || IsAdverb(seq[i]))) i++;
            if (i < end && IsNoun(seq[i]))
            {
                next = i + 1;
                return true;
            }
        }

        if (seq[start] == LearningPosType.JJ)
        {
            int i = start + 1;
            while (i < end && seq[i] == LearningPosType.JJ) i++;
            if (i < end && IsUncountableOrProperNoun(seq[i]))
            {
                next = i + 1;
                return true;
            }
        }

        return false;
    }

    private static bool TryParseAdjP(IReadOnlyList<LearningPosType> seq, int start, int end, out int next)
    {
        next = start;
        while (start < end && IsAdverb(seq[start])) start++;
        if (start < end && seq[start] == LearningPosType.JJ)
        {
            next = start + 1;
            return true;
        }
        return false;
    }

    private static bool TryParseComplement(IReadOnlyList<LearningPosType> seq, int start, int end, out int next)
    {
        if (TryParseAdjP(seq, start, end, out next)) return true;
        if (start + 1 < end && seq[start] == LearningPosType.TO_VB && seq[start + 1] == LearningPosType.VB)
        {
            next = start + 2;
            return true;
        }
        if (start < end && seq[start] == LearningPosType.TO_VB)
        {
            next = start + 1;
            return true;
        }
        if (start < end && (seq[start] == LearningPosType.VB || seq[start] == LearningPosType.MODAL))
        {
            next = start + 1;
            return true;
        }
        return false;
    }

    private static bool TryParsePP(IReadOnlyList<LearningPosType> seq, int start, int end, out int next)
    {
        next = start;
        if (start >= end || seq[start] != LearningPosType.IN) return false;
        return TryParseNP(seq, start + 1, end, out next);
    }

    private static int SkipAdverbs(IReadOnlyList<LearningPosType> seq, int start, int end)
    {
        while (start < end && IsAdverb(seq[start])) start++;
        return start;
    }

    private static int SkipAuxiliaryModifiers(IReadOnlyList<LearningPosType> seq, int start, int end)
    {
        while (start < end && (IsAdverb(seq[start]) || seq[start] == LearningPosType.RB_NOT)) start++;
        return start;
    }

    private static bool IsDeterminer(LearningPosType pos) => pos == LearningPosType.DT_AN || pos == LearningPosType.DT_THE;
    private static bool IsNoun(LearningPosType pos) => pos == LearningPosType.NNU || pos == LearningPosType.NNC || pos == LearningPosType.PROPN;
    private static bool IsUncountableOrProperNoun(LearningPosType pos) => pos == LearningPosType.NNU || pos == LearningPosType.PROPN;
    private static bool IsStandaloneNP(LearningPosType pos) => pos == LearningPosType.PRP || IsUncountableOrProperNoun(pos);
    private static bool IsAdverb(LearningPosType pos) => pos == LearningPosType.RB || pos == LearningPosType.RB_FREQ;
}
