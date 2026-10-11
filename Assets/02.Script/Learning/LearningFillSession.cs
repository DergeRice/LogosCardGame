using System.Collections.Generic;
using UnityEngine;

public sealed class LearningFillSession
{
    public LearningSentenceData Sentence { get; private set; }
    public int SelectedBlankIndex { get; private set; }

    private readonly List<PlacedWordCard> _placed = new List<PlacedWordCard>();

    public IReadOnlyList<PlacedWordCard> PlacedCards => _placed;

    public LearningFillSession(LearningSentenceData sentence)
    {
        Sentence = sentence;
        SelectedBlankIndex = 0;

        int count = sentence != null && sentence.blanks != null ? sentence.blanks.Count : 0;
        for (int i = 0; i < count; i++)
        {
            _placed.Add(null);
        }
    }

    public void SelectBlank(int blankIndex)
    {
        if (blankIndex < 0 || blankIndex >= _placed.Count) return;
        SelectedBlankIndex = blankIndex;
    }

    public PlacedWordCard PlaceCard(PlacedWordCard card)
    {
        if (card == null) return null;
        if (SelectedBlankIndex < 0 || SelectedBlankIndex >= _placed.Count) return null;

        PlacedWordCard previous = _placed[SelectedBlankIndex];
        _placed[SelectedBlankIndex] = card;

        SelectNextEmptyOrStay();
        return previous;
    }

    public LearningAnswerResult Submit()
    {
        var result = new LearningAnswerResult();
        result.totalCount = _placed.Count;

        if (Sentence == null || Sentence.blanks == null)
            return result;

        for (int i = 0; i < Sentence.blanks.Count && i < _placed.Count; i++)
        {
            var blank = Sentence.blanks[i];
            var card = _placed[i];
            if (card != null && card.pos == blank.requiredPos)
            {
                result.correctCount += 1;
            }
        }

        if (AllFilled() && IsGrammarValidWithPlacedCards())
        {
            result.correctCount = result.totalCount;
        }

        result.success = result.correctCount == result.totalCount && result.totalCount > 0;
        result.score = ComputeScore(result.correctCount, result.totalCount);
        return result;
    }

    private bool AllFilled()
    {
        for (int i = 0; i < _placed.Count; i++)
        {
            if (_placed[i] == null) return false;
        }
        return _placed.Count > 0;
    }

    private bool IsGrammarValidWithPlacedCards()
    {
        if (Sentence == null || Sentence.tokens == null || Sentence.blanks == null) return false;

        var sequence = new List<LearningPosType>();
        for (int tokenIndex = 0; tokenIndex < Sentence.tokens.Count; tokenIndex++)
        {
            LearningPosType pos = Sentence.tokens[tokenIndex].pos;
            for (int blankIndex = 0; blankIndex < Sentence.blanks.Count && blankIndex < _placed.Count; blankIndex++)
            {
                if (Sentence.blanks[blankIndex].tokenIndex == tokenIndex && _placed[blankIndex] != null)
                {
                    pos = _placed[blankIndex].pos;
                    break;
                }
            }
            sequence.Add(pos);
        }

        return LearningLocalGrammarChecker.Check(sequence).valid;
    }

    private void SelectNextEmptyOrStay()
    {
        for (int i = SelectedBlankIndex + 1; i < _placed.Count; i++)
        {
            if (_placed[i] == null)
            {
                SelectedBlankIndex = i;
                return;
            }
        }

        for (int i = 0; i < _placed.Count; i++)
        {
            if (_placed[i] == null)
            {
                SelectedBlankIndex = i;
                return;
            }
        }
    }

    private static int ComputeScore(int correct, int total)
    {
        if (total <= 0) return 0;
        return correct;
    }
}

[System.Serializable]
public class PlacedWordCard
{
    public string word;
    public string wordHint;
    public LearningPosType pos;
    public string characterId;
    public string symbolId;
    public bool revealsSpecificWord;
    public LearningCardDisplayMode displayMode;
    public string numberLabel;

    public string DisplayText => revealsSpecificWord && !string.IsNullOrWhiteSpace(wordHint)
        ? $"{ModeLabel}\n{wordHint}"
        : ModeLabel;

    public string ModeLabel
    {
        get
        {
            switch (displayMode)
            {
                case LearningCardDisplayMode.Shape:
                    return LearningCardDisplayUtility.GetShapeSymbol(pos);
                case LearningCardDisplayMode.Number:
                    return !string.IsNullOrWhiteSpace(numberLabel) ? numberLabel : "?";
                default:
                    return PosLabel;
            }
        }
    }

    public string PosLabel
    {
        get
        {
            return LearningCardDisplayUtility.GetPosLabel(pos);
        }
    }
}
