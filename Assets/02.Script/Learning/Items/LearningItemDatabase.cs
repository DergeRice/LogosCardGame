using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using UnityEngine;

[Serializable]
public class LearningItemDatabaseSet
{
    public List<LearningItemRecord> items = new List<LearningItemRecord>();
}

[Serializable]
public class LearningItemRecord
{
    public string itemId;
    public string displayName;
    public string description;
    public string iconResourcePath;
    [JsonIgnore] public Sprite icon;
    public LearningItemRarity rarity;
    public int price;
    public LearningItemUseMode useMode;
    public bool consumable = true;
    public int stackValue;
    public int maxStackValue;
    public string stackResetTiming;
    public bool removeWhenStackZero;
    public List<LearningItemEffect> effects = new List<LearningItemEffect>();
}

public static class LearningItemDatabase
{
    private const string ExplorationPath = "Learning/items/exploration_items";
    private const string BattlePath = "Learning/items/battle_items";
    private const string ItemIconConventionPath = "Learning/ItemIcons/";

    private static LearningItemDatabaseSet explorationItems;
    private static LearningItemDatabaseSet battleItems;
    private static readonly Dictionary<string, Sprite> iconCache = new Dictionary<string, Sprite>();

    public static IReadOnlyList<LearningItemRecord> GetItems(LearningModeType mode)
    {
        if (mode == LearningModeType.Battle)
        {
            if (battleItems == null) battleItems = Load(BattlePath);
            return battleItems.items;
        }

        if (explorationItems == null) explorationItems = Load(ExplorationPath);
        return explorationItems.items;
    }

    public static LearningItemRecord GetItemById(LearningModeType mode, string itemId)
    {
        if (string.IsNullOrWhiteSpace(itemId)) return null;
        IReadOnlyList<LearningItemRecord> items = GetItems(mode);
        for (int i = 0; i < items.Count; i++)
        {
            if (items[i] != null && items[i].itemId == itemId) return items[i];
        }
        return null;
    }

    public static int GetFixedPrice(LearningItemRarity rarity)
    {
        switch (rarity)
        {
            case LearningItemRarity.A:
                return 6;
            case LearningItemRarity.S:
                return 8;
            default:
                return 3;
        }
    }

    public static int GetPrice(LearningItemRecord item)
    {
        if (item == null) return 0;
        // The content JSON owns item-by-item balancing. Keep the rarity price only as a
        // backward-compatible fallback for old or incomplete records.
        return item.price > 0 ? item.price : GetFixedPrice(item.rarity);
    }

    public static List<LearningItemRecord> RollShopItems(LearningModeType mode, int count, IReadOnlyList<string> previousOfferIds)
    {
        IReadOnlyList<LearningItemRecord> source = GetItems(mode);
        var result = new List<LearningItemRecord>();
        var blocked = new HashSet<string>();
        if (previousOfferIds != null)
        {
            for (int i = 0; i < previousOfferIds.Count; i++)
            {
                blocked.Add(previousOfferIds[i]);
            }
        }

        int safeGuard = 0;
        while (result.Count < count && safeGuard++ < 200)
        {
            LearningItemRarity rarity = RollRarity();
            LearningItemRecord item = PickByRarity(source, rarity, blocked, result);
            if (item == null) item = PickByRarity(source, LearningItemRarity.B, blocked, result);
            if (item == null) break;
            result.Add(item);
        }
        return result;
    }

    private static LearningItemRarity RollRarity()
    {
        int roll = LearningRunRandom.Range(0, 100);
        if (roll < 50) return LearningItemRarity.B;
        if (roll < 95) return LearningItemRarity.A;
        return LearningItemRarity.S;
    }

    private static LearningItemRecord PickByRarity(IReadOnlyList<LearningItemRecord> source, LearningItemRarity rarity, HashSet<string> blocked, List<LearningItemRecord> current)
    {
        var candidates = new List<LearningItemRecord>();
        for (int i = 0; i < source.Count; i++)
        {
            LearningItemRecord item = source[i];
            if (item == null || item.rarity != rarity) continue;
            if (blocked != null && blocked.Contains(item.itemId)) continue;
            bool alreadyInCurrent = false;
            for (int j = 0; j < current.Count; j++)
            {
                if (current[j].itemId == item.itemId)
                {
                    alreadyInCurrent = true;
                    break;
                }
            }
            if (!alreadyInCurrent) candidates.Add(item);
        }

        if (candidates.Count == 0) return null;
        return candidates[LearningRunRandom.Range(0, candidates.Count)];
    }

    private static LearningItemDatabaseSet Load(string path)
    {
        TextAsset asset = Resources.Load<TextAsset>(path);
        if (asset == null)
        {
            Debug.LogWarning($"[LearningItemDatabase] Missing Resources/{path}.json");
            return new LearningItemDatabaseSet();
        }

        LearningItemDatabaseSet set = JsonConvert.DeserializeObject<LearningItemDatabaseSet>(asset.text);
        set ??= new LearningItemDatabaseSet();
        ResolveIcons(set);
        return set;
    }

    private static void ResolveIcons(LearningItemDatabaseSet set)
    {
        if (set == null || set.items == null) return;
        for (int i = 0; i < set.items.Count; i++)
        {
            LearningItemRecord item = set.items[i];
            if (item == null) continue;
            item.icon = ResolveIcon(item.iconResourcePath, item.itemId);
        }
    }

    public static Sprite ResolveIcon(string iconResourcePath, string itemId)
    {
        Sprite icon = LoadIcon(iconResourcePath, true);
        if (icon != null) return icon;
        return LoadIcon(string.IsNullOrWhiteSpace(itemId) ? string.Empty : ItemIconConventionPath + itemId, false);
    }

    private static Sprite LoadIcon(string resourcePath, bool warnIfMissing)
    {
        if (string.IsNullOrWhiteSpace(resourcePath)) return null;
        if (iconCache.TryGetValue(resourcePath, out Sprite cached)) return cached;

        Sprite loaded = Resources.Load<Sprite>(resourcePath);
        iconCache[resourcePath] = loaded;
        if (loaded == null && warnIfMissing)
        {
            Debug.LogWarning($"[LearningItemDatabase] Item icon not found. Resources/{resourcePath}");
        }
        return loaded;
    }
}
