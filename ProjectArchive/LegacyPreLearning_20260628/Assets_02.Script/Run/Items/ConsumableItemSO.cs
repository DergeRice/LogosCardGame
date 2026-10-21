using System.Collections.Generic;
using UnityEngine;

[CreateAssetMenu(fileName = "ConsumableItem", menuName = "Roguelike/Consumable Item", order = 2)]
public class ConsumableItemSO : ScriptableObject
{
    [Header("Id")]
    public string itemId;

    public string title;
    [TextArea] public string description;

    public List<RunEffect> effects = new List<RunEffect>();
}
