using System.Collections.Generic;
using UnityEngine;

[System.Serializable]
public class LearningSavedShopOffers
{
    public List<string> itemIds = new List<string>();
    public List<LearningDeckCard> cardOffers = new List<LearningDeckCard>();
}

[System.Serializable]
public class LearningSavedExplorationBattleState
{
    public bool active;
    public int chapter;
    public int blindIndex;
    public int blindHp;
    public int maxBlindHp;
    public int handsRemaining;
    public int dropsRemaining;
    public List<LearningDeckCard> sentenceCards = new List<LearningDeckCard>();
    public bool hasLastSubmittedPattern;
    public int lastSubmittedPattern;
    public int samePatternChain;
    public float dropStackMultiplier;
    public int supplyCardsAddedCount;
    public int submitStackMultiplier;
    public int passiveTriggerStackMultiplier;
}

public static class LearningExplorationRunState
{
    private const string ActiveKey = "learning.exploration.run.active";
    private const string ChapterKey = "learning.exploration.run.chapter";
    private const string BlindIndexKey = "learning.exploration.run.blindIndex";
    private const string BlindRuleKey = "learning.exploration.run.blindRule";
    private const string TierKey = "learning.exploration.run.tier";
    private const string DeckKey = "learning.exploration.run.deck";
    private const string ShopSlotsKey = "learning.exploration.run.shopSlots";
    private const string ItemSlotsKey = "learning.exploration.run.itemSlots";
    private const string CoinKey = "learning.exploration.run.coin";
    private const string ShopPendingKey = "learning.exploration.run.shopPending";
    private const string InventoryKey = "learning.exploration.run.inventory";
    private const string RerollCountKey = "learning.exploration.run.rerollCount";
    private const string ShopOffersKey = "learning.exploration.run.shopOffers";
    private const string BattleStateKey = "learning.exploration.run.battleState";
    private const string ShopDeckDeletePurchasedKey = "learning.exploration.run.shopDeckDeletePurchased";

    public static bool HasActiveRun => PlayerPrefs.GetInt(ActiveKey, 0) == 1;
    public static int Chapter => Mathf.Max(1, PlayerPrefs.GetInt(ChapterKey, 1));
    public static int BlindIndex => Mathf.Clamp(PlayerPrefs.GetInt(BlindIndexKey, 0), 0, 2);
    public static LearningBlindRuleType BlindRule => (LearningBlindRuleType)PlayerPrefs.GetInt(BlindRuleKey, (int)LearningBlindRuleType.None);
    public static LearningTier Tier => (LearningTier)PlayerPrefs.GetInt(TierKey, (int)LearningTier.Bronze);
    public static int ShopSlots => Mathf.Clamp(PlayerPrefs.GetInt(ShopSlotsKey, 3), 3, 5);
    public static int ItemSlots => Mathf.Clamp(PlayerPrefs.GetInt(ItemSlotsKey, 2), 2, 5);
    public static int Coin => Mathf.Max(0, PlayerPrefs.GetInt(CoinKey, 8));
    public static bool ShopPending => PlayerPrefs.GetInt(ShopPendingKey, 0) == 1;

    public static void StartNewRun()
    {
        StartNewRun(LearningTier.Bronze);
    }

    public static void StartNewRun(LearningTier tier)
    {
        LearningRunRandom.ResetNewRunSeed();
        LearningDeckTemplate naroDeck = LearningDeckRepository.GetNaroStartingDeck();
        LearningRunDeckState deck = LearningDeckRepository.CreateRunDeckFromTemplate(naroDeck);
        Save(1, 0, LearningBlindRuleType.None, tier, deck, 3, 3);
        SetCoin(8);
        SetShopPending(false);
        SaveInventory(new LearningSavedItemInventory());
        SetRerollCount(0);
        ClearShopOffers();
        ClearBattleState();
    }

    public static void Save(int chapter, int blindIndex, LearningBlindRuleType ruleType)
    {
        Save(chapter, blindIndex, ruleType, Tier, LoadDeck(), ShopSlots, ItemSlots);
    }

    public static void Save(int chapter, int blindIndex, LearningBlindRuleType ruleType, LearningTier tier, LearningRunDeckState deck, int shopSlots, int itemSlots)
    {
        PlayerPrefs.SetInt(ActiveKey, 1);
        PlayerPrefs.SetInt(ChapterKey, Mathf.Max(1, chapter));
        PlayerPrefs.SetInt(BlindIndexKey, Mathf.Clamp(blindIndex, 0, 2));
        PlayerPrefs.SetInt(BlindRuleKey, (int)ruleType);
        PlayerPrefs.SetInt(TierKey, (int)tier);
        PlayerPrefs.SetInt(ShopSlotsKey, Mathf.Clamp(shopSlots, 3, 5));
        PlayerPrefs.SetInt(ItemSlotsKey, Mathf.Clamp(itemSlots, 2, 5));
        if (deck != null)
        {
            PlayerPrefs.SetString(DeckKey, JsonUtility.ToJson(deck));
        }
        PlayerPrefs.Save();
    }

    public static void AddCoin(int amount)
    {
        SetCoin(Coin + Mathf.Max(0, amount));
    }

    public static bool TrySpendCoin(int amount)
    {
        amount = Mathf.Max(0, amount);
        if (Coin < amount) return false;
        SetCoin(Coin - amount);
        return true;
    }

    public static void SetCoin(int amount)
    {
        PlayerPrefs.SetInt(CoinKey, Mathf.Max(0, amount));
        PlayerPrefs.Save();
    }

    public static void SetShopPending(bool pending)
    {
        PlayerPrefs.SetInt(ShopPendingKey, pending ? 1 : 0);
        PlayerPrefs.Save();
    }

    public static void SetItemSlots(int slots)
    {
        PlayerPrefs.SetInt(ItemSlotsKey, Mathf.Clamp(slots, 2, 5));
        PlayerPrefs.Save();
    }

    public static void SetShopSlots(int slots)
    {
        PlayerPrefs.SetInt(ShopSlotsKey, Mathf.Clamp(slots, 3, 5));
        PlayerPrefs.Save();
    }

    public static int RerollCount => Mathf.Max(0, PlayerPrefs.GetInt(RerollCountKey, 0));
    public static bool HasSavedShopOffers => PlayerPrefs.HasKey(ShopOffersKey);
    public static bool ShopDeckDeletePurchased => PlayerPrefs.GetInt(ShopDeckDeletePurchasedKey, 0) == 1;

    public static void SetRerollCount(int count)
    {
        PlayerPrefs.SetInt(RerollCountKey, Mathf.Max(0, count));
        PlayerPrefs.Save();
    }

    public static void IncrementRerollCount()
    {
        SetRerollCount(RerollCount + 1);
    }

    public static void SetShopDeckDeletePurchased(bool purchased)
    {
        PlayerPrefs.SetInt(ShopDeckDeletePurchasedKey, purchased ? 1 : 0);
        PlayerPrefs.Save();
    }

    public static void SaveShopOffers(List<string> itemIds, List<LearningDeckCard> cardOffers)
    {
        var saved = new LearningSavedShopOffers();
        if (itemIds != null)
        {
            for (int i = 0; i < itemIds.Count; i++)
            {
                if (!string.IsNullOrWhiteSpace(itemIds[i])) saved.itemIds.Add(itemIds[i]);
            }
        }

        if (cardOffers != null)
        {
            for (int i = 0; i < cardOffers.Count; i++)
            {
                if (cardOffers[i] != null) saved.cardOffers.Add(cardOffers[i]);
            }
        }

        PlayerPrefs.SetString(ShopOffersKey, JsonUtility.ToJson(saved));
        PlayerPrefs.Save();
    }

    public static LearningSavedShopOffers LoadShopOffers()
    {
        string json = PlayerPrefs.GetString(ShopOffersKey, string.Empty);
        if (string.IsNullOrWhiteSpace(json)) return new LearningSavedShopOffers();
        LearningSavedShopOffers loaded = JsonUtility.FromJson<LearningSavedShopOffers>(json);
        return loaded ?? new LearningSavedShopOffers();
    }

    public static void ClearShopOffers()
    {
        PlayerPrefs.DeleteKey(ShopOffersKey);
        PlayerPrefs.DeleteKey(ShopDeckDeletePurchasedKey);
        PlayerPrefs.Save();
    }

    public static void SaveBattleState(LearningSavedExplorationBattleState state)
    {
        PlayerPrefs.SetString(BattleStateKey, JsonUtility.ToJson(state ?? new LearningSavedExplorationBattleState()));
        PlayerPrefs.Save();
    }

    public static LearningSavedExplorationBattleState LoadBattleState()
    {
        string json = PlayerPrefs.GetString(BattleStateKey, string.Empty);
        if (string.IsNullOrWhiteSpace(json)) return new LearningSavedExplorationBattleState();
        LearningSavedExplorationBattleState loaded = JsonUtility.FromJson<LearningSavedExplorationBattleState>(json);
        return loaded ?? new LearningSavedExplorationBattleState();
    }

    public static void ClearBattleState()
    {
        PlayerPrefs.DeleteKey(BattleStateKey);
        PlayerPrefs.Save();
    }

    public static void SaveInventory(LearningSavedItemInventory inventory)
    {
        PlayerPrefs.SetString(InventoryKey, JsonUtility.ToJson(inventory ?? new LearningSavedItemInventory()));
        PlayerPrefs.Save();
    }

    public static LearningSavedItemInventory LoadInventory()
    {
        string json = PlayerPrefs.GetString(InventoryKey, string.Empty);
        if (string.IsNullOrWhiteSpace(json)) return new LearningSavedItemInventory();
        LearningSavedItemInventory loaded = JsonUtility.FromJson<LearningSavedItemInventory>(json);
        return loaded ?? new LearningSavedItemInventory();
    }

    public static LearningRunDeckState LoadDeck()
    {
        LearningDeckTemplate naroDeck = LearningDeckRepository.GetNaroStartingDeck();
        string json = PlayerPrefs.GetString(DeckKey, string.Empty);
        if (!string.IsNullOrWhiteSpace(json))
        {
            LearningRunDeckState loaded = JsonUtility.FromJson<LearningRunDeckState>(json);
            if (loaded != null)
            {
                int added = LearningDeckRepository.AddMissingTemplateCardsToDrawPile(loaded, naroDeck);
                if (added > 0) SaveDeck(loaded);
                return loaded;
            }
        }

        return LearningDeckRepository.CreateRunDeckFromTemplate(naroDeck);
    }

    public static void SaveDeck(LearningRunDeckState deck)
    {
        if (deck == null) return;
        PlayerPrefs.SetString(DeckKey, JsonUtility.ToJson(deck));
        PlayerPrefs.Save();
    }

    public static void Clear()
    {
        PlayerPrefs.DeleteKey(ActiveKey);
        PlayerPrefs.DeleteKey(ChapterKey);
        PlayerPrefs.DeleteKey(BlindIndexKey);
        PlayerPrefs.DeleteKey(BlindRuleKey);
        PlayerPrefs.DeleteKey(TierKey);
        PlayerPrefs.DeleteKey(DeckKey);
        PlayerPrefs.DeleteKey(ShopSlotsKey);
        PlayerPrefs.DeleteKey(ItemSlotsKey);
        PlayerPrefs.DeleteKey(CoinKey);
        PlayerPrefs.DeleteKey(ShopPendingKey);
        PlayerPrefs.DeleteKey(InventoryKey);
        PlayerPrefs.DeleteKey(RerollCountKey);
        PlayerPrefs.DeleteKey(ShopOffersKey);
        PlayerPrefs.DeleteKey(BattleStateKey);
        PlayerPrefs.DeleteKey(ShopDeckDeletePurchasedKey);
        LearningRunRandom.Clear();
        PlayerPrefs.Save();
    }
}
