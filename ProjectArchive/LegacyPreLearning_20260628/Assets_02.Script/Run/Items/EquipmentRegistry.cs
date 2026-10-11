using System.Collections.Generic;
using UnityEngine;

public static class EquipmentRegistry
{
    private const string ResourcesPath = "Roguelike/Equipments";

    private static bool _loaded;
    private static readonly Dictionary<string, EquipmentSO> _byId = new Dictionary<string, EquipmentSO>();

    public static EquipmentSO GetById(string equipmentId)
    {
        if (string.IsNullOrWhiteSpace(equipmentId)) return null;
        EnsureLoaded();

        return _byId.TryGetValue(equipmentId, out var eq) ? eq : null;
    }

    public static void EnsureLoaded()
    {
        if (_loaded) return;
        _loaded = true;

        _byId.Clear();

        EquipmentSO[] all = Resources.LoadAll<EquipmentSO>(ResourcesPath);
        for (int i = 0; i < all.Length; i++)
        {
            EquipmentSO eq = all[i];
            if (eq == null) continue;

            string id = eq.equipmentId;
            if (string.IsNullOrWhiteSpace(id))
            {
                // Allow iteration without hard-crashing if some assets are missing ids.
                continue;
            }

            if (_byId.ContainsKey(id))
            {
                Debug.LogWarning($"[EquipmentRegistry] Duplicate equipmentId={id} (asset={eq.name})");
                continue;
            }

            _byId.Add(id, eq);
        }
    }
}

