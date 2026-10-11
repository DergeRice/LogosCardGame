using DG.Tweening;
using UnityEngine;

public class LearningPopupPanel : MonoBehaviour
{
    [SerializeField] private CanvasGroup canvasGroup;
    [SerializeField] private RectTransform panel;
    [SerializeField] private float duration = 0.22f;

    private void Awake()
    {
        if (canvasGroup == null) canvasGroup = GetComponent<CanvasGroup>();
        if (panel == null) panel = transform as RectTransform;
    }

    public void Open()
    {
        gameObject.SetActive(true);
        if (canvasGroup != null)
        {
            canvasGroup.alpha = 0f;
            canvasGroup.DOFade(1f, duration);
        }
        if (panel != null)
        {
            panel.localScale = Vector3.one * 0.94f;
            panel.DOScale(1f, duration).SetEase(Ease.OutBack);
        }
    }

    public void Close()
    {
        if (canvasGroup != null) canvasGroup.DOFade(0f, duration * 0.8f);
        if (panel != null)
        {
            panel.DOScale(0.94f, duration * 0.8f).SetEase(Ease.InBack).OnComplete(() => gameObject.SetActive(false));
        }
        else
        {
            gameObject.SetActive(false);
        }
    }
}
