using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class LearningItemSlotView : MonoBehaviour
{
    [SerializeField] private GameObject emptyObject;
    [SerializeField] private GameObject contentObject;
    [SerializeField] private Image iconImage;
    [SerializeField] private TMP_Text nameText;
    [SerializeField] private TMP_Text stackText;
    [SerializeField] private Sprite fallbackIcon;

    private Button button;
    private LearningItemDefinition boundItem;
    private System.Action<LearningItemDefinition> onItemClick;

    public GameObject EmptyObject => emptyObject;
    public GameObject ContentObject => contentObject;

    private void Reset()
    {
        AutoFillFromChildren();
        BindEmpty();
    }

    private void Awake()
    {
        AutoFillFromChildren();
        EnsureButton();
        BindEmpty();
    }

    private void OnEnable()
    {
        AutoFillFromChildren();
    }

    [ContextMenu("Auto Fill From Children")]
    public void AutoFillFromChildren()
    {
        if (emptyObject == null) emptyObject = FindObject("Empty Object", "Item Empty", "Empty", "ItemEmpty");
        if (contentObject == null) contentObject = FindObject("Num", "Content", "Content Object", "ItemContent", "Filled");
        if (iconImage == null) iconImage = FindImage("Icon", "ItemIcon");
        if (nameText == null) nameText = FindText("NameText", "Name", "TitleText");
        if (stackText == null) stackText = FindText("StackText", "Stack", "CountText", "NumText", "Text");
    }

    public void BindEmpty()
    {
        AutoFillFromChildren();
        boundItem = null;
        onItemClick = null;
        EnsureButton();
        if (button != null) button.interactable = false;
        SetObjectActive(emptyObject, true);
        SetObjectActive(contentObject, false);
        if (iconImage != null)
        {
            iconImage.sprite = null;
            iconImage.color = Color.clear;
            iconImage.gameObject.SetActive(false);
        }
        if (nameText != null)
        {
            nameText.text = string.Empty;
            nameText.gameObject.SetActive(false);
        }
        if (stackText != null)
        {
            stackText.text = string.Empty;
            stackText.gameObject.SetActive(false);
        }
    }

    public void BindItem(LearningItemDefinition item, string stackDisplay, Sprite icon = null, System.Action<LearningItemDefinition> clickAction = null)
    {
        AutoFillFromChildren();
        boundItem = item;
        onItemClick = clickAction;
        EnsureButton();
        if (button != null) button.interactable = item != null;
        Sprite resolvedIcon = icon != null
            ? icon
            : item != null && item.icon != null
                ? item.icon
                : fallbackIcon != null
                    ? fallbackIcon
                    : LearningUiSkin.ResolveItemIconSprite(null);
        bool hasStack = !string.IsNullOrWhiteSpace(stackDisplay);
        bool sharesLabel = nameText != null && nameText == stackText;
        SetObjectActive(emptyObject, false);
        SetObjectActive(contentObject, hasStack);
        if (iconImage != null)
        {
            iconImage.gameObject.SetActive(true);
            iconImage.sprite = resolvedIcon;
            iconImage.color = resolvedIcon != null ? Color.white : new Color(1f, 1f, 1f, 0.35f);
            iconImage.preserveAspect = true;
        }
        if (nameText != null)
        {
            nameText.gameObject.SetActive(item != null);
            nameText.text = item == null
                ? string.Empty
                : sharesLabel && hasStack
                    ? $"{item.displayName}\n{stackDisplay}"
                    : item.displayName;
        }
        if (stackText != null)
        {
            // Some of the 04 Exploration scene's prepared frames intentionally use one
            // TMP label for both item name and stack. Do not hide that label for passive
            // items that have no stack, and keep both values visible when a stack exists.
            stackText.gameObject.SetActive(sharesLabel ? item != null : hasStack);
            if (!sharesLabel) stackText.text = stackDisplay ?? string.Empty;
        }
    }

    private GameObject FindObject(params string[] names)
    {
        Transform found = FindTransformRecursive(transform, names);
        return found != null ? found.gameObject : null;
    }

    private Image FindImage(params string[] names)
    {
        Transform found = FindTransformRecursive(transform, names);
        return found != null ? found.GetComponent<Image>() : null;
    }

    private TMP_Text FindText(params string[] names)
    {
        Transform found = FindTransformRecursive(transform, names);
        return found != null ? found.GetComponent<TMP_Text>() : null;
    }

    private static Transform FindTransformRecursive(Transform root, string[] names)
    {
        if (root == null) return null;
        for (int i = 0; i < names.Length; i++)
        {
            if (NameMatches(root.name, names[i])) return root;
        }
        for (int i = 0; i < root.childCount; i++)
        {
            Transform found = FindTransformRecursive(root.GetChild(i), names);
            if (found != null) return found;
        }
        return null;
    }

    private static bool NameMatches(string actual, string expected)
    {
        if (string.IsNullOrEmpty(actual) || string.IsNullOrEmpty(expected)) return false;
        return actual.Equals(expected, System.StringComparison.OrdinalIgnoreCase) ||
               actual.StartsWith(expected + " (", System.StringComparison.OrdinalIgnoreCase);
    }

    private void SetObjectActive(GameObject target, bool active)
    {
        if (target == null || target == gameObject) return;
        target.SetActive(active);
    }

    private void EnsureButton()
    {
        if (button == null) button = GetComponent<Button>();
        if (button == null)
        {
            button = gameObject.AddComponent<Button>();
        }
        if (button.targetGraphic == null) button.targetGraphic = GetComponent<Image>();

        button.onClick.RemoveListener(HandleClick);
        button.onClick.AddListener(HandleClick);
    }

    private void HandleClick()
    {
        if (boundItem != null) onItemClick?.Invoke(boundItem);
    }

}
