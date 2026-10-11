using System.Collections.Generic;
using UnityEngine;

[CreateAssetMenu(fileName = "Equipment", menuName = "Roguelike/Equipment", order = 1)]
public class EquipmentSO : ScriptableObject
{
    [Header("Id")]
    public string equipmentId;

    public string title;
    [TextArea] public string description;

    [Header("Kind")]
    public EquipmentKind kind = EquipmentKind.ScoreModifiers;

    [Header("Stack Multiplier (Kind=StackMultiplierOnSubmit)")]
    public int initialStacks = 20;
    public float stackMultiplier = 2f;

    [Header("Shop Free Rerolls (Kind=ShopFreeRerollsConsumable)")]
    public int freeRerolls = 10;

    [Header("Shop Discount (Kind=ShopDiscountAll)")]
    [Range(0f, 0.9f)] public float shopDiscountPercent = 0.2f;

    [Header("Coin Gain (Kind=CoinGainOnShopOpen)")]
    public int coinsOnShopOpen = 5;

    // Passive effects applied on submit.
    public List<SubmitModifier> submitModifiers = new List<SubmitModifier>();
}

[System.Serializable]
public class SubmitModifier
{
    public SubmitModifierType type;

    // For POS-based modifiers
    public string posId;

    public int addScore;
    public float multiplyScore = 1f;
}

public enum SubmitModifierType
{
    AddScorePerPosCount,
    MultiplyScoreIfPosPresent,
}

public enum EquipmentKind
{
    ScoreModifiers,
    StackMultiplierOnSubmit,
    ShopFreeRerollsConsumable,
    ShopDiscountAll,
    CoinGainOnShopOpen,
}
