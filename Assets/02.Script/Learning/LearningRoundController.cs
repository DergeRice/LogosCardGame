using System;
using System.Collections.Generic;
using UnityEngine;

public class LearningRoundController : MonoBehaviour
{
    public LearningModeType modeType = LearningModeType.Practice;
    public int stage = 1;
    public bool saveCloudAfterSubmit = true;
    public LearningCardDisplayMode cardDisplayMode = LearningCardDisplayMode.Pos;
    [SerializeField] private LearningItemEffectExecutor itemEffectExecutor;

    public LearningFillSession Session { get; private set; }
    public LearningStageConfig StageConfig { get; private set; }
    public bool EasyMode { get; private set; }

    public event Action<LearningSentenceData> RoundStarted;
    public event Action<LearningAnswerResult> RoundSubmitted;

    private void Awake()
    {
        if (itemEffectExecutor == null) itemEffectExecutor = GetComponent<LearningItemEffectExecutor>();
    }

    public bool StartRound(LearningModeType mode, int requestedStage)
    {
        modeType = mode;
        stage = Mathf.Clamp(requestedStage, 1, LearningPlayerProfile.MaxStage);

        StageConfig = LearningContentRepository.GetStageConfig(stage);
        if (StageConfig == null) return false;

        LearningSentenceData sentence = LearningContentRepository.PickSentenceForStage(stage);
        if (sentence == null) return false;
        sentence = CloneWithLimitedBlanks(sentence);

        Session = new LearningFillSession(sentence);
        EasyMode = false;
        RoundStarted?.Invoke(sentence);
        return true;
    }

    public void SelectBlank(int blankIndex)
    {
        if (Session == null) return;
        Session.SelectBlank(blankIndex);
    }

    public PlacedWordCard PlaceCard(PlacedWordCard card)
    {
        if (Session == null) return null;
        return Session.PlaceCard(card);
    }

    public LearningAnswerResult Submit()
    {
        if (Session == null) return null;

        LearningAnswerResult result = Session.Submit();
        if (result != null && itemEffectExecutor != null)
        {
            result.score = itemEffectExecutor.ModifyScore(result.score);
            itemEffectExecutor.ResetRoundEffects();
        }

        if (modeType == LearningModeType.Practice)
        {
            LearningPlayerProfile.RecordPracticeResult(stage, result);
            if (result != null && !result.success)
            {
                EasyMode = true;
            }
        }
        else if (modeType == LearningModeType.Exploration)
        {
            LearningPlayerProfile.RecordExplorationResult(stage, result);
        }

        RoundSubmitted?.Invoke(result);
        if (saveCloudAfterSubmit)
        {
            LearningCloudService.Instance.SaveLocalFireAndForget();
        }

        return result;
    }

    public List<PlacedWordCard> BuildPracticeCards()
    {
        return BuildPracticeCards(EasyMode);
    }

    public List<PlacedWordCard> BuildPracticeCards(bool easyMode)
    {
        var cards = new List<PlacedWordCard>();
        if (Session == null || Session.Sentence == null || Session.Sentence.blanks == null)
            return cards;

        for (int i = 0; i < Session.Sentence.blanks.Count; i++)
        {
            var blank = Session.Sentence.blanks[i];
            string word = Session.Sentence.tokens[blank.tokenIndex].text;
            cards.Add(new PlacedWordCard
            {
                word = blank.requiredPos.ToString(),
                wordHint = word,
                pos = blank.requiredPos,
                revealsSpecificWord = easyMode,
                characterId = blank.requiredPos.ToString().ToLowerInvariant(),
                symbolId = blank.requiredPos.ToString().ToLowerInvariant(),
                displayMode = cardDisplayMode,
                numberLabel = LearningCardDisplayUtility.GetNumberLabel(Session.Sentence, blank.tokenIndex),
            });
        }

        AddDecoy(cards, LearningPosType.JJ, "kind", easyMode, cardDisplayMode, "3");
        AddDecoy(cards, LearningPosType.NNC, "story", easyMode, cardDisplayMode, "4");
        AddDecoy(cards, LearningPosType.VB, "make", easyMode, cardDisplayMode, "2");
        AddDecoy(cards, LearningPosType.BE, "is", easyMode, cardDisplayMode, "2");
        Shuffle(cards);
        return cards;
    }

    private static void AddDecoy(List<PlacedWordCard> cards, LearningPosType pos, string word, bool easyMode, LearningCardDisplayMode displayMode, string numberLabel)
    {
        cards.Add(new PlacedWordCard
        {
            word = pos.ToString(),
            wordHint = word,
            pos = pos,
            revealsSpecificWord = easyMode,
            characterId = pos.ToString().ToLowerInvariant(),
            symbolId = pos.ToString().ToLowerInvariant(),
            displayMode = displayMode,
            numberLabel = numberLabel,
        });
    }

    private static void Shuffle<T>(List<T> list)
    {
        for (int i = 0; i < list.Count - 1; i++)
        {
            int j = UnityEngine.Random.Range(i, list.Count);
            T temp = list[i];
            list[i] = list[j];
            list[j] = temp;
        }
    }

    private static LearningSentenceData CloneWithLimitedBlanks(LearningSentenceData source)
    {
        var clone = new LearningSentenceData
        {
            id = source.id,
            tier = source.tier,
            patternType = source.patternType,
            fullSentence = source.fullSentence,
            tokens = source.tokens != null ? new List<LearningTokenData>(source.tokens) : new List<LearningTokenData>(),
            blanks = new List<LearningBlankData>(),
        };

        int tokenCount = source.tokens != null ? source.tokens.Count : 0;
        int maxBlanks = tokenCount <= 5 ? 2 : 3;
        if (source.blanks == null || source.blanks.Count <= maxBlanks)
        {
            if (source.blanks != null) clone.blanks.AddRange(source.blanks);
            return clone;
        }

        var selected = new List<LearningBlankData>(source.blanks);
        Shuffle(selected);
        selected = selected.GetRange(0, maxBlanks);
        selected.Sort((a, b) => a.tokenIndex.CompareTo(b.tokenIndex));
        clone.blanks.AddRange(selected);
        return clone;
    }
}
