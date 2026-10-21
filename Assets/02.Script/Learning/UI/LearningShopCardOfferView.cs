using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

public class LearningShopCardOfferView : LearningShopOfferViewBase
{
    [SerializeField] private LearningDeckCardView displayCardView;

    public void Bind(LearningDeckCard card, int price, Sprite icon, UnityAction onClick)
    {
        EnsureBuilt(false);
        BindDisplayCard(card);
        BindPurchaseCurrency(price, onClick);
    }

    private void BindDisplayCard(LearningDeckCard card)
    {
        if (displayCardView == null)
        {
            GameObject displayCard = FindDeepObject("DisplayCard");
            if (displayCard != null)
            {
                displayCardView = displayCard.GetComponent<LearningDeckCardView>();
                DisableDisplayCardTriggers(displayCard);
            }
        }

        if (displayCardView != null)
        {
            displayCardView.Bind(card, false, false);
        }
        else
        {
            Debug.LogWarning($"[LearningShopCardOfferView] DisplayCard or LearningDeckCardView not found on {name}.");
        }

        string description = BuildDescription(card);
        if (descriptionText != null) descriptionText.text = description;
        if (nameText != null) nameText.text = card != null ? LearningSpecialDeckCardRules.GetCardLabel(card) : "카드";
    }

    private static string BuildDescription(LearningDeckCard card)
    {
        if (card == null) return string.Empty;
        if (card.bonusScore != 0)
        {
            return card.bonusScore > 0 ? $"+{card.bonusScore}점" : $"{card.bonusScore}점";
        }

        if (card.multiplier > 0f && Mathf.Abs(card.multiplier - 1f) > 0.001f)
        {
            return $"x{card.multiplier:0.##}";
        }

        return "기본 카드";
    }

    private static void DisableDisplayCardTriggers(GameObject displayCard)
    {
        LearningExplorationSentenceCardView explorationView = displayCard.GetComponent<LearningExplorationSentenceCardView>();
        if (explorationView != null) explorationView.enabled = false;

        LearningBattleSentenceCardView battleView = displayCard.GetComponent<LearningBattleSentenceCardView>();
        if (battleView != null) battleView.enabled = false;

        LearningWordCardButton wordButton = displayCard.GetComponent<LearningWordCardButton>();
        if (wordButton != null) wordButton.enabled = false;

        Button[] buttons = displayCard.GetComponentsInChildren<Button>(true);
        for (int i = 0; i < buttons.Length; i++)
        {
            buttons[i].interactable = false;
            buttons[i].onClick.RemoveAllListeners();
        }
    }
}
