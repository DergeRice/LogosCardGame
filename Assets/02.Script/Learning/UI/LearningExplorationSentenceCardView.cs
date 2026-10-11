using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public class LearningExplorationSentenceCardView : MonoBehaviour, IBeginDragHandler, IDragHandler, IEndDragHandler
{
    [SerializeField] private TMP_Text label;
    [SerializeField] private Image background;
    [SerializeField] private Button button;
    [SerializeField] private GameObject tempRoot;
    private LearningExplorationSentenceUI owner;
    private int index;
    private LearningDeckCard card;
    private bool sentenceCard;
    private bool dragging;
    private CanvasGroup canvasGroup;

    public void Init(LearningExplorationSentenceUI ui, int cardIndex, LearningDeckCard card, bool inSentence)
    {
        owner = ui;
        index = cardIndex;
        this.card = card;
        sentenceCard = inSentence;
        if (button == null) button = ResolveButton();
        if (label == null) label = ResolveLabel();
        if (background == null) background = GetComponent<Image>();
        if (tempRoot == null) tempRoot = FindObject("Temp");
        if (canvasGroup == null)
        {
            canvasGroup = gameObject.GetComponent<CanvasGroup>();
            if (canvasGroup == null) canvasGroup = gameObject.AddComponent<CanvasGroup>();
        }

        if (label != null)
        {
            label.text = LearningSpecialDeckCardRules.GetCardLabel(card);
        }

        bool temporary = card != null && card.temporary;
        if (tempRoot != null) tempRoot.SetActive(temporary);

        if (background != null)
        {
            bool scoring = sentenceCard && owner != null && owner.IsScoringSentenceCard(index);
            background.color = scoring ? new Color(0.92f, 0.18f, 0.16f, 1f) :
                temporary ? new Color(0.50f, 0.82f, 1f, 0.72f) :
                sentenceCard ? new Color(0.20f, 0.42f, 0.72f, 1f) : new Color(0.14f, 0.22f, 0.34f, 1f);
        }

        if (canvasGroup != null && !dragging)
        {
            canvasGroup.alpha = temporary ? 0.74f : 1f;
        }

        WireButtons();
        if (button == null)
        {
            Debug.LogWarning($"[LearningExplorationSentenceCardView] Button not found on {name}.");
        }
    }

    private Button ResolveButton()
    {
        Button[] buttons = GetComponentsInChildren<Button>(true);
        for (int i = 0; i < buttons.Length; i++)
        {
            if (buttons[i] != null && buttons[i].gameObject != gameObject) return buttons[i];
        }

        if (buttons.Length > 0) return buttons[0];
        return GetComponent<Button>();
    }

    private void WireButtons()
    {
        Button[] buttons = GetComponentsInChildren<Button>(true);
        if ((buttons == null || buttons.Length == 0) && button != null)
        {
            buttons = new[] { button };
        }

        if (buttons == null) return;
        for (int i = 0; i < buttons.Length; i++)
        {
            if (buttons[i] == null) continue;
            buttons[i].onClick.RemoveAllListeners();
            buttons[i].onClick.AddListener(OnClick);
            buttons[i].interactable = true;
        }

        if (button == null && buttons.Length > 0) button = buttons[0];
    }

    private TMP_Text ResolveLabel()
    {
        TMP_Text named = FindText("Text", "Label", "CardText");
        if (named != null) return named;
        return GetComponentInChildren<TMP_Text>(true);
    }

    private TMP_Text FindText(params string[] names)
    {
        for (int i = 0; i < names.Length; i++)
        {
            Transform child = transform.Find(names[i]);
            if (child != null && child.TryGetComponent(out TMP_Text text)) return text;
        }
        return null;
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

    public void OnBeginDrag(PointerEventData eventData)
    {
        dragging = true;
        if (sentenceCard) owner?.BeginSentenceDrag(index, eventData.position, transform as RectTransform, canvasGroup);
        else owner?.BeginHandDrag(index, card, eventData.position, transform as RectTransform, canvasGroup);
    }

    public void OnDrag(PointerEventData eventData)
    {
        if (sentenceCard) owner?.UpdateSentenceDrag(index, eventData.position);
        else owner?.UpdateHandDrag(index, eventData.position);
    }

    public void OnEndDrag(PointerEventData eventData)
    {
        dragging = false;
        if (sentenceCard) owner?.CommitSentenceDrag(index, eventData.position);
        else owner?.CommitHandDrag(index, card, eventData.position);
    }

    private void OnDisable()
    {
        if (dragging)
        {
            dragging = false;
            owner?.CancelSentenceDragVisual();
        }
    }

    private void OnClick()
    {
        if (sentenceCard) owner?.ReturnSentenceCard(index);
        else owner?.PlayHandCard(index, card);
    }
}
