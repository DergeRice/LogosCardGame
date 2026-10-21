using TMPro;
using UnityEngine.Events;
using UnityEngine;
using UnityEngine.UI;

public enum LearningCurrencyType
{
    Coin,
    Stamina,
}

public class LearningCurrencySlotView : MonoBehaviour
{
    [SerializeField] private LearningCurrencyType currencyType = LearningCurrencyType.Coin;
    [SerializeField] private Image iconImage;
    [SerializeField] private TMP_Text valueText;
    [SerializeField] private Sprite coinIcon;
    [SerializeField] private Button button;

    public void Bind(LearningCurrencyType type, Sprite icon = null)
    {
        currencyType = type;
        EnsureBuilt();
        if (iconImage != null)
        {
            iconImage.sprite = icon != null ? icon : LearningUiSkin.ResolveCoinIconSprite(coinIcon);
            iconImage.preserveAspect = true;
            iconImage.color = Color.white;
        }
        Refresh();
    }

    public void BindPrice(int amount, Sprite icon, UnityAction onClick)
    {
        EnsureBuilt();
        if (iconImage != null)
        {
            iconImage.sprite = icon != null ? icon : LearningUiSkin.ResolveCoinIconSprite(coinIcon);
            iconImage.preserveAspect = true;
            iconImage.color = Color.white;
        }

        if (valueText != null)
        {
            valueText.text = LearningNumberFormatter.Format(amount);
        }

        if (button != null)
        {
            button.interactable = true;
            button.onClick.RemoveAllListeners();
            if (onClick != null) button.onClick.AddListener(onClick);
        }
    }

    private void OnEnable()
    {
        EnsureBuilt();
        Refresh();
    }

    public void Refresh()
    {
        if (valueText == null) return;
        switch (currencyType)
        {
            case LearningCurrencyType.Stamina:
                StaminaManager.Refresh();
                valueText.text = $"{StaminaManager.Current}/{StaminaManager.MaxStamina}";
                break;
            default:
                valueText.text = LearningNumberFormatter.Format(LearningExplorationRunState.Coin);
                break;
        }
    }

    private void EnsureBuilt()
    {
        if (button == null) button = GetComponent<Button>();
        if (iconImage == null) iconImage = FindChildImage("Icon", "CoinIcon", "CurrencyIcon");
        if (valueText == null) valueText = FindChildText("ValueText", "CoinText", "CurrencyText", "Text", "LabelText");
        if (iconImage != null && valueText != null) return;

        if (iconImage == null)
        {
            Debug.LogWarning($"[LearningCurrencySlotView] Icon child not found on {name}.");
        }

        if (valueText == null)
        {
            Debug.LogWarning($"[LearningCurrencySlotView] Text child not found on {name}.");
        }
    }

    private Image FindChildImage(params string[] names)
    {
        for (int i = 0; i < names.Length; i++)
        {
            Transform child = transform.Find(names[i]);
            if (child != null && child.TryGetComponent(out Image image)) return image;
        }
        return null;
    }

    private TMP_Text FindChildText(params string[] names)
    {
        for (int i = 0; i < names.Length; i++)
        {
            Transform child = transform.Find(names[i]);
            if (child != null && child.TryGetComponent(out TMP_Text text)) return text;
        }
        return GetComponentInChildren<TMP_Text>(true);
    }
}
