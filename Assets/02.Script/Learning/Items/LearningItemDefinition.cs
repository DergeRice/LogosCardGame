using System.Collections.Generic;
using UnityEngine;

[CreateAssetMenu(menuName = "Learning/Item Definition", fileName = "LearningItem")]
public class LearningItemDefinition : ScriptableObject
{
    public string itemId;
    public string displayName;
    [TextArea] public string description;
    public string iconResourcePath;
    public Sprite icon;
    public LearningItemRarity rarity = LearningItemRarity.B;
    public int price = 3;
    public LearningItemUseMode useMode = LearningItemUseMode.ExplorationAndBattle;
    public bool consumable = true;
    public int stackValue;
    public int maxStackValue;
    public string stackResetTiming;
    public bool removeWhenStackZero;
    public List<LearningItemEffect> effects = new List<LearningItemEffect>();

    public bool CanUseIn(LearningModeType mode)
    {
        if (mode == LearningModeType.Exploration)
            return useMode == LearningItemUseMode.ExplorationOnly || useMode == LearningItemUseMode.ExplorationAndBattle;
        if (mode == LearningModeType.Battle)
            return useMode == LearningItemUseMode.BattleOnly || useMode == LearningItemUseMode.ExplorationAndBattle;
        return false;
    }
}
