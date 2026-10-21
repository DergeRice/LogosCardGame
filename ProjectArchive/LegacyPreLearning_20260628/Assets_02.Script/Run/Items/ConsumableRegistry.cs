using System.Collections.Generic;
using UnityEngine;

public static class ConsumableRegistry
{
    private const string ResourcesPath = "Roguelike/Consumables";

    private static bool _loaded;
    private static readonly Dictionary<string, ConsumableItemSO> _byId = new Dictionary<string, ConsumableItemSO>();

    public static ConsumableItemSO GetById(string itemId)
    {
        if (string.IsNullOrWhiteSpace(itemId)) return null;
        EnsureLoaded();
        return _byId.TryGetValue(itemId, out var it) ? it : null;
    }

    public static List<ConsumableItemSO> GetAll()
    {
        EnsureLoaded();
        return new List<ConsumableItemSO>(_byId.Values);
    }

    public static void EnsureLoaded()
    {
        if (_loaded) return;
        _loaded = true;

        _byId.Clear();
        var all = Resources.LoadAll<ConsumableItemSO>(ResourcesPath);
        for (int i = 0; i < all.Length; i++)
        {
            var it = all[i];
            if (it == null) continue;
            if (string.IsNullOrWhiteSpace(it.itemId)) continue;
            if (_byId.ContainsKey(it.itemId))
            {
                Debug.LogWarning($"[ConsumableRegistry] Duplicate itemId={it.itemId} (asset={it.name})");
                continue;
            }
            _byId.Add(it.itemId, it);
        }
    }
}

