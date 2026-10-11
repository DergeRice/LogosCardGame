using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class LearningExplorationSentenceController : MonoBehaviour
{
    private const int BaseSupplyBonusDrawCount = 1;
    private const int BaseScoreMultiplier = 5;
    private const int MaxSupplyCount = 8;
    public const int MaxSentenceCardCount = 12;

    [SerializeField] private int handSize = 5;
    [SerializeField] private int baseHands = 4;
    [SerializeField] private int baseDrops = 5;
    [SerializeField] private LearningItemEffectExecutor itemEffectExecutor;

    public LearningRunDeckState Deck { get; private set; }
    public List<LearningDeckCard> SentenceCards { get; } = new List<LearningDeckCard>();
    public int Chapter { get; private set; } = 1;
    public int BlindIndex { get; private set; }
    public int BlindHp { get; private set; }
    public int MaxBlindHp { get; private set; }
    public int HandsRemaining { get; private set; }
    public int DropsRemaining { get; private set; }
    public int HandsMax { get; private set; }
    public int DropsMax { get; private set; }
    public float CurrentScoreMultiplier => Mathf.Max(0f, BaseScoreMultiplier - Mathf.Max(0, DropsMax - DropsRemaining) + (itemEffectExecutor != null ? itemEffectExecutor.GetBaseMultiplierDelta() : 0f) + (itemEffectExecutor != null ? itemEffectExecutor.GetSupplyStackMultiplier() : 0f));
    public bool IsDefeated { get; private set; }
    public bool IsWaitingForShop => LearningExplorationRunState.ShopPending;
    public bool IsResolvingSubmit { get; private set; }
    public bool CanAddSentenceCard => SentenceCards.Count < MaxSentenceCardCount;

    public event System.Action StateChanged;
    public event System.Action<string> MessageRaised;
    public event System.Action ShopRequested;
    public event System.Action Defeated;
    public event System.Action<int, int, int, int, string, int, int, bool> SubmitAnimationRequested;

    private readonly HashSet<int> scoringCardIndexes = new HashSet<int>();

    private void Awake()
    {
        if (itemEffectExecutor == null) itemEffectExecutor = GetComponent<LearningItemEffectExecutor>();
    }

    private void Start()
    {
        StartOrContinueRun();
    }

    public void StartOrContinueRun()
    {
        if (!LearningExplorationRunState.HasActiveRun)
        {
            LearningExplorationRunState.StartNewRun();
        }

        Deck = LearningExplorationRunState.LoadDeck();
        Chapter = LearningExplorationRunState.Chapter;
        BlindIndex = LearningExplorationRunState.BlindIndex;
        ResetActionCounts();
        IsDefeated = false;
        SentenceCards.Clear();

        if (LearningExplorationRunState.ShopPending)
        {
            ShopRequested?.Invoke();
            StateChanged?.Invoke();
            return;
        }

        if (TryRestoreBattleState(out LearningSavedExplorationBattleState restoredState))
        {
            // Battle state already contains the remaining hands/drops. Reapplying
            // start effects here would grant them again every time the app reloads.
            itemEffectExecutor?.RestoreBlindRuntimeEffects(restoredState);
            StateChanged?.Invoke();
            MessageRaised?.Invoke(GetBlindName() + " 이어하기");
            return;
        }

        SetupBlind(BlindIndex);
        PrepareDeckForNewBlind();
        itemEffectExecutor?.ApplyBlindStartEffects(this, Deck);
        EnsureHandFilled();
        LearningSfxPlayer.PlayBlindStart();
        SaveDeck();
        SaveBattleState();
        StateChanged?.Invoke();
        MessageRaised?.Invoke(GetBlindName() + " 시작");
    }

    public void PlayHandCard(int handIndex)
    {
        if (IsDefeated || IsWaitingForShop || IsResolvingSubmit || Deck == null) return;
        if (handIndex < 0 || handIndex >= Deck.hand.Count) return;

        LearningDeckCard card = Deck.hand[handIndex];
        if (TryUseDrawCard(handIndex, card)) return;
        if (!CanAddSentenceCard)
        {
            MessageRaised?.Invoke($"문장은 최대 {MaxSentenceCardCount}장까지 올릴 수 있습니다.");
            return;
        }

        Deck.hand.RemoveAt(handIndex);
        SentenceCards.Add(card);
        LearningFeedback.CardPlay();
        SaveBattleState();
        SaveDeck();
        StateChanged?.Invoke();
    }

    public void PlayHandCard(LearningDeckCard card)
    {
        if (card == null || Deck == null)
        {
            return;
        }

        int index = FindHandCardIndex(card);
        if (index < 0)
        {
            return;
        }

        PlayHandCard(index);
    }

    public void ReturnSentenceCard(int sentenceIndex)
    {
        if (IsDefeated || IsWaitingForShop || IsResolvingSubmit || Deck == null) return;
        if (sentenceIndex < 0 || sentenceIndex >= SentenceCards.Count) return;

        LearningDeckCard card = SentenceCards[sentenceIndex];
        SentenceCards.RemoveAt(sentenceIndex);
        Deck.hand.Add(card);
        LearningFeedback.CardReturn();
        SaveBattleState();
        SaveDeck();
        StateChanged?.Invoke();
    }

    private int FindHandCardIndex(LearningDeckCard card)
    {
        if (Deck == null || Deck.hand == null || card == null) return -1;
        for (int i = 0; i < Deck.hand.Count; i++)
        {
            if (ReferenceEquals(Deck.hand[i], card)) return i;
        }

        if (!string.IsNullOrWhiteSpace(card.id))
        {
            for (int i = 0; i < Deck.hand.Count; i++)
            {
                if (Deck.hand[i] != null &&
                    Deck.hand[i].temporary == card.temporary &&
                    Deck.hand[i].id == card.id)
                {
                    return i;
                }
            }
        }

        for (int i = 0; i < Deck.hand.Count; i++)
        {
            LearningDeckCard candidate = Deck.hand[i];
            if (candidate == null) continue;
            if (candidate.temporary != card.temporary) continue;
            if (candidate.pos == card.pos &&
                candidate.displayName == card.displayName &&
                candidate.bonusScore == card.bonusScore &&
                Mathf.Abs(candidate.multiplier - card.multiplier) < 0.001f)
            {
                return i;
            }
        }

        return -1;
    }

    public void MoveSentenceCard(int fromIndex, int toIndex)
    {
        if (IsResolvingSubmit) return;
        if (fromIndex < 0 || fromIndex >= SentenceCards.Count) return;
        toIndex = Mathf.Clamp(toIndex, 0, SentenceCards.Count - 1);
        if (fromIndex == toIndex) return;

        LearningDeckCard card = SentenceCards[fromIndex];
        SentenceCards.RemoveAt(fromIndex);
        SentenceCards.Insert(toIndex, card);
        LearningFeedback.CardReorder();
        SaveBattleState();
        StateChanged?.Invoke();
    }

    public void SubmitSentence()
    {
        if (IsDefeated || IsWaitingForShop || IsResolvingSubmit || Deck == null) return;
        if (HandsRemaining <= 0)
        {
            Defeat();
            return;
        }

        HandsRemaining -= 1;
        SaveBattleState();
        LearningGrammarCheckResult grammar = LearningLocalGrammarChecker.CheckPlayableSegment(
            GetSentencePosSequence(),
            itemEffectExecutor != null && itemEffectExecutor.AllowsBareCountableNoun());
        MarkScoringCards(grammar);
        if (grammar.valid) LearningFeedback.SubmitValid(); else LearningFeedback.SubmitInvalid();
        StateChanged?.Invoke();
        StartCoroutine(ResolveSubmitAfterHighlight(grammar));
    }

    private IEnumerator ResolveSubmitAfterHighlight(LearningGrammarCheckResult grammar)
    {
        IsResolvingSubmit = true;
        yield return new WaitForSeconds(0.28f);

        List<LearningDeckCard> scoringCards = GetScoringCards(grammar);
        int preMultiplierScore = 0;
        float baseMultiplier = 0f;
        int baseDamage = grammar.valid ? ComputeBaseDamage(grammar.patternType, scoringCards, out preMultiplierScore, out baseMultiplier) : 0;
        int damage = grammar.valid ? ApplyItemDamage(baseDamage, preMultiplierScore, baseMultiplier, grammar.patternType, scoringCards) : 0;
        string triggerSummary = itemEffectExecutor != null && !string.IsNullOrEmpty(itemEffectExecutor.LastTriggerSummary)
            ? $" / {itemEffectExecutor.LastTriggerSummary}"
            : string.Empty;
        int oldHp = BlindHp;
        int newHp = Mathf.Max(0, BlindHp - damage);
        bool willClear = grammar.valid && newHp <= 0;
        Debug.Log($"[ExplorationDamage] valid={grammar.valid} pattern={grammar.patternType} used={grammar.usedStartIndex}+{grammar.usedLength} base={baseDamage} final={damage} hp={oldHp}->{newHp} triggers={triggerSummary}");
        SubmitAnimationRequested?.Invoke(grammar.usedStartIndex, grammar.usedLength, baseDamage, damage, triggerSummary, oldHp, newHp, willClear);
        yield return new WaitForSeconds(GetSubmitAnimationSeconds(grammar, triggerSummary));

        BlindHp = newHp;
        List<LearningDeckCard> playedCards = TakeSentenceCards();
        int need = CountNonTemporaryCards(playedCards) + (itemEffectExecutor != null ? itemEffectExecutor.GetExtraDrawAfterSubmit() : 0);
        int drawn = LearningDeckRepository.Draw(Deck, need);
        MoveCardsToDiscard(playedCards);
        if (drawn < need)
        {
            LearningDeckRepository.Draw(Deck, need - drawn);
        }
        itemEffectExecutor?.SaveInventoryState();
        SaveBattleState();
        SaveDeck();
        scoringCardIndexes.Clear();
        IsResolvingSubmit = false;

        MessageRaised?.Invoke(grammar.valid ? $"{grammar.message} / {grammar.usedLength}장 계산 / {LearningNumberFormatter.Format(damage)} 데미지{triggerSummary}" : $"{grammar.message} / 0 데미지");
        if (BlindHp <= 0)
        {
            CompleteBlind();
            yield break;
        }

        if (HandsRemaining <= 0)
        {
            Defeat();
            yield break;
        }

        StateChanged?.Invoke();
    }

    public void SupplyCards()
    {
        if (IsDefeated || IsWaitingForShop || IsResolvingSubmit || Deck == null) return;
        if (DropsRemaining <= 0)
        {
            MessageRaised?.Invoke("드로우 횟수가 없습니다.");
            return;
        }

        DropsRemaining -= 1;
        SaveBattleState();

        int drawCount = BaseSupplyBonusDrawCount + (itemEffectExecutor != null ? itemEffectExecutor.GetExtraDrawAfterDrop() : 0);
        List<LearningDeckCard> drawnCards = LearningDeckRepository.DrawCards(Deck, drawCount);
        int drawn = drawnCards.Count;
        int supplyDamage = itemEffectExecutor != null ? itemEffectExecutor.GetSupplyDamage(drawnCards) : 0;
        if (supplyDamage > 0)
        {
            int oldHp = BlindHp;
            BlindHp = Mathf.Max(0, BlindHp - supplyDamage);
            Debug.Log($"[ExplorationSupplyDamage] drawn={drawn} damage={supplyDamage} hp={oldHp}->{BlindHp} triggers={itemEffectExecutor?.LastTriggerSummary}");
        }
        itemEffectExecutor?.ApplyPostPlayRefill(Deck);
        itemEffectExecutor?.SaveInventoryState();
        SaveBattleState();
        SaveDeck();
        string damageText = supplyDamage > 0 ? $" / 즉발 피해 {LearningNumberFormatter.Format(supplyDamage)}" : string.Empty;
        MessageRaised?.Invoke($"드로우 {drawn}장 / 현재 배율 x{CurrentScoreMultiplier:0.#}{damageText}");
        if (BlindHp <= 0)
        {
            CompleteBlind();
            return;
        }
        StateChanged?.Invoke();
    }

    public void DropSentence() => SupplyCards();

    public void DefeatBlindCheat()
    {
        if (IsDefeated || IsWaitingForShop || IsResolvingSubmit) return;
        BlindHp = 0;
        MessageRaised?.Invoke("치트: 블라인드 즉시 처치");
        CompleteBlind();
    }

    public void RefreshFromCheat(string message = null)
    {
        if (Deck != null)
        {
            SaveDeck();
            SaveBattleState();
        }

        if (!string.IsNullOrWhiteSpace(message)) MessageRaised?.Invoke(message);
        StateChanged?.Invoke();
    }

    public string BuildDeckListText()
    {
        if (Deck == null) return "덱 정보가 없습니다.";
        var builder = new System.Text.StringBuilder();
        builder.AppendLine($"남은 덱 {Deck.drawPile.Count}장");
        AppendCards(builder, Deck.drawPile);
        builder.AppendLine();
        builder.AppendLine($"버린 덱 {Deck.discardPile.Count}장");
        AppendCards(builder, Deck.discardPile);
        return builder.ToString();
    }

    public string ContinueAfterShop()
    {
        LearningExplorationRunState.SetShopPending(false);
        LearningExplorationRunState.ClearShopOffers();
        LearningExplorationRunState.ClearBattleState();
        Chapter = LearningExplorationRunState.Chapter + 1;
        BlindIndex = 0;
        LearningExplorationRunState.Save(Chapter, BlindIndex, LearningBlindRuleType.None);
        StartOrContinueRun();
        return $"챕터 {Chapter} 시작";
    }

    private void SetupBlind(int blindIndex)
    {
        BlindIndex = Mathf.Clamp(blindIndex, 0, 2);
        MaxBlindHp = ComputeBlindHp(Chapter, BlindIndex);
        BlindHp = MaxBlindHp;
        LearningExplorationRunState.Save(Chapter, BlindIndex, BlindIndex >= 2 ? LearningBlindRuleType.NumberBlind : LearningBlindRuleType.None);
        LearningExplorationRunState.ClearBattleState();
    }

    private static int ComputeBlindHp(int chapter, int blindIndex)
    {
        chapter = Mathf.Max(1, chapter);
        blindIndex = Mathf.Clamp(blindIndex, 0, 2);

        if (chapter == 1)
        {
            return blindIndex == 0 ? 17 : blindIndex == 1 ? 21 : 25;
        }

        long chapterLong = chapter;
        long chapterStartHp = (3L * chapterLong * (chapterLong - 1L)) / 2L + 10L * chapterLong + 7L;
        long blindStep = chapterLong + 3L;
        long hp = chapterStartHp + blindStep * blindIndex;
        return hp > int.MaxValue ? int.MaxValue : Mathf.Max(1, (int)hp);
    }

    public bool IsScoringSentenceCard(int index)
    {
        return scoringCardIndexes.Contains(index);
    }

    private int ComputeBaseDamage(SentencePatternType patternType, List<LearningDeckCard> scoringCards, out int preMultiplierScore, out float totalMultiplier)
    {
        int appliedCount = scoringCards != null ? scoringCards.Count : 0;
        int bonus = 0;
        float cardMultiplierBonus = 0f;
        for (int i = 0; i < appliedCount; i++)
        {
            bonus += scoringCards[i].bonusScore;
            cardMultiplierBonus += GetCardMultiplierBonus(scoringCards[i]);
        }

        float supplyMultiplier = CurrentScoreMultiplier;
        preMultiplierScore = appliedCount + bonus;
        if (supplyMultiplier <= 0)
        {
            totalMultiplier = 0f;
            return Mathf.Max(0, bonus);
        }

        totalMultiplier = supplyMultiplier + cardMultiplierBonus;
        return Mathf.Max(1, Mathf.RoundToInt(preMultiplierScore * totalMultiplier));
    }

    private static float GetCardMultiplierBonus(LearningDeckCard card)
    {
        if (card == null || Mathf.Abs(card.multiplier - 1f) <= 0.001f) return 0f;
        return Mathf.Max(0f, card.multiplier);
    }

    private int ApplyItemDamage(int baseDamage, int preMultiplierScore, float baseMultiplier, SentencePatternType patternType, List<LearningDeckCard> scoringCards)
    {
        int damage = baseDamage;
        if (itemEffectExecutor != null)
        {
            damage = itemEffectExecutor.ModifyExplorationDamage(damage, preMultiplierScore, baseMultiplier, patternType, scoringCards, Deck);
        }
        return Mathf.Max(0, damage);
    }

    private static float GetSubmitAnimationSeconds(LearningGrammarCheckResult grammar, string triggerSummary)
    {
        if (grammar == null || !grammar.valid) return 0.12f;
        float seconds = Mathf.Max(0, grammar.usedLength) * 0.78f;
        seconds += 3.75f;
        if (!string.IsNullOrEmpty(triggerSummary)) seconds += 0.2f;
        return seconds;
    }

    public void AddSubmitCount(int amount)
    {
        HandsRemaining = Mathf.Max(0, HandsRemaining + amount);
        HandsMax = Mathf.Max(HandsRemaining, HandsMax + amount);
    }

    public void AddDropCount(int amount)
    {
        DropsRemaining = Mathf.Clamp(DropsRemaining + amount, 0, MaxSupplyCount);
        DropsMax = Mathf.Clamp(Mathf.Max(DropsRemaining, DropsMax + amount), 0, MaxSupplyCount);
    }

    public void SetSubmitCount(int amount)
    {
        HandsRemaining = Mathf.Max(0, amount);
        HandsMax = HandsRemaining;
    }

    public void SetDropCount(int amount)
    {
        DropsRemaining = Mathf.Clamp(amount, 0, MaxSupplyCount);
        DropsMax = DropsRemaining;
    }

    private void CompleteBlind()
    {
        itemEffectExecutor?.OnBlindCleared();
        int reward = BlindIndex < 2 ? 5 : 10;
        LearningExplorationRunState.AddCoin(reward);
        MessageRaised?.Invoke($"{GetBlindName()} 클리어 +{reward}G");

        if (BlindIndex < 2)
        {
            SetupBlind(BlindIndex + 1);
            ResetActionCounts();
            PrepareDeckForNewBlind();
            itemEffectExecutor?.ApplyBlindStartEffects(this, Deck);
            EnsureHandFilled();
            LearningSfxPlayer.PlayBlindStart();
            SaveDeck();
            SaveBattleState();
            StateChanged?.Invoke();
            return;
        }

        LearningExplorationRunState.SetShopPending(true);
        LearningExplorationRunState.SetRerollCount(0);
        LearningExplorationRunState.ClearShopOffers();
        LearningExplorationRunState.ClearBattleState();
        SaveDeck();
        StateChanged?.Invoke();
        ShopRequested?.Invoke();
    }

    private void Defeat()
    {
        IsDefeated = true;
        SentenceCards.Clear();
        scoringCardIndexes.Clear();
        IsResolvingSubmit = false;
        MessageRaised?.Invoke("패배: 제출 횟수를 모두 사용했습니다.");
        LearningExplorationRunState.Clear();
        StateChanged?.Invoke();
        Defeated?.Invoke();
    }

    private bool TryRestoreBattleState(out LearningSavedExplorationBattleState restoredState)
    {
        LearningSavedExplorationBattleState state = LearningExplorationRunState.LoadBattleState();
        restoredState = null;
        if (state == null || !state.active) return false;
        if (state.chapter != Chapter || state.blindIndex != BlindIndex) return false;

        MaxBlindHp = Mathf.Max(1, state.maxBlindHp);
        BlindHp = Mathf.Clamp(state.blindHp, 0, MaxBlindHp);
        HandsRemaining = Mathf.Max(0, state.handsRemaining);
        DropsRemaining = Mathf.Clamp(state.dropsRemaining, 0, MaxSupplyCount);
        HandsMax = Mathf.Max(baseHands, HandsRemaining);
        DropsMax = Mathf.Clamp(Mathf.Max(baseDrops, DropsRemaining), 0, MaxSupplyCount);
        SentenceCards.Clear();
        if (state.sentenceCards != null)
        {
            for (int i = 0; i < state.sentenceCards.Count; i++)
            {
                if (state.sentenceCards[i] != null) SentenceCards.Add(state.sentenceCards[i]);
            }
        }

        restoredState = state;
        return true;
    }

    private void SaveBattleState()
    {
        if (Deck == null || LearningExplorationRunState.ShopPending) return;
        var state = new LearningSavedExplorationBattleState
        {
            active = true,
            chapter = Chapter,
            blindIndex = BlindIndex,
            blindHp = BlindHp,
            maxBlindHp = MaxBlindHp,
            handsRemaining = HandsRemaining,
            dropsRemaining = DropsRemaining,
            sentenceCards = new List<LearningDeckCard>(SentenceCards),
        };
        itemEffectExecutor?.SaveBlindRuntimeEffects(state);
        LearningExplorationRunState.SaveBattleState(state);
    }

    private void ResetActionCounts()
    {
        HandsMax = Mathf.Max(0, baseHands);
        DropsMax = Mathf.Clamp(baseDrops, 0, MaxSupplyCount);
        HandsRemaining = HandsMax;
        DropsRemaining = DropsMax;
    }

    private void AppendCards(System.Text.StringBuilder builder, List<LearningDeckCard> cards)
    {
        if (cards == null || cards.Count == 0)
        {
            builder.AppendLine("(없음)");
            return;
        }

        for (int i = 0; i < cards.Count; i++)
        {
            LearningDeckCard card = cards[i];
            builder.AppendLine($"{i + 1}. {LearningSpecialDeckCardRules.GetCardLabelWithStats(card)}");
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

    private void PrepareDeckForNewBlind()
    {
        if (Deck == null) return;

        ReturnNonTemporaryToDrawPile(SentenceCards);
        SentenceCards.Clear();
        ReturnNonTemporaryToDrawPile(Deck.hand);
        Deck.hand.Clear();
        ReturnNonTemporaryToDrawPile(Deck.discardPile);
        Deck.discardPile.Clear();
        Deck.exhaustedTemporaryCards.Clear();
        RemoveTemporaryFromDrawPile();

        LearningDeckRepository.Shuffle(Deck.drawPile);
    }

    private void RemoveTemporaryFromDrawPile()
    {
        if (Deck == null || Deck.drawPile == null) return;
        for (int i = Deck.drawPile.Count - 1; i >= 0; i--)
        {
            if (Deck.drawPile[i] != null && Deck.drawPile[i].temporary)
            {
                Deck.drawPile.RemoveAt(i);
            }
        }
    }

    private void ReturnNonTemporaryToDrawPile(List<LearningDeckCard> cards)
    {
        if (cards == null || Deck == null) return;
        for (int i = 0; i < cards.Count; i++)
        {
            LearningDeckCard card = cards[i];
            if (card == null || card.temporary) continue;
            Deck.drawPile.Add(card);
        }
    }

    private bool TryUseDrawCard(int handIndex, LearningDeckCard card)
    {
        if (!LearningSpecialDeckCardRules.TryGetDrawAmount(card, out int drawAmount)) return false;

        Deck.hand.RemoveAt(handIndex);
        int drawn = 0;
        if (LearningSpecialDeckCardRules.CreatesTemporaryCards(card))
        {
            if (itemEffectExecutor != null && itemEffectExecutor.ShouldRealizeTemporaryCards())
            {
                drawn = LearningDeckRepository.Draw(Deck, drawAmount);
            }
            else
            {
                List<LearningDeckCard> temporaryCards = LearningDeckRepository.CreateTemporaryCards(drawAmount);
                Deck.hand.AddRange(temporaryCards);
                drawn = temporaryCards.Count;
            }
        }
        else
        {
            drawn = LearningDeckRepository.Draw(Deck, drawAmount);
        }
        MoveCardsToDiscard(new List<LearningDeckCard> { card });
        SaveDeck();
        MessageRaised?.Invoke(LearningSpecialDeckCardRules.CreatesTemporaryCards(card)
            ? $"{card.displayName} 사용: 임시 카드 {drawn}장 획득."
            : $"{card.displayName} 사용: {drawn}장 뽑았습니다.");
        StateChanged?.Invoke();
        return true;
    }

    private int CountNonTemporaryCards(List<LearningDeckCard> cards)
    {
        if (cards == null) return 0;
        int count = 0;
        for (int i = 0; i < cards.Count; i++)
        {
            if (cards[i] != null && !cards[i].temporary) count += 1;
        }
        return count;
    }

    private void EnsureHandFilled()
    {
        if (Deck == null) return;
        LearningDeckRepository.Draw(Deck, GetHandFillNeed());
    }

    private int GetHandFillNeed()
    {
        if (Deck == null) return 0;
        int bonus = itemEffectExecutor != null ? itemEffectExecutor.GetStartingHandSizeBonus() : 0;
        return Mathf.Max(0, handSize + bonus - Deck.hand.Count);
    }

    private void TrimHandToSize()
    {
        if (Deck == null) return;
        int bonus = itemEffectExecutor != null ? itemEffectExecutor.GetStartingHandSizeBonus() : 0;
        int maxHandSize = Mathf.Max(0, handSize + bonus);
        while (Deck.hand.Count > maxHandSize)
        {
            int lastIndex = Deck.hand.Count - 1;
            Deck.drawPile.Insert(0, Deck.hand[lastIndex]);
            Deck.hand.RemoveAt(lastIndex);
        }
    }

    private List<LearningPosType> GetSentencePosSequence()
    {
        var list = new List<LearningPosType>();
        for (int i = 0; i < SentenceCards.Count; i++)
        {
            list.Add(SentenceCards[i].pos);
        }
        return list;
    }

    private void SaveDeck()
    {
        if (Deck != null) LearningExplorationRunState.SaveDeck(Deck);
    }

    private string GetBlindName()
    {
        if (BlindIndex == 0) return "스몰 블라인드 1";
        if (BlindIndex == 1) return "스몰 블라인드 2";
        return "빅 블라인드";
    }
}
