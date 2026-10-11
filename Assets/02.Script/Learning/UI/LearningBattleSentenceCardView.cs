using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public class LearningBattleSentenceCardView : MonoBehaviour, IBeginDragHandler, IDragHandler, IEndDragHandler
{
    private LearningBattleSentenceUI owner;
    private int cardIndex;
    private bool inSentence;
    [SerializeField] private Button button;

    public void Init(LearningBattleSentenceUI ui, int index, bool sentenceCard)
    {
        owner = ui;
        cardIndex = index;
        inSentence = sentenceCard;
        if (button == null) button = ResolveButton();
        if (button != null)
        {
            button.onClick.RemoveAllListeners();
            button.onClick.AddListener(OnClick);
            button.interactable = true;
        }
        else
        {
            Debug.LogWarning($"[LearningBattleSentenceCardView] Button not found on {name}.");
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

    private void OnClick()
    {
        if (inSentence) owner?.ReturnSentenceCard(cardIndex);
        else owner?.PlayHandCard(cardIndex);
    }

    public void OnBeginDrag(PointerEventData eventData) { }

    public void OnDrag(PointerEventData eventData)
    {
        if (inSentence) owner?.PreviewSentenceDrag(cardIndex, eventData.position);
    }

    public void OnEndDrag(PointerEventData eventData)
    {
        if (inSentence) owner?.CommitSentenceDrag(cardIndex, eventData.position);
    }
}
