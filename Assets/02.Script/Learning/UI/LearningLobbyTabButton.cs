using DG.Tweening;
using UnityEngine;
using UnityEngine.UI;

public class LearningLobbyTabButton : MonoBehaviour
{
    [SerializeField] private LearningLobbyTabType tabType;
    [SerializeField] private Button button;
    [SerializeField] private RectTransform iconRoot;
    [SerializeField] private Graphic[] colorTargets;
    [SerializeField] private Color selectedColor = Color.white;
    [SerializeField] private Color unselectedColor = new Color(1f, 1f, 1f, 0.45f);
    [SerializeField] private bool animateYOffset;
    [SerializeField] private float selectedYOffset = 8f;
    [SerializeField] private float selectedScale = 1.14f;

    private LearningLobbyTabController controller;
    private Vector2 basePosition;
    private bool isSelected;

    public LearningLobbyTabType TabType => tabType;
    public RectTransform IconRoot => iconRoot != null ? iconRoot : transform as RectTransform;

    private void Awake()
    {
        if (button == null) button = GetComponent<Button>();
        if (iconRoot == null) iconRoot = FindDefaultIconRoot();
        if (iconRoot != null) basePosition = iconRoot.anchoredPosition;
        if (colorTargets == null || colorTargets.Length == 0)
        {
            Graphic graphic = iconRoot != null ? iconRoot.GetComponent<Graphic>() : GetComponent<Graphic>();
            if (graphic != null) colorTargets = new[] { graphic };
        }
    }

    public void Init(LearningLobbyTabController owner)
    {
        controller = owner;
        if (button == null) button = GetComponent<Button>();
        if (button != null)
        {
            button.onClick.RemoveListener(OnClick);
            button.onClick.AddListener(OnClick);
        }
    }

    public void SetSelected(bool selected, float duration)
    {
        if (iconRoot == null) return;

        isSelected = selected;
        iconRoot.DOKill();
        Vector2 targetPosition = basePosition;
        if (animateYOffset && !IsControlledByLayout(iconRoot))
        {
            targetPosition = selected ? basePosition + new Vector2(0f, selectedYOffset) : basePosition;
        }
        Vector3 targetScale = selected ? Vector3.one * selectedScale : Vector3.one;

        if (duration <= 0f)
        {
            iconRoot.anchoredPosition = targetPosition;
            iconRoot.localScale = targetScale;
        }
        else
        {
            iconRoot.DOAnchorPos(targetPosition, duration).SetEase(Ease.OutQuad);
            iconRoot.DOScale(targetScale, duration).SetEase(Ease.OutBack);
        }

        if (colorTargets != null)
        {
            for (int i = 0; i < colorTargets.Length; i++)
            {
                if (colorTargets[i] == null) continue;
                colorTargets[i].DOKill();
                if (duration <= 0f) colorTargets[i].color = selected ? selectedColor : unselectedColor;
                else colorTargets[i].DOColor(selected ? selectedColor : unselectedColor, duration);
            }
        }
    }

    public void PlayReselectFeedback(float duration)
    {
        if (!isSelected || iconRoot == null) return;
        iconRoot.DOKill();
        iconRoot.anchoredPosition = basePosition;
        iconRoot.localScale = Vector3.one * selectedScale;
        iconRoot.DOPunchScale(new Vector3(0.08f, 0.08f, 0f), Mathf.Min(0.1f, Mathf.Max(0.06f, duration)), 6, 0.6f)
            .OnComplete(() => iconRoot.localScale = Vector3.one * selectedScale);
    }

    private void OnClick()
    {
        controller?.Select(tabType);
    }

    private RectTransform FindDefaultIconRoot()
    {
        Graphic[] graphics = GetComponentsInChildren<Graphic>(true);
        for (int i = 0; i < graphics.Length; i++)
        {
            if (graphics[i] == null || graphics[i].transform == transform) continue;
            string lowerName = graphics[i].name.ToLowerInvariant();
            if (lowerName.Contains("icon") || lowerName.Contains("image") || lowerName.Contains("emoji"))
            {
                return graphics[i].rectTransform;
            }
        }

        for (int i = 0; i < graphics.Length; i++)
        {
            if (graphics[i] == null || graphics[i].transform == transform) continue;
            return graphics[i].rectTransform;
        }

        return transform as RectTransform;
    }

    private static bool IsControlledByLayout(RectTransform rect)
    {
        if (rect == null || rect.parent == null) return false;
        return rect.parent.GetComponent<HorizontalLayoutGroup>() != null ||
               rect.parent.GetComponent<VerticalLayoutGroup>() != null ||
               rect.parent.GetComponent<GridLayoutGroup>() != null;
    }
}
