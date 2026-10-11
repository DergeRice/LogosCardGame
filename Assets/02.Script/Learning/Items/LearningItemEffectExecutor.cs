using System.Collections.Generic;
using UnityEngine;

public class LearningItemEffectExecutor : MonoBehaviour
{
    [SerializeField] private LearningRoundController roundController;
    [SerializeField] private LearningItemInventory inventory;
    [SerializeField] private LearningExplorationSentenceController explorationController;

    public int scoreBonusFlat;
    public float scoreMultiplierBonus;
    public int temporaryCardCount;
    private SentencePatternType lastSubmittedPattern;
    private bool hasLastSubmittedPattern;
    private int samePatternChain;
    private float dropStackMultiplier;
    private int supplyCardsAddedCount;
    private int submitStackMultiplier;
    private int passiveTriggerStackMultiplier;
    private readonly List<string> triggerMessages = new List<string>();
    private readonly List<string> triggeredItemIds = new List<string>();
    private readonly List<LearningItemDefinition> pendingStackRemovals = new List<LearningItemDefinition>();
    private LearningItemDefinition activeTriggerItem;

    public string LastTriggerSummary { get; private set; }
    public IReadOnlyList<string> LastTriggeredItemIds => triggeredItemIds;

    private void Awake()
    {
        if (roundController == null) roundController = FindFirstObjectByType<LearningRoundController>();
        if (inventory == null) inventory = GetComponent<LearningItemInventory>();
        if (explorationController == null) explorationController = FindFirstObjectByType<LearningExplorationSentenceController>();
    }

    public bool UseItem(LearningItemDefinition item)
    {
        if (item == null || roundController == null || !item.CanUseIn(roundController.modeType)) return false;

        Apply(item.effects);
        if (item.consumable && inventory != null)
        {
            inventory.TryRemove(item);
        }

        return true;
    }

    public void ApplyPurchasedExplorationItem(LearningItemDefinition item, LearningRunDeckState deck)
    {
        if (item == null || deck == null) return;
        ApplyImmediateExplorationEffects(item.effects, deck);
    }

    public void ApplyBlindStartEffects(LearningExplorationSentenceController controller, LearningRunDeckState deck)
    {
        if (controller == null || inventory == null) return;

        ResetBlindRuntimeEffects();

        for (int i = 0; i < inventory.Items.Count; i++)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item == null) continue;
            ApplyCountEffects(item.effects, controller);
        }
    }

    /// <summary>
    /// Reinitializes runtime-only counters after loading an in-progress blind without
    /// applying start-of-blind item counts a second time.
    /// </summary>
    public void RestoreBlindRuntimeEffects(LearningSavedExplorationBattleState savedState = null)
    {
        ResetBlindRuntimeEffects();
        if (savedState == null) return;

        hasLastSubmittedPattern = savedState.hasLastSubmittedPattern;
        lastSubmittedPattern = (SentencePatternType)savedState.lastSubmittedPattern;
        samePatternChain = Mathf.Max(0, savedState.samePatternChain);
        dropStackMultiplier = Mathf.Max(0f, savedState.dropStackMultiplier);
        supplyCardsAddedCount = Mathf.Max(0, savedState.supplyCardsAddedCount);
        submitStackMultiplier = Mathf.Max(0, savedState.submitStackMultiplier);
        passiveTriggerStackMultiplier = Mathf.Max(0, savedState.passiveTriggerStackMultiplier);
    }

    public void SaveBlindRuntimeEffects(LearningSavedExplorationBattleState target)
    {
        if (target == null) return;
        target.hasLastSubmittedPattern = hasLastSubmittedPattern;
        target.lastSubmittedPattern = (int)lastSubmittedPattern;
        target.samePatternChain = samePatternChain;
        target.dropStackMultiplier = dropStackMultiplier;
        target.supplyCardsAddedCount = supplyCardsAddedCount;
        target.submitStackMultiplier = submitStackMultiplier;
        target.passiveTriggerStackMultiplier = passiveTriggerStackMultiplier;
    }

    private void ResetBlindRuntimeEffects()
    {
        hasLastSubmittedPattern = false;
        samePatternChain = 0;
        dropStackMultiplier = 0f;
        supplyCardsAddedCount = 0;
        submitStackMultiplier = 0;
        passiveTriggerStackMultiplier = 0;
    }

    public int ModifyExplorationDamage(int baseDamage, int preMultiplierScore, float baseMultiplier, SentencePatternType patternType, List<LearningDeckCard> scoringCards, LearningRunDeckState deck)
    {
        int flat = 0;
        float addMultiplier = 0f;
        triggerMessages.Clear();
        triggeredItemIds.Clear();
        pendingStackRemovals.Clear();
        LastTriggerSummary = string.Empty;
        bool inventoryStateChanged = false;

        if (inventory != null)
        {
            for (int i = 0; i < inventory.Items.Count; i++)
            {
                LearningItemDefinition item = inventory.Items[i];
                if (item == null || item.effects == null) continue;
                activeTriggerItem = item;
                for (int e = 0; e < item.effects.Count; e++)
                {
                    LearningItemEffect effect = item.effects[e];
                    if (!ShouldTriggerSubmitEffect(effect, patternType, scoringCards, deck)) continue;

                    switch (effect.effectType)
                    {
                        case LearningItemEffectType.AddPosTriggerScore:
                        case LearningItemEffectType.AddPatternScore:
                        case LearningItemEffectType.AddDeckSizeConditionalScore:
                            flat += effect.intValue;
                            AddTrigger(effect, $"+{effect.intValue}");
                            TriggerPassiveStack();
                            break;
                        case LearningItemEffectType.AddPosTriggerMultiplier:
                        case LearningItemEffectType.AddPatternMultiplier:
                        case LearningItemEffectType.AddDeckSizeConditionalMultiplier:
                            addMultiplier += effect.floatValue;
                            AddTrigger(effect, $"x+{effect.floatValue:0.##}");
                            TriggerPassiveStack();
                            break;
                        case LearningItemEffectType.AddDifferentPatternMultiplier:
                            if (hasLastSubmittedPattern && lastSubmittedPattern != patternType)
                            {
                                addMultiplier += effect.floatValue;
                                AddTrigger(effect, $"x+{effect.floatValue:0.##}");
                                TriggerPassiveStack();
                            }
                            break;
                        case LearningItemEffectType.AddConsecutivePatternMultiplier:
                            if (hasLastSubmittedPattern && lastSubmittedPattern == patternType)
                            {
                                samePatternChain += 1;
                            }
                            else
                            {
                                samePatternChain = 1;
                            }
                            addMultiplier += effect.floatValue * samePatternChain;
                            AddTrigger(effect, $"x+{effect.floatValue * samePatternChain:0.##}");
                            TriggerPassiveStack();
                            break;
                        case LearningItemEffectType.AddSubmitStackMultiplier:
                            submitStackMultiplier += Mathf.RoundToInt(effect.floatValue);
                            addMultiplier += submitStackMultiplier;
                            AddTrigger(effect, $"x+{submitStackMultiplier}");
                            TriggerPassiveStack();
                            break;
                        case LearningItemEffectType.AddPassiveTriggerMultiplier:
                            addMultiplier += passiveTriggerStackMultiplier;
                            if (passiveTriggerStackMultiplier > 0) AddTrigger(effect, $"x+{passiveTriggerStackMultiplier}");
                            break;
                        case LearningItemEffectType.AddOpeningDecayMultiplier:
                        case LearningItemEffectType.AddBlindDecayMultiplier:
                            if (item.stackValue > 0)
                            {
                                addMultiplier += item.stackValue;
                                AddTrigger(effect, $"x+{item.stackValue}");
                                if (effect.effectType == LearningItemEffectType.AddOpeningDecayMultiplier)
                                {
                                    item.stackValue = Mathf.Max(0, item.stackValue - Mathf.Max(1, effect.intValue2));
                                    inventoryStateChanged = true;
                                    RemoveIfStackEmpty(item);
                                }
                            }
                            break;
                        case LearningItemEffectType.FixSubmitCount:
                            if (effect.floatValue > 0f)
                            {
                                addMultiplier += effect.floatValue;
                                AddTrigger(effect, $"x+{effect.floatValue:0.##}");
                            }
                            break;
                        case LearningItemEffectType.Custom:
                            ApplyCustomSubmitEffect(effect, scoringCards, deck, ref flat, ref addMultiplier);
                            break;
                    }
                }
                activeTriggerItem = null;
            }
        }

        int result;
        if (baseMultiplier <= 0f)
        {
            result = baseDamage + flat;
        }
        else
        {
            float multiplier = Mathf.Max(0f, baseMultiplier + addMultiplier);
            result = Mathf.RoundToInt((preMultiplierScore + flat) * multiplier);
        }
        ApplyCardGrowthEffects(result, scoringCards);
        hasLastSubmittedPattern = true;
        lastSubmittedPattern = patternType;
        LastTriggerSummary = triggerMessages.Count > 0 ? string.Join(" / ", triggerMessages) : string.Empty;
        activeTriggerItem = null;
        inventoryStateChanged |= FlushPendingStackRemovals();
        if (inventoryStateChanged) inventory?.SaveExplorationInventory();
        return Mathf.Max(1, result);
    }

    public int GetExtraDrawAfterSubmit()
    {
        return SumIntEffects(LearningItemEffectType.AddDrawAfterSubmit);
    }

    public int GetExtraDrawAfterDrop()
    {
        int extra = 0;
        if (inventory == null) return extra;

        for (int i = 0; i < inventory.Items.Count; i++)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item == null || item.effects == null) continue;
            for (int e = 0; e < item.effects.Count; e++)
            {
                LearningItemEffect effect = item.effects[e];
                if (effect.effectType != LearningItemEffectType.AddDrawAfterDrop) continue;

                if (effect.condition == "supply_every")
                {
                    int interval = Mathf.Max(1, effect.intValue2);
                    if ((supplyCardsAddedCount + 1) % interval == 0)
                    {
                        extra += Mathf.Max(0, effect.intValue);
                    }
                }
                else
                {
                    extra += Mathf.Max(0, effect.intValue);
                }
            }
        }

        return extra;
    }

    public int GetStartingHandSizeBonus()
    {
        return SumIntEffects(LearningItemEffectType.AddStartingHandSize);
    }

    public float GetBaseMultiplierDelta()
    {
        return SumFloatEffects(LearningItemEffectType.AddBaseMultiplier);
    }

    public int GetSupplyDamage(List<LearningDeckCard> suppliedCards)
    {
        if (suppliedCards == null || inventory == null) return 0;
        triggerMessages.Clear();
        triggeredItemIds.Clear();
        LastTriggerSummary = string.Empty;
        int damage = 0;
        supplyCardsAddedCount += suppliedCards.Count;
        for (int i = 0; i < inventory.Items.Count; i++)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item == null || item.effects == null) continue;
            activeTriggerItem = item;
            for (int e = 0; e < item.effects.Count; e++)
            {
                LearningItemEffect effect = item.effects[e];
                switch (effect.effectType)
                {
                case LearningItemEffectType.AddDropDamagePerCard:
                    damage += suppliedCards.Count * effect.intValue;
                    AddTrigger(effect, $"+{suppliedCards.Count * effect.intValue}");
                    break;
                case LearningItemEffectType.AddDropDamageFromBonusScore:
                    int cardScoreDamage = SumCardSupplyDamage(suppliedCards, Mathf.Max(1, effect.intValue));
                    damage += cardScoreDamage;
                    AddTrigger(effect, $"+{cardScoreDamage}");
                    break;
                case LearningItemEffectType.AddDropStackMultiplier:
                    dropStackMultiplier += effect.floatValue;
                    AddTrigger(effect, $"x+{dropStackMultiplier:0.##}");
                    break;
                }
            }
            activeTriggerItem = null;
        }
        LastTriggerSummary = triggerMessages.Count > 0 ? string.Join(" / ", triggerMessages) : string.Empty;
        activeTriggerItem = null;
        return Mathf.Max(0, damage);
    }

    public float GetSupplyStackMultiplier()
    {
        return Mathf.Max(0f, dropStackMultiplier);
    }

    public bool ShouldRealizeTemporaryCards()
    {
        return HasEffect(LearningItemEffectType.RealizeTemporaryCards);
    }

    public bool AllowsBareCountableNoun()
    {
        return HasEffect(LearningItemEffectType.AddNoArticleRule);
    }

    public void ApplyPostPlayRefill(LearningRunDeckState deck)
    {
        if (deck == null || inventory == null) return;
        for (int i = 0; i < inventory.Items.Count; i++)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item == null || item.effects == null) continue;
            for (int e = 0; e < item.effects.Count; e++)
            {
                LearningItemEffect effect = item.effects[e];
                if (effect.effectType == LearningItemEffectType.RefillHandWhenEmpty && deck.hand.Count == 0)
                {
                    LearningDeckRepository.Draw(deck, Mathf.Max(0, effect.intValue));
                }
                else if (effect.effectType == LearningItemEffectType.Custom && effect.stringValue == "HandCycle" && deck.hand.Count <= effect.intValue2)
                {
                    LearningDeckRepository.Draw(deck, Mathf.Max(0, effect.intValue));
                }
            }
        }
    }

    public void SaveInventoryState()
    {
        inventory?.SaveExplorationInventory();
    }

    public void OnBlindCleared()
    {
        if (inventory == null) return;
        pendingStackRemovals.Clear();
        for (int i = inventory.Items.Count - 1; i >= 0; i--)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item == null || item.effects == null) continue;
            for (int e = 0; e < item.effects.Count; e++)
            {
                LearningItemEffect effect = item.effects[e];
                if (effect.effectType != LearningItemEffectType.AddBlindDecayMultiplier) continue;
                item.stackValue = Mathf.Max(0, item.stackValue - Mathf.Max(1, effect.intValue2));
                RemoveIfStackEmpty(item);
            }
        }
        FlushPendingStackRemovals();
        inventory.SaveExplorationInventory();
    }

    public string GetStackDisplay(LearningItemDefinition item, LearningRunDeckState deck)
    {
        if (item == null) return string.Empty;
        if (item.stackValue > 0) return item.stackValue.ToString();
        if (item.effects == null) return string.Empty;

        for (int i = 0; i < item.effects.Count; i++)
        {
            LearningItemEffect effect = item.effects[i];
            switch (effect.stackDisplay)
            {
                case "deck_card_count":
                    return CountDeckCards(deck).ToString();
                case "special_card_count":
                    return CountCards(deck, IsSpecialCard).ToString();
                case "chain_count":
                    return samePatternChain > 0 ? samePatternChain.ToString() : string.Empty;
                case "stackValue":
                    return item.stackValue > 0 ? item.stackValue.ToString() : string.Empty;
            }
        }

        return string.Empty;
    }

    private void Apply(List<LearningItemEffect> effects)
    {
        if (effects == null) return;

        for (int i = 0; i < effects.Count; i++)
        {
            LearningItemEffect effect = effects[i];
            switch (effect.effectType)
            {
                case LearningItemEffectType.AddScore:
                    scoreBonusFlat += effect.intValue;
                    break;
                case LearningItemEffectType.MultiplyScore:
                    scoreMultiplierBonus += effect.floatValue;
                    break;
                case LearningItemEffectType.AddTemporaryPosCards:
                    temporaryCardCount += Mathf.Max(0, effect.intValue);
                    break;
            }
        }
    }

    public int ModifyScore(int baseScore)
    {
        float multiplier = 1f + Mathf.Max(0f, scoreMultiplierBonus);
        return Mathf.RoundToInt((baseScore + scoreBonusFlat) * multiplier);
    }

    public void ResetRoundEffects()
    {
        scoreBonusFlat = 0;
        scoreMultiplierBonus = 0f;
        temporaryCardCount = 0;
    }

    private void ApplyImmediateExplorationEffects(List<LearningItemEffect> effects, LearningRunDeckState deck)
    {
        if (effects == null || deck == null) return;
        for (int i = 0; i < effects.Count; i++)
        {
            LearningItemEffect effect = effects[i];
            switch (effect.effectType)
            {
                case LearningItemEffectType.AddCardBonusScore:
                    AddBonusToRandomMatchingCard(deck, effect.target, effect.intValue);
                    break;
                case LearningItemEffectType.AddDeckPosBonusScore:
                    AddBonusToAllMatchingCards(deck, effect.target, effect.intValue);
                    break;
                case LearningItemEffectType.AddCardToDeck:
                    AddCardsToDeck(deck, effect.target, Mathf.Max(1, effect.intValue), 0, 1f);
                    break;
                case LearningItemEffectType.AddRandomCardsToDeck:
                    AddCardsToDeck(deck, effect.target, Mathf.Max(0, effect.intValue), 0, 1f);
                    break;
                case LearningItemEffectType.AddSpecialCardSet:
                    AddSpecialCardSet(deck);
                    break;
                case LearningItemEffectType.AddGoldenSpecialCard:
                    AddCardsToDeck(deck, effect.target, Mathf.Max(1, effect.intValue), 0, Mathf.Max(1f, effect.floatValue));
                    break;
                case LearningItemEffectType.RemoveAllPosCards:
                    RemoveAllMatchingCards(deck, effect.target);
                    break;
                case LearningItemEffectType.AddItemSlots:
                    inventory?.ReconcileExplorationSlotCapacity();
                    break;
            }
        }
    }

    private void ApplyCountEffects(List<LearningItemEffect> effects, LearningExplorationSentenceController controller)
    {
        if (effects == null || controller == null) return;
        for (int i = 0; i < effects.Count; i++)
        {
            LearningItemEffect effect = effects[i];
            switch (effect.effectType)
            {
                case LearningItemEffectType.AddDropCount:
                    controller.AddDropCount(effect.intValue);
                    break;
                case LearningItemEffectType.AddSubmitCount:
                    controller.AddSubmitCount(effect.intValue);
                    break;
                case LearningItemEffectType.FixDropCount:
                    controller.SetDropCount(effect.intValue);
                    break;
                case LearningItemEffectType.FixSubmitCount:
                    controller.SetSubmitCount(effect.intValue);
                    break;
            }
        }
    }

    private bool ShouldTriggerSubmitEffect(LearningItemEffect effect, SentencePatternType patternType, List<LearningDeckCard> scoringCards, LearningRunDeckState deck)
    {
        switch (effect.effectType)
        {
            case LearningItemEffectType.AddPosTriggerScore:
            case LearningItemEffectType.AddPosTriggerMultiplier:
                return ContainsTarget(scoringCards, effect.target);
            case LearningItemEffectType.AddPatternScore:
            case LearningItemEffectType.AddPatternMultiplier:
                return MatchesPattern(effect.target, patternType);
            case LearningItemEffectType.AddDeckSizeConditionalScore:
            case LearningItemEffectType.AddDeckSizeConditionalMultiplier:
                return MatchCountCondition(CountDeckCards(deck), effect.condition, effect.intValue2);
            default:
                return true;
        }
    }

    private void ApplyCustomSubmitEffect(LearningItemEffect effect, List<LearningDeckCard> scoringCards, LearningRunDeckState deck, ref int flat, ref float addMultiplier)
    {
        switch (effect.stringValue)
        {
            case "SpecialCardPerfect":
            case "SpecialCardUnstable":
                if (CountUniqueSpecialCards(scoringCards) >= effect.intValue2)
                {
                    addMultiplier += effect.floatValue;
                    AddTrigger(effect, $"x+{effect.floatValue:0.##}");
                }
                break;
            case "SpecialCardDeck":
                if (CountCards(deck, IsSpecialCard) >= effect.intValue2)
                {
                    addMultiplier += effect.floatValue;
                    AddTrigger(effect, $"x+{effect.floatValue:0.##}");
                }
                break;
            case "SpecialCardFloor":
                if (CountCards(scoringCards, IsSpecialCard) >= effect.intValue2)
                {
                    flat += effect.intValue;
                    AddTrigger(effect, $"+{effect.intValue}");
                }
                break;
            case "SpecialCardCeiling":
                if (CountCards(scoringCards, IsSpecialCard) >= effect.intValue2)
                {
                    addMultiplier += effect.floatValue;
                    AddTrigger(effect, $"x+{effect.floatValue:0.##}");
                }
                break;
            case "NounEmpire":
                if (CountCards(scoringCards, IsNounCard) >= effect.intValue2)
                {
                    addMultiplier += effect.floatValue;
                    AddTrigger(effect, $"x+{effect.floatValue:0.##}");
                }
                break;
            case "VerbEmpire":
                if (CountCards(scoringCards, IsVerbCard) >= effect.intValue2)
                {
                    addMultiplier += effect.floatValue;
                    AddTrigger(effect, $"x+{effect.floatValue:0.##}");
                }
                break;
            case "AdjectiveEmpire":
                if (CountCards(scoringCards, c => c != null && c.pos == LearningPosType.JJ) >= effect.intValue2)
                {
                    addMultiplier += effect.floatValue;
                    AddTrigger(effect, $"x+{effect.floatValue:0.##}");
                }
                break;
            case "AdverbEmpire":
                if (CountCards(scoringCards, c => c != null && LearningCardDisplayUtility.IsAdverbLike(c.pos)) >= effect.intValue2)
                {
                    addMultiplier += effect.floatValue;
                    AddTrigger(effect, $"x+{effect.floatValue:0.##}");
                }
                break;
        }
    }

    private void AddTrigger(LearningItemEffect effect, string value)
    {
        string name = string.IsNullOrWhiteSpace(effect.target) ? effect.effectType.ToString() : effect.target;
        triggerMessages.Add($"{name} {value}");
        if (activeTriggerItem != null && !string.IsNullOrWhiteSpace(activeTriggerItem.itemId) && !triggeredItemIds.Contains(activeTriggerItem.itemId))
        {
            triggeredItemIds.Add(activeTriggerItem.itemId);
        }
    }

    private void TriggerPassiveStack()
    {
        if (HasEffect(LearningItemEffectType.AddPassiveTriggerMultiplier))
        {
            passiveTriggerStackMultiplier += 1;
        }
    }

    private void ApplyCardGrowthEffects(int score, List<LearningDeckCard> scoringCards)
    {
        if (inventory == null || scoringCards == null) return;
        for (int i = 0; i < inventory.Items.Count; i++)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item == null || item.effects == null) continue;
            activeTriggerItem = item;
            for (int e = 0; e < item.effects.Count; e++)
            {
                LearningItemEffect effect = item.effects[e];
                if (effect.effectType != LearningItemEffectType.AddCardGrowthOnScoreThreshold) continue;
                if (score < effect.intValue2) continue;
                for (int c = 0; c < scoringCards.Count; c++)
                {
                    if (scoringCards[c] != null) scoringCards[c].bonusScore += effect.intValue;
                }
                AddTrigger(effect, $"카드+{effect.intValue}");
            }
            activeTriggerItem = null;
        }
    }

    private void RemoveIfStackEmpty(LearningItemDefinition item)
    {
        if (item != null && item.removeWhenStackZero && item.stackValue <= 0 && inventory != null && !pendingStackRemovals.Contains(item))
        {
            pendingStackRemovals.Add(item);
        }
    }

    private bool FlushPendingStackRemovals()
    {
        if (inventory == null || pendingStackRemovals.Count == 0) return false;

        bool removedAny = false;
        for (int i = 0; i < pendingStackRemovals.Count; i++)
        {
            LearningItemDefinition item = pendingStackRemovals[i];
            if (item != null && inventory.TryRemove(item)) removedAny = true;
        }

        pendingStackRemovals.Clear();
        return removedAny;
    }

    private int SumIntEffects(LearningItemEffectType type)
    {
        if (inventory == null) return 0;
        int total = 0;
        for (int i = 0; i < inventory.Items.Count; i++)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item == null || item.effects == null) continue;
            for (int e = 0; e < item.effects.Count; e++)
            {
                if (item.effects[e].effectType == type) total += item.effects[e].intValue;
            }
        }
        return total;
    }

    private float SumFloatEffects(LearningItemEffectType type)
    {
        if (inventory == null) return 0f;
        float total = 0f;
        for (int i = 0; i < inventory.Items.Count; i++)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item == null || item.effects == null) continue;
            for (int e = 0; e < item.effects.Count; e++)
            {
                if (item.effects[e].effectType == type) total += item.effects[e].floatValue;
            }
        }
        return total;
    }

    private bool HasEffect(LearningItemEffectType type)
    {
        if (inventory == null) return false;
        for (int i = 0; i < inventory.Items.Count; i++)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item == null || item.effects == null) continue;
            for (int e = 0; e < item.effects.Count; e++)
            {
                if (item.effects[e].effectType == type) return true;
            }
        }
        return false;
    }

    private static void AddBonusToRandomMatchingCard(LearningRunDeckState deck, string target, int bonus)
    {
        List<LearningDeckCard> matches = GetMatchingCards(deck, target);
        if (matches.Count == 0) return;
        matches[LearningRunRandom.Range(0, matches.Count)].bonusScore += bonus;
    }

    private static void AddBonusToAllMatchingCards(LearningRunDeckState deck, string target, int bonus)
    {
        List<LearningDeckCard> matches = GetMatchingCards(deck, target);
        for (int i = 0; i < matches.Count; i++)
        {
            matches[i].bonusScore += bonus;
        }
    }

    private static void RemoveAllMatchingCards(LearningRunDeckState deck, string target)
    {
        RemoveAllMatchingCards(deck.drawPile, target);
        RemoveAllMatchingCards(deck.hand, target);
        RemoveAllMatchingCards(deck.discardPile, target);
    }

    private static void RemoveAllMatchingCards(List<LearningDeckCard> cards, string target)
    {
        if (cards == null) return;
        for (int i = cards.Count - 1; i >= 0; i--)
        {
            if (MatchesTarget(cards[i], target)) cards.RemoveAt(i);
        }
    }

    private static List<LearningDeckCard> GetMatchingCards(LearningRunDeckState deck, string target)
    {
        var result = new List<LearningDeckCard>();
        AddMatching(result, deck.drawPile, target);
        AddMatching(result, deck.hand, target);
        AddMatching(result, deck.discardPile, target);
        return result;
    }

    private static void AddMatching(List<LearningDeckCard> result, List<LearningDeckCard> cards, string target)
    {
        if (cards == null) return;
        for (int i = 0; i < cards.Count; i++)
        {
            if (MatchesTarget(cards[i], target)) result.Add(cards[i]);
        }
    }

    private static void AddCardsToDeck(LearningRunDeckState deck, string target, int count, int bonusScore, float multiplier)
    {
        if (deck == null || count <= 0) return;
        for (int i = 0; i < count; i++)
        {
            LearningDeckCard card = CreateCardForTarget(target);
            card.id = $"{SanitizeId(target)}_{System.Guid.NewGuid():N}";
            card.bonusScore = bonusScore;
            card.multiplier = Mathf.Max(0.1f, multiplier);
            deck.drawPile.Add(card);
        }
    }

    private static void AddSpecialCardSet(LearningRunDeckState deck)
    {
        AddCardsToDeck(deck, "정관사", 1, 0, 1f);
        AddCardsToDeck(deck, "a/an", 1, 0, 1f);
        AddCardsToDeck(deck, "전치사", 1, 0, 1f);
        AddCardsToDeck(deck, "소유격", 1, 0, 1f);
        AddCardsToDeck(deck, "to", 1, 0, 1f);
        AddCardsToDeck(deck, "Do", 1, 0, 1f);
        AddCardsToDeck(deck, "not", 1, 0, 1f);
        AddCardsToDeck(deck, "Wh의문사", 1, 0, 1f);
    }

    private static LearningDeckCard CreateCardForTarget(string target)
    {
        LearningPosType pos = TargetToPos(target);
        return new LearningDeckCard
        {
            pos = pos,
            displayName = NormalizeTarget(target),
            multiplier = 1f,
        };
    }

    private static bool ContainsTarget(List<LearningDeckCard> cards, string target)
    {
        if (cards == null) return false;
        for (int i = 0; i < cards.Count; i++)
        {
            if (MatchesTarget(cards[i], target)) return true;
        }
        return false;
    }

    private static bool MatchesTarget(LearningDeckCard card, string target)
    {
        if (card == null) return false;
        target = NormalizeTarget(target);
        if (target == "명사") return IsNounCard(card);
        if (target == "동사") return IsVerbCard(card);
        if (target == "관사") return card.pos == LearningPosType.DT_AN || card.pos == LearningPosType.DT_THE;
        if (target == "특수 카드") return IsSpecialCard(card);
        return LearningCardDisplayUtility.GetPosLabel(card.pos) == target || card.displayName == target;
    }

    private static LearningPosType TargetToPos(string target)
    {
        switch (NormalizeTarget(target))
        {
            case "일반동사": return LearningPosType.VB;
            case "Be동사": return LearningPosType.BE;
            case "셀없명사": return LearningPosType.NNU;
            case "셀있명사": return LearningPosType.NNC;
            case "대명사": return LearningPosType.PRP;
            case "형용사": return LearningPosType.JJ;
            case "부사": return LearningPosType.RB;
            case "정관사": return LearningPosType.DT_THE;
            case "a/an": return LearningPosType.DT_AN;
            case "전치사": return LearningPosType.IN;
            case "소유격": return LearningPosType.PRP_POS;
            case "to": return LearningPosType.TO_VB;
            case "Do": return LearningPosType.DO;
            case "not": return LearningPosType.RB_NOT;
            case "Wh의문사": return LearningPosType.WH;
            case "Get2": return LearningPosType.RB;
            case "Get3": return LearningPosType.RB;
            case "명사": return LearningRunRandom.Value() < 0.5f ? LearningPosType.NNU : LearningPosType.NNC;
            default: return LearningPosType.RB;
        }
    }

    private static bool MatchesPattern(string target, SentencePatternType patternType)
    {
        return target == $"{(int)patternType}형식";
    }

    private static bool MatchCountCondition(int count, string condition, int threshold)
    {
        if (condition != null && condition.StartsWith("lte_")) return count <= threshold;
        if (condition != null && condition.StartsWith("gte_")) return count >= threshold;
        return false;
    }

    private static int CountDeckCards(LearningRunDeckState deck)
    {
        if (deck == null) return 0;
        return CountList(deck.drawPile) + CountList(deck.hand) + CountList(deck.discardPile);
    }

    private static int CountList(List<LearningDeckCard> cards)
    {
        return cards != null ? cards.Count : 0;
    }

    private static int CountCards(LearningRunDeckState deck, System.Predicate<LearningDeckCard> predicate)
    {
        if (deck == null) return 0;
        return CountCards(deck.drawPile, predicate) + CountCards(deck.hand, predicate) + CountCards(deck.discardPile, predicate);
    }

    private static int CountCards(List<LearningDeckCard> cards, System.Predicate<LearningDeckCard> predicate)
    {
        if (cards == null || predicate == null) return 0;
        int count = 0;
        for (int i = 0; i < cards.Count; i++)
        {
            if (predicate(cards[i])) count += 1;
        }
        return count;
    }

    private static int CountUniqueSpecialCards(List<LearningDeckCard> cards)
    {
        var set = new HashSet<string>();
        if (cards == null) return 0;
        for (int i = 0; i < cards.Count; i++)
        {
            if (!IsSpecialCard(cards[i])) continue;
            set.Add(LearningCardDisplayUtility.GetPosLabel(cards[i].pos));
        }
        return set.Count;
    }

    private static int SumBonusScore(List<LearningDeckCard> cards)
    {
        if (cards == null) return 0;
        int sum = 0;
        for (int i = 0; i < cards.Count; i++)
        {
            if (cards[i] != null) sum += Mathf.Max(0, cards[i].bonusScore);
        }
        return sum;
    }

    private static int SumCardSupplyDamage(List<LearningDeckCard> cards, int multiplier)
    {
        if (cards == null) return 0;
        int sum = 0;
        for (int i = 0; i < cards.Count; i++)
        {
            LearningDeckCard card = cards[i];
            if (card == null) continue;
            int baseScore = 1 + Mathf.Max(0, card.bonusScore);
            sum += baseScore * multiplier;
        }
        return sum;
    }

    private static bool IsNounCard(LearningDeckCard card)
    {
        return card != null && (card.pos == LearningPosType.NNU || card.pos == LearningPosType.NNC || card.pos == LearningPosType.PRP);
    }

    private static bool IsVerbCard(LearningDeckCard card)
    {
        return card != null && (card.pos == LearningPosType.VB || card.pos == LearningPosType.BE);
    }

    private static bool IsSpecialCard(LearningDeckCard card)
    {
        if (card == null) return false;
        return card.pos == LearningPosType.DT_THE ||
               card.pos == LearningPosType.DT_AN ||
               card.pos == LearningPosType.IN ||
               card.pos == LearningPosType.PRP_POS ||
               card.pos == LearningPosType.TO_VB ||
               card.pos == LearningPosType.DO ||
               card.pos == LearningPosType.RB_NOT ||
               card.pos == LearningPosType.WH;
    }

    private static string NormalizeTarget(string target)
    {
        return string.IsNullOrWhiteSpace(target) ? string.Empty : target.Trim();
    }

    private static string SanitizeId(string target)
    {
        return NormalizeTarget(target).Replace("/", "_").Replace(" ", "_").ToLowerInvariant();
    }
}
