using UnityEngine;
using TCG_CardMaker;
using System.Collections.Generic;

public class GrammarCardMaker : MonoBehaviour
{
    [SerializeField] private Transform cardsContainer;
    [SerializeField] private DeckCardView deckCardViewPrefab;

    List<DeckCardView> cards = new List<DeckCardView>();
    private CardView cardViewPrefab;

    private CardSO selectedCard;

    [UnityEngine.ContextMenu("GenerateCards")]
    private void PopulateCards()
    {
        CardsDB.Instance.Cards.RemoveAll(item => item == null);
        List<CardSO> cardsDB = CardsDB.Instance.Cards;

        // Debug.Log(cardsDB.Count);
        for (int i = 0; i < cardsDB.Count; i++)
        {
            if (i < cards.Count)
            {
                cards[i].UpdateCardSO(cardsDB[i]);
            }
            else
            {
                DeckCardView deckView = Instantiate(deckCardViewPrefab, cardsContainer);

                // Create the deck card view
                CardView view = Instantiate(cardViewPrefab, deckView.transform);
                view.transform.SetAsFirstSibling();
                deckView.SetCardView(view);
                deckView.UpdateCardSO(cardsDB[i]);
                cards.Add(deckView);
            }

        }

        for (int i = cardsDB.Count; i < cards.Count; i++)
        {
            Destroy(cards[i].gameObject);
        }

        cards.RemoveRange(cardsDB.Count, cards.Count - cardsDB.Count);
    }

}
