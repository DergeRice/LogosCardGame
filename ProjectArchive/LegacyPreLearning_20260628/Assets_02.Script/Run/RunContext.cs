using System;
using System.Collections.Generic;
using System.Linq;
using TCG_CardMaker;
using UnityEngine;

public class RunContext : MonoBehaviour
{
    public static RunContext Instance { get; private set; }

    public RunState State { get; private set; } = new RunState();
    public RunStats Stats { get; private set; } = new RunStats();
    public RunEventQueue EventQueue { get; private set; }

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        DontDestroyOnLoad(gameObject);

        EventQueue = GetComponent<RunEventQueue>();
        if (EventQueue == null)
        {
            EventQueue = gameObject.AddComponent<RunEventQueue>();
        }
    }

    public void EnsureDefaultsFrom(DeckSO startingDeck)
    {
        if (State.deckCards != null && State.deckCards.Count > 0) return;
        if (State.deckCardIds != null && State.deckCardIds.Count > 0) return;
        if (startingDeck == null) return;

        var cards = startingDeck.CreateCardList(cloneCards: false);
        var ids = cards.Select(ToStableCardId).ToList();
        State.deckCardIds = ids;
        State.deckCards = ids.Select(id => new CardInstanceState { stableId = id }).ToList();
    }

    private void EnsureConsumableState()
    {
        if (State.consumableItemIds == null)
        {
            State.consumableItemIds = new List<string>();
        }
    }

    public IReadOnlyList<string> GetConsumableIds()
    {
        EnsureConsumableState();
        return State.consumableItemIds;
    }

    public bool AddConsumableById(string itemId)
    {
        if (string.IsNullOrWhiteSpace(itemId)) return false;
        EnsureConsumableState();

        var def = ConsumableRegistry.GetById(itemId);
        if (def == null)
        {
            Debug.LogWarning($"[RunContext] AddConsumableById failed: missing ConsumableItemSO for id={itemId}");
            return false;
        }

        State.consumableItemIds.Add(itemId);
        Stats.SetInt(RunStatKey.ConsumableCount, State.consumableItemIds.Count);
        SaveRun();
        return true;
    }

    public bool ConsumeConsumableAt(int index)
    {
        EnsureConsumableState();
        if (index < 0 || index >= State.consumableItemIds.Count) return false;

        State.consumableItemIds.RemoveAt(index);
        Stats.SetInt(RunStatKey.ConsumableCount, State.consumableItemIds.Count);
        SaveRun();
        return true;
    }

    public bool TryUseConsumableAt(int index)
    {
        EnsureConsumableState();
        if (index < 0 || index >= State.consumableItemIds.Count) return false;

        string id = State.consumableItemIds[index];
        var item = ConsumableRegistry.GetById(id);
        if (item == null) return false;

        // Drive selection modes by id for now (fast iteration, no enum explosion).
        if (ArcanaSelectionMode.Instance == null)
        {
            var go = new GameObject("ArcanaSelectionMode");
            go.AddComponent<ArcanaSelectionMode>();
        }
        if (ArcanaOverlayUI.Instance == null)
        {
            var go = new GameObject("ArcanaOverlayUI");
            go.AddComponent<ArcanaOverlayUI>();
        }

        ArcanaSelectionMode.Instance.SetPendingInventoryIndex(index, id);

        if (string.Equals(id, "ar_card_pack", StringComparison.Ordinal))
        {
            var cards = CardsDB.Instance != null ? CardsDB.Instance.Cards.Where(c => c != null).ToList() : new List<CardSO>();
            var candidates = new List<CardSO>();
            for (int i = 0; i < 5 && cards.Count > 0; i++)
            {
                int idxPick = UnityEngine.Random.Range(0, cards.Count);
                candidates.Add(cards[idxPick]);
            }
            ArcanaSelectionMode.Instance.BeginCardPackPickOne(item, candidates);
            return true;
        }

        if (string.Equals(id, "ar_handtype_upgrade_pick", StringComparison.Ordinal))
        {
            ArcanaSelectionMode.Instance.BeginHandTypePickOne(item);
            return true;
        }

        if (string.Equals(id, "ar_deck_transform", StringComparison.Ordinal))
        {
            ArcanaSelectionMode.Instance.BeginDeckTransformPickFrom(item);
            return true;
        }

        // Default: single-card confirm uses RunEffect list.
        ArcanaSelectionMode.Instance.BeginSingleCard(item);
        return true;
    }

    public void ApplyBlindState(int blindIndex, int enemyHp, int hands, int discards)
    {
        State.blindIndex = blindIndex;
        State.enemyHp = enemyHp;
        State.hands = hands;
        State.discards = discards;

        Stats.SetInt(RunStatKey.BlindIndex, blindIndex);
        Stats.SetInt(RunStatKey.EnemyHp, enemyHp);
        Stats.SetInt(RunStatKey.Hands, hands);
        Stats.SetInt(RunStatKey.Discards, discards);
    }

    public void SetCoins(int coins)
    {
        State.coins = coins;
        Stats.SetInt(RunStatKey.Coins, coins);
    }

    public void AddCoins(int delta)
    {
        if (delta == 0) return;
        SetCoins(Mathf.Max(0, State.coins + delta));
        SaveRun();
    }

    public bool TrySpendCoins(int amount)
    {
        if (amount <= 0) return true;
        if (State.coins < amount) return false;
        SetCoins(State.coins - amount);
        SaveRun();
        return true;
    }

    public int ApplyPermanentBaseScore(int score)
    {
        score += State.baseScoreAdd;
        score = Mathf.FloorToInt(score * Mathf.Max(0f, State.baseScoreMultiply));
        return score;
    }

    public void AddDeckCard(string stableId)
    {
        if (string.IsNullOrWhiteSpace(stableId)) return;
        if (State.deckCards == null) State.deckCards = new List<CardInstanceState>();
        State.deckCards.Add(new CardInstanceState { stableId = stableId });
        if (State.deckCardIds == null) State.deckCardIds = new List<string>();
        State.deckCardIds.Add(stableId); // legacy mirror
        SaveRun();
    }

    public void AddDeckCardWithModifiers(string stableId, List<TCG_CardMaker.CostModifier> modifiers)
    {
        if (string.IsNullOrWhiteSpace(stableId)) return;
        if (State.deckCards == null) State.deckCards = new List<CardInstanceState>();

        var inst = new CardInstanceState { stableId = stableId };
        if (modifiers != null && modifiers.Count > 0)
        {
            for (int i = 0; i < modifiers.Count; i++)
            {
                inst.modifiers.Add(new CardCostModifierState
                {
                    op = (int)modifiers[i].Modifier,
                    value = modifiers[i].Value,
                });
            }
        }

        State.deckCards.Add(inst);
        if (State.deckCardIds == null) State.deckCardIds = new List<string>();
        State.deckCardIds.Add(stableId); // legacy mirror
        SaveRun();
    }

    public void UpgradeHandType(int handTypeIndex)
    {
        // index 0..4 => type 1..5
        if (handTypeIndex < 0 || handTypeIndex >= 5) return;
        if (State.handTypeAdd == null || State.handTypeAdd.Length != 5) State.handTypeAdd = new int[5];
        if (State.handTypeMultiply == null || State.handTypeMultiply.Length != 5) State.handTypeMultiply = new float[5] { 1f, 1f, 1f, 1f, 1f };

        State.handTypeAdd[handTypeIndex] += 5;
        State.handTypeMultiply[handTypeIndex] *= 1.05f;
        SaveRun();
    }

    public int ApplyHandTypeBonuses(int handTypeIndex, int score)
    {
        if (handTypeIndex < 0 || handTypeIndex >= 5) return score;
        if (State.handTypeAdd == null || State.handTypeAdd.Length != 5) return score;
        if (State.handTypeMultiply == null || State.handTypeMultiply.Length != 5) return score;

        score += State.handTypeAdd[handTypeIndex];
        score = Mathf.FloorToInt(score * Mathf.Max(0f, State.handTypeMultiply[handTypeIndex]));
        return score;
    }

    public void TransformOneDeckCard(string fromStableId, string toStableId)
    {
        if (string.IsNullOrWhiteSpace(fromStableId) || string.IsNullOrWhiteSpace(toStableId)) return;

        // Prefer deckCards (preserves modifiers)
        if (State.deckCards != null && State.deckCards.Count > 0)
        {
            for (int i = 0; i < State.deckCards.Count; i++)
            {
                var inst = State.deckCards[i];
                if (inst == null) continue;
                if (string.Equals(inst.stableId, fromStableId, StringComparison.Ordinal))
                {
                    inst.stableId = toStableId;
                    SaveRun();
                    return;
                }
            }
        }

        if (State.deckCardIds == null || State.deckCardIds.Count == 0) return;
        if (string.IsNullOrWhiteSpace(fromStableId) || string.IsNullOrWhiteSpace(toStableId)) return;

        for (int i = 0; i < State.deckCardIds.Count; i++)
        {
            if (string.Equals(State.deckCardIds[i], fromStableId, StringComparison.Ordinal))
            {
                State.deckCardIds[i] = toStableId;
                SaveRun();
                return;
            }
        }
    }

    public void UseItem(ConsumableItemSO item)
    {
        if (item == null) return;
        if (EventQueue == null) return;

        for (int i = 0; i < item.effects.Count; i++)
        {
            RunEffect effect = item.effects[i];
            EventQueue.Enqueue(RunEffectExecutor.Execute(effect));
        }
    }

    private void EnsureEquipmentState()
    {
        if (State.equipments == null)
        {
            State.equipments = new List<EquipmentInstanceState>();
        }
    }

    public bool AddEquipmentById(string equipmentId)
    {
        if (string.IsNullOrWhiteSpace(equipmentId)) return false;
        EnsureEquipmentState();

        EquipmentSO def = EquipmentRegistry.GetById(equipmentId);
        if (def == null)
        {
            Debug.LogWarning($"[RunContext] AddEquipmentById failed: missing EquipmentSO for id={equipmentId}");
            return false;
        }

        var inst = new EquipmentInstanceState
        {
            equipmentId = def.equipmentId,
            stacks = def.kind == EquipmentKind.StackMultiplierOnSubmit
                ? Mathf.Max(0, def.initialStacks)
                : def.kind == EquipmentKind.ShopFreeRerollsConsumable
                    ? Mathf.Max(0, def.freeRerolls)
                    : 0,
            consumed = false,
        };

        State.equipments.Add(inst);
        RebuildShopCachesFromEquipments();
        SaveRun();
        return true;
    }

    public IEnumerable<(EquipmentInstanceState inst, EquipmentSO def)> EnumerateEquipments()
    {
        EnsureEquipmentState();

        for (int i = 0; i < State.equipments.Count; i++)
        {
            EquipmentInstanceState inst = State.equipments[i];
            if (inst == null || string.IsNullOrWhiteSpace(inst.equipmentId)) continue;

            EquipmentSO def = EquipmentRegistry.GetById(inst.equipmentId);
            if (def == null) continue;

            yield return (inst, def);
        }
    }

    public void OnShopOpened()
    {
        // Reroll price should start at 2 each time you enter a shop.
        State.shopRerollCount = 0;
        RebuildShopCachesFromEquipments();
        // New shop: always roll fresh offers.
        RegenerateShopOffers();
        SaveRun();
    }

    public int GetShopRerollCost()
    {
        if (State.shopFreeRerollsRemaining > 0) return 0;

        // 2,4,6,8,10... (cap 10 for now)
        int cost = 2 * (State.shopRerollCount + 1);
        return Mathf.Min(10, cost);
    }

    public bool TryShopReroll(out int costPaid, out bool usedFree)
    {
        costPaid = 0;
        usedFree = false;

        RebuildShopCachesFromEquipments();

        if (State.shopFreeRerollsRemaining > 0)
        {
            usedFree = true;
            ConsumeOneFreeRerollFromEquipments();
            State.shopFreeRerollsRemaining = Mathf.Max(0, State.shopFreeRerollsRemaining - 1);
            EnsureShopOffers();
            RegenerateShopOffers();
            SaveRun();
            return true;
        }

        int cost = GetShopRerollCost();
        if (!TrySpendCoins(cost)) return false;

        costPaid = cost;
        State.shopRerollCount += 1;
        EnsureShopOffers();
        RegenerateShopOffers();
        SaveRun();
        return true;
    }

    private void ConsumeOneFreeRerollFromEquipments()
    {
        EnsureEquipmentState();

        for (int i = 0; i < State.equipments.Count; i++)
        {
            var inst = State.equipments[i];
            if (inst == null || inst.consumed) continue;

            EquipmentSO def = EquipmentRegistry.GetById(inst.equipmentId);
            if (def == null || def.kind != EquipmentKind.ShopFreeRerollsConsumable) continue;
            if (inst.stacks <= 0) continue;

            inst.stacks -= 1;
            if (inst.stacks <= 0)
            {
                inst.stacks = 0;
                inst.consumed = true;
            }
            return;
        }
    }

    public void RebuildShopCachesFromEquipments()
    {
        EnsureEquipmentState();

        int total = 0;
        float discount = 0f;
        int coinsOnOpen = 0;
        for (int i = 0; i < State.equipments.Count; i++)
        {
            var inst = State.equipments[i];
            if (inst == null || inst.consumed) continue;

            EquipmentSO def = EquipmentRegistry.GetById(inst.equipmentId);
            if (def == null) continue;

            if (def.kind == EquipmentKind.ShopFreeRerollsConsumable)
            {
                total += Mathf.Max(0, inst.stacks);
            }
            else if (def.kind == EquipmentKind.ShopDiscountAll)
            {
                // Stack discounts multiplicatively-ish by taking max for now (simple and safe).
                discount = Mathf.Max(discount, Mathf.Clamp01(def.shopDiscountPercent));
            }
            else if (def.kind == EquipmentKind.CoinGainOnShopOpen)
            {
                coinsOnOpen += Mathf.Max(0, def.coinsOnShopOpen);
            }
        }

        State.shopFreeRerollsRemaining = total;
        State.shopDiscountPercent = discount;

        // One-shot coin injection on shop open: only apply when entering shop (caller handles).
        // We store cached value so UI/pricing can show it later if needed.
        if (coinsOnOpen > 0)
        {
            // Intentionally not auto-applied here to avoid double applying on every rebuild.
        }
    }

    public float GetShopDiscountPercent()
    {
        RebuildShopCachesFromEquipments();
        return Mathf.Clamp01(State.shopDiscountPercent);
    }

    public int ApplyShopPriceDiscount(int basePrice)
    {
        basePrice = Mathf.Max(0, basePrice);
        float d = GetShopDiscountPercent();
        if (d <= 0f) return basePrice;
        return Mathf.Max(0, Mathf.CeilToInt(basePrice * (1f - d)));
    }

    public int GrantCoinsFromShopOpenEquipments()
    {
        EnsureEquipmentState();
        int coins = 0;
        for (int i = 0; i < State.equipments.Count; i++)
        {
            var inst = State.equipments[i];
            if (inst == null || inst.consumed) continue;
            var def = EquipmentRegistry.GetById(inst.equipmentId);
            if (def == null) continue;
            if (def.kind != EquipmentKind.CoinGainOnShopOpen) continue;
            coins += Mathf.Max(0, def.coinsOnShopOpen);
        }

        if (coins > 0)
        {
            AddCoins(coins);
        }
        return coins;
    }

    private void EnsureShopOffers()
    {
        if (State.shopOffers == null) State.shopOffers = new List<ShopOfferState>();
        if (State.shopOffers.Count == 0)
        {
            RegenerateShopOffers();
        }
    }

    public void RegenerateShopOffers()
    {
        if (State.shopOffers == null) State.shopOffers = new List<ShopOfferState>();
        State.shopOffers.Clear();

        // 2 arcanas, 2 equips, 2 cards
        var allConsumables = ConsumableRegistry.GetAll();
        State.shopOffers.Add(new ShopOfferState { type = "consumable", id = PickRandomConsumable(allConsumables) });
        State.shopOffers.Add(new ShopOfferState { type = "consumable", id = PickRandomConsumable(allConsumables) });

        EquipmentRegistry.EnsureLoaded();
        var allEquip = Resources.LoadAll<EquipmentSO>("Roguelike/Equipments");
        State.shopOffers.Add(new ShopOfferState { type = "equipment", id = PickRandomEquipment(allEquip) });
        State.shopOffers.Add(new ShopOfferState { type = "equipment", id = PickRandomEquipment(allEquip) });

        var cardOfferA = BuildRandomCardOffer();
        var cardOfferB = BuildRandomCardOffer();
        State.shopOffers.Add(cardOfferA);
        State.shopOffers.Add(cardOfferB);
    }

    private static string PickRandomConsumable(List<ConsumableItemSO> all)
    {
        if (all == null || all.Count == 0) return null;
        var it = all[UnityEngine.Random.Range(0, all.Count)];
        return it != null ? it.itemId : null;
    }

    private static string PickRandomEquipment(EquipmentSO[] all)
    {
        if (all == null || all.Length == 0) return null;
        var it = all[UnityEngine.Random.Range(0, all.Length)];
        return it != null ? it.equipmentId : null;
    }

    private static ShopOfferState BuildRandomCardOffer()
    {
        var offer = new ShopOfferState { type = "card" };
        if (CardsDB.Instance == null || CardsDB.Instance.Cards == null || CardsDB.Instance.Cards.Count == 0)
        {
            offer.id = null;
            return offer;
        }

        // Pick a base card
        var cards = CardsDB.Instance.Cards;
        CardSO pick = null;
        for (int tries = 0; tries < 20; tries++)
        {
            var c = cards[UnityEngine.Random.Range(0, cards.Count)];
            if (c == null) continue;
            pick = c;
            break;
        }
        if (pick == null)
        {
            offer.id = null;
            return offer;
        }

        offer.id = ToStableCardId(pick);
        offer.modifiers = new List<CardCostModifierState>();

        int modCount = UnityEngine.Random.Range(1, 3);
        for (int i = 0; i < modCount; i++)
        {
            bool isMult = UnityEngine.Random.value < 0.35f;
            if (isMult)
            {
                float m = UnityEngine.Random.value < 0.5f ? 1.1f : 1.2f;
                offer.modifiers.Add(new CardCostModifierState { op = (int)Calculate.Multifier.Multiply, value = m });
            }
            else
            {
                int add = UnityEngine.Random.Range(2, 7);
                offer.modifiers.Add(new CardCostModifierState { op = (int)Calculate.Multifier.Add, value = add });
            }
        }

        return offer;
    }

    public int ApplyEquipmentsToScore(Dictionary<string, int> posCounts, int baseScore)
    {
        return ApplyEquipmentsToScore(posCounts, baseScore, out _);
    }

    public int ApplyEquipmentsToScore(Dictionary<string, int> posCounts, int baseScore, out List<EquipmentTriggerStep> steps)
    {
        steps = new List<EquipmentTriggerStep>();
        if (posCounts == null) return baseScore;
        int score = baseScore;

        EnsureEquipmentState();

        bool mutated = false;

        // Deterministic order: as stored in State (purchase/acquire order).
        for (int i = 0; i < State.equipments.Count; i++)
        {
            var inst = State.equipments[i];
            if (inst == null) continue;

            EquipmentSO eq = EquipmentRegistry.GetById(inst.equipmentId);
            if (eq == null) continue;

            string eqTitle = string.IsNullOrWhiteSpace(eq.title) ? eq.name : eq.title;

            switch (eq.kind)
            {
                case EquipmentKind.ScoreModifiers:
                {
                    for (int j = 0; j < eq.submitModifiers.Count; j++)
                    {
                        var mod = eq.submitModifiers[j];
                        if (string.IsNullOrWhiteSpace(mod.posId)) continue;

                        posCounts.TryGetValue(mod.posId, out int count);

                        switch (mod.type)
                        {
                            case SubmitModifierType.AddScorePerPosCount:
                            {
                                int before = score;
                                int delta = mod.addScore * count;
                                score += delta;
                                steps.Add(new EquipmentTriggerStep
                                {
                                    equipmentTitle = eqTitle,
                                    triggered = count > 0 && delta != 0,
                                    deltaText = delta >= 0 ? $"+{delta}" : delta.ToString(),
                                    scoreBefore = before,
                                    scoreAfter = score,
                                });
                                break;
                            }

                            case SubmitModifierType.MultiplyScoreIfPosPresent:
                            {
                                int before = score;
                                bool trig = count > 0;
                                if (trig)
                                {
                                    score = Mathf.FloorToInt(score * Mathf.Max(0f, mod.multiplyScore));
                                }
                                steps.Add(new EquipmentTriggerStep
                                {
                                    equipmentTitle = eqTitle,
                                    triggered = trig,
                                    deltaText = $"x{mod.multiplyScore:0.##}",
                                    scoreBefore = before,
                                    scoreAfter = score,
                                });
                                break;
                            }
                        }
                    }
                    break;
                }

                case EquipmentKind.StackMultiplierOnSubmit:
                {
                    int before = score;
                    bool trig = !inst.consumed && inst.stacks > 0;
                    if (trig)
                    {
                        score = Mathf.FloorToInt(score * Mathf.Max(0f, eq.stackMultiplier));
                        inst.stacks -= 1;
                        if (inst.stacks <= 0)
                        {
                            inst.stacks = 0;
                            inst.consumed = true;
                        }
                        mutated = true;
                    }

                    steps.Add(new EquipmentTriggerStep
                    {
                        equipmentTitle = eqTitle,
                        triggered = trig,
                        deltaText = trig ? $"x{eq.stackMultiplier:0.##} ({inst.stacks} left)" : "(no stacks)",
                        scoreBefore = before,
                        scoreAfter = score,
                    });
                    break;
                }

                case EquipmentKind.ShopFreeRerollsConsumable:
                default:
                    // Not a submit-time score modifier.
                    break;
            }
        }

        if (mutated)
        {
            RebuildShopCachesFromEquipments();
            SaveRun();
        }

        return score;
    }

    [UnityEngine.ContextMenu("Save Run")]
    public void SaveRun()
    {
        RunSaveManager.Save(State);
    }

    [UnityEngine.ContextMenu("Load Run")]
    public void LoadRun()
    {
        if (!RunSaveManager.TryLoad(out var loaded))
        {
            Debug.Log("[RunContext] No save to load.");
            return;
        }

        State = loaded;

        // Backward-compat defaults
        EnsureConsumableState();
        EnsureEquipmentState();
        if (State.deckCards == null) State.deckCards = new List<CardInstanceState>();
        if ((State.deckCards == null || State.deckCards.Count == 0) && State.deckCardIds != null && State.deckCardIds.Count > 0)
        {
            State.deckCards = State.deckCardIds.Select(id => new CardInstanceState { stableId = id }).ToList();
        }

        // Push into stats so UI updates.
        Stats.SetInt(RunStatKey.BlindIndex, State.blindIndex);
        Stats.SetInt(RunStatKey.EnemyHp, State.enemyHp);
        Stats.SetInt(RunStatKey.Hands, State.hands);
        Stats.SetInt(RunStatKey.Discards, State.discards);
        Stats.SetInt(RunStatKey.Coins, State.coins);
        Stats.SetInt(RunStatKey.ConsumableCount, State.consumableItemIds != null ? State.consumableItemIds.Count : 0);

        RebuildShopCachesFromEquipments();
        EnsureShopOffers();

        Debug.Log("[RunContext] Loaded run state.");
    }

    [UnityEngine.ContextMenu("Reset Run")]
    public void ResetRun()
    {
        State = new RunState();
        EnsureConsumableState();
        EnsureEquipmentState();
        if (State.deckCards == null) State.deckCards = new List<CardInstanceState>();
        if (State.deckCardIds == null) State.deckCardIds = new List<string>();

        Stats.SetInt(RunStatKey.BlindIndex, 0);
        Stats.SetInt(RunStatKey.EnemyHp, 0);
        Stats.SetInt(RunStatKey.Hands, 0);
        Stats.SetInt(RunStatKey.Discards, 0);
        Stats.SetInt(RunStatKey.Coins, 0);
        Stats.SetInt(RunStatKey.ConsumableCount, 0);
        Stats.SetInt(RunStatKey.ArcanaSelectedIndex, -1);

        RunSaveManager.Delete();
        Debug.Log("[RunContext] Reset run.");
    }

    public static string ToStableCardId(CardSO card)
    {
        if (card == null) return string.Empty;

        // Match CardSO.CreateClone() logic: Title with digits removed.
        string title = card.Title ?? string.Empty;
        return new string(title.Where(c => !char.IsDigit(c)).ToArray());
    }

    public static CardSO FindCardByStableId(string stableId)
    {
        if (string.IsNullOrWhiteSpace(stableId)) return null;

        var cards = CardsDB.Instance.Cards;
        for (int i = 0; i < cards.Count; i++)
        {
            var c = cards[i];
            if (c == null) continue;
            if (string.Equals(ToStableCardId(c), stableId, StringComparison.Ordinal))
            {
                return c;
            }
        }

        return null;
    }

    public List<CardSO> BuildDeckCards(bool cloneCards)
    {
        var result = new List<CardSO>();
        // Preferred: deckCards with per-card modifiers
        if (State.deckCards != null && State.deckCards.Count > 0)
        {
            for (int i = 0; i < State.deckCards.Count; i++)
            {
                var inst = State.deckCards[i];
                if (inst == null || string.IsNullOrWhiteSpace(inst.stableId)) continue;

                CardSO baseCard = FindCardByStableId(inst.stableId);
                if (baseCard == null) continue;

                // Always clone if modifiers exist (to avoid mutating DB assets).
                bool needClone = cloneCards || (inst.modifiers != null && inst.modifiers.Count > 0);
                CardSO card = needClone ? baseCard.CreateClone() : baseCard;

                if (inst.modifiers != null && inst.modifiers.Count > 0)
                {
                    for (int m = 0; m < inst.modifiers.Count; m++)
                    {
                        var sm = inst.modifiers[m];
                        card.AddCostModifier((TCG_CardMaker.Calculate.Multifier)sm.op, sm.value);
                    }
                }

                result.Add(card);
            }

            return result;
        }

        // Legacy fallback: ids only
        if (State.deckCardIds == null) return result;
        foreach (string id in State.deckCardIds)
        {
            CardSO baseCard = FindCardByStableId(id);
            if (baseCard == null) continue;
            result.Add(cloneCards ? baseCard.CreateClone() : baseCard);
        }

        return result;
    }
}
