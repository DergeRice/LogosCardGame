using System;
using UnityEngine;
using UnityEngine.Purchasing;

[Serializable]
public class LearningIapProductConfig
{
    [Tooltip("Google Play / App Store product ID. Use the same ID on both stores until store-specific IDs are needed.")]
    public string productId;
    public ProductType productType;
    [Tooltip("Only used by the stamina consumable.")]
    [Min(1)] public int staminaAmount = StaminaManager.MaxStamina;
}

[CreateAssetMenu(menuName = "Learning/IAP Settings", fileName = "LearningIapSettings")]
public class LearningIapSettings : ScriptableObject
{
    public LearningIapProductConfig staminaPack = new LearningIapProductConfig
    {
        productId = "com.baragames.logoscardgame.stamina_pack",
        productType = ProductType.Consumable,
        staminaAmount = StaminaManager.MaxStamina,
    };

    public LearningIapProductConfig adRemoval = new LearningIapProductConfig
    {
        productId = "com.baragames.logoscardgame.remove_ads",
        productType = ProductType.NonConsumable,
        staminaAmount = 1,
    };
}
