using TMPro;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

public class LearningShopActionButtonView : MonoBehaviour
{
    [SerializeField] private Button button;
    [SerializeField] private Image iconImage;
    [SerializeField] private TMP_Text labelText;

    public Button Button
    {
        get
        {
            EnsureBuilt();
            return button;
        }
    }

    public void Bind(string label, UnityAction onClick, Sprite icon = null)
    {
        EnsureBuilt();
        if (labelText != null) labelText.text = label;
        if (iconImage != null)
        {
            iconImage.gameObject.SetActive(icon != null);
            iconImage.sprite = icon;
            iconImage.preserveAspect = true;
        }

        if (button != null)
        {
            button.onClick.RemoveAllListeners();
            if (onClick != null) button.onClick.AddListener(onClick);
        }
    }

    public void SetLabel(string label)
    {
        EnsureBuilt();
        if (labelText != null) labelText.text = label;
    }

    private void EnsureBuilt()
    {
        if (button == null) button = GetComponent<Button>();
        if (labelText == null) labelText = FindChildText("LabelText", "Text", "Label");
        if (iconImage == null) iconImage = FindChildImage("Icon");

        if (button == null) Debug.LogWarning($"[LearningShopActionButtonView] Button component not found on {name}.");
        if (iconImage == null) Debug.LogWarning($"[LearningShopActionButtonView] Icon child not found on {name}.");
        if (labelText == null) Debug.LogWarning($"[LearningShopActionButtonView] Text child not found on {name}.");
    }

    private Image FindChildImage(string name)
    {
        Transform child = transform.Find(name);
        return child != null ? child.GetComponent<Image>() : null;
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
