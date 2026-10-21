using TMPro;
using UnityEngine;

public class LearningShopPanelView : MonoBehaviour
{
    [Header("Texts")]
    public TMP_Text titleText;
    public TMP_Text statusText;

    [Header("Currency")]
    public LearningCurrencySlotView coinSlotView;

    [Header("Offer Roots")]
    public Transform itemOfferRoot;
    public Transform cardOfferRoot;
    public Transform inventoryRoot;

    [Header("Offer Slots")]
    public LearningShopItemOfferView[] itemOfferViews;
    public LearningShopCardOfferView[] cardOfferViews;

    [Header("Action Buttons")]
    public LearningShopActionButtonView rerollButtonView;
    public LearningShopActionButtonView deckDeleteButtonView;
    public LearningShopActionButtonView continueButtonView;

    [Header("Animation Roots")]
    public RectTransform itemOfferAnimationRoot;
    public RectTransform cardOfferAnimationRoot;
}
