using System;
using System.Collections.Generic;

[Serializable]
public class RunState
{
    public int chapterIndex;
    public int stageIndex;

    // 0: small1, 1: small2, 2: big
    public int blindIndex;

    public int enemyHp;
    public int hands;
    public int discards;

    public int coins;

    // Permanent score baseline modifiers.
    public int baseScoreAdd;
    public float baseScoreMultiply = 1f;

    // Hand-type upgrades (index 0..4 => type 1..5)
    public int[] handTypeAdd = new int[5];
    public float[] handTypeMultiply = new float[5] { 1f, 1f, 1f, 1f, 1f };
    public int[] handTypeUseCount = new int[5];

    // Shop state
    public int shopRerollCount;
    public int shopFreeRerollsRemaining;
    public float shopDiscountPercent; // cached from equipments for convenience

    // Current shop offers (persist across save/load while shop is open)
    public List<ShopOfferState> shopOffers = new List<ShopOfferState>();

    // Equipment instances (runtime state)
    public List<EquipmentInstanceState> equipments = new List<EquipmentInstanceState>();

    // Consumables (Arcana) in inventory (store itemId, order matters)
    public List<string> consumableItemIds = new List<string>();

    // Persist by stable id (Title without digits, matches CardSO.CardPOS logic)
    public List<string> deckCardIds = new List<string>();

    // Preferred deck storage (supports per-card bonus modifiers bought from shop).
    public List<CardInstanceState> deckCards = new List<CardInstanceState>();

    // TODO: fill later with real upgrade system
    public List<string> upgradeIds = new List<string>();

    public int version = 1;
}

[Serializable]
public class CardInstanceState
{
    public string stableId;
    public List<CardCostModifierState> modifiers = new List<CardCostModifierState>();
}

[Serializable]
public struct CardCostModifierState
{
    // int-cast of TCG_CardMaker.Calculate.Multifier
    public int op;
    public float value;
}

[Serializable]
public class EquipmentInstanceState
{
    public string equipmentId;
    public int stacks;
    public bool consumed;
}

[Serializable]
public class ShopOfferState
{
    // "consumable" | "equipment" | "card"
    public string type;
    public bool sold;

    // common id (consumable itemId / equipmentId / card stableId)
    public string id;

    // for cards: serialized modifiers
    public List<CardCostModifierState> modifiers = new List<CardCostModifierState>();
}
