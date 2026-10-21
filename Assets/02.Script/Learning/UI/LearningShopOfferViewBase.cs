using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

public abstract class LearningShopOfferViewBase : MonoBehaviour
{
    [SerializeField] protected Button button;
    [SerializeField] protected Image iconImage;
    [SerializeField] protected Image coinIconImage;
    [SerializeField] protected TMP_Text nameText;
    [SerializeField] protected TMP_Text rarityText;
    [SerializeField] protected TMP_Text descriptionText;
    [SerializeField] protected TMP_Text priceText;
    [SerializeField] protected Sprite coinIconSprite;
    [SerializeField] protected LearningCurrencySlotView purchaseCurrencyView;

    public void BindEmpty(string label)
    {
        EnsureBuilt(true);
        if (nameText != null) nameText.text = label;
        if (descriptionText != null) descriptionText.text = label;
        if (rarityText != null) rarityText.text = string.Empty;
        if (priceText != null) priceText.text = string.Empty;
        if (iconImage != null) iconImage.color = new Color(1f, 1f, 1f, 0.28f);
        if (button != null) button.interactable = false;
        if (purchaseCurrencyView != null) purchaseCurrencyView.gameObject.SetActive(false);
    }

    protected void BindClick(UnityAction onClick)
    {
        if (button == null) return;
        button.interactable = true;
        button.onClick.RemoveAllListeners();
        if (onClick != null) button.onClick.AddListener(onClick);
    }

    protected void BindPurchaseCurrency(int price, UnityAction onClick)
    {
        if (purchaseCurrencyView == null)
        {
            GameObject currencyGo = FindDeepObject("CurrencyHudPrefab", "PriceCurrency", "BuyCurrency");
            if (currencyGo != null) purchaseCurrencyView = currencyGo.GetComponent<LearningCurrencySlotView>();
        }

        if (purchaseCurrencyView != null)
        {
            purchaseCurrencyView.gameObject.SetActive(true);
            purchaseCurrencyView.BindPrice(price, LearningUiSkin.ResolveCoinIconSprite(coinIconSprite), onClick);
            return;
        }

        BindClick(onClick);
    }

    protected void EnsureBuilt(bool itemStyle)
    {
        if (button == null) button = GetComponent<Button>();
        if (iconImage == null) iconImage = FindDeepImageOutside("CurrencyHudPrefab", "Icon", "ItemIcon", "CardIcon");
        if (coinIconImage == null) coinIconImage = FindDeepImage("CoinIcon");
        TMP_Text fallbackText = FindDeepText("Text", "LabelText", "NameText", "TitleText");
        if (nameText == null) nameText = FindDeepText("NameText", "TitleText", "LabelText", "Text");
        if (rarityText == null) rarityText = FindDeepText("RarityText");
        if (descriptionText == null) descriptionText = FindDeepText("Des", "DescriptionText", "BonusText", "MultiplierText");
        if (priceText == null) priceText = FindDeepText("PriceText");
        if (purchaseCurrencyView == null)
        {
            GameObject currencyGo = FindDeepObject("CurrencyHudPrefab", "PriceCurrency", "BuyCurrency");
            if (currencyGo != null) purchaseCurrencyView = currencyGo.GetComponent<LearningCurrencySlotView>();
        }

        if (iconImage == null) Debug.LogWarning($"[LearningShopOfferViewBase] Icon child not found on {name}.");
        if (nameText == null) nameText = fallbackText;
        if (nameText == null && descriptionText == null) Debug.LogWarning($"[LearningShopOfferViewBase] Text child not found on {name}.");

        if (coinIconImage != null)
        {
            coinIconImage.sprite = LearningUiSkin.ResolveCoinIconSprite(coinIconSprite);
            coinIconImage.preserveAspect = true;
            coinIconImage.color = Color.white;
        }
    }

    protected void SetTextLines(string title, string rarity, string description, string price)
    {
        bool singleText = nameText != null && rarityText == null && descriptionText == null && priceText == null;
        if (singleText)
        {
            nameText.text = $"{title}\n{rarity}\n{description}\n{price}";
            return;
        }

        if (nameText != null) nameText.text = title;
        if (rarityText != null) rarityText.text = rarity;
        if (descriptionText != null) descriptionText.text = description;
        if (priceText != null) priceText.text = price;
    }

    protected void SetIcon(Sprite icon)
    {
        if (iconImage == null) return;
        iconImage.sprite = icon;
        iconImage.preserveAspect = true;
        iconImage.color = icon != null ? Color.white : new Color(1f, 1f, 1f, 0.35f);
    }

    protected GameObject FindDeepObject(params string[] names)
    {
        Transform found = FindDeepTransform(transform, names);
        return found != null ? found.gameObject : null;
    }

    protected Image FindDeepImage(params string[] names)
    {
        Transform found = FindDeepTransform(transform, names);
        return found != null ? found.GetComponent<Image>() : null;
    }

    protected Image FindDeepImageOutside(string excludedAncestorName, params string[] names)
    {
        Transform found = FindDeepTransformOutside(transform, excludedAncestorName, names);
        return found != null ? found.GetComponent<Image>() : null;
    }

    protected TMP_Text FindDeepText(params string[] names)
    {
        Transform found = FindDeepTransform(transform, names);
        if (found != null && found.TryGetComponent(out TMP_Text text)) return text;
        return null;
    }

    protected Transform FindDeepTransform(Transform root, params string[] names)
    {
        if (root == null) return null;
        for (int i = 0; i < names.Length; i++)
        {
            if (NameMatches(root.name, names[i])) return root;
        }

        for (int i = 0; i < root.childCount; i++)
        {
            Transform found = FindDeepTransform(root.GetChild(i), names);
            if (found != null) return found;
        }
        return null;
    }

    protected Transform FindDeepTransformOutside(Transform root, string excludedAncestorName, params string[] names)
    {
        if (root == null) return null;
        if (NameMatches(root.name, excludedAncestorName)) return null;

        for (int i = 0; i < names.Length; i++)
        {
            if (NameMatches(root.name, names[i])) return root;
        }

        for (int i = 0; i < root.childCount; i++)
        {
            Transform found = FindDeepTransformOutside(root.GetChild(i), excludedAncestorName, names);
            if (found != null) return found;
        }
        return null;
    }

    protected List<Transform> FindDeepTransformsStartingWith(string prefix)
    {
        var result = new List<Transform>();
        CollectDeepTransformsStartingWith(transform, prefix, result);
        return result;
    }

    private void CollectDeepTransformsStartingWith(Transform root, string prefix, List<Transform> result)
    {
        if (root == null) return;
        if (!string.IsNullOrEmpty(prefix) && root.name.StartsWith(prefix, System.StringComparison.OrdinalIgnoreCase))
        {
            result.Add(root);
        }

        for (int i = 0; i < root.childCount; i++)
        {
            CollectDeepTransformsStartingWith(root.GetChild(i), prefix, result);
        }
    }

    private static bool NameMatches(string actual, string expected)
    {
        if (string.IsNullOrEmpty(actual) || string.IsNullOrEmpty(expected)) return false;
        return actual.Equals(expected, System.StringComparison.OrdinalIgnoreCase) ||
               actual.StartsWith(expected + " (", System.StringComparison.OrdinalIgnoreCase);
    }
}
