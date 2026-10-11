using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class LearningDeckCardView : MonoBehaviour
{
    [SerializeField] private TMP_Text labelText;
    [SerializeField] private TMP_Text plusText;
    [SerializeField] private TMP_Text multiplyText;
    [SerializeField] private GameObject plusRoot;
    [SerializeField] private GameObject multiplyRoot;
    [SerializeField] private Image plusFill;
    [SerializeField] private Image multiplyFill;
    [SerializeField] private Image background;
    [SerializeField] private GameObject tempRoot;
    [SerializeField] private float sentenceStatScale = 1.18f;
    [SerializeField] private float sentenceStatPopScale = 1.38f;
    [SerializeField] private float sentenceStatPopDuration = 0.34f;

    private Coroutine plusPopRoutine;
    private Coroutine multiplyPopRoutine;
    private Vector2 plusRootBaseSize;
    private Vector2 multiplyRootBaseSize;
    private bool hasPlusRootBaseSize;
    private bool hasMultiplyRootBaseSize;
    private CanvasGroup canvasGroup;

    public LearningDeckCard Card { get; private set; }
    public int BonusScore => Card != null ? Card.bonusScore : 0;
    public float Multiplier => Card != null ? Card.multiplier : 1f;

    public void Bind(LearningDeckCard card, bool inSentence, bool scoring)
    {
        Bind(card, inSentence, scoring, true);
    }

    public void Bind(LearningDeckCard card, bool inSentence, bool scoring, bool playSentenceStatPop)
    {
        ResolveReferences();
        Card = card;

        if (labelText != null)
        {
            labelText.text = LearningSpecialDeckCardRules.GetCardLabel(card);
        }

        int bonusScore = card != null ? card.bonusScore : 0;
        bool hasBonus = bonusScore != 0;
        if (plusRoot != null) plusRoot.SetActive(hasBonus);
        if (plusText != null) plusText.text = bonusScore > 0 ? $"+{bonusScore}" : bonusScore.ToString();
        SetImageFill(plusFill, hasBonus ? 1f : 0f);
        ApplyStatScale(plusRoot, hasBonus, inSentence, playSentenceStatPop, ref plusPopRoutine);

        float multiplier = card != null ? card.multiplier : 1f;
        bool hasMultiplier = multiplier > 0f && Mathf.Abs(multiplier - 1f) > 0.001f;
        if (multiplyRoot != null) multiplyRoot.SetActive(hasMultiplier);
        if (multiplyText != null) multiplyText.text = $"x{multiplier:0.##}";
        SetImageFill(multiplyFill, hasMultiplier ? 1f : 0f);
        ApplyStatScale(multiplyRoot, hasMultiplier, inSentence, playSentenceStatPop, ref multiplyPopRoutine);

        bool temporary = card != null && card.temporary;
        if (tempRoot != null) tempRoot.SetActive(temporary);

        if (background != null)
        {
            background.color = scoring ? new Color(0.92f, 0.18f, 0.16f, 1f) :
                temporary ? new Color(0.50f, 0.82f, 1f, 0.72f) :
                inSentence ? new Color(0.20f, 0.42f, 0.72f, 1f) : new Color(0.14f, 0.22f, 0.34f, 1f);
        }

        if (canvasGroup != null)
        {
            canvasGroup.alpha = card != null && card.temporary ? 0.74f : 1f;
        }
    }

    public void SetPlusFill(float value)
    {
        ResolveReferences();
        SetImageFill(plusFill, value);
    }

    public void SetMultiplyFill(float value)
    {
        ResolveReferences();
        SetImageFill(multiplyFill, value);
    }

    private void ResolveReferences()
    {
        if (background == null) background = GetComponent<Image>();
        if (canvasGroup == null) canvasGroup = GetComponent<CanvasGroup>();
        if (labelText == null) labelText = FindText("Text", "Label", "Text (TMP) (1)");
        if (plusRoot == null) plusRoot = FindObject("PlusText");
        if (multiplyRoot == null) multiplyRoot = FindObject("MultiflyText", "MultiplyText");
        if (tempRoot == null) tempRoot = FindObject("Temp");
        CaptureBaseSize(plusRoot, ref plusRootBaseSize, ref hasPlusRootBaseSize);
        CaptureBaseSize(multiplyRoot, ref multiplyRootBaseSize, ref hasMultiplyRootBaseSize);
        if (plusText == null && plusRoot != null) plusText = plusRoot.GetComponentInChildren<TMP_Text>(true);
        if (multiplyText == null && multiplyRoot != null) multiplyText = multiplyRoot.GetComponentInChildren<TMP_Text>(true);
        if (plusFill == null && plusRoot != null) plusFill = FindImage(plusRoot.transform, "Fill", "fill");
        if (multiplyFill == null && multiplyRoot != null) multiplyFill = FindImage(multiplyRoot.transform, "Fill", "fill");
    }

    private void ApplyStatScale(GameObject root, bool visible, bool inSentence, bool playPop, ref Coroutine routine)
    {
        if (root == null) return;

        if (routine != null)
        {
            StopCoroutine(routine);
            routine = null;
        }

        float targetScale = visible && inSentence ? sentenceStatScale : 1f;
        ApplyRootVisualScale(root, targetScale);
        if (visible && inSentence && playPop && gameObject.activeInHierarchy)
        {
            routine = StartCoroutine(PopStat(root.transform, targetScale));
        }
    }

    private IEnumerator PopStat(Transform target, float settleScale)
    {
        if (target == null) yield break;

        float elapsed = 0f;
        while (elapsed < sentenceStatPopDuration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / Mathf.Max(0.001f, sentenceStatPopDuration));
            float ring = Mathf.Sin(t * Mathf.PI);
            float overshoot = Mathf.Sin(t * Mathf.PI * 3f) * Mathf.Pow(1f - t, 1.45f) * 0.08f;
            float scale = Mathf.Lerp(0.82f, settleScale, EaseOutBack(t)) + ring * (sentenceStatPopScale - settleScale) + overshoot;
            ApplyRootVisualScale(target.gameObject, Mathf.Max(0.01f, scale));
            yield return null;
        }

        if (target != null) ApplyRootVisualScale(target.gameObject, settleScale);
    }

    private void ApplyRootVisualScale(GameObject root, float scale)
    {
        if (root == null) return;
        root.transform.localScale = Vector3.one * scale;

        RectTransform rect = root.transform as RectTransform;
        if (rect == null) return;

        if (root == plusRoot && hasPlusRootBaseSize)
        {
            rect.sizeDelta = plusRootBaseSize * scale;
            ApplyLayoutSize(root, plusRootBaseSize, scale);
        }
        else if (root == multiplyRoot && hasMultiplyRootBaseSize)
        {
            rect.sizeDelta = multiplyRootBaseSize * scale;
            ApplyLayoutSize(root, multiplyRootBaseSize, scale);
        }
    }

    private static void ApplyLayoutSize(GameObject root, Vector2 baseSize, float scale)
    {
        if (root == null) return;
        LayoutElement layout = root.GetComponent<LayoutElement>();
        if (layout == null) layout = root.AddComponent<LayoutElement>();
        layout.preferredWidth = baseSize.x * scale;
        layout.preferredHeight = baseSize.y * scale;
    }

    private static void CaptureBaseSize(GameObject root, ref Vector2 baseSize, ref bool hasBaseSize)
    {
        if (root == null || hasBaseSize) return;
        RectTransform rect = root.transform as RectTransform;
        if (rect == null) return;
        baseSize = rect.sizeDelta;
        hasBaseSize = true;
    }

    private GameObject FindObject(params string[] names)
    {
        return FindObjectRecursive(transform, names);
    }

    private static GameObject FindObjectRecursive(Transform root, params string[] names)
    {
        if (root == null) return null;
        for (int i = 0; i < root.childCount; i++)
        {
            Transform child = root.GetChild(i);
            for (int j = 0; j < names.Length; j++)
            {
                if (child.name == names[j]) return child.gameObject;
            }

            GameObject nested = FindObjectRecursive(child, names);
            if (nested != null) return nested;
        }
        return null;
    }

    private TMP_Text FindText(params string[] names)
    {
        for (int i = 0; i < names.Length; i++)
        {
            Transform child = transform.Find(names[i]);
            if (child != null && child.TryGetComponent(out TMP_Text text)) return text;
        }
        return GetComponentInChildren<TMP_Text>(true);
    }

    private static Image FindImage(Transform root, params string[] names)
    {
        if (root == null) return null;
        for (int i = 0; i < root.childCount; i++)
        {
            Transform child = root.GetChild(i);
            for (int j = 0; j < names.Length; j++)
            {
                if (child.name.Equals(names[j], System.StringComparison.OrdinalIgnoreCase) &&
                    child.TryGetComponent(out Image image))
                {
                    return image;
                }
            }

            Image nested = FindImage(child, names);
            if (nested != null) return nested;
        }
        return null;
    }

    private static void SetImageFill(Image image, float value)
    {
        if (image == null) return;
        image.fillAmount = Mathf.Clamp01(value);
    }

    private static float EaseOutBack(float t)
    {
        const float c1 = 1.70158f;
        const float c3 = c1 + 1f;
        return 1f + c3 * Mathf.Pow(t - 1f, 3f) + c1 * Mathf.Pow(t - 1f, 2f);
    }
}
