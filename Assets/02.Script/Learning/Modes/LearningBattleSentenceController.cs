using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class LearningBattleSentenceController : MonoBehaviour
{
    [SerializeField] private int handSize = 7;
    [SerializeField] private int winScoreGap = 10;
    [SerializeField] private LearningItemEffectExecutor itemEffectExecutor;

    public LearningRunDeckState Deck { get; private set; }
    public List<LearningDeckCard> SentenceCards { get; } = new List<LearningDeckCard>();
    public int PlayerScore { get; private set; }
    public int AiScore { get; private set; }
    public bool IsRunning { get; private set; }
    public int Difficulty { get; private set; } = 1;

    public event System.Action StateChanged;
    public event System.Action<string> MessageRaised;

    private Coroutine aiRoutine;
    private readonly HashSet<int> scoringCardIndexes = new HashSet<int>();

    private void Awake()
    {
        if (itemEffectExecutor == null) itemEffectExecutor = GetComponent<LearningItemEffectExecutor>();
    }

    private void Start()
    {
        StartBattle(LearningPlayerProfile.BattleDifficulty);
    }

    public void StartBattle(int difficulty)
    {
        StopBattle(recordResult: false);
        Difficulty = Mathf.Clamp(difficulty, 1, LearningPlayerProfile.MaxStage);
        PlayerScore = 0;
        AiScore = 0;
        SentenceCards.Clear();
        scoringCardIndexes.Clear();
        Deck = LearningDeckRepository.CreateRunDeckFromTemplate(LearningDeckRepository.GetNaroStartingDeck(), handSize);
        IsRunning = true;
        aiRoutine = StartCoroutine(AiRoutine());
        StateChanged?.Invoke();
        MessageRaised?.Invoke("문장 제작 대전 시작");
    }

    public void PlayHandCard(int handIndex)
    {
        if (!IsRunning || Deck == null) return;
        if (handIndex < 0 || handIndex >= Deck.hand.Count) return;

        LearningDeckCard card = Deck.hand[handIndex];
        if (TryUseDrawCard(handIndex, card)) return;

        Deck.hand.RemoveAt(handIndex);
        SentenceCards.Add(card);
        LearningFeedback.CardPlay();
        StateChanged?.Invoke();
    }

    public void ReturnSentenceCard(int sentenceIndex)
    {
        if (!IsRunning || Deck == null) return;
        if (sentenceIndex < 0 || sentenceIndex >= SentenceCards.Count) return;

        LearningDeckCard card = SentenceCards[sentenceIndex];
        SentenceCards.RemoveAt(sentenceIndex);
        Deck.hand.Add(card);
        LearningFeedback.CardReturn();
        StateChanged?.Invoke();
    }

    public void MoveSentenceCard(int fromIndex, int toIndex)
    {
        if (!IsRunning) return;
        if (fromIndex < 0 || fromIndex >= SentenceCards.Count) return;
        toIndex = Mathf.Clamp(toIndex, 0, SentenceCards.Count - 1);
        if (fromIndex == toIndex) return;

        LearningDeckCard card = SentenceCards[fromIndex];
        SentenceCards.RemoveAt(fromIndex);
        SentenceCards.Insert(toIndex, card);
        LearningFeedback.CardReorder();
        StateChanged?.Invoke();
    }

    public void SubmitSentence()
    {
        if (!IsRunning || Deck == null) return;

        LearningGrammarCheckResult grammar = LearningLocalGrammarChecker.CheckPlayableSegment(GetSentencePosSequence());
        if (grammar.valid) LearningFeedback.SubmitValid(); else LearningFeedback.SubmitInvalid();
        MarkScoringCards(grammar);
        StateChanged?.Invoke();

        int points = grammar.valid ? ComputeSentenceScore(GetScoringCards(grammar)) : 0;
        PlayerScore += points;
        List<LearningDeckCard> playedCards = TakeSentenceCards();
        int need = GetHandFillNeed();
        int drawn = LearningDeckRepository.Draw(Deck, need);
        MoveCardsToDiscard(playedCards);
        if (drawn < need)
        {
            LearningDeckRepository.Draw(Deck, need - drawn);
        }
        scoringCardIndexes.Clear();
        MessageRaised?.Invoke(grammar.valid ? $"{grammar.message} / {grammar.usedLength}장 계산 +{LearningNumberFormatter.Format(points)}점" : $"{grammar.message} +0점");
        CheckScoreGap();
        StateChanged?.Invoke();
    }

    public void DropSentence()
    {
        if (!IsRunning || Deck == null) return;
        int count = SentenceCards.Count;
        if (count <= 0)
        {
            MessageRaised?.Invoke("버릴 카드가 없습니다.");
            return;
        }

        List<LearningDeckCard> droppedCards = TakeSentenceCards();
        int drawn = LearningDeckRepository.Draw(Deck, count);
        MoveCardsToDiscard(droppedCards);
        MessageRaised?.Invoke($"{count}장 버리고 {drawn}장 뽑았습니다.");
        StateChanged?.Invoke();
    }

    public bool IsScoringSentenceCard(int index)
    {
        return scoringCardIndexes.Contains(index);
    }

    private int ComputeSentenceScore(List<LearningDeckCard> scoringCards)
    {
        int appliedCount = scoringCards != null ? scoringCards.Count : 0;
        int baseScore = appliedCount;
        int bonus = 0;
        float multiplier = 1f;
        for (int i = 0; i < appliedCount; i++)
        {
            bonus += scoringCards[i].bonusScore;
            multiplier += GetCardMultiplierBonus(scoringCards[i]);
        }

        int score = Mathf.RoundToInt((baseScore + bonus) * multiplier);
        if (itemEffectExecutor != null) score = itemEffectExecutor.ModifyScore(score);
        return Mathf.Max(1, score);
    }

    private static float GetCardMultiplierBonus(LearningDeckCard card)
    {
        if (card == null || Mathf.Abs(card.multiplier - 1f) <= 0.001f) return 0f;
        return Mathf.Max(0f, card.multiplier);
    }

    private IEnumerator AiRoutine()
    {
        LearningStageConfig config = LearningContentRepository.GetStageConfig(Difficulty);
        float baseSeconds = config != null ? config.aiAnswerSeconds : 6f;
        float speedBonus = Mathf.Clamp(Difficulty * 0.08f, 0f, 2.2f);

        while (IsRunning)
        {
            float wait = Mathf.Max(1.1f, baseSeconds - speedBonus + Random.Range(-0.45f, 0.45f));
            yield return new WaitForSeconds(wait);
            if (!IsRunning) yield break;

            int points = RollAiSentenceScore();
            AiScore += points;
            MessageRaised?.Invoke($"AI +{LearningNumberFormatter.Format(points)}점");
            CheckScoreGap();
            StateChanged?.Invoke();
        }
    }

    private int RollAiSentenceScore()
    {
        float type5Chance = Mathf.Clamp01(0.04f + Difficulty * 0.01f);
        float type4Chance = Mathf.Clamp01(0.08f + Difficulty * 0.012f);
        float roll = Random.value;
        if (roll < type5Chance) return 5;
        if (roll < type5Chance + type4Chance) return 4;
        if (roll < 0.48f + Difficulty * 0.01f) return 3;
        if (roll < 0.8f) return 2;
        return 1;
    }

    private void CheckScoreGap()
    {
        int gap = PlayerScore - AiScore;
        if (gap >= winScoreGap)
        {
            MessageRaised?.Invoke("승리: 10점 차이를 만들었습니다.");
            StopBattle(recordResult: true);
        }
        else if (gap <= -winScoreGap)
        {
            MessageRaised?.Invoke("패배: AI에게 10점 차이가 났습니다.");
            StopBattle(recordResult: true);
        }
    }

    private void StopBattle(bool recordResult)
    {
        bool wasRunning = IsRunning;
        IsRunning = false;
        if (aiRoutine != null)
        {
            StopCoroutine(aiRoutine);
            aiRoutine = null;
        }

        if (recordResult && wasRunning)
        {
            LearningPlayerProfile.RecordBattleResult(Difficulty, PlayerScore > AiScore);
            LearningCloudService.Instance.SaveLocalFireAndForget();
        }
    }

    private void MarkScoringCards(LearningGrammarCheckResult grammar)
    {
        scoringCardIndexes.Clear();
        if (grammar == null || !grammar.valid) return;

        int end = Mathf.Min(SentenceCards.Count, grammar.usedStartIndex + grammar.usedLength);
        for (int i = Mathf.Max(0, grammar.usedStartIndex); i < end; i++)
        {
            scoringCardIndexes.Add(i);
        }
    }

    private List<LearningDeckCard> GetScoringCards(LearningGrammarCheckResult grammar)
    {
        var cards = new List<LearningDeckCard>();
        if (grammar == null || !grammar.valid) return cards;

        int end = Mathf.Min(SentenceCards.Count, grammar.usedStartIndex + grammar.usedLength);
        for (int i = Mathf.Max(0, grammar.usedStartIndex); i < end; i++)
        {
            cards.Add(SentenceCards[i]);
        }
        return cards;
    }

    private void FillHand()
    {
        if (Deck == null) return;
        LearningDeckRepository.Draw(Deck, GetHandFillNeed());
    }

    private int GetHandFillNeed()
    {
        if (Deck == null) return 0;
        return Mathf.Max(0, handSize - Deck.hand.Count);
    }

    private List<LearningDeckCard> TakeSentenceCards()
    {
        var cards = new List<LearningDeckCard>(SentenceCards);
        SentenceCards.Clear();
        return cards;
    }

    private void MoveCardsToDiscard(List<LearningDeckCard> cards)
    {
        if (cards == null) return;
        for (int i = 0; i < cards.Count; i++)
        {
            LearningDeckCard card = cards[i];
            if (card.temporary) Deck.exhaustedTemporaryCards.Add(card);
            else Deck.discardPile.Add(card);
        }
    }

    private bool TryUseDrawCard(int handIndex, LearningDeckCard card)
    {
        if (!LearningSpecialDeckCardRules.TryGetDrawAmount(card, out int drawAmount)) return false;

        Deck.hand.RemoveAt(handIndex);
        int drawn = LearningDeckRepository.Draw(Deck, drawAmount);
        MoveCardsToDiscard(new List<LearningDeckCard> { card });
        MessageRaised?.Invoke($"{card.displayName} 사용: {drawn}장 뽑았습니다.");
        StateChanged?.Invoke();
        return true;
    }

    private List<LearningPosType> GetSentencePosSequence()
    {
        var list = new List<LearningPosType>();
        for (int i = 0; i < SentenceCards.Count; i++) list.Add(SentenceCards[i].pos);
        return list;
    }
}
