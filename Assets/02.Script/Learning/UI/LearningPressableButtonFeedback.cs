using DG.Tweening;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

[DisallowMultipleComponent]
[RequireComponent(typeof(Button))]
public class LearningPressableButtonFeedback : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler
{
    [SerializeField] private RectTransform target;
    [SerializeField] private float pressedYOffset = -3f;
    [SerializeField] private Vector2 pressedSizeOffset = new Vector2(-4f, -4f);
    [SerializeField] private float pressDuration = 0.08f;
    [SerializeField] private float releaseDuration = 0.22f;
    [SerializeField] private Ease pressEase = Ease.OutQuad;
    [SerializeField] private Ease releaseEase = Ease.OutBack;
    [SerializeField] private bool ignoreWhenNotInteractable = true;

    private Button button;
    private Vector2 baseAnchoredPosition;
    private Vector2 baseSizeDelta;
    private bool initialized;
    private bool pressed;

    private void Awake()
    {
        if (GetComponent<LearningLobbyTabButton>() != null)
        {
            enabled = false;
            return;
        }

        Initialize();
    }

    private void OnEnable()
    {
        Initialize();
        ResetVisual(immediate: true);
    }

    private void OnDisable()
    {
        if (target != null) target.DOKill();
        pressed = false;
    }

    private void OnRectTransformDimensionsChange()
    {
        if (!isActiveAndEnabled || pressed || target == null) return;
        CaptureBaseState();
    }

    public void OnPointerDown(PointerEventData eventData)
    {
        if (!CanAnimate()) return;
        pressed = true;
        AnimatePressed();
    }

    public void OnPointerUp(PointerEventData eventData)
    {
        if (!initialized) return;
        pressed = false;
        ResetVisual(immediate: false);
    }

    public void OnPointerExit(PointerEventData eventData)
    {
        if (!initialized || !pressed) return;
        pressed = false;
        ResetVisual(immediate: false);
    }

    [ContextMenu("Capture Current As Base")]
    public void CaptureCurrentAsBase()
    {
        Initialize(force: true);
    }

    private void Initialize(bool force = false)
    {
        if (initialized && !force) return;

        if (button == null) button = GetComponent<Button>();
        if (target == null) target = transform as RectTransform;
        CaptureBaseState();
        initialized = target != null;
    }

    private void CaptureBaseState()
    {
        if (target == null) return;
        baseAnchoredPosition = target.anchoredPosition;
        baseSizeDelta = target.sizeDelta;
    }

    private bool CanAnimate()
    {
        Initialize();
        if (!initialized || target == null) return false;
        if (ignoreWhenNotInteractable && button != null && !button.interactable) return false;
        return true;
    }

    private void AnimatePressed()
    {
        target.DOKill();
        target.DOAnchorPos(baseAnchoredPosition + new Vector2(0f, pressedYOffset), pressDuration)
            .SetEase(pressEase)
            .SetUpdate(true);
        target.DOSizeDelta(baseSizeDelta + pressedSizeOffset, pressDuration)
            .SetEase(pressEase)
            .SetUpdate(true);
    }

    private void ResetVisual(bool immediate)
    {
        if (target == null) return;

        target.DOKill();
        if (immediate)
        {
            target.anchoredPosition = baseAnchoredPosition;
            target.sizeDelta = baseSizeDelta;
            return;
        }

        target.DOAnchorPos(baseAnchoredPosition, releaseDuration)
            .SetEase(releaseEase)
            .SetUpdate(true);
        target.DOSizeDelta(baseSizeDelta, releaseDuration)
            .SetEase(releaseEase)
            .SetUpdate(true);
    }
}
