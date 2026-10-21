using System.Collections.Generic;
using UnityEngine;

[System.Serializable]
public class LearningSavedItemInventory
{
    public List<LearningSavedItemState> items = new List<LearningSavedItemState>();
}

[System.Serializable]
public class LearningSavedItemState
{
    public string itemId;
    public int stackValue;
    public int maxStackValue;
}

public class LearningItemInventory : MonoBehaviour
{
    private const int BaseExplorationSlots = 3;
    [SerializeField] private int maxSlots = 2;
    [SerializeField] private List<LearningItemDefinition> items = new List<LearningItemDefinition>();

    public IReadOnlyList<LearningItemDefinition> Items => items;
    public int MaxSlots => maxSlots;
    public bool IsFull => items.Count >= maxSlots;

    public void SetMaxSlots(int slots)
    {
        maxSlots = Mathf.Clamp(slots, 2, 5);
    }

    public bool CanAdd(LearningItemDefinition item)
    {
        if (item == null) return false;
        if (!IsFull) return true;
        return Mathf.Clamp(maxSlots + GetSlotExpansion(item), 2, 5) > maxSlots;
    }

    public bool TryAdd(LearningItemDefinition item)
    {
        if (!CanAdd(item)) return false;
        if (IsFull)
        {
            SetMaxSlots(maxSlots + GetSlotExpansion(item));
            LearningExplorationRunState.SetItemSlots(maxSlots);
        }
        items.Add(item);
        ReconcileExplorationSlotCapacity();
        SaveExplorationInventory();
        return true;
    }

    public bool TryRemove(LearningItemDefinition item)
    {
        bool removed = item != null && items.Remove(item);
        if (removed) SaveExplorationInventory();
        return removed;
    }

    public void Clear()
    {
        items.Clear();
        SaveExplorationInventory();
    }

    public void LoadExplorationInventory()
    {
        items.Clear();
        LearningSavedItemInventory saved = LearningExplorationRunState.LoadInventory();
        if (saved == null || saved.items == null) return;

        for (int i = 0; i < saved.items.Count; i++)
        {
            if (items.Count >= maxSlots)
            {
                Debug.LogWarning("[LearningItemInventory] Saved inventory exceeds the current slot limit. Extra items were ignored.");
                break;
            }

            LearningSavedItemState state = saved.items[i];
            if (state == null || string.IsNullOrWhiteSpace(state.itemId)) continue;
            LearningItemRecord record = LearningItemDatabase.GetItemById(LearningModeType.Exploration, state.itemId);
            LearningItemDefinition item = LearningItemFactory.CreateRuntimeDefinition(record);
            if (item == null)
            {
                Debug.LogWarning($"[LearningItemInventory] Load inventory failed: itemId={state.itemId} not found or invalid.");
                continue;
            }
            item.maxStackValue = Mathf.Max(0, state.maxStackValue);
            item.stackValue = item.maxStackValue > 0
                ? Mathf.Clamp(state.stackValue, 0, item.maxStackValue)
                : Mathf.Max(0, state.stackValue);
            items.Add(item);
        }

        ReconcileExplorationSlotCapacity();
    }

    public void SaveExplorationInventory()
    {
        var saved = new LearningSavedItemInventory();
        for (int i = 0; i < items.Count; i++)
        {
            LearningItemDefinition item = items[i];
            if (item == null) continue;
            saved.items.Add(new LearningSavedItemState
            {
                itemId = item.itemId,
                stackValue = item.stackValue,
                maxStackValue = item.maxStackValue,
            });
        }

        LearningExplorationRunState.SaveInventory(saved);
    }

    public void ReconcileExplorationSlotCapacity()
    {
        int desiredSlots = BaseExplorationSlots;
        for (int i = 0; i < items.Count; i++)
        {
            desiredSlots += GetSlotExpansion(items[i]);
        }

        desiredSlots = Mathf.Clamp(desiredSlots, 2, 5);
        if (desiredSlots <= maxSlots) return;
        SetMaxSlots(desiredSlots);
        LearningExplorationRunState.SetItemSlots(maxSlots);
    }

    private static int GetSlotExpansion(LearningItemDefinition item)
    {
        if (item?.effects == null) return 0;
        int expansion = 0;
        for (int i = 0; i < item.effects.Count; i++)
        {
            if (item.effects[i].effectType == LearningItemEffectType.AddItemSlots)
            {
                expansion += Mathf.Max(0, item.effects[i].intValue);
            }
        }
        return expansion;
    }
}
