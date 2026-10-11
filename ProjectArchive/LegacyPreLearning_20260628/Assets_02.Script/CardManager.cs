using UnityEngine;
using Fusion;
using Fusion.Photon;
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
        // Debug.Log(index+"찾아볼게");
        CardSO targetSO = CardsDB.Instance.Cards[index];
        return GetCardObjectBySo(targetSO);
    }


    public GameObject GetCardObjectBySo(CardSO targetSO)
    {

        // 1. 핸드에서 먼저 검색
        foreach (Transform child in handManager.cardsContainer)
        {
            var cardView = child.GetComponent<DeckCardView>();
            if (cardView != null && cardView.card == targetSO)
            {
                // Debug.Log("찾음");
                return child.gameObject;
            }
        }

        // 2. 핸드에서 못 찾았으면 필드에서 검색
        foreach (Transform child in fieldManager.fieldParent)
        {
            var cardView = child.GetComponent<DeckCardView>();
            if (cardView != null && cardView.card == targetSO)
            {
                // Debug.Log("찾음");
                return child.gameObject;
            }
        }

        // Debug.Log("못찾음");
        // 3. 어디에서도 못 찾았으면 null
        return null;


    }

}
