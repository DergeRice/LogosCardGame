using TMPro;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

public class LearningGenericButtonView : MonoBehaviour
{
    [SerializeField] private Button button;
    [SerializeField] private TMP_Text labelText;
    [SerializeField] private Image iconImage;

    public Button Button => button;

    private void Awake()
    {
        ResolveReferences();
    }

    public void Bind(string label, Sprite icon, UnityAction onClick)
    {
        ResolveReferences();
        if (labelText != null) labelText.text = label;
        if (iconImage != null)
        {
            iconImage.sprite = icon;
            iconImage.color = icon != null ? Color.white : new Color(1f, 1f, 1f, 0f);
            iconImage.preserveAspect = true;
        }
        if (button != null)
        {
            button.onClick.RemoveAllListeners();
            if (onClick != null) button.onClick.AddListener(onClick);
        }
    }

    private void ResolveReferences()
    {
        if (button == null) button = GetComponent<Button>();
        if (labelText == null) labelText = GetComponentInChildren<TMP_Text>(true);
        if (iconImage == null)
        {
            Transform icon = transform.Find("Icon");
            if (icon != null) iconImage = icon.GetComponent<Image>();
        }
    }
}
