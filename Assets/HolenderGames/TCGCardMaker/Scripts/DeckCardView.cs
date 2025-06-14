using UnityEngine;

namespace TCG_CardMaker
{
    public class DeckCardView : MonoBehaviour
    {
        private CardContextMenu menu;
        public CardView cardView;
        public CardSO card { get; private set; }

        private void Awake()
        {
            menu = GetComponent<CardContextMenu>();
        }

        public void SetCardView(CardView cardView)
        {
            this.cardView = cardView;
        }

        public void UpdateCardSO(CardSO card)
        {
            this.card = card;
            cardView.SetData(card);
            // menu.SetCardSO(card);
        }

    }
}
