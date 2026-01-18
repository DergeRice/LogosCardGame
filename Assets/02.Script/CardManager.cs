using UnityEngine;
using TCG_CardMaker;

public class CardManager : MonoBehaviour
{
    public static CardManager instance;
    public HoldingCard holdingCard;

    public FieldManager fieldManager;

    public HandManager handManager;

    public ReturnArea returnArea;

    void Awake()
    {
        instance = this;
    }

    public GameObject GetCardObjectByIndex(int index)
    {
        CardSO targetSO = CardsDB.Instance.Cards[index];
        return GetCardObjectBySo(targetSO);
    }

    public GameObject GetCardObjectBySo(CardSO targetSO)
    {
        foreach (Transform child in handManager.cardsContainer)
        {
            var cardView = child.GetComponent<DeckCardView>();
            if (cardView != null && cardView.card == targetSO)
            {
                return child.gameObject;
            }
        }

        foreach (Transform child in fieldManager.fieldParent)
        {
            var cardView = child.GetComponent<DeckCardView>();
            if (cardView != null && cardView.card == targetSO)
            {
                return child.gameObject;
            }
        }

        return null;
    }
}
