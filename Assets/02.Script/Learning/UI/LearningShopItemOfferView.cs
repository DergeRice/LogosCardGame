using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

public class LearningShopItemOfferView : LearningShopOfferViewBase
{
    [Header("Targets")]
    [SerializeField] private Image rootBackgroundImage;

    [Header("B Grade Colors")]
    [SerializeField] private Color bBackgroundColor = new Color(0.42f, 0.72f, 0.42f, 1f);
    [SerializeField] private Color bPurchaseButtonColor = new Color(0.32f, 0.62f, 0.32f, 1f);

    [Header("A Grade Colors")]
    [SerializeField] private Color aBackgroundColor = new Color(0.38f, 0.58f, 0.95f, 1f);
    [SerializeField] private Color aPurchaseButtonColor = new Color(0.24f, 0.45f, 0.88f, 1f);

    [Header("S Grade Colors")]
    [SerializeField] private Color sBackgroundColor = new Color(1f, 0.76f, 0.22f, 1f);
    [SerializeField] private Color sPurchaseButtonColor = new Color(0.95f, 0.48f, 0.12f, 1f);

    public void Bind(LearningItemRecord item, int price, Sprite icon, UnityAction onClick)
    {
        EnsureBuilt(true);
        SetIcon(icon);

        if (descriptionText != null)
        {
            descriptionText.text = item != null ? item.description : string.Empty;
        }

        if (nameText != null)
        {
            nameText.text = item != null ? item.displayName : "아이템";
        }

        LearningItemRarity rarity = item != null ? item.rarity : LearningItemRarity.B;
        SetRarityVisual(rarity);
        BindPurchaseCurrency(price, onClick);
    }

    private void SetRarityVisual(LearningItemRarity rarity)
    {
        SetStarsActive(rarity);

        Color backgroundColor = GetRarityBackgroundColor(rarity);
        Color purchaseButtonColor = GetRarityPurchaseButtonColor(rarity);
        ApplyRootBackgroundColor(backgroundColor);
        ApplyColorIfExists("BgBottom", purchaseButtonColor);
        ApplyStarsColor(purchaseButtonColor);

    }

    private void SetStarsActive(LearningItemRarity rarity)
    {
        SetGroupActive("B Stars", rarity == LearningItemRarity.B);
        SetGroupActive("A Stars", rarity == LearningItemRarity.A);
        SetGroupActive("S Stars", rarity == LearningItemRarity.S);
    }

    private void ApplyRootBackgroundColor(Color color)
    {
        if (rootBackgroundImage == null)
        {
            rootBackgroundImage = GetComponent<Image>();
        }

        if (rootBackgroundImage != null)
        {
            rootBackgroundImage.color = color;
        }
    }

    private void ApplyStarsColor(Color color)
    {
        ApplyColorIfExists("B Stars", color);
        ApplyColorIfExists("A Stars", color);
        ApplyColorIfExists("S Stars", color);
    }

    private void SetGroupActive(string prefix, bool active)
    {
        List<Transform> groups = FindDeepTransformsStartingWith(prefix);
        for (int i = 0; i < groups.Count; i++)
        {
            groups[i].gameObject.SetActive(active);
        }
    }

    private void ApplyColorIfExists(string prefix, Color color)
    {
        List<Transform> targets = FindDeepTransformsStartingWith(prefix);
        for (int i = 0; i < targets.Count; i++)
        {
            Image image = targets[i].GetComponent<Image>();
            if (image != null) image.color = color;
        }
    }

    private Color GetRarityBackgroundColor(LearningItemRarity rarity)
    {
        switch (rarity)
        {
            case LearningItemRarity.A:
                return aBackgroundColor;
            case LearningItemRarity.S:
                return sBackgroundColor;
            default:
                return bBackgroundColor;
        }
    }

    private Color GetRarityPurchaseButtonColor(LearningItemRarity rarity)
    {
        switch (rarity)
        {
            case LearningItemRarity.A:
                return aPurchaseButtonColor;
            case LearningItemRarity.S:
                return sPurchaseButtonColor;
            default:
                return bPurchaseButtonColor;
        }
    }
}
