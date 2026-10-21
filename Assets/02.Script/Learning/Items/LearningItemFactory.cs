using UnityEngine;

public static class LearningItemFactory
{
    public static LearningItemDefinition CreateRuntimeDefinition(LearningItemRecord record)
    {
        if (record == null) return null;

        LearningItemDefinition item = ScriptableObject.CreateInstance<LearningItemDefinition>();
        item.itemId = record.itemId;
        item.displayName = record.displayName;
        item.description = record.description;
        item.iconResourcePath = record.iconResourcePath;
        item.icon = record.icon != null ? record.icon : LearningItemDatabase.ResolveIcon(record.iconResourcePath, record.itemId);
        item.rarity = record.rarity;
        item.price = LearningItemDatabase.GetPrice(record);
        item.useMode = record.useMode;
        item.consumable = record.consumable;
        item.stackValue = record.stackValue;
        item.maxStackValue = record.maxStackValue;
        item.stackResetTiming = record.stackResetTiming;
        item.removeWhenStackZero = record.removeWhenStackZero;
        item.effects = record.effects != null
            ? new System.Collections.Generic.List<LearningItemEffect>(record.effects)
            : new System.Collections.Generic.List<LearningItemEffect>();
        return item;
    }
}
