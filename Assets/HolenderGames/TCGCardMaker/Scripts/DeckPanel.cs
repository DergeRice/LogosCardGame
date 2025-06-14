using UnityEngine;
using System.Collections.Generic;
using System.Linq;

namespace TCG_CardMaker
{
    public class DeckPanel : MonoBehaviour
    {
        [SerializeField] private Transform cardsContainer;
        [SerializeField] private DeckCardView deckCardViewPrefab;

        List<DeckCardView> cards = new List<DeckCardView>();
        private CardView cardViewPrefab;

        private CardSO selectedCard;

        private void Awake()
        {
            CardContextMenu.OnDeleteCardClick += OnDeleteCardClick;
        }

        private void OnEnable()
        {
            InitPanel();
        }

        private void InitPanel()
        {
            cardViewPrefab = Settings.Instance.CardViewPrefab;
            PopulateCards();
        }


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

        private void OnDeleteCardClick(CardSO card)
        {
            selectedCard = card;
            YesNoDialog.Instance.Show("Delete card <color=#ff0000>" + card.Title + "</color> (cannot undo)?", DeleteDialogResponse);
        }

        private void DeleteDialogResponse(bool isDeleteApproved)
        {
            if(!isDeleteApproved || selectedCard==null) { return; }

            CardsDB.Instance.Cards.RemoveAll(item => item == selectedCard);
            DeckCardView cardToDelete = cards.FirstOrDefault(c => c.card == selectedCard);
            if (cardToDelete != null)
            {
                Destroy(cardToDelete.gameObject);
                cards.Remove(cardToDelete);
            }


            DeleteCardAsset(selectedCard);
        }

        private void DeleteCardAsset(CardSO card)
        {
            string fullPath = Settings.Instance.saveFolderPath + "card_" + card.Title.ToLower().Replace(" ", "_") + ".asset";


            // Save the asset
#if UNITY_EDITOR
            bool isDeleted = UnityEditor.AssetDatabase.DeleteAsset(fullPath);
            Debug.Log("ScriptableObject delete: " + fullPath + " - success: " + isDeleted.ToString());



#endif


        }
    }
}
