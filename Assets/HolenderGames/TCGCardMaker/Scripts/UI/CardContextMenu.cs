using System;
using UnityEngine;
using UnityEngine.UI;

namespace TCG_CardMaker
{
    public class CardContextMenu : ContextMenu
    {
        public static event Action<CardSO> OnEditCardClick;
        public static event Action<CardSO> OnDeleteCardClick;

        [SerializeField] private Button btnEdit;
        [SerializeField] private Button btnDelete;

        private CardSO card;
        private void Awake()
        {
            // btnEdit.onClick.AddListener(OnEditClick);
            // btnDelete.onClick.AddListener(OnDeleteClick);
        }

        public void SetCardSO(CardSO card)
        {
            this.card = card;
        }

        public CardSO DragStartWithThisSO()
        {

            return card;
        }

        private void OnEditClick()
        {
            OnEditCardClick?.Invoke(card);
            HideMenu();
        }

        private void OnDeleteClick()
        {
            OnDeleteCardClick?.Invoke(card);
            HideMenu();
        }
    }
}
